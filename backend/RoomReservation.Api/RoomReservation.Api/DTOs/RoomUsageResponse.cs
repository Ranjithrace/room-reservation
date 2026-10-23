namespace RoomReservation.Api.DTOs;

public class RoomUsageResponse
{
    public int RoomId { get; set; }

    public string RoomName { get; set; } = string.Empty;

    public int CompletedReservations { get; set; }

    public int CheckedInReservations { get; set; }

    public int ReservationsWithoutCheckIn { get; set; }

    public double ScheduledMinutes { get; set; }

    public double RecordedUsageMinutes { get; set; }

    public double? UsagePercent { get; set; }
}