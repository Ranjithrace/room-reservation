namespace RoomReservation.Api.DTOs;

public class RoomResponse
{
    public int Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public int Capacity { get; set; }

    public string Floor { get; set; } = string.Empty;

    public string Location { get; set; } = string.Empty;

    public string[] Equipment { get; set; } = [];

    public bool IsActive { get; set; }
}