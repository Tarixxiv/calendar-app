import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, momentLocalizer, SlotInfo, EventPropGetter, View, Views } from 'react-big-calendar';
import moment from 'moment';
import axios from 'axios';
import 'react-big-calendar/lib/css/react-big-calendar.css';

import { API_URL, getAuthHeaders } from '../config';
import { CalendarEvent, LocationData, NewEventData } from '../model';
import EventModal from '../components/EventModal';
import ConfirmModal from '../components/ConfirmModal';

const localizer = momentLocalizer(moment);

interface CalendarPageProps {
    isAdmin: boolean;
    events: CalendarEvent[];
    locations: LocationData[];
    refreshData: () => void;
    onAddLocation: (loc: string) => void;
    onRemoveLocation: (loc: string) => void;
    onEditEvent: (event: CalendarEvent) => Promise<void>;
}

const CalendarPage: React.FC<CalendarPageProps> = ({
                                                       isAdmin, events, locations, refreshData, onAddLocation, onRemoveLocation, onEditEvent
                                                   }) => {
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date } | null>(null);
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
    const [newLocName, setNewLocName] = useState('');
    const [locationToDelete, setLocationToDelete] = useState<string | null>(null);
    const [activeFilters, setActiveFilters] = useState<string[]>([]);

    // Default to Month view
    const [view, setView] = useState<View>(Views.MONTH);
    const [date, setDate] = useState<Date>(new Date());

    useEffect(() => {
        if (locations.length > 0) setActiveFilters(locations.map(l => l.name));
    }, [locations]);

    // Formats object removed as it was only for Agenda customization

    const visibleEvents = useMemo(() => {
        return events.filter(ev => activeFilters.includes(ev.location));
    }, [events, activeFilters]);

    const { min, max } = useMemo(() => {
        const today = new Date();
        return {
            min: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 8, 0, 0),
            max: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 19, 30, 0)
        };
    }, []);

    const handleSelectSlot = ({ start }: SlotInfo) => {
        const end = moment(start).add(1, 'hours').toDate();
        setSelectedSlot({ start, end });
        setSelectedEvent(null);
        setModalOpen(true);
    };

    const handleSelectEvent = (event: CalendarEvent) => {
        setSelectedEvent(event);
        setSelectedSlot(null);
        setModalOpen(true);
    };

    const saveEvent = async (data: NewEventData) => {
        if (!selectedSlot) return;
        const startDate = data.startTimeOverride || selectedSlot.start;
        const payload = {
            firstName: data.firstName,
            lastName: data.lastName,
            phoneNumber: data.phoneNumber,
            email: data.email,
            location: data.location,
            notes: data.notes,
            start: startDate,
            end: moment(startDate).add(1, 'hours').toDate(),
            status: 'pending'
        };
        try {
            await axios.post(`${API_URL}/events`, payload, { headers: getAuthHeaders() });
            refreshData();
            setModalOpen(false);
        } catch (error) { console.error(error); }
    };

    const handleEditWrapper = async (ev: CalendarEvent) => { await onEditEvent(ev); setModalOpen(false); }

    const approveEvent = async (ev: CalendarEvent) => {
        try {
            await axios.put(`${API_URL}/events/${ev.id}`, { ...ev, status: 'approved' }, { headers: getAuthHeaders() });
            refreshData();
            setModalOpen(false);
        } catch (error) { console.error(error); }
    };

    const deleteEvent = async (ev: CalendarEvent) => {
        try {
            await axios.delete(`${API_URL}/events/${ev.id}`, { headers: getAuthHeaders() });
            refreshData();
            setModalOpen(false);
        } catch (error) { console.error(error); }
    };

    const handleAddLocationSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newLocName.trim()) {
            onAddLocation(newLocName.trim());
            setNewLocName('');
        }
    };

    const eventStyleGetter: EventPropGetter<CalendarEvent> = (event) => {
        const locData = locations.find(l => l.name === event.location);
        const baseColor = locData ? locData.color : '#999';
        const opacity = event.status === 'pending' ? 0.5 : 1.0;
        return { style: { backgroundColor: baseColor, opacity: opacity, borderRadius: '5px', color: 'white', border: '0px', display: 'block' } };
    };

    return (
        <div className="calendar-container">
            <div className="calendar-header">
                <h2>{isAdmin ? "Admin Dashboard" : "Booking Calendar"}</h2>
                <div className="legend"><span className="dot pending"></span> Pending <span className="dot approved"></span> Approved</div>
            </div>

            <div className="location-manager">
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center', marginBottom: 10 }}>
                    <h3>Locations</h3>
                    <button onClick={() => setActiveFilters(activeFilters.length === locations.length ? [] : locations.map(l => l.name))} className="btn-text-only">
                        {activeFilters.length === locations.length ? "Deselect All" : "Select All"}
                    </button>
                </div>
                <div className="location-list">
                    {locations.map(loc => {
                        const isActive = activeFilters.includes(loc.name);
                        return (
                            <span key={loc.id} className={`location-tag ${!isActive ? 'inactive' : ''}`}
                                  style={{ borderColor: loc.color, color: isActive ? 'white' : loc.color, backgroundColor: isActive ? loc.color : 'white' }}
                                  onClick={() => setActiveFilters(p => p.includes(loc.name) ? p.filter(l => l !== loc.name) : [...p, loc.name])}>
                                {loc.name}
                                {isAdmin && <button onClick={(e) => { e.stopPropagation(); setLocationToDelete(loc.name); }} style={{ color: 'inherit' }}>×</button>}
                            </span>
                        );
                    })}
                </div>
                {isAdmin && (
                    <form onSubmit={handleAddLocationSubmit} className="add-location-form">
                        <input value={newLocName} onChange={e => setNewLocName(e.target.value)} placeholder="New Location" />
                        <button type="submit" className="btn-success">Add</button>
                    </form>
                )}
            </div>

            <Calendar<CalendarEvent>
                localizer={localizer}
                events={visibleEvents}
                startAccessor="start"
                endAccessor="end"
                style={{ height: '100%', minHeight: '500px' }}
                selectable
                onSelectSlot={handleSelectSlot}
                onSelectEvent={handleSelectEvent}
                // REMOVED Views.AGENDA from here
                views={[Views.MONTH, Views.WEEK, Views.DAY]}
                view={view}
                date={date}
                onView={setView}
                onNavigate={setDate}
                min={min}
                max={max}
                eventPropGetter={eventStyleGetter}
            />

            <EventModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                selectedSlot={selectedSlot}
                selectedEvent={selectedEvent}
                events={events}
                locations={locations}
                onSave={saveEvent}
                onEdit={handleEditWrapper}
                onApprove={approveEvent}
                onDelete={deleteEvent}
                isAdmin={isAdmin}
            />

            <ConfirmModal
                isOpen={!!locationToDelete}
                title="Delete Location?"
                message={`Delete "${locationToDelete}"?`}
                onConfirm={() => { if (locationToDelete) onRemoveLocation(locationToDelete); setLocationToDelete(null); }}
                onCancel={() => setLocationToDelete(null)}
            />
        </div>
    );
};

export default CalendarPage;