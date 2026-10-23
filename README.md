\# Room Reservation



A meeting room reservation application built for the Present Connection internship task.



\## Technologies



\- ASP.NET Core on .NET 10

\- Entity Framework Core InMemory

\- React with TypeScript

\- Vite

\- Bootstrap

\- xUnit



\## Requirements



\- .NET 10 SDK

\- A Node.js version supported by the Vite version in frontend/package.json

\- npm



\## Run the backend



From the repository root:



```powershell

cd backend/RoomReservation.Api/RoomReservation.Api

dotnet restore

dotnet build -p:UseAppHost=false

dotnet ./bin/Debug/net10.0/RoomReservation.Api.dll --urls "http://localhost:5080"

```



Leave this terminal running.



The API runs at http://localhost:5080. For example, open

http://localhost:5080/api/rooms to view the room data.



\## Run the frontend



Open a second terminal from the repository root:



```powershell

cd frontend

npm.cmd ci

npm.cmd run dev

```



Open http://localhost:5173.



On macOS or Linux, use npm instead of npm.cmd.



The Vite development server proxies /api requests to the backend at

http://localhost:5080. Both servers must be running.



\## Run the tests



Stop the running backend with Ctrl+C before testing to avoid locked DLL files on Windows.



From the repository root:



```powershell

dotnet test ./backend/RoomReservation.Api/RoomReservation.Tests/RoomReservation.Tests.csproj -p:UseAppHost=false

```



The test suite contains 25 tests covering booking boundaries, room and

organizer conflicts, capacity, editing, cancellation, check-in, ending

meetings early, and usage calculations.



\## Build the frontend



From the repository root:



```powershell

cd frontend

npm.cmd run build

```



This checks TypeScript compilation and generates the frontend build.



\## Features



\### Rooms



\- View room ID, name, capacity, floor, location, equipment, and active status.

\- Filter by minimum capacity, floor, and equipment.

\- Equipment filtering requires all selected equipment.



\### Users



\- View users and their active reservation counts.

\- Active counts include upcoming and ongoing bookings.



\### Reservations



\- Create reservations.

\- Edit or cancel upcoming reservations.

\- Check in during a meeting's scheduled time.

\- End a checked-in meeting early.

\- Filter by room, organizer, status, and date range.

\- View scheduled and recorded usage times.



\### Usage report



\- View completed reservation counts for each room.

\- Compare scheduled minutes with recorded usage minutes.

\- Identify completed reservations without check-in.

\- Filter the report by date range.



\## Booking rules



The backend validates all reservation requests:



\- The start time must be in the future.

\- The end time must be after the start time.

\- Duration must not exceed 7 days; exactly 7 days is allowed.

\- The start must be no more than 90 days ahead; exactly 90 days is allowed.

\- The room must exist and be active.

\- The organizer must exist.

\- Attendee count must be positive and within room capacity.

\- A room cannot have overlapping bookings.

\- An organizer cannot have overlapping bookings.

\- Consecutive bookings are allowed when one ends exactly as another starts.

\- Cancelled reservations do not block new bookings.



Duration and advance-booking limits are configurable in the backend's

appsettings.json:



```json

"BookingRules": {

&#x20; "MaxDurationDays": 7,

&#x20; "MaxAdvanceBookingDays": 90

}

```



\## Usage calculation



Usage is based on manual check-in.



\- Check-in records the actual start time.

\- Ending a meeting early records the actual end time while preserving its scheduled end.

\- If a checked-in meeting reaches its scheduled end without being ended early,

&#x20; recorded usage is counted through the scheduled end.

\- A completed reservation without check-in contributes zero recorded usage minutes.

&#x20; It is also listed in the count of reservations without check-in.

\- Cancelled, upcoming, and ongoing reservations are excluded from the usage report.

\- Scheduled and recorded intervals are clipped to the selected reporting period.



Usage percentage is:



```text

Recorded usage minutes / Scheduled minutes × 100

```



The report shows N/A when scheduled minutes are zero. This percentage measures

recorded use of completed bookings, rather than occupancy across all available

office hours.



\## Sample data



The application seeds four rooms, three users, and sample reservations at startup.



Sample reservations include completed meetings with and without check-in,

a cancelled meeting, and an upcoming booking. Their dates are relative to

the backend startup date.



\## Design and assumptions



\- Controllers handle HTTP requests and responses.

\- Services contain booking rules and usage calculations.

\- DTOs define request and response data.

\- Dependency injection supplies services, configuration, and the clock.

\- Tests use a controlled clock for reproducible time-based checks.

\- Dates are exchanged as UTC timestamps and displayed in the browser's local time.

\- Reservation date filters return reservations overlapping the selected interval.

\- Reservations become effectively completed when their scheduled end is reached.

\- Refresh the reservation list to update time-dependent statuses and actions.

\- Editing and cancellation are limited to bookings that have not started.

\- Ending early requires check-in.

\- No authentication is implemented.

\- Data is stored in memory and resets when the backend restarts.

\- Reservation writes are serialized within one backend process to prevent

&#x20; concurrent conflict checks from accepting overlapping bookings.

&#x20; Multiple backend instances would require shared database concurrency control.



\## Author



Ranjith Rajagopalan
