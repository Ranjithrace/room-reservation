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
    { id: 'usage', label: 'Usage report' },
]

export default function App() {
    const [page, setPage] = useState<Page>('rooms')

    return (
        <>
            <a className="skip-link" href="#main-content">
                Skip to content
            </a>

            <header className="app-header">
                <div className="container app-header-inner">
                    <div className="app-brand">
                        <span className="app-brand-mark" aria-hidden="true">
                            <svg
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.7"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <rect x="4" y="5" width="16" height="16" rx="3" />
                                <path d="M8 3v4M16 3v4M4 11h16M8 15h3M8 18h6" />
                            </svg>
                        </span>

                        <div>
                            <h1>Room Reservation</h1>
                            <p>Office meeting spaces</p>
                        </div>
                    </div>

                    <span className="app-header-label">
                        Workspace booking
                    </span>
                </div>
            </header>

            <div className="app-navigation">
                <div className="container">
                    <nav className="app-tabs" aria-label="Main navigation">
                        {pages.map(item => (
                            <button
                                key={item.id}
                                type="button"
                                className={`app-tab ${
                                    page === item.id ? 'is-active' : ''
                                }`}
                                aria-current={
                                    page === item.id ? 'page' : undefined
                                }
                                onClick={() => setPage(item.id)}
                            >
                                {item.label}
                            </button>
                        ))}
                    </nav>
                </div>
            </div>

            <main
                id="main-content"
                className="container app-main"
                tabIndex={-1}
            >
                {page === 'rooms' && <RoomsPage />}
                {page === 'users' && <UsersPage />}
                {page === 'reservations' && <ReservationsPage />}
                {page === 'usage' && <UsagePage />}
            </main>

            <footer className="container app-footer">
                Room Reservation
                <span aria-hidden="true"> / </span>
                Meeting management and recorded usage
            </footer>
        </>
    )
}