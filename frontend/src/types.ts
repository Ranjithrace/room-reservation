export interface Room {
    id: number
    name: string
    capacity: number
    floor: string
    location: string
    equipment: string[]
    isActive: boolean
}

export interface User {
    id: number
    firstName: string
    lastName: string
    activeReservationCount: number
}

export interface Reservation {
    id: number
    roomId: number
    roomName: string
    organizerId: number
    organizerName: string
    title: string
    startAt: string
    endAt: string
    attendees: number
    status: 'Booked' | 'Completed' | 'Cancelled'
    actualStartAt: string | null
    actualEndAt: string | null
}

export interface SaveReservationRequest {
    roomId: number
    organizerId: number
    title: string
    startAt: string
    endAt: string
    attendees: number
}

export interface RoomUsage {
    roomId: number
    roomName: string
    completedReservations: number
    checkedInReservations: number
    reservationsWithoutCheckIn: number
    scheduledMinutes: number
    recordedUsageMinutes: number
    usagePercent: number | null
}