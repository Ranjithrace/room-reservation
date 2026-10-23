using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using RoomReservation.Api.Data;
using RoomReservation.Api.DTOs;
using RoomReservation.Api.Models;
using RoomReservation.Api.Options;

namespace RoomReservation.Api.Services;

public class ReservationService
{
    private readonly AppDbContext _context;
    private readonly BookingRulesOptions _rules;
    private readonly TimeProvider _clock;
    private readonly ReservationWriteLock _writeLock;

    public ReservationService(
        AppDbContext context,
        IOptions<BookingRulesOptions> rules,
        TimeProvider clock,
        ReservationWriteLock writeLock)
    {
        _context = context;
        _rules = rules.Value;
        _clock = clock;
        _writeLock = writeLock;
    }

    public async Task<ReservationResponse> SaveAsync(
        SaveReservationRequest request,
        int? reservationId,
        CancellationToken cancellationToken)
    {
        await _writeLock.Gate.WaitAsync(cancellationToken);

        try
        {
            var now = _clock.GetUtcNow();
            Reservation? reservation = null;

            if (reservationId.HasValue)
            {
                reservation = await FindAsync(
                    reservationId.Value, cancellationToken);

                if (reservation.Status != ReservationStatus.Booked ||
                    reservation.StartAt <= now)
                {
                    throw new BookingException(
                        "RESERVATION_NOT_EDITABLE",
                        "Only upcoming booked reservations can be edited.",
                        409);
                }
            }

            if (string.IsNullOrWhiteSpace(request.Title) ||
                request.Title.Trim().Length > 200)
            {
                throw new BookingException(
                    "INVALID_TITLE",
                    "Enter a meeting title between 1 and 200 characters.");
            }

            if (!request.StartAt.HasValue ||
                !request.EndAt.HasValue)
            {
                throw new BookingException(
                    "MISSING_TIME",
                    "Start and end date and time are required.");
            }

            var start = request.StartAt.Value.ToUniversalTime();
            var end = request.EndAt.Value.ToUniversalTime();

            if (end <= start)
            {
                throw new BookingException(
                    "INVALID_TIME_RANGE",
                    "End must be after start.");
            }

            if (start <= now)
            {
                throw new BookingException(
                    "START_NOT_FUTURE",
                    "The reservation must start in the future.");
            }

            if (end - start > TimeSpan.FromDays(_rules.MaxDurationDays))
            {
                throw new BookingException(
                    "MAX_DURATION_EXCEEDED",
                    $"A reservation cannot exceed {_rules.MaxDurationDays} days.");
            }

            if (start > now.AddDays(_rules.MaxAdvanceBookingDays))
            {
                throw new BookingException(
                    "BOOKING_HORIZON_EXCEEDED",
                    $"A reservation cannot start more than " +
                    $"{_rules.MaxAdvanceBookingDays} days in the future.");
            }

            var room = await _context.Rooms
                .SingleOrDefaultAsync(
                    item => item.Id == request.RoomId,
                    cancellationToken);

            if (room is null)
            {
                throw new BookingException(
                    "ROOM_NOT_FOUND",
                    "The selected room does not exist.",
                    404);
            }

            if (!room.IsActive)
            {
                throw new BookingException(
                    "ROOM_INACTIVE",
                    "This room is inactive and cannot be booked.");
            }

            if (request.Attendees < 1 ||
                request.Attendees > room.Capacity)
            {
                throw new BookingException(
                    "INVALID_ATTENDEE_COUNT",
                    $"Attendees must be between 1 and {room.Capacity}.");
            }

            var organizer = await _context.Users
                .SingleOrDefaultAsync(
                    item => item.Id == request.OrganizerId,
                    cancellationToken);

            if (organizer is null)
            {
                throw new BookingException(
                    "ORGANIZER_NOT_FOUND",
                    "The selected organizer does not exist.",
                    404);
            }

            var conflicts = _context.Reservations
                .AsNoTracking()
                .Where(item =>
                    item.Status == ReservationStatus.Booked &&
                    item.StartAt < end &&
                    start < item.EndAt);

            if (reservationId.HasValue)
            {
                var excludedId = reservationId.Value;

                conflicts = conflicts.Where(item =>
                    item.Id != excludedId);
            }

            if (await conflicts.AnyAsync(
                item => item.RoomId == request.RoomId,
                cancellationToken))
            {
                throw new BookingException(
                    "ROOM_TIME_CONFLICT",
                    "This room is already booked during the selected time.",
                    409);
            }

            if (await conflicts.AnyAsync(
                item => item.OrganizerId == request.OrganizerId,
                cancellationToken))
            {
                throw new BookingException(
                    "ORGANIZER_TIME_CONFLICT",
                    "This organizer already has a meeting during the selected time.",
                    409);
            }

            if (reservation is null)
            {
                reservation = new Reservation();
                _context.Reservations.Add(reservation);
            }

            reservation.RoomId = room.Id;
            reservation.Room = room;
            reservation.OrganizerId = organizer.Id;
            reservation.Organizer = organizer;
            reservation.Title = request.Title.Trim();
            reservation.StartAt = start;
            reservation.EndAt = end;
            reservation.Attendees = request.Attendees;
            reservation.Status = ReservationStatus.Booked;

            await _context.SaveChangesAsync(cancellationToken);

            return ToResponse(reservation, now);
        }
        finally
        {
            _writeLock.Gate.Release();
        }
    }

