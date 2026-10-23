namespace RoomReservation.Api.DTOs;

public class UserResponse
{
    public int Id { get; set; }

    public string FirstName { get; set; } = string.Empty;

    public string LastName { get; set; } = string.Empty;

    public int ActiveReservationCount { get; set; }
}