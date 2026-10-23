namespace RoomReservation.Api.Services;

public class BookingException : Exception
{
    public string Code { get; }

    public int StatusCode { get; }

    public BookingException(
        string code,
        string message,
        int statusCode = 400) : base(message)
    {
        Code = code;
        StatusCode = statusCode;
    }
}