    public async Task<ReservationResponse> CancelAsync(
        int id,
        CancellationToken cancellationToken)
    {
        await _writeLock.Gate.WaitAsync(cancellationToken);

        try
        {
            var now = _clock.GetUtcNow();
            var reservation = await FindAsync(id, cancellationToken);

            if (reservation.Status != ReservationStatus.Booked ||
                reservation.StartAt <= now)
            {
                throw new BookingException(
                    "RESERVATION_NOT_CANCELLABLE",
                    "Only upcoming booked reservations can be cancelled.",
                    409);
            }

            reservation.Status = ReservationStatus.Cancelled;

            await _context.SaveChangesAsync(cancellationToken);

            return ToResponse(reservation, now);
        }
        finally
        {
            _writeLock.Gate.Release();
        }
    }

    public async Task<ReservationResponse> EndEarlyAsync(
        int id,
        CancellationToken cancellationToken)
    {
        await _writeLock.Gate.WaitAsync(cancellationToken);

        try
        {
            var now = _clock.GetUtcNow();
            var reservation = await FindAsync(id, cancellationToken);

            if (reservation.Status != ReservationStatus.Booked ||
                now < reservation.StartAt ||
                now >= reservation.EndAt)
            {
                throw new BookingException(
                    "MEETING_NOT_RUNNING",
                    "Only a currently running booked meeting can be ended early.",
                    409);
            }

            if (!reservation.ActualStartAt.HasValue)
            {
                throw new BookingException(
                    "CHECK_IN_REQUIRED",
                    "Check in before ending the meeting early.",
                    409);
            }
            reservation.ActualEndAt = now;
            reservation.Status = ReservationStatus.Completed;

            await _context.SaveChangesAsync(cancellationToken);

            return ToResponse(reservation, now);
        }
        finally
        {
            _writeLock.Gate.Release();
        }
    }


    public async Task<ReservationResponse> CheckInAsync(
    int id,
    CancellationToken cancellationToken)
    {
        await _writeLock.Gate.WaitAsync(cancellationToken);

        try
        {
            var now = _clock.GetUtcNow();
            var reservation = await FindAsync(id, cancellationToken);

            if (reservation.Status != ReservationStatus.Booked ||
                now < reservation.StartAt ||
                now >= reservation.EndAt)
            {
                throw new BookingException(
                    "MEETING_NOT_RUNNING",
                    "Check-in is only available during the booked meeting time.",
                    409);
            }

            if (reservation.ActualStartAt.HasValue)
            {
                throw new BookingException(
                    "ALREADY_CHECKED_IN",
                    "This meeting has already been checked in.",
                    409);
            }

            reservation.ActualStartAt = now;

            await _context.SaveChangesAsync(cancellationToken);

            return ToResponse(reservation, now);
        }
        finally
        {
            _writeLock.Gate.Release();
        }
    }


    private async Task<Reservation> FindAsync(
        int id,
        CancellationToken cancellationToken)
    {
        var reservation = await _context.Reservations
            .Include(item => item.Room)
            .Include(item => item.Organizer)
            .SingleOrDefaultAsync(
                item => item.Id == id,
                cancellationToken);

        return reservation ?? throw new BookingException(
            "RESERVATION_NOT_FOUND",
            "The reservation does not exist.",
            404);
    }

    public static ReservationStatus GetEffectiveStatus(
        Reservation reservation,
        DateTimeOffset now)
    {
        if (reservation.Status == ReservationStatus.Booked &&
            reservation.EndAt <= now)
        {
            return ReservationStatus.Completed;
        }

        return reservation.Status;
    }

    public static ReservationResponse ToResponse(
        Reservation reservation,
        DateTimeOffset now)
    {
        return new ReservationResponse
        {
            Id = reservation.Id,
            RoomId = reservation.RoomId,
            RoomName = reservation.Room.Name,
            OrganizerId = reservation.OrganizerId,
            OrganizerName =
                $"{reservation.Organizer.FirstName} " +
                $"{reservation.Organizer.LastName}",
            Title = reservation.Title,
            StartAt = reservation.StartAt,
            EndAt = reservation.EndAt,
            Attendees = reservation.Attendees,
            Status = GetEffectiveStatus(reservation, now).ToString(),
            ActualStartAt = reservation.ActualStartAt,
            ActualEndAt = reservation.ActualEndAt
        };
    }
}