# Room Reservation

A meeting room reservation application built for the Present Connection internship technical assignment.

Users can browse rooms, manage reservations, and compare scheduled meeting time with recorded room usage.

## Technologies

- ASP.NET Core on .NET 10
- Entity Framework Core InMemory
- React with TypeScript
- Vite
- Bootstrap
- xUnit

## Prerequisites

- .NET 10 SDK
- Node.js with npm; tested with Node.js 24.14.0
- Git, if cloning the repository
- For Visual Studio: a version supporting .NET 10 and the ASP.NET and web development workload

No separate database installation is required.

## Get the source code

```powershell
git clone https://github.com/Ranjithrace/room-reservation.git
cd room-reservation
```

The commands below assume you start in this repository root unless stated otherwise.

## Run the backend

In the first terminal:

```powershell
dotnet run --project backend/RoomReservation.Api/RoomReservation.Api/RoomReservation.Api.csproj --launch-profile http -p:UseAppHost=false
```

The backend listens at:

http://localhost:5080

To check the API, open:

http://localhost:5080/api/rooms

This endpoint returns JSON. The application interface is served separately by the frontend.

Keep the backend terminal running.

### Alternative: build and run the DLL

From the repository root:

```powershell
cd backend/RoomReservation.Api/RoomReservation.Api
dotnet restore
dotnet build -p:UseAppHost=false
dotnet ./bin/Debug/net10.0/RoomReservation.Api.dll --urls "http://localhost:5080"
```

Run either backend startup method, not both simultaneously.

## Run the frontend

Open a second terminal in the repository root:

```powershell
cd frontend
npm.cmd ci
npm.cmd run dev
```

Open:

http://localhost:5173

On macOS or Linux, use `npm` instead of `npm.cmd`.

The Vite development server forwards `/api` requests to the backend at `http://localhost:5080`. Both servers must remain running.

The frontend uses port 5173 with strict port selection. If that port is occupied, stop the other process before starting it.

## Run using Visual Studio

1. Open `backend/RoomReservation.Api/RoomReservation.Api.slnx`.
2. Allow NuGet packages to restore.
3. Set `RoomReservation.Api` as the startup project.
4. Select the `http` launch profile.
5. Press F5 or click Run.

The launch profile configures the backend at `http://localhost:5080` and opens `/api/rooms` in the browser.

Start the React frontend separately using the frontend commands above, then open `http://localhost:5173`.

The solution includes both the API and test projects. To run the tests in Visual Studio, stop debugging, open **Test > Test Explorer**, and select **Run All Tests**.

The terminal startup methods are available if the IDE cannot launch the application executable.

## Run backend tests

Stop the backend before building or testing on Windows to avoid locked DLL files.

From the repository root:

```powershell
dotnet test backend/RoomReservation.Api/RoomReservation.Api.slnx -p:UseAppHost=false
```

The suite contains 25 tests covering:

- Maximum duration and booking horizon boundaries
- Configurable booking limits
- Future start validation
- Room and organizer conflicts
- Consecutive bookings
- Cancelled bookings releasing a slot
- Capacity and inactive rooms
- Editing and self-conflict handling
- Check-in and early completion
- Room usage calculations and reporting boundaries

These tests exercise backend service logic. They are not browser automation tests.

## Check the frontend

From the repository root:

```powershell
cd frontend
npm.cmd run build
npm.cmd run lint
```

The build command checks TypeScript and generates production assets in `frontend/dist`.

The lint command checks the frontend against the configured lint rules.

## Features

### Rooms

- Display each room's ID, name, capacity, floor, location, equipment, and active status.
- Filter by minimum capacity, floor, and equipment.
- Require all selected equipment when filtering.
- Display inactive rooms while preventing their reservation.

Active status means a room is enabled for booking. It does not indicate whether the room is free at a particular time. Time conflicts are checked when a reservation is submitted.

### Users

- Display user ID, first name, and last name.
- Display the active reservation count calculated by the backend.
- Count upcoming and ongoing booked meetings as active.

### Reservations

- Display room, organizer, title, start, end, attendees, and status.
- Create reservations.
- Edit or cancel reservations before their start.
- Check in during the scheduled meeting interval.
- End a checked-in meeting early.
- Display recorded check-in and early-end timestamps.
- Filter by room, organizer, status, and date range.
- Display readable backend validation errors.

Reservation statuses are `Booked`, `Completed`, and `Cancelled`.

An ongoing meeting remains `Booked` until it finishes. Check-in is recorded separately.

### Usage report

- Display completed reservation counts for each room.
- Display counts with and without check-in.
- Compare scheduled minutes with recorded usage minutes.
- Calculate recorded usage as a percentage of scheduled time.
- Filter by a reporting period, including the entire selected final day.

## Booking rules

When creating or editing a reservation, the backend validates the following:

| Rule | Behavior |
| --- | --- |
| Maximum duration | At most 7 days; exactly 7 days is allowed |
| Room conflicts | Overlapping bookings for the same room are rejected |
| Organizer conflicts | Overlapping bookings for the same organizer are rejected, including meetings in different rooms |
| Future start | Start must be strictly later than the backend's current time |
| Capacity | Attendees must be positive and must not exceed room capacity |
| Booking horizon | Start must be no more than 90 days ahead; exactly 90 days is allowed |
| Active rooms | Inactive rooms cannot be booked |

The backend also checks that:

