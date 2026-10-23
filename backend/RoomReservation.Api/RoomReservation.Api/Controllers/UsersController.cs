using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RoomReservation.Api.Data;
using RoomReservation.Api.DTOs;
using RoomReservation.Api.Models;

namespace RoomReservation.Api.Controllers;

[ApiController]
[Route("api/users")]
public class UsersController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly TimeProvider _timeProvider;

    public UsersController(
        AppDbContext context,
        TimeProvider timeProvider)
    {
        _context = context;
        _timeProvider = timeProvider;
    }

    [HttpGet]
    public async Task<ActionResult<List<UserResponse>>> GetUsers(
        CancellationToken cancellationToken)
    {
        var now = _timeProvider.GetUtcNow();

        var users = await _context.Users
            .AsNoTracking()
            .OrderBy(user => user.FirstName)
            .ThenBy(user => user.LastName)
            .Select(user => new UserResponse
            {
                Id = user.Id,
                FirstName = user.FirstName,
                LastName = user.LastName,
                ActiveReservationCount = _context.Reservations.Count(
                    reservation =>
                        reservation.OrganizerId == user.Id &&
                        reservation.Status == ReservationStatus.Booked &&
                        reservation.EndAt > now)
            })
            .ToListAsync(cancellationToken);

        return Ok(users);
    }
}