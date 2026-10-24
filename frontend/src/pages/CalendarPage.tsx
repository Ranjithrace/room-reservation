import { useEffect, useState } from 'react'
import { getJson } from '../api'
import type { Reservation, Room } from '../types'

function dateValue(date: Date) {
    const pad = (value: number) => String(value).padStart(2, '0')

    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function dayBounds(value: string) {
    const start = new Date(`${value}T00:00:00`)
    const end = new Date(start)
    end.setDate(end.getDate() + 1)

    return { start, end }
}

function displayTime(value: string) {
    return new Date(value).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    })
}

export default function CalendarPage() {
    const [date, setDate] = useState(() => dateValue(new Date()))
    const [roomId, setRoomId] = useState('')
    const [rooms, setRooms] = useState<Room[]>([])
    const [reservations, setReservations] = useState<Reservation[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [reload, setReload] = useState(0)

    function refresh() {
        setLoading(true)
        setError('')
        setReload(current => current + 1)
    }

    function changeDate(value: string) {
        if (!value) return

        setDate(value)
        refresh()
    }

    function moveDay(amount: number) {
        const next = new Date(`${date}T12:00:00`)
        next.setDate(next.getDate() + amount)
        changeDate(dateValue(next))
    }

    useEffect(() => {
        const controller = new AbortController()
        const { start, end } = dayBounds(date)
        const parameters = new URLSearchParams({
            from: start.toISOString(),
            to: end.toISOString(),
        })

        Promise.all([
            getJson<Room[]>('/api/rooms', controller.signal),
            getJson<Reservation[]>(
                `/api/reservations?${parameters}`,
                controller.signal,
            ),
        ])
            .then(([roomData, reservationData]) => {
                if (controller.signal.aborted) return

                setRooms(roomData)
                setRoomId(current =>
                    roomData.some(room => String(room.id) === current)
                        ? current
                        : String(roomData[0]?.id ?? ''),
                )
                setReservations(reservationData)
            })
            .catch((reason: unknown) => {
                if (!controller.signal.aborted) {
                    setError(
                        reason instanceof Error
                            ? reason.message
                            : 'Could not load the calendar.',
                    )
                }
            })
            .finally(() => {
                if (!controller.signal.aborted) {
                    setLoading(false)
                }
            })

        return () => controller.abort()
    }, [date, reload])

    const selectedRoom = rooms.find(room => String(room.id) === roomId)
    const bookings = reservations
        .filter(reservation =>
            String(reservation.roomId) === roomId &&
            reservation.status !== 'Cancelled')
        .sort((first, second) =>
            new Date(first.startAt).getTime() -
            new Date(second.startAt).getTime())

    const { start, end } = dayBounds(date)
    const dayStart = start.getTime()
    const dayEnd = end.getTime()
    const dayLength = dayEnd - dayStart

    const ticks: { label: string; position: number }[] = []

    for (
        let timestamp = dayStart;
        timestamp < dayEnd;
        timestamp += 60 * 60 * 1000
    ) {
        ticks.push({
            label: new Date(timestamp).toLocaleTimeString(undefined, {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
            }),
            position: ((timestamp - dayStart) / dayLength) * 100,
        })
    }

    const headingDate = start.toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    })

    return (
        <section aria-labelledby="calendar-heading">
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
                <h2 id="calendar-heading" className="h3 mb-0">
                    Room calendar
                </h2>
                <button
                    type="button"
                    className="btn btn-outline-primary"
                    disabled={loading}
                    onClick={refresh}
                >
                    Refresh
                </button>
            </div>

            <p className="text-secondary">
                View a room's scheduled bookings across one day.
                Times use your device's local time zone.
            </p>

            <div className="card border-0 shadow-sm p-4 mb-4">
                <div className="row g-3 align-items-end">
                    <div className="col-md-5">
                        <label htmlFor="calendar-room" className="form-label">
                            Room
                        </label>
                        <select
                            id="calendar-room"
                            className="form-select"
                            value={roomId}
                            disabled={loading || rooms.length === 0}
                            onChange={event => setRoomId(event.target.value)}
                        >
                            {rooms.map(room => (
                                <option key={room.id} value={room.id}>
                                    {room.name}
                                    {room.isActive ? '' : ' (inactive)'}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="col-md-4">
                        <label htmlFor="calendar-date" className="form-label">
                            Date
                        </label>
                        <input
                            id="calendar-date"
                            className="form-control"
                            type="date"
                            required
                            value={date}
                            onChange={event => changeDate(event.target.value)}
                        />
                    </div>

                    <div className="col-md-3">
                        <button
                            type="button"
                            className="btn btn-outline-primary"
                            onClick={() => changeDate(dateValue(new Date()))}
                        >
                            Today
                        </button>
                    </div>
                </div>
            </div>

            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
                <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => moveDay(-1)}
                >
                    Previous day
                </button>
                <h3 className="h5 mb-0">{headingDate}</h3>
                <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => moveDay(1)}
                >
                    Next day
                </button>
            </div>

            {loading && <p role="status">Loading calendar...</p>}

            {error && (
                <div className="alert alert-danger" role="alert">
                    {error}
                    <button
                        type="button"
                        className="btn btn-sm btn-outline-danger ms-3"
                        onClick={refresh}
                    >
                        Retry
                    </button>
                </div>
            )}

            {!loading && !error && rooms.length === 0 && (
                <div className="alert alert-info">No rooms found.</div>
            )}

            {!loading && !error && selectedRoom && (
                <>
                    <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
                        <h3 className="h5 mb-0">{selectedRoom.name}</h3>
                        <span className="badge text-bg-light">
                            Capacity: {selectedRoom.capacity}
                        </span>
                        {!selectedRoom.isActive && (
                            <span className="badge text-bg-secondary">
                                Inactive room
                            </span>
                        )}
                    </div>

                    <p className="small text-secondary">
                        Cancelled bookings are excluded. Bars show scheduled
                        times, including bookings that continue across midnight.
                        Scroll horizontally on smaller screens.
                    </p>

                    {bookings.length === 0 ? (
                        <div className="alert alert-info">
                            No non-cancelled bookings for this room on this day.
                        </div>
                    ) : (
                        <div className="card border-0 shadow-sm p-3">
                            <div
                                className="room-calendar-scroll"
                                role="region"
                                aria-label="Daily booking timeline"
                                tabIndex={0}
                            >
                                <div className="room-calendar-grid">
                                    <div className="room-calendar-axis" aria-hidden="true">
                                        {ticks.map(tick => (
                                            <span
                                                key={tick.position}
                                                style={{ left: `${tick.position}%` }}
                                            >
                                                {tick.label}
                                            </span>
                                        ))}
                                    </div>

                                    {bookings.map(booking => {
                                        const visibleStart = Math.max(
                                            new Date(booking.startAt).getTime(),
                                            dayStart,
                                        )
                                        const visibleEnd = Math.min(
                                            new Date(booking.endAt).getTime(),
                                            dayEnd,
                                        )
                                        const left =
                                            ((visibleStart - dayStart) / dayLength) * 100
                                        const width =
                                            ((visibleEnd - visibleStart) / dayLength) * 100

                                        return (
                                            <div className="room-calendar-entry" key={booking.id}>
                                                <div className="room-calendar-details">
                                                    <strong>{booking.title}</strong>
                                                    <span className="badge text-bg-light">
                                                        {booking.status}
                                                    </span>
                                                    <div className="small text-secondary">
                                                        {displayTime(booking.startAt)}
                                                        {' to '}
                                                        {displayTime(booking.endAt)}
                                                        {' | '}
                                                        {booking.organizerName}
                                                        {' | '}
                                                        {booking.attendees} attendees
                                                    </div>
                                                </div>

                                                <div className="room-calendar-track" aria-hidden="true">
                                                    <div
                                                        className={`room-calendar-bar ${
                                                            booking.status === 'Completed'
                                                                ? 'is-completed'
                                                                : ''
                                                        }`}
                                                        style={{
                                                            left: `${left}%`,
                                                            width: `${width}%`,
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </section>
    )
}