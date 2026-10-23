using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RoomReservation.Api.Data;
using RoomReservation.Api.DTOs;
using RoomReservation.Api.Models;
using RoomReservation.Api.Services;

namespace RoomReservation.Api.Controllers;

[ApiController]
[Route("api/reservations")]
public class ReservationsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ReservationService _service;
    private readonly TimeProvider _clock;

    public ReservationsController(
        AppDbContext context,
        ReservationService service,
        TimeProvider clock)
    {
        _context = context;
        _service = service;
        _clock = clock;
    }

    [HttpGet]
    public async Task<ActionResult<List<ReservationResponse>>> GetAll(
        [FromQuery] int? roomId,
        [FromQuery] int? organizerId,
        [FromQuery] ReservationStatus? status,
        [FromQuery] DateTimeOffset? from,
        [FromQuery] DateTimeOffset? to,
        CancellationToken cancellationToken)
    {
        if (from.HasValue && to.HasValue &&
            from.Value >= to.Value)
        {
            return BadRequest(new
            {
                code = "INVALID_DATE_RANGE",
                message = "The date range end must be after its start."
            });
        }

        if (status.HasValue &&
            !Enum.IsDefined(status.Value))
        {
            return BadRequest(new
            {
                code = "INVALID_STATUS",
                message = "Select Booked, Completed, or Cancelled."
            });
        }

        var query = _context.Reservations
            .AsNoTracking()
            .Include(item => item.Room)
            .Include(item => item.Organizer)
            .AsQueryable();

        if (roomId.HasValue)
        {
            query = query.Where(item =>
                item.RoomId == roomId.Value);
        }

        if (organizerId.HasValue)
        {
            query = query.Where(item =>
                item.OrganizerId == organizerId.Value);
        }

        // Return meetings that overlap the requested date range.
        if (from.HasValue)
        {
            var rangeStart = from.Value.ToUniversalTime();

            query = query.Where(item =>
                item.EndAt > rangeStart);
        }

        if (to.HasValue)
        {
            var rangeEnd = to.Value.ToUniversalTime();

            query = query.Where(item =>
                item.StartAt < rangeEnd);
        }

        var reservations = await query
            .OrderBy(item => item.StartAt)
            .ThenBy(item => item.Id)
            .ToListAsync(cancellationToken);

        var now = _clock.GetUtcNow();

        // Use effective status so naturally ended meetings
        // are included when filtering for Completed.
        if (status.HasValue)
        {
            reservations = reservations
                .Where(item =>
                    ReservationService.GetEffectiveStatus(item, now)
                        == status.Value)
                .ToList();
        }

        return Ok(reservations
            .Select(item =>
                ReservationService.ToResponse(item, now))
            .ToList());
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ReservationResponse>> GetById(
        int id,
        CancellationToken cancellationToken)
    {
        var reservation = await _context.Reservations
            .AsNoTracking()
            .Include(item => item.Room)
            .Include(item => item.Organizer)
            .SingleOrDefaultAsync(
                item => item.Id == id,
                cancellationToken);

        if (reservation is null)
        {
            return NotFound(new
            {
                code = "RESERVATION_NOT_FOUND",
                message = "The reservation does not exist."
            });
        }

        return Ok(ReservationService.ToResponse(
            reservation, _clock.GetUtcNow()));
    }

    [HttpPost]
    public async Task<ActionResult<ReservationResponse>> Create(
        [FromBody] SaveReservationRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _service.SaveAsync(
                request, null, cancellationToken);

            return CreatedAtAction(
                nameof(GetById),
                new { id = result.Id },
                result);
        }
        catch (BookingException exception)
        {
            return BookingError(exception);
        }
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<ReservationResponse>> Update(
        int id,
        [FromBody] SaveReservationRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await _service.SaveAsync(
                request, id, cancellationToken));
        }
        catch (BookingException exception)
        {
            return BookingError(exception);
        }
    }

    [HttpPost("{id:int}/cancel")]
    public async Task<ActionResult<ReservationResponse>> Cancel(
        int id,
        CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await _service.CancelAsync(
                id, cancellationToken));
        }
        catch (BookingException exception)
        {
            return BookingError(exception);
        }
    }

    [HttpPost("{id:int}/end-early")]
    public async Task<ActionResult<ReservationResponse>> EndEarly(
        int id,
        CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await _service.EndEarlyAsync(
                id, cancellationToken));
        }
        catch (BookingException exception)
        {
            return BookingError(exception);
        }
    }

    [HttpPost("{id:int}/check-in")]
    public async Task<ActionResult<ReservationResponse>> CheckIn(
    int id,
    CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await _service.CheckInAsync(
                id, cancellationToken));
        }
        catch (BookingException exception)
        {
            return BookingError(exception);
        }
    }

    private ObjectResult BookingError(BookingException exception)
    {
        return StatusCode(exception.StatusCode, new
        {
            code = exception.Code,
            message = exception.Message
        });
    }
}