using Microsoft.EntityFrameworkCore;
using RoomReservation.Api.Models;

namespace RoomReservation.Api.Data;

public static class DbSeeder
{
    public static async Task SeedAsync(AppDbContext context)
    {
        if (!await context.Rooms.AnyAsync())
        {
            context.Rooms.AddRange(
                new Room
                {
                    Id = 1,
                    Name = "Kaunas",
                    Capacity = 6,
                    Floor = "1",
                    Location = "East wing",
                    Equipment = RoomEquipment.TvScreen
                        | RoomEquipment.Whiteboard,
                    IsActive = true
                },
                new Room
                {
                    Id = 2,
                    Name = "Vilnius",
                    Capacity = 12,
                    Floor = "2",
                    Location = "West wing",
                    Equipment = RoomEquipment.Projector
                        | RoomEquipment.VideoConferencing
                        | RoomEquipment.Whiteboard,
                    IsActive = true
                },
                new Room
                {
                    Id = 3,
                    Name = "Klaipeda",
                    Capacity = 4,
                    Floor = "1",
                    Location = "East wing",
                    Equipment = RoomEquipment.Whiteboard,
                    IsActive = true
                },
                new Room
                {
                    Id = 4,
                    Name = "Trakai",
                    Capacity = 8,
                    Floor = "2",
                    Location = "West wing",
                    Equipment = RoomEquipment.TvScreen
                        | RoomEquipment.VideoConferencing,
                    IsActive = false
                }
            );
        }

        if (!await context.Users.AnyAsync())
        {
            context.Users.AddRange(
                new User
                {
                    Id = 1,
                    FirstName = "Ranjith",
                    LastName = "Rajagopalan"
                },
                new User
                {
                    Id = 2,
                    FirstName = "Alex",
                    LastName = "Smith"
                },
                new User
                {
                    Id = 3,
                    FirstName = "Maria",
                    LastName = "Brown"
                }
            );
        }
        // Save rooms and users before adding their reservations.
        await context.SaveChangesAsync();

        if (!await context.Reservations.AnyAsync())
        {
            var now = DateTimeOffset.UtcNow;
            var yesterday = new DateTimeOffset(
                now.UtcDateTime.Date.AddDays(-1),
                TimeSpan.Zero);

            context.Reservations.AddRange(
                new Reservation
                {
                    Id = 1,
                    RoomId = 1,
                    OrganizerId = 1,
                    Title = "Sample: team planning",
                    StartAt = yesterday.AddHours(9),
                    EndAt = yesterday.AddHours(10),
                    Attendees = 4,
                    Status = ReservationStatus.Completed,
                    ActualStartAt = yesterday.AddHours(9),
                    ActualEndAt = yesterday.AddHours(9).AddMinutes(45)
                },
                new Reservation
                {
                    Id = 2,
                    RoomId = 1,
                    OrganizerId = 2,
                    Title = "Sample: meeting without check-in",
                    StartAt = yesterday.AddHours(11),
                    EndAt = yesterday.AddHours(12),
                    Attendees = 3,
                    Status = ReservationStatus.Completed
                },
                new Reservation
                {
                    Id = 3,
                    RoomId = 2,
                    OrganizerId = 3,
                    Title = "Sample: project review",
                    StartAt = yesterday.AddHours(13),
                    EndAt = yesterday.AddHours(14),
                    Attendees = 8,
                    Status = ReservationStatus.Completed,
                    ActualStartAt = yesterday.AddHours(13),
                    ActualEndAt = yesterday.AddHours(14)
                },
                new Reservation
                {
                    Id = 4,
                    RoomId = 3,
                    OrganizerId = 2,
                    Title = "Sample: cancelled discussion",
                    StartAt = yesterday.AddHours(15),
                    EndAt = yesterday.AddHours(16),
                    Attendees = 2,
                    Status = ReservationStatus.Cancelled
                },
                new Reservation
                {
                    Id = 5,
                    RoomId = 1,
                    OrganizerId = 1,
                    Title = "Sample: upcoming planning",
                    StartAt = now.AddDays(1),
                    EndAt = now.AddDays(1).AddHours(1),
                    Attendees = 4,
                    Status = ReservationStatus.Booked
                }
            );
        }

        await context.SaveChangesAsync();
    }
}