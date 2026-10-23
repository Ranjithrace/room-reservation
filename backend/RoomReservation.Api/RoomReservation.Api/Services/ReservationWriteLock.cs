namespace RoomReservation.Api.Services;

public sealed class ReservationWriteLock : IDisposable
{
    public SemaphoreSlim Gate { get; } = new(1, 1);

    public void Dispose()
    {
        Gate.Dispose();
    }
}