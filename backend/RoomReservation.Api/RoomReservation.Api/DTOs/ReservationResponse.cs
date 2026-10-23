namespace RoomReservation.Api.DTOs;

public class ReservationResponse
{
    public int Id { get; set; }

    public int RoomId { get; set; }

    public string RoomName { get; set; } = string.Empty;

    public int OrganizerId { get; set; }

    public string OrganizerName { get; set; } = string.Empty;

    public string Title { get; set; } = string.Empty;

    public DateTimeOffset StartAt { get; set; }

    public DateTimeOffset EndAt { get; set; }

    public int Attendees { get; set; }

    public string Status { get; set; } = string.Empty;

    public DateTimeOffset? ActualStartAt { get; set; }

    public DateTimeOffset? ActualEndAt { get; set; }
}