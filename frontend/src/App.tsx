import { useState } from 'react'
import RoomsPage from './pages/RoomsPage'
import UsersPage from './pages/UsersPage'
import ReservationsPage from './pages/ReservationsPage'
import UsagePage from './pages/UsagePage'

type Page = 'rooms' | 'users' | 'reservations' | 'usage'

const pages: { id: Page; label: string }[] = [
    { id: 'rooms', label: 'Rooms' },
    { id: 'users', label: 'Users' },
    { id: 'reservations', label: 'Reservations' },
    { id: 'usage', label: 'Usage' },
]

export default function App() {
    const [page, setPage] = useState<Page>('rooms')


    return (
        <>
            <header className="app-header py-4 mb-4">
                <div className="container">
                    <h1 className="h3 mb-1">Room Reservation</h1>
                    <p className="mb-0 opacity-75">
                        Office meeting room booking
                    </p>
                </div>
            </header>

            <main className="container pb-5">
                <nav
                    aria-label="Main navigation"
                    className="d-flex flex-wrap gap-2 border-bottom pb-3 mb-4"
                >
                    {pages.map(item => (
                        <button
                            key={item.id}
                            type="button"
                            className={`btn ${page === item.id
                                    ? 'btn-primary'
                                    : 'btn-outline-primary'
                                }`}
                            aria-current={page === item.id ? 'page' : undefined}
                            onClick={() => setPage(item.id)}
                        >
                            {item.label}
                        </button>
                    ))}
                </nav>

                {page === 'rooms' && <RoomsPage />}
                {page === 'users' && <UsersPage />}
                {page === 'reservations' && <ReservationsPage />}
                {page === 'usage' && <UsagePage />}
            </main>
        </>
    )
}