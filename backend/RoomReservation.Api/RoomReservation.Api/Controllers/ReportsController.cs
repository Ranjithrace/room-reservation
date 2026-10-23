using Microsoft.AspNetCore.Mvc;
using RoomReservation.Api.DTOs;
using RoomReservation.Api.Services;

namespace RoomReservation.Api.Controllers;

[ApiController]
[Route("api/reports")]
public class ReportsController : ControllerBase
{
    private readonly RoomUsageService _service;

    public ReportsController(RoomUsageService service)
    {
        _service = service;
    }

    [HttpGet("room-usage")]
    public async Task<ActionResult<List<RoomUsageResponse>>> GetRoomUsage(
        [FromQuery] DateTimeOffset? from,
        [FromQuery] DateTimeOffset? to,
        CancellationToken cancellationToken)
    {
        if (!from.HasValue || !to.HasValue)
        {
            return BadRequest(new
            {
                code = "MISSING_DATE_RANGE",
                message = "Provide both report start and end dates."
            });
        }

        try
        {
            return Ok(await _service.GetAsync(
                from.Value.ToUniversalTime(),
                to.Value.ToUniversalTime(),
                cancellationToken));
        }
        catch (BookingException exception)
        {
            return StatusCode(exception.StatusCode, new
            {
                code = exception.Code,
                message = exception.Message
            });
        }
    }
}