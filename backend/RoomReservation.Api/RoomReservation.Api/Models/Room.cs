namespace RoomReservation.Api.Models;

public class Room
{
    public int Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public int Capacity { get; set; }

    public string Floor { get; set; } = string.Empty;

    public string Location { get; set; } = string.Empty;

    public RoomEquipment Equipment { get; set; }

    public bool IsActive { get; set; } = true;
}