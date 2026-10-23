using Microsoft.EntityFrameworkCore;
using RoomReservation.Api.Data;
using RoomReservation.Api.DTOs;
using RoomReservation.Api.Models;

namespace RoomReservation.Api.Services;

public class RoomUsageService
{
    private readonly AppDbContext _context;
    private readonly TimeProvider _clock;

    public RoomUsageService(
        AppDbContext context,
        TimeProvider clock)
    {
        _context = context;
        _clock = clock;
    }

    public async Task<List<RoomUsageResponse>> GetAsync(
        DateTimeOffset from,
        DateTimeOffset to,
        CancellationToken cancellationToken)
    {
        if (from >= to)
        {
            throw new BookingException(
                "INVALID_DATE_RANGE",
                "The report end must be after its start.");
        }

        var now = _clock.GetUtcNow();

        var rooms = await _context.Rooms
            .AsNoTracking()
            .OrderBy(room => room.Name)
            .ToListAsync(cancellationToken);

        var reservations = await _context.Reservations
            .AsNoTracking()
            .Where(item =>
                item.Status != ReservationStatus.Cancelled &&
                item.StartAt < to &&
                item.EndAt > from)
            .ToListAsync(cancellationToken);

        // Include only meetings that have actually finished.
        var completed = reservations
            .Where(item =>
                ReservationService.GetEffectiveStatus(item, now)
                    == ReservationStatus.Completed)
            .ToLookup(item => item.RoomId);

        return rooms.Select(room =>
        {
            var meetings = completed[room.Id].ToList();

            var scheduledMinutes = meetings.Sum(item =>
                OverlapMinutes(
                    item.StartAt,
                    item.EndAt,
                    from,
                    to));

            var recordedMinutes = meetings.Sum(item =>
            {
                if (!item.ActualStartAt.HasValue)
                {
                    return 0.0;
                }

                // Without an early end, assume use continued
                // until the scheduled end.
                var usageEnd = item.ActualEndAt ?? item.EndAt;

                // Restrict recorded usage to the booking interval.
                var usageStart = item.ActualStartAt.Value > item.StartAt
                    ? item.ActualStartAt.Value
                    : item.StartAt;

                if (usageEnd > item.EndAt)
                {
                    usageEnd = item.EndAt;
                }

                return OverlapMinutes(
                    usageStart,
                    usageEnd,
                    from,
                    to);
            });

            var checkedIn = meetings.Count(item =>
                item.ActualStartAt.HasValue);

            return new RoomUsageResponse
            {
                RoomId = room.Id,
                RoomName = room.Name,
                CompletedReservations = meetings.Count,
                CheckedInReservations = checkedIn,
                ReservationsWithoutCheckIn =
                    meetings.Count - checkedIn,
                ScheduledMinutes = Math.Round(scheduledMinutes, 2),
                RecordedUsageMinutes = Math.Round(recordedMinutes, 2),
                UsagePercent = scheduledMinutes > 0
                    ? Math.Round(
                        recordedMinutes / scheduledMinutes * 100, 2)
                    : null
            };
        }).ToList();
    }

    private static double OverlapMinutes(
        DateTimeOffset start,
        DateTimeOffset end,
        DateTimeOffset from,
        DateTimeOffset to)
    {
        var clippedStart = start > from ? start : from;
        var clippedEnd = end < to ? end : to;

        return clippedEnd > clippedStart
            ? (clippedEnd - clippedStart).TotalMinutes
            : 0;
    }
}