- The room and organizer exist.
- The end is after the start.
- The title is supplied and does not exceed 200 characters.
- An edited reservation is still eligible for editing.

Cancelled reservations do not block new bookings.

Consecutive bookings are allowed when one ends exactly as another starts.

When checking conflicts during editing, the reservation being edited is excluded from the comparison.

API validation failures include an error code and a human-readable message, which the frontend displays.

### Configurable limits

Duration and advance-booking limits are configured in:

`backend/RoomReservation.Api/RoomReservation.Api/appsettings.json`

The following section belongs inside that file's root JSON object:

```json
"BookingRules": {
  "MaxDurationDays": 7,
  "MaxAdvanceBookingDays": 90
}
```

Restart the backend after changing these settings.

## Reservation lifecycle

- Creating a valid reservation sets its status to `Booked`.
- Editing and cancellation are allowed only before the scheduled start.
- Cancellation sets the status to `Cancelled` and preserves the record.
- Check-in records the actual start during the scheduled meeting interval.
- Ending early requires check-in, records the actual end, and sets the status to `Completed`.
- Ending early preserves the original scheduled end for reporting.
- A booked reservation is treated as completed once its scheduled end has passed.

Time-dependent completion is determined when the backend reads reservation data; it does not require a background job.

Click **Apply / Refresh** on the Reservations page to update time-dependent statuses and available actions.

## Usage calculation

Usage is based on manual check-in rather than automatic room occupancy detection.

For completed, non-cancelled reservations:

- Check-in records the actual start.
- Early completion records the actual end.
- If there is a check-in but no early end, recorded usage is counted through the scheduled end.
- A reservation without check-in contributes zero recorded usage minutes and is counted under reservations without check-in.
- Missing check-in does not prove that the room was physically empty.
- Upcoming, ongoing, and cancelled meetings are excluded.
- Scheduled and recorded intervals are clipped to the selected reporting period.

The backend calculates:

```text
Usage percentage = Recorded usage minutes / Scheduled minutes * 100
```

For example, two completed bookings totaling 120 scheduled minutes and 45 recorded minutes produce:

```text
45 / 120 * 100 = 37.5%
```

The report displays `N/A` when scheduled minutes are zero.

This percentage measures recorded use of completed bookings. It does not measure occupancy across all available office hours.

## Dates and filtering

- The backend uses UTC timestamps.
- The frontend accepts and displays dates in the browser's local time zone.
- Reservation date filters return meetings overlapping the selected interval.
- Usage report date selections represent local calendar days.
- The entire final selected reporting day is included.

## Sample data and persistence

The application seeds:

- Four rooms, including one inactive room
- Three users
- Completed reservations with and without check-in
- A cancelled reservation
- An upcoming reservation

Sample reservation dates are relative to backend startup.

Data is stored using EF Core InMemory. Stopping and restarting the backend clears user-created data and recreates the sample data.

Refreshing the browser does not clear data while the backend remains running.

## Architecture

### Backend

- `Controllers`: HTTP endpoints and response handling
- `Services`: reservation rules, actions, and usage calculations
- `Models`: room, user, and reservation entities
- `DTOs`: API request and response structures
- `Data`: database context and sample data seeding
- `Options`: configurable booking rules
- `Program.cs`: service registration and application startup

Dependency injection supplies the database context, services, configuration, and clock.

DTO mapping uses custom code.

A shared semaphore serializes reservation writes within one backend process so concurrent requests cannot both pass overlapping-booking checks.

### Frontend

- `App.tsx`: page navigation
- `pages`: Rooms, Users, Reservations, and Usage components
- `api.ts`: shared API request handling
- `types.ts`: TypeScript data definitions
- `index.css`: application styling
- `vite.config.ts`: development server and API proxy configuration

Booking validation, active reservation counts, and usage calculations are implemented in the backend. The frontend handles presentation, form state, and local date formatting.

## Scope and limitations

- No authentication or authorization is implemented, as permitted by the assignment.
- The organizer is selected in the reservation form.
- Attendees are stored as a count, not a list of users.
- EF Core InMemory provides temporary storage and is not a production database.
- Multiple backend instances would require shared database concurrency control.
- Usage relies on manual check-in and documented assumptions.
- Calendar/timeline view and PDF export are not implemented; both are optional task features.

## Troubleshooting

### The frontend opens but cannot load data

Confirm the backend is running at `http://localhost:5080`.

Open `http://localhost:5080/api/rooms` directly to check it.

### The build reports locked DLL files

Stop the running backend or Visual Studio debugging session, then rebuild or run the tests.

### Visual Studio cannot launch the executable

Use the documented terminal command with `-p:UseAppHost=false`, or build and run the DLL directly.

### A port is already in use

Stop the existing backend or frontend process before starting another instance.

### Reservations disappear after restarting

This is expected because the database is stored in memory.

## Verification

Tested environment:

- .NET SDK 10.0.302
- Node.js 24.14.0
- Windows PowerShell

A fresh GitHub clone successfully completed:

- Dependency restoration
- All 25 backend tests
- Frontend dependency installation
- TypeScript checking and production build
- Frontend lint with zero warnings and errors

After aligning the launch profile and adding the test project to the solution, all 25 tests passed again and the backend successfully served `/api/rooms` on port 5080.

Visual Studio startup instructions are provided from the configured launch profile. The Visual Studio Run button itself has not been independently verified.

## Author

Ranjith Rajagopalan