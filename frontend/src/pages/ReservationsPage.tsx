import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { getJson, sendJson } from '../api'
import type {
    Reservation,
    Room,
    SaveReservationRequest,
    User,
} from '../types'

interface BookingForm {
    roomId: string
    organizerId: string
    title: string
    startAt: string
    endAt: string
    attendees: string
}

const emptyForm: BookingForm = {
    roomId: '',
    organizerId: '',
    title: '',
    startAt: '',
    endAt: '',
    attendees: '1',
}

const emptyFilters = {
    roomId: '',
    organizerId: '',
    status: '',
    from: '',
    to: '',
}

function localInputValue(value: string) {
    const date = new Date(value)
    const pad = (number: number) => String(number).padStart(2, '0')

    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
        date.getDate(),
    )}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function displayDate(value: string) {
    return new Date(value).toLocaleString()
}

function errorMessage(reason: unknown) {
    return reason instanceof Error
        ? reason.message
        : 'The request could not be completed.'
}

export default function ReservationsPage() {
    const [rooms, setRooms] = useState<Room[]>([])
    const [users, setUsers] = useState<User[]>([])
    const [reservations, setReservations] = useState<Reservation[]>([])

    const [form, setForm] = useState<BookingForm>({ ...emptyForm })
    const [editingId, setEditingId] = useState<number | null>(null)
    const [filters, setFilters] = useState({ ...emptyFilters })
    const [query, setQuery] = useState('')

    const [loading, setLoading] = useState(true)
    const [lookupLoading, setLookupLoading] = useState(true)
    const [lookupError, setLookupError] = useState('')
    const [listError, setListError] = useState('')
    const [actionError, setActionError] = useState('')
    const [success, setSuccess] = useState('')
    const [busy, setBusy] = useState(false)
    const [reload, setReload] = useState(0)
    const [lookupReload, setLookupReload] = useState(0)

    const [snapshotTime, setSnapshotTime] = useState(() => Date.now())

    function refreshReservations() {
        setLoading(true)
        setListError('')
        setReload(current => current + 1)
    }

    function refreshLookups() {
        setLookupLoading(true)
        setLookupError('')
        setLookupReload(current => current + 1)
    }


    useEffect(() => {
        const controller = new AbortController()


        Promise.all([
            getJson<Room[]>('/api/rooms', controller.signal),
            getJson<User[]>('/api/users', controller.signal),
        ])
            .then(([roomData, userData]) => {
                if (!controller.signal.aborted) {
                    setRooms(roomData)
                    setUsers(userData)
                }
            })
            .catch((reason: unknown) => {
                if (!controller.signal.aborted) {
                    setLookupError(errorMessage(reason))
                }
            })
            .finally(() => {
                if (!controller.signal.aborted) {
                    setLookupLoading(false)
                }
            })

        return () => controller.abort()
    }, [lookupReload])

    useEffect(() => {
        const controller = new AbortController()


        getJson<Reservation[]>(
            `/api/reservations${query}`,
            controller.signal,
        )
            .then(data => {
                if (!controller.signal.aborted) {
                    setSnapshotTime(Date.now())
                    setReservations(data)
                }
            })
            .catch((reason: unknown) => {
                if (!controller.signal.aborted) {
                    setListError(errorMessage(reason))
                }
            })
            .finally(() => {
                if (!controller.signal.aborted) {
                    setLoading(false)
                }
            })

        return () => controller.abort()
    }, [query, reload])

    function changeForm(field: keyof BookingForm, value: string) {
        setForm(current => ({ ...current, [field]: value }))
    }

    function resetForm() {
        setForm({ ...emptyForm })
        setEditingId(null)
        setActionError('')
    }

    async function saveReservation(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        if (busy) return

        setActionError('')
        setSuccess('')

        const start = new Date(form.startAt)
        const end = new Date(form.endAt)

        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
            setActionError('Enter a valid start and end date and time.')
            return
        }

        const body: SaveReservationRequest = {
            roomId: Number(form.roomId),
            organizerId: Number(form.organizerId),
            title: form.title,
            startAt: start.toISOString(),
            endAt: end.toISOString(),
            attendees: Number(form.attendees),
        }

        setBusy(true)

        try {
            await sendJson<Reservation>(
                editingId === null
                    ? '/api/reservations'
                    : `/api/reservations/${editingId}`,
                editingId === null ? 'POST' : 'PUT',
                body,
            )

            setSuccess(
                editingId === null
                    ? 'Reservation created.'
                    : 'Reservation updated.',
            )
            resetForm()
            refreshReservations()
        } catch (reason: unknown) {
            setActionError(errorMessage(reason))
        } finally {
            setBusy(false)
        }
    }

    function editReservation(reservation: Reservation) {
        setEditingId(reservation.id)
        setForm({
            roomId: String(reservation.roomId),
            organizerId: String(reservation.organizerId),
            title: reservation.title,
            startAt: localInputValue(reservation.startAt),
            endAt: localInputValue(reservation.endAt),
            attendees: String(reservation.attendees),
        })
        setActionError('')
        setSuccess('')
        document.getElementById('booking-title')?.focus()
    }

    async function performAction(
        reservation: Reservation,
        action: 'cancel' | 'check-in' | 'end-early',
    ) {
        if (busy) return

        const prompts = {
            cancel: `Cancel "${reservation.title}"?`,
            'check-in': `Check in to "${reservation.title}" now?`,
            'end-early': `End "${reservation.title}" now?`,
        }

        if (!window.confirm(prompts[action])) return

        setBusy(true)
        setActionError('')
        setSuccess('')

        try {
            await sendJson<Reservation>(
                `/api/reservations/${reservation.id}/${action}`,
                'POST',
            )

            if (editingId === reservation.id) resetForm()

            const messages = {
                cancel: 'Reservation cancelled.',
                'check-in': 'Check-in recorded. The meeting is now in use.',
                'end-early': 'Meeting ended early.',
            }

            setSuccess(messages[action])
            refreshReservations()
        } catch (reason: unknown) {
            setActionError(errorMessage(reason))
        } finally {
            setBusy(false)
        }
    }

    function applyFilters(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()

        const parameters = new URLSearchParams()

        if (filters.roomId) parameters.set('roomId', filters.roomId)
        if (filters.organizerId) {
            parameters.set('organizerId', filters.organizerId)
        }
        if (filters.status) parameters.set('status', filters.status)
        if (filters.from) {
            parameters.set('from', new Date(filters.from).toISOString())
        }
        if (filters.to) {
            parameters.set('to', new Date(filters.to).toISOString())
        }

        const value = parameters.toString()
        setQuery(value ? `?${value}` : '')
        refreshReservations()
    }

    return (
        <section aria-labelledby="reservations-heading">
            <h2 id="reservations-heading" className="h3">
                Reservations
            </h2>
            <p className="text-secondary">
                Enter and view times in your device’s local time zone.
            </p>

            {success && (
                <div className="alert alert-success" role="status">
                    {success}
                </div>
            )}

            {actionError && (
                <div className="alert alert-danger" role="alert">
                    {actionError}
                </div>
            )}

            {lookupError && (
                <div className="alert alert-danger" role="alert">
                    <p>{lookupError}</p>
                    <button
                        className="btn btn-outline-danger btn-sm"
                        onClick={() => refreshLookups()}
                    >
                        Retry loading rooms and users
                    </button>
                </div>
            )}

            <form
                className="card border-0 shadow-sm p-4 mb-4"
                onSubmit={saveReservation}
            >
                <h3 className="h5 mb-3">
                    {editingId === null
                        ? 'Create reservation'
                        : `Edit reservation #${editingId}`}
                </h3>

                {lookupLoading && <p role="status">Loading rooms and users…</p>}

                <fieldset disabled={busy || lookupLoading || !!lookupError}>
                    <div className="row g-3">
                        <div className="col-md-6">
                            <label htmlFor="booking-room" className="form-label">
                                Room
                            </label>
                            <select
                                id="booking-room"
                                className="form-select"
                                required
                                value={form.roomId}
                                onChange={event => changeForm('roomId', event.target.value)}
                            >
                                <option value="">Select a room</option>
                                {rooms.map(room => (
                                    <option
                                        key={room.id}
                                        value={room.id}
                                        disabled={!room.isActive}
                                    >
                                        {room.name} — capacity {room.capacity}
                                        {!room.isActive ? ' (Inactive)' : ''}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="col-md-6">
                            <label htmlFor="booking-organizer" className="form-label">
                                Organizer
                            </label>
                            <select
                                id="booking-organizer"
                                className="form-select"
                                required
                                value={form.organizerId}
                                onChange={event =>
                                    changeForm('organizerId', event.target.value)}
                            >
                                <option value="">Select an organizer</option>
                                {users.map(user => (
                                    <option key={user.id} value={user.id}>
                                        {user.firstName} {user.lastName}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="col-md-8">
                            <label htmlFor="booking-title" className="form-label">
                                Meeting title
                            </label>
                            <input
                                id="booking-title"
                                className="form-control"
                                required
                                maxLength={200}
                                value={form.title}
                                onChange={event => changeForm('title', event.target.value)}
                            />
                        </div>

                        <div className="col-md-4">
                            <label htmlFor="booking-attendees" className="form-label">
                                Attendees
                            </label>
                            <input
                                id="booking-attendees"
                                className="form-control"
                                type="number"
                                min="1"
                                step="1"
                                required
                                value={form.attendees}
                                onChange={event =>
                                    changeForm('attendees', event.target.value)}
                            />
                        </div>

                        <div className="col-md-6">
                            <label htmlFor="booking-start" className="form-label">
                                Start
                            </label>
                            <input
                                id="booking-start"
                                className="form-control"
                                type="datetime-local"
                                required
                                value={form.startAt}
                                onChange={event => changeForm('startAt', event.target.value)}
                            />
                        </div>

                        <div className="col-md-6">
                            <label htmlFor="booking-end" className="form-label">
                                End
                            </label>
                            <input
                                id="booking-end"
                                className="form-control"
                                type="datetime-local"
                                required
                                value={form.endAt}
                                onChange={event => changeForm('endAt', event.target.value)}
                            />
                        </div>
                    </div>

                    <div className="d-flex gap-2 mt-3">
                        <button className="btn btn-primary" type="submit">
                            {busy ? 'Saving…' : editingId === null
                                ? 'Create reservation'
                                : 'Save changes'}
                        </button>
                        <button
                            className="btn btn-outline-secondary"
                            type="button"
                            onClick={resetForm}
                        >
                            {editingId === null ? 'Clear form' : 'Cancel editing'}
                        </button>
                    </div>
                </fieldset>
            </form>

            <form
                className="card border-0 shadow-sm p-4 mb-4"
                onSubmit={applyFilters}
            >
                <h3 className="h5">Filter reservations</h3>
                <div className="row g-3">
                    <div className="col-md-4">
                        <label htmlFor="filter-room" className="form-label">Room</label>
                        <select
                            id="filter-room"
                            className="form-select"
                            value={filters.roomId}
                            onChange={event => setFilters(current => ({
                                ...current, roomId: event.target.value,
                            }))}
                        >
                            <option value="">All rooms</option>
                            {rooms.map(room => (
                                <option key={room.id} value={room.id}>{room.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="col-md-4">
                        <label htmlFor="filter-organizer" className="form-label">
                            Organizer
                        </label>
                        <select
                            id="filter-organizer"
                            className="form-select"
                            value={filters.organizerId}
                            onChange={event => setFilters(current => ({
                                ...current, organizerId: event.target.value,
                            }))}
                        >
                            <option value="">All organizers</option>
                            {users.map(user => (
                                <option key={user.id} value={user.id}>
                                    {user.firstName} {user.lastName}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="col-md-4">
                        <label htmlFor="filter-status" className="form-label">
                            Status
                        </label>
                        <select
                            id="filter-status"
                            className="form-select"
                            value={filters.status}
                            onChange={event => setFilters(current => ({
                                ...current, status: event.target.value,
                            }))}
                        >
                            <option value="">All statuses</option>
                            <option value="Booked">Booked</option>
                            <option value="Completed">Completed</option>
                            <option value="Cancelled">Cancelled</option>
                        </select>
                    </div>

                    <div className="col-md-6">
                        <label htmlFor="filter-from" className="form-label">
                            From
                        </label>
                        <input
                            id="filter-from"
                            type="datetime-local"
                            className="form-control"
                            value={filters.from}
                            onChange={event => setFilters(current => ({
                                ...current, from: event.target.value,
                            }))}
                        />
                    </div>

                    <div className="col-md-6">
                        <label htmlFor="filter-to" className="form-label">
                            To
                        </label>
                        <input
                            id="filter-to"
                            type="datetime-local"
                            className="form-control"
                            value={filters.to}
                            onChange={event => setFilters(current => ({
                                ...current, to: event.target.value,
                            }))}
                        />
                    </div>
                </div>

                <div className="d-flex gap-2 mt-3">
                    <button className="btn btn-primary" type="submit">
                        Apply / Refresh
                    </button>
                    <button
                        className="btn btn-outline-secondary"
                        type="button"
                        onClick={() => {
                            setFilters({ ...emptyFilters })
                            setQuery('')
                            refreshReservations()
                        }}
                    >
                        Reset
                    </button>
                </div>
            </form>

            {loading && <p role="status">Loading reservations…</p>}

            {listError && (
                <div className="alert alert-danger" role="alert">
                    {listError}
                    <button
                        className="btn btn-sm btn-outline-danger ms-3"
                        onClick={() => refreshReservations()}
                    >
                        Retry
                    </button>
                </div>
            )}

            {!loading && !listError && reservations.length === 0 && (
                <div className="alert alert-info">
                    No reservations match these filters.
                </div>
            )}

            {!loading && !listError && reservations.length > 0 && (
                <div className="card border-0 shadow-sm">
                    <div className="table-responsive">
                        <table className="table align-middle mb-0">
                            <caption className="px-3">
                                Reservations matching the selected filters
                            </caption>
                            <thead className="table-light">
                                <tr>
                                    <th scope="col">Meeting</th>
                                    <th scope="col">Room / Organizer</th>
                                    <th scope="col">Schedule</th>
                                    <th scope="col">Attendees</th>
                                    <th scope="col">Status</th>
                                    <th scope="col">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reservations.map(reservation => {
                                    const now = snapshotTime
                                    const start = new Date(reservation.startAt).getTime()
                                    const end = new Date(reservation.endAt).getTime()
                                    const upcoming =
                                        reservation.status === 'Booked' && start > now
                                    const running =
                                        reservation.status === 'Booked' &&
                                        start <= now && end > now

                                    return (
                                        <tr key={reservation.id}>
                                            <td>
                                                <strong>{reservation.title}</strong>
                                                <div className="small text-secondary">
                                                    #{reservation.id}
                                                </div>
                                            </td>
                                            <td>
                                                {reservation.roomName}
                                                <div className="small text-secondary">
                                                    {reservation.organizerName}
                                                </div>
                                            </td>
                                            <td className="small">
                                                <div>Start: {displayDate(reservation.startAt)}</div>
                                                <div>End: {displayDate(reservation.endAt)}</div>
                                                {reservation.actualStartAt && (
                                                    <div>
                                                        Checked in: {displayDate(reservation.actualStartAt)}
                                                    </div>
                                                )}
                                                {reservation.actualEndAt && (
                                                    <div>
                                                        Ended: {displayDate(reservation.actualEndAt)}
                                                    </div>
                                                )}
                                            </td>
                                            <td>{reservation.attendees}</td>
                                            <td>
                                                <span className={`badge ${reservation.status === 'Booked'
                                                        ? 'text-bg-primary'
                                                        : reservation.status === 'Completed'
                                                            ? 'text-bg-success'
                                                            : 'text-bg-secondary'
                                                    }`}>
                                                    {reservation.status}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="d-flex flex-wrap gap-2">
                                                    {upcoming && (
                                                        <>
                                                            <button
                                                                className="btn btn-sm btn-outline-primary"
                                                                disabled={busy}
                                                                onClick={() => editReservation(reservation)}
                                                            >
                                                                Edit
                                                            </button>
                                                            <button
                                                                className="btn btn-sm btn-outline-danger"
                                                                disabled={busy}
                                                                onClick={() =>
                                                                    performAction(reservation, 'cancel')}
                                                            >
                                                                Cancel
                                                            </button>
                                                        </>
                                                    )}
                                                    {running && !reservation.actualStartAt && (
                                                        <button
                                                            className="btn btn-sm btn-outline-success"
                                                            disabled={busy}
                                                            onClick={() =>
                                                                performAction(reservation, 'check-in')}
                                                        >
                                                            Check in
                                                        </button>
                                                    )}

                                                    {running && reservation.actualStartAt && (
                                                        <button
                                                            className="btn btn-sm btn-outline-warning"
                                                            disabled={busy}
                                                            onClick={() =>
                                                                performAction(reservation, 'end-early')}
                                                        >
                                                            End early
                                                        </button>
                                                    )}
                                                    {!upcoming && !running && (
                                                        <span className="small text-secondary">
                                                            No actions
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </section>
    )
}