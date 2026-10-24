using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using RoomReservation.Api.Data;
using RoomReservation.Api.DTOs;
using RoomReservation.Api.Models;
using RoomReservation.Api.Options;
using RoomReservation.Api.Services;
using Xunit;

namespace RoomReservation.Tests;

public class BookingBoundaryTests
{
    [Theory]
    [InlineData(7, true)]
    [InlineData(8, false)]
    public async Task Duration_limit_is_enforced(
        int durationDays,
        bool allowed)
    {
        using var fixture = new TestFixture();

        var request = fixture.ValidRequest();
        request.EndAt = request.StartAt!.Value.AddDays(durationDays);

        if (allowed)
        {
            var result = await fixture.Service.SaveAsync(
                request, null, CancellationToken.None);

            Assert.Equal("Booked", result.Status);
            Assert.Single(await fixture.Context.Reservations.ToListAsync());
        }
        else
        {
            var error = await Assert.ThrowsAsync<BookingException>(
                () => fixture.Service.SaveAsync(
                    request, null, CancellationToken.None));

            Assert.Equal("MAX_DURATION_EXCEEDED", error.Code);
            Assert.Empty(await fixture.Context.Reservations.ToListAsync());
        }
    }

    [Theory]
    [InlineData(90, true)]
    [InlineData(91, false)]
    public async Task Booking_horizon_is_enforced(
        int advanceDays,
        bool allowed)
    {
        using var fixture = new TestFixture();

        var request = fixture.ValidRequest();
        request.StartAt = fixture.Clock.Now.AddDays(advanceDays);
        request.EndAt = request.StartAt.Value.AddHours(1);

        if (allowed)
        {
            var result = await fixture.Service.SaveAsync(
                request, null, CancellationToken.None);

            Assert.Equal("Booked", result.Status);
        }
        else
        {
            var error = await Assert.ThrowsAsync<BookingException>(
                () => fixture.Service.SaveAsync(
                    request, null, CancellationToken.None));

            Assert.Equal("BOOKING_HORIZON_EXCEEDED", error.Code);
        }
    }

    [Fact]
    public async Task Start_exactly_now_is_rejected()
    {
        using var fixture = new TestFixture();

        var request = fixture.ValidRequest();
        request.StartAt = fixture.Clock.Now;
        request.EndAt = fixture.Clock.Now.AddHours(1);

        var error = await Assert.ThrowsAsync<BookingException>(
            () => fixture.Service.SaveAsync(
                request, null, CancellationToken.None));

        Assert.Equal("START_NOT_FUTURE", error.Code);
    }

    [Fact]
    public async Task Configured_duration_overrides_default_limit()
    {
        using var fixture = new TestFixture(maxDurationDays: 2);

        var request = fixture.ValidRequest();
        request.EndAt = request.StartAt!.Value.AddDays(3);

        var error = await Assert.ThrowsAsync<BookingException>(
            () => fixture.Service.SaveAsync(
                request, null, CancellationToken.None));

        Assert.Equal("MAX_DURATION_EXCEEDED", error.Code);
    }
}

internal sealed class TestClock : TimeProvider
{
    public DateTimeOffset Now { get; set; } =
        new(2030, 1, 1, 9, 0, 0, TimeSpan.Zero);

    public override DateTimeOffset GetUtcNow() => Now;
}

internal sealed class TestFixture : IDisposable
{
    public AppDbContext Context { get; }
    public TestClock Clock { get; } = new();
    public ReservationService Service { get; }

    private readonly ReservationWriteLock _writeLock = new();

    public TestFixture(int maxDurationDays = 7)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        Context = new AppDbContext(options);

        Context.Rooms.Add(new Room
        {
            Id = 1,
            Name = "Test room",
            Capacity = 6,
            Floor = "1",
            Location = "Test location",
            IsActive = true
        });

        Context.Users.Add(new User
        {
            Id = 1,
            FirstName = "Test",
            LastName = "Organizer"
        });

        Context.SaveChanges();

        Service = new ReservationService(
            Context,
            Options.Create(new BookingRulesOptions
            {
                MaxDurationDays = maxDurationDays,
                MaxAdvanceBookingDays = 90
            }),
            Clock,
            _writeLock);
    }

    public SaveReservationRequest ValidRequest()
    {
        return new SaveReservationRequest
        {
            RoomId = 1,
            OrganizerId = 1,
            Title = "Test meeting",
            StartAt = Clock.Now.AddDays(1),
            EndAt = Clock.Now.AddDays(1).AddHours(1),
            Attendees = 4
        };
    }

    public void Dispose()
    {
        Context.Dispose();
        _writeLock.Dispose();
    }
}