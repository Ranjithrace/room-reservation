using System.ComponentModel.DataAnnotations;

namespace RoomReservation.Api.DTOs;

public class SaveReservationRequest
{
    [Range(1, int.MaxValue,
        ErrorMessage = "Select a valid room.")]
    public int RoomId { get; set; }

    [Range(1, int.MaxValue,
        ErrorMessage = "Select a valid organizer.")]
    public int OrganizerId { get; set; }

    [Required(ErrorMessage = "Meeting title is required.")]
    [StringLength(200,
        ErrorMessage = "Meeting title cannot exceed 200 characters.")]
    public string Title { get; set; } = string.Empty;

    [Required(ErrorMessage = "Start date and time are required.")]
    public DateTimeOffset? StartAt { get; set; }

    [Required(ErrorMessage = "End date and time are required.")]
    public DateTimeOffset? EndAt { get; set; }

    [Range(1, int.MaxValue,
        ErrorMessage = "Number of attendees must be at least 1.")]
    public int Attendees { get; set; }
}