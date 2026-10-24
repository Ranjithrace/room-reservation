import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { getJson } from '../api'
import type { RoomUsage } from '../types'
import { exportUsagePdf } from '../exportUsagePdf'

function localDateValue(date: Date) {
    const pad = (value: number) => String(value).padStart(2, '0')

    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
        date.getDate(),
    )}`
}

function reportQuery(from: string, through: string) {
    const start = new Date(`${from}T00:00:00`)
    const end = new Date(`${through}T00:00:00`)

    // Include the entire final local calendar day.
    end.setDate(end.getDate() + 1)

    return new URLSearchParams({
        from: start.toISOString(),
        to: end.toISOString(),
    }).toString()
}

export default function UsagePage() {
    const [from, setFrom] = useState(() => {
        const date = new Date()
        date.setDate(date.getDate() - 6)
        return localDateValue(date)
    })

    const [through, setThrough] = useState(() =>
        localDateValue(new Date()))

    const [query, setQuery] = useState(() =>
        reportQuery(from, through))

    const [rows, setRows] = useState<RoomUsage[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [validationError, setValidationError] = useState('')
    const [reload, setReload] = useState(0)

    const [exporting, setExporting] = useState(false)
    const [exportError, setExportError] = useState('')

    async function downloadReport() {
        if (loading || error || rows.length === 0 || exporting) {
            return
        }

        setExporting(true)
        setExportError('')

        try {
            await exportUsagePdf(rows, query)
        } catch {
            setExportError(
                'Could not export the report. Please try again.',
            )
        } finally {
            setExporting(false)
        }
    }

    function refreshReport() {
        setLoading(true)
        setError('')
        setReload(current => current + 1)
    }

    useEffect(() => {
        const controller = new AbortController()

        getJson<RoomUsage[]>(
            `/api/reports/room-usage?${query}`,
            controller.signal,
        )
            .then(data => {
                if (!controller.signal.aborted) {
                    setRows(data)
                }
            })
            .catch((reason: unknown) => {
                if (!controller.signal.aborted) {
                    setError(
                        reason instanceof Error
                            ? reason.message
                            : 'Could not load the usage report.',
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

    function applyDates(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setValidationError('')

        if (!from || !through || from > through) {
            setValidationError(
                'Choose valid dates. The final day cannot precede the first day.',
            )
            return
        }

        setQuery(reportQuery(from, through))
        refreshReport()
    }

    const appliedParameters = new URLSearchParams(query)
    const appliedFrom = new Date(
        appliedParameters.get('from')!,
    ).toLocaleDateString()
    const appliedThrough = new Date(
        new Date(appliedParameters.get('to')!).getTime() - 1,
    ).toLocaleDateString()

    return (
        <section aria-labelledby="usage-heading">
                        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
                <h2 id="usage-heading" className="h3 mb-0">
                    Room usage
                </h2>

                <button
                    type="button"
                    className="btn btn-outline-primary"
                    disabled={
                        loading ||
                        Boolean(error) ||
                        rows.length === 0 ||
                        exporting
                    }
                    onClick={downloadReport}
                >
                    {exporting ? 'Exporting...' : 'Export PDF'}
                </button>
            </div>

            {exportError && (
                <div className="alert alert-danger" role="alert">
                    {exportError}
                </div>
            )}
            <p className="text-secondary">
                Compare scheduled time with recorded usage for finished meetings.
            </p>

            <form
                className="card border-0 shadow-sm p-4 mb-4"
                onSubmit={applyDates}
            >
                <div className="row g-3 align-items-end">
                    <div className="col-md-4">
                        <label htmlFor="usage-from" className="form-label">
                            First day
                        </label>
                        <input
                            id="usage-from"
                            className="form-control"
                            type="date"
                            required
                            value={from}
                            onChange={event => setFrom(event.target.value)}
                        />
                    </div>

                    <div className="col-md-4">
                        <label htmlFor="usage-through" className="form-label">
                            Final day (included)
                        </label>
                        <input
                            id="usage-through"
                            className="form-control"
                            type="date"
                            required
                            value={through}
                            onChange={event => setThrough(event.target.value)}
                        />
                    </div>

                    <div className="col-md-4">
                        <button className="btn btn-primary" type="submit">
                            Apply / Refresh
                        </button>
                    </div>
                </div>

                <p className="small text-secondary mt-3 mb-0">
                    Dates use your device's local time zone.
                </p>

                {validationError && (
                    <p className="text-danger mt-2 mb-0" role="alert">
                        {validationError}
                    </p>
                )}
            </form>

            <div className="alert alert-info">
                Only finished, non-cancelled meetings are included.
                Usage is based on manual check-in. If no early end is recorded,
                usage is assumed to continue until the scheduled end.
                Missing check-in does not prove the room was empty.
            </div>

            {loading && (
                <p role="status">Loading usage report...</p>
            )}

            {error && (
                <div className="alert alert-danger" role="alert">
                    {error}
                    <button
                        type="button"
                        className="btn btn-sm btn-outline-danger ms-3"
                        disabled={loading}
                        onClick={refreshReport}
                    >
                        Retry
                    </button>
                </div>
            )}

            {!loading && !error && rows.length === 0 && (
                <div className="alert alert-info">
                    No rooms found.
                </div>
            )}

            {!loading && !error && rows.length > 0 && (
                <>
                    <p className="small text-secondary">
                        Applied period: {appliedFrom} through {appliedThrough}
                    </p>

                    <div className="card border-0 shadow-sm">
                        <div className="table-responsive">
                            <table className="table align-middle mb-0">
                                <caption className="px-3">
                                    Recorded usage as a percentage of scheduled time.
                                    All durations are in minutes.
                                </caption>

                                <thead className="table-light">
                                    <tr>
                                        <th scope="col">Room</th>
                                        <th scope="col">Finished bookings</th>
                                        <th scope="col">Checked in</th>
                                        <th scope="col">No check-in</th>
                                        <th scope="col">Scheduled minutes</th>
                                        <th scope="col">Recorded minutes</th>
                                        <th scope="col">
                                            Recorded use / booked time
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {rows.map(row => (
                                        <tr key={row.roomId}>
                                            <th scope="row">
                                                {row.roomName}
                                                <div className="small text-secondary fw-normal">
                                                    ID: {row.roomId}
                                                </div>
                                            </th>
                                            <td>{row.completedReservations}</td>
                                            <td>{row.checkedInReservations}</td>
                                            <td>{row.reservationsWithoutCheckIn}</td>
                                            <td>
                                                {row.scheduledMinutes.toFixed(2)}
                                            </td>
                                            <td>
                                                {row.recordedUsageMinutes.toFixed(2)}
                                            </td>
                                            <td>
                                                {row.usagePercent === null
                                                    ? 'N/A'
                                                    : `${row.usagePercent.toFixed(2)}%`}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </section>
    )
}