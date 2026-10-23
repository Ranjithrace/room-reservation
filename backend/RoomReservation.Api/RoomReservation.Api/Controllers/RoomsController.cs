using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RoomReservation.Api.Data;
using RoomReservation.Api.DTOs;
using RoomReservation.Api.Models;

namespace RoomReservation.Api.Controllers;

[ApiController]
[Route("api/rooms")]
public class RoomsController : ControllerBase
{
    private readonly AppDbContext _context;

    public RoomsController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<List<RoomResponse>>> GetRooms(
        [FromQuery] int? minCapacity,
        [FromQuery] string? floor,
        [FromQuery] RoomEquipment? equipment,
        CancellationToken cancellationToken)
    {
        if (minCapacity.HasValue && minCapacity.Value < 1)
        {
            return BadRequest(new
            {
                code = "INVALID_MIN_CAPACITY",
                message = "Minimum capacity must be at least 1."
            });
        }

        var supportedEquipment =
            RoomEquipment.Projector |
            RoomEquipment.TvScreen |
            RoomEquipment.VideoConferencing |
            RoomEquipment.Whiteboard;

        if (equipment.HasValue &&
            (equipment.Value & ~supportedEquipment) != RoomEquipment.None)
        {
            return BadRequest(new
            {
                code = "INVALID_EQUIPMENT",
                message = "The selected equipment is not supported."
            });
        }

        var query = _context.Rooms.AsNoTracking();

        if (minCapacity.HasValue)
        {
            query = query.Where(room =>
                room.Capacity >= minCapacity.Value);
        }

        if (!string.IsNullOrWhiteSpace(floor))
        {
            var selectedFloor = floor.Trim();

            query = query.Where(room =>
                room.Floor == selectedFloor);
        }

        if (equipment.HasValue &&
            equipment.Value != RoomEquipment.None)
        {
            var selectedEquipment = equipment.Value;

            query = query.Where(room =>
                (room.Equipment & selectedEquipment)
                    == selectedEquipment);
        }

        var rooms = await query
            .OrderBy(room => room.Name)
            .ToListAsync(cancellationToken);

        var response = rooms.Select(room => new RoomResponse
        {
            Id = room.Id,
            Name = room.Name,
            Capacity = room.Capacity,
            Floor = room.Floor,
            Location = room.Location,
            Equipment = Enum.GetValues<RoomEquipment>()
                .Where(item =>
                    item != RoomEquipment.None &&
                    room.Equipment.HasFlag(item))
                .Select(item => item.ToString())
                .ToArray(),
            IsActive = room.IsActive
        }).ToList();

        return Ok(response);
    }
}