namespace RoomReservation.Api.Models;

public class Reservation
{
    public int Id { get; set; }

    public int RoomId { get; set; }

    public Room Room { get; set; } = null!;

    public int OrganizerId { get; set; }

    public User Organizer { get; set; } = null!;

    public string Title { get; set; } = string.Empty;

    public DateTimeOffset StartAt { get; set; }

    public DateTimeOffset EndAt { get; set; }

    public int Attendees { get; set; }

    public ReservationStatus Status { get; set; }
        = ReservationStatus.Booked;

    public DateTimeOffset? ActualStartAt { get; set; }

    public DateTimeOffset? ActualEndAt { get; set; }
}