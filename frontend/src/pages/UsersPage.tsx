import { useEffect, useState } from 'react'
import { getJson } from '../api'
import type { User } from '../types'

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [reload, setReload] = useState(0)

    function refreshUsers() {
        setLoading(true)
        setError('')
        setReload(current => current + 1)
    }

    useEffect(() => {
        const controller = new AbortController()

        getJson<User[]>('/api/users', controller.signal)
            .then(data => {
                if (!controller.signal.aborted) {
                    setUsers(data)
                }
            })
            .catch((reason: unknown) => {
                if (!controller.signal.aborted) {
                    setError(
                        reason instanceof Error
                            ? reason.message
                            : 'Could not load users.',
                    )
                }
            })
            .finally(() => {
                if (!controller.signal.aborted) {
                    setLoading(false)
                }
            })

        return () => controller.abort()
    }, [reload])

    return (
        <section aria-labelledby="users-heading">
            <div className="d-flex justify-content-between align-items-start gap-3 mb-4">
                <div>
                    <h2 id="users-heading" className="h3">
                        Users
                    </h2>
                    <p className="text-secondary mb-0">
                        Active reservations include upcoming and currently
                        running booked meetings.
                    </p>
                </div>

                <button
                    type="button"
                    className="btn btn-outline-primary"
                    disabled={loading}
                    onClick={refreshUsers}
                >
                    Refresh
                </button>
            </div>

            {loading && (
                <p role="status" className="text-secondary">
                    Loading users...
                </p>
            )}

            {error && (
                <div className="alert alert-danger" role="alert">
                    <p className="mb-2">{error}</p>
                    <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        disabled={loading}
                        onClick={refreshUsers}
                    >
                        Retry
                    </button>
                </div>
            )}

            {!loading && !error && users.length === 0 && (
                <div className="alert alert-info">
                    No users found.
                </div>
            )}

            {!loading && !error && users.length > 0 && (
                <div className="card border-0 shadow-sm">
                    <div className="table-responsive">
                        <table className="table align-middle mb-0">
                            <caption className="px-3">
                                Users and their active reservation counts
                            </caption>

                            <thead className="table-light">
                                <tr>
                                    <th scope="col">User ID</th>
                                    <th scope="col">First name</th>
                                    <th scope="col">Last name</th>
                                    <th scope="col">Active reservations</th>
                                </tr>
                            </thead>

                            <tbody>
                                {users.map(user => (
                                    <tr key={user.id}>
                                        <td>{user.id}</td>
                                        <td>{user.firstName}</td>
                                        <td>{user.lastName}</td>
                                        <td>
                                            <span className="badge text-bg-primary">
                                                {user.activeReservationCount}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </section>
    )
}