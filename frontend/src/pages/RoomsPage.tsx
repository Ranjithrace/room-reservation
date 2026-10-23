import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { getJson } from '../api'
import type { Room } from '../types'

const equipmentOptions = [
    { value: 'Projector', label: 'Projector' },
    { value: 'TvScreen', label: 'TV screen' },
    { value: 'VideoConferencing', label: 'Video conferencing' },
    { value: 'Whiteboard', label: 'Whiteboard' },
]

function equipmentLabel(value: string) {
    return equipmentOptions.find(option => option.value === value)
        ?.label ?? value
}

export default function RoomsPage() {
    const [rooms, setRooms] = useState<Room[]>([])
    const [minCapacity, setMinCapacity] = useState('')
    const [floor, setFloor] = useState('')
    const [equipment, setEquipment] = useState<string[]>([])
    const [query, setQuery] = useState('')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [reload, setReload] = useState(0)

    function refreshRooms() {
        setLoading(true)
        setError('')
        setRooms([])
        setReload(current => current + 1)
    }

    useEffect(() => {
        const controller = new AbortController()

        getJson<Room[]>(`/api/rooms${query}`, controller.signal)
            .then(data => {
                if (!controller.signal.aborted) {
                    setRooms(data)
                }
            })
            .catch((reason: unknown) => {
                if (!controller.signal.aborted) {
                    setError(
                        reason instanceof Error
                            ? reason.message
                            : 'Could not load rooms.',
                    )
                }
            })
            .finally(() => {
                if (!controller.signal.aborted) {
                    setLoading(false)
                }
            })

        return () => controller.abort()
    }, [query, reload])

    function toggleEquipment(value: string) {
        setEquipment(current =>
            current.includes(value)
                ? current.filter(item => item !== value)
                : [...current, value],
        )
    }

    function applyFilters(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()

        const parameters = new URLSearchParams()

        if (minCapacity) parameters.set('minCapacity', minCapacity)
        if (floor.trim()) parameters.set('floor', floor.trim())
        if (equipment.length) {
            parameters.set('equipment', equipment.join(','))
        }

        const value = parameters.toString()
        setQuery(value ? `?${value}` : '')
        refreshRooms()
    }

    function resetFilters() {
        setMinCapacity('')
        setFloor('')
        setEquipment([])
        setQuery('')
        refreshRooms()
    }

    return (
        <section aria-labelledby="rooms-heading">
            <div className="mb-4">
                <h2 id="rooms-heading" className="h3">
                    Meeting rooms
                </h2>
                <p className="text-secondary">
                    Find a room by capacity, floor, and equipment.
                </p>
            </div>

            <form
                className="card border-0 shadow-sm p-4 mb-4"
                onSubmit={applyFilters}
            >
                <div className="row g-3 mb-3">
                    <div className="col-md-6">
                        <label htmlFor="capacity" className="form-label">
                            Minimum capacity
                        </label>
                        <input
                            id="capacity"
                            type="number"
                            min="1"
                            step="1"
                            className="form-control"
                            placeholder="Any capacity"
                            value={minCapacity}
                            onChange={event => setMinCapacity(event.target.value)}
                        />
                    </div>

                    <div className="col-md-6">
                        <label htmlFor="floor" className="form-label">
                            Floor
                        </label>
                        <input
                            id="floor"
                            className="form-control"
                            placeholder="Any floor"
                            value={floor}
                            onChange={event => setFloor(event.target.value)}
                        />
                    </div>
                </div>

                <fieldset className="mb-3">
                    <legend className="fs-6">
                        Required equipment
                    </legend>

                    <div className="d-flex flex-wrap gap-3">
                        {equipmentOptions.map(option => (
                            <div className="form-check" key={option.value}>
                                <input
                                    id={`equipment-${option.value}`}
                                    className="form-check-input"
                                    type="checkbox"
                                    checked={equipment.includes(option.value)}
                                    onChange={() => toggleEquipment(option.value)}
                                />
                                <label
                                    className="form-check-label"
                                    htmlFor={`equipment-${option.value}`}
                                >
                                    {option.label}
                                </label>
                            </div>
                        ))}
                    </div>

                    <p className="small text-secondary mt-2 mb-0">
                        Rooms must have all selected equipment.
                    </p>
                </fieldset>

                <div className="d-flex gap-2">
                    <button type="submit" className="btn btn-primary">
                        Apply filters
                    </button>
                    <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={resetFilters}
                    >
                        Reset
                    </button>
                </div>
            </form>

            {loading && (
                <p role="status" className="text-secondary">
                    Loading rooms...
                </p>
            )}

            {error && (
                <div className="alert alert-danger" role="alert">
                    <p className="mb-2">{error}</p>
                    <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        disabled={loading}
                        onClick={refreshRooms}
                    >
                        Retry
                    </button>
                </div>
            )}

            {!loading && !error && rooms.length === 0 && (
                <div className="alert alert-info">
                    No rooms match these filters.
                </div>
            )}

            {!loading && !error && rooms.length > 0 && (
                <div className="row g-4">
                    {rooms.map(room => (
                        <div className="col-md-6 col-xl-4" key={room.id}>
                            <article className="card room-card h-100 shadow-sm">
                                <div className="card-body p-4">
                                    <div className="d-flex justify-content-between gap-2">
                                        <h3 className="h5">{room.name}</h3>
                                        <span
                                            className={`badge ${
                                                room.isActive
                                                    ? 'text-bg-success'
                                                    : 'text-bg-secondary'
                                            }`}
                                        >
                                            {room.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>

                                    <p className="small text-secondary">
                                        Room ID: {room.id}
                                    </p>

                                    <dl className="row mb-3">
                                        <dt className="col-5">Capacity</dt>
                                        <dd className="col-7">
                                            {room.capacity} people
                                        </dd>

                                        <dt className="col-5">Floor</dt>
                                        <dd className="col-7">{room.floor}</dd>

                                        <dt className="col-5">Location</dt>
                                        <dd className="col-7">{room.location}</dd>
                                    </dl>

                                    <div className="d-flex flex-wrap gap-2">
                                        {room.equipment.map(item => (
                                            <span
                                                className="badge equipment-badge"
                                                key={item}
                                            >
                                                {equipmentLabel(item)}
                                            </span>
                                        ))}

                                        {room.equipment.length === 0 && (
                                            <span className="small text-secondary">
                                                No equipment listed
                                            </span>
                                        )}
                                    </div>

                                    {!room.isActive && (
                                        <p className="small text-secondary mt-3 mb-0">
                                            This room cannot currently be booked.
                                        </p>
                                    )}
                                </div>
                            </article>
                        </div>
                    ))}
                </div>
            )}
        </section>
    )
}