using System.ComponentModel.DataAnnotations;

namespace RoomReservation.Api.Options;

public class BookingRulesOptions
{
    public const string SectionName = "BookingRules";

    [Range(1, 365)]
    public int MaxDurationDays { get; set; }

    [Range(1, 3650)]
    public int MaxAdvanceBookingDays { get; set; }
}