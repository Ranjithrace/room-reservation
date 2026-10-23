using RoomReservation.Api.Models;
using RoomReservation.Api.Services;
using Xunit;

namespace RoomReservation.Tests;

public class RoomUsageServiceTests
{
    [Fact]
    public async Task Report_calculates_recorded_usage_percentage()
    {
        using var fixture = new TestFixture();

        var start = fixture.Clock.Now.AddDays(-1);

        fixture.Context.Reservations.AddRange(
            Meeting(start, checkedIn: true, usageMinutes: 45),
            Meeting(start.AddHours(2), checkedIn: false)
        );
        await fixture.Context.SaveChangesAsync();

        var service = new RoomUsageService(
            fixture.Context, fixture.Clock);

        var report = await service.GetAsync(
            start,
            start.AddDays(1),
            CancellationToken.None);

        var room = Assert.Single(report);

        Assert.Equal(2, room.CompletedReservations);
        Assert.Equal(1, room.CheckedInReservations);
        Assert.Equal(1, room.ReservationsWithoutCheckIn);
        Assert.Equal(120.0, room.ScheduledMinutes);
        Assert.Equal(45.0, room.RecordedUsageMinutes);
        Assert.Equal<double?>(37.5, room.UsagePercent);
    }

    [Fact]
    public async Task Report_clips_durations_to_selected_range()
    {
        using var fixture = new TestFixture();

        var start = fixture.Clock.Now.AddDays(-1);

        fixture.Context.Reservations.Add(
            Meeting(start, checkedIn: true, usageMinutes: 45));
        await fixture.Context.SaveChangesAsync();

        var service = new RoomUsageService(
            fixture.Context, fixture.Clock);

        var report = await service.GetAsync(
            start.AddMinutes(30),
            start.AddMinutes(60),
            CancellationToken.None);

        var room = Assert.Single(report);

        Assert.Equal(30.0, room.ScheduledMinutes);
        Assert.Equal(15.0, room.RecordedUsageMinutes);
        Assert.Equal<double?>(50.0, room.UsagePercent);
    }

    [Fact]
    public async Task Report_excludes_cancelled_and_unfinished_meetings()
    {
        using var fixture = new TestFixture();

        var now = fixture.Clock.Now;

        var cancelled = Meeting(
            now.AddDays(-1), checkedIn: false);
        cancelled.Status = ReservationStatus.Cancelled;

        var running = Meeting(
            now.AddMinutes(-30), checkedIn: true);
        running.Status = ReservationStatus.Booked;
        running.ActualEndAt = null;

        var upcoming = Meeting(
            now.AddDays(1), checkedIn: false);
        upcoming.Status = ReservationStatus.Booked;

        fixture.Context.Reservations.AddRange(
            cancelled, running, upcoming);
        await fixture.Context.SaveChangesAsync();

        var service = new RoomUsageService(
            fixture.Context, fixture.Clock);

        var report = await service.GetAsync(
            now.AddDays(-2),
            now.AddDays(2),
            CancellationToken.None);

        var room = Assert.Single(report);

        Assert.Equal(0, room.CompletedReservations);
        Assert.Equal(0.0, room.ScheduledMinutes);
        Assert.Equal(0.0, room.RecordedUsageMinutes);
        Assert.Null(room.UsagePercent);
    }

    [Fact]
    public async Task Naturally_finished_checked_in_meeting_uses_scheduled_end()
    {
        using var fixture = new TestFixture();

        var start = fixture.Clock.Now.AddDays(-1);
        var meeting = Meeting(start, checkedIn: true);

        meeting.Status = ReservationStatus.Booked;
        meeting.ActualStartAt = start.AddMinutes(10);
        meeting.ActualEndAt = null;

        fixture.Context.Reservations.Add(meeting);
        await fixture.Context.SaveChangesAsync();

        var service = new RoomUsageService(
            fixture.Context, fixture.Clock);

        var report = await service.GetAsync(
            start,
            start.AddHours(1),
            CancellationToken.None);

        var room = Assert.Single(report);

        Assert.Equal(1, room.CompletedReservations);
        Assert.Equal(60.0, room.ScheduledMinutes);
        Assert.Equal(50.0, room.RecordedUsageMinutes);
        Assert.Equal<double?>(83.33, room.UsagePercent);
    }

    [Fact]
    public async Task Invalid_report_date_range_is_rejected()
    {
        using var fixture = new TestFixture();

        var service = new RoomUsageService(
            fixture.Context, fixture.Clock);

        var error = await Assert.ThrowsAsync<BookingException>(
            () => service.GetAsync(
                fixture.Clock.Now,
                fixture.Clock.Now,
                CancellationToken.None));

        Assert.Equal("INVALID_DATE_RANGE", error.Code);
    }

    private static Reservation Meeting(
        DateTimeOffset start,
        bool checkedIn,
        int usageMinutes = 60)
    {
        return new Reservation
        {
            RoomId = 1,
            OrganizerId = 1,
            Title = "Report test meeting",
            StartAt = start,
            EndAt = start.AddHours(1),
            Attendees = 3,
            Status = ReservationStatus.Completed,
            ActualStartAt = checkedIn ? start : null,
            ActualEndAt = checkedIn
                ? start.AddMinutes(usageMinutes)
                : null
        };
    }
}