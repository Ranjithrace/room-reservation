using Microsoft.EntityFrameworkCore;
using RoomReservation.Api.Models;
using RoomReservation.Api.Services;
using Xunit;

namespace RoomReservation.Tests;

public class ReservationServiceTests
{
    [Fact]
    public async Task Same_room_overlap_is_rejected()
    {
        using var fixture = new TestFixture();

        await fixture.Service.SaveAsync(
            fixture.ValidRequest(), null, CancellationToken.None);

        fixture.Context.Users.Add(new User
        {
            Id = 2,
            FirstName = "Other",
            LastName = "Organizer"
        });
        await fixture.Context.SaveChangesAsync();

        var second = fixture.ValidRequest();
        second.OrganizerId = 2;
        second.StartAt = second.StartAt!.Value.AddMinutes(30);
        second.EndAt = second.EndAt!.Value.AddMinutes(30);

        var error = await Assert.ThrowsAsync<BookingException>(
            () => fixture.Service.SaveAsync(
                second, null, CancellationToken.None));

        Assert.Equal("ROOM_TIME_CONFLICT", error.Code);
        Assert.Single(await fixture.Context.Reservations.ToListAsync());
    }

    [Fact]
    public async Task Same_organizer_overlap_in_another_room_is_rejected()
    {
        using var fixture = new TestFixture();

        fixture.Context.Rooms.Add(new Room
        {
            Id = 2,
            Name = "Second room",
            Capacity = 6,
            IsActive = true
        });
        await fixture.Context.SaveChangesAsync();

        await fixture.Service.SaveAsync(
            fixture.ValidRequest(), null, CancellationToken.None);

        var second = fixture.ValidRequest();
        second.RoomId = 2;

        var error = await Assert.ThrowsAsync<BookingException>(
            () => fixture.Service.SaveAsync(
                second, null, CancellationToken.None));

        Assert.Equal("ORGANIZER_TIME_CONFLICT", error.Code);
    }

    [Fact]
    public async Task Back_to_back_bookings_are_allowed()
    {
        using var fixture = new TestFixture();

        var first = await fixture.Service.SaveAsync(
            fixture.ValidRequest(), null, CancellationToken.None);

        var second = fixture.ValidRequest();
        second.StartAt = first.EndAt;
        second.EndAt = first.EndAt.AddHours(1);

        await fixture.Service.SaveAsync(
            second, null, CancellationToken.None);

        Assert.Equal(
            2, await fixture.Context.Reservations.CountAsync());
    }

    [Fact]
    public async Task Cancelled_booking_does_not_block_the_slot()
    {
        using var fixture = new TestFixture();

        var first = await fixture.Service.SaveAsync(
            fixture.ValidRequest(), null, CancellationToken.None);

        await fixture.Service.CancelAsync(
            first.Id, CancellationToken.None);

        var second = await fixture.Service.SaveAsync(
            fixture.ValidRequest(), null, CancellationToken.None);

        Assert.Equal("Booked", second.Status);
        Assert.NotEqual(first.Id, second.Id);
        Assert.Equal(
            ReservationStatus.Cancelled,
            (await fixture.Context.Reservations.FindAsync(first.Id))!.Status);
    }

    [Theory]
    [InlineData(6, true)]
    [InlineData(7, false)]
    [InlineData(0, false)]
    public async Task Attendee_count_respects_room_capacity(
        int attendees,
        bool allowed)
    {
        using var fixture = new TestFixture();

        var request = fixture.ValidRequest();
        request.Attendees = attendees;

        if (allowed)
        {
            var result = await fixture.Service.SaveAsync(
                request, null, CancellationToken.None);

            Assert.Equal(attendees, result.Attendees);
        }
        else
        {
            var error = await Assert.ThrowsAsync<BookingException>(
                () => fixture.Service.SaveAsync(
                    request, null, CancellationToken.None));

            Assert.Equal("INVALID_ATTENDEE_COUNT", error.Code);
        }
    }

    [Fact]
    public async Task Inactive_room_cannot_be_booked()
    {
        using var fixture = new TestFixture();

        var room = await fixture.Context.Rooms.FindAsync(1);
        room!.IsActive = false;
        await fixture.Context.SaveChangesAsync();

        var error = await Assert.ThrowsAsync<BookingException>(
            () => fixture.Service.SaveAsync(
                fixture.ValidRequest(), null, CancellationToken.None));

        Assert.Equal("ROOM_INACTIVE", error.Code);
    }

