export interface CalendarEvent {
    id: number;
    title: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    start: Date;
    end: Date;
    email: string;
    location: string;
    notes?: string;
    status: 'pending' | 'approved';
}

export interface LocationData {
    id: number;
    name: string;
    color: string;
}

export interface NewEventData {
    firstName: string;
    lastName: string;
    phoneNumber: string;
    email: string;
    location: string;
    notes: string;
    startTimeOverride?: Date;
}