    [Fact]
    public async Task Editing_does_not_conflict_with_itself()
    {
        using var fixture = new TestFixture();

        var original = await fixture.Service.SaveAsync(
            fixture.ValidRequest(), null, CancellationToken.None);

        var update = fixture.ValidRequest();
        update.Title = "Updated title";

        var result = await fixture.Service.SaveAsync(
            update, original.Id, CancellationToken.None);

        Assert.Equal(original.Id, result.Id);
        Assert.Equal("Updated title", result.Title);
        Assert.Single(await fixture.Context.Reservations.ToListAsync());
    }

    [Fact]
    public async Task Editing_into_another_booking_is_rejected()
    {
        using var fixture = new TestFixture();

        var firstRequest = fixture.ValidRequest();

        await fixture.Service.SaveAsync(
            firstRequest, null, CancellationToken.None);

        var secondRequest = fixture.ValidRequest();
        secondRequest.StartAt = firstRequest.EndAt!.Value.AddHours(1);
        secondRequest.EndAt = secondRequest.StartAt.Value.AddHours(1);

        var second = await fixture.Service.SaveAsync(
            secondRequest, null, CancellationToken.None);

        var error = await Assert.ThrowsAsync<BookingException>(
            () => fixture.Service.SaveAsync(
                firstRequest, second.Id, CancellationToken.None));

        Assert.Equal("ROOM_TIME_CONFLICT", error.Code);

        var stored = await fixture.Context.Reservations.FindAsync(second.Id);
        Assert.Equal(second.StartAt, stored!.StartAt);
    }

    [Fact]
    public async Task Check_in_before_start_is_rejected()
    {
        using var fixture = new TestFixture();

        var reservation = await fixture.Service.SaveAsync(
            fixture.ValidRequest(), null, CancellationToken.None);

        var error = await Assert.ThrowsAsync<BookingException>(
            () => fixture.Service.CheckInAsync(
                reservation.Id, CancellationToken.None));

        Assert.Equal("MEETING_NOT_RUNNING", error.Code);
    }

    [Fact]
    public async Task Duplicate_check_in_is_rejected()
    {
        using var fixture = new TestFixture();

        var reservation = await fixture.Service.SaveAsync(
            fixture.ValidRequest(), null, CancellationToken.None);

        fixture.Clock.Now = reservation.StartAt.AddMinutes(1);

        await fixture.Service.CheckInAsync(
            reservation.Id, CancellationToken.None);

        var error = await Assert.ThrowsAsync<BookingException>(
            () => fixture.Service.CheckInAsync(
                reservation.Id, CancellationToken.None));

        Assert.Equal("ALREADY_CHECKED_IN", error.Code);
    }

    [Fact]
    public async Task Early_end_requires_check_in()
    {
        using var fixture = new TestFixture();

        var reservation = await fixture.Service.SaveAsync(
            fixture.ValidRequest(), null, CancellationToken.None);

        fixture.Clock.Now = reservation.StartAt.AddMinutes(1);

        var error = await Assert.ThrowsAsync<BookingException>(
            () => fixture.Service.EndEarlyAsync(
                reservation.Id, CancellationToken.None));

        Assert.Equal("CHECK_IN_REQUIRED", error.Code);
    }

    [Fact]
    public async Task Early_end_records_times_and_preserves_scheduled_end()
    {
        using var fixture = new TestFixture();

        var reservation = await fixture.Service.SaveAsync(
            fixture.ValidRequest(), null, CancellationToken.None);

        var checkedInAt = reservation.StartAt.AddMinutes(5);
        fixture.Clock.Now = checkedInAt;

        await fixture.Service.CheckInAsync(
            reservation.Id, CancellationToken.None);

        var endedAt = reservation.StartAt.AddMinutes(20);
        fixture.Clock.Now = endedAt;

        var result = await fixture.Service.EndEarlyAsync(
            reservation.Id, CancellationToken.None);

        Assert.Equal("Completed", result.Status);
        Assert.Equal<DateTimeOffset?>(checkedInAt, result.ActualStartAt);
        Assert.Equal<DateTimeOffset?>(endedAt, result.ActualEndAt);
        Assert.Equal(reservation.EndAt, result.EndAt);
    }
}