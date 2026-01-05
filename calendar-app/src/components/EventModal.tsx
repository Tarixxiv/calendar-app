import React, { useState, useEffect } from 'react';
import moment from 'moment';
import { CalendarEvent, LocationData, NewEventData } from '../model';

interface EventModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedSlot: { start: Date; end: Date } | null;
    selectedEvent: CalendarEvent | null;
    events: CalendarEvent[];
    locations: LocationData[];
    onSave: (data: NewEventData) => void;
    onEdit: (event: CalendarEvent) => void;
    isAdmin: boolean;
    onDelete: (event: CalendarEvent) => void;
    onApprove: (event: CalendarEvent) => void;
}

const EventModal: React.FC<EventModalProps> = ({
                                                   isOpen, onClose, selectedSlot, selectedEvent, events, locations,
                                                   onSave, onEdit, isAdmin, onDelete, onApprove
                                               }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [location, setLocation] = useState('');
    const [notes, setNotes] = useState('');
    const [timeStr, setTimeStr] = useState('09:00');

    useEffect(() => {
        if (isOpen) {
            if (selectedEvent) {
                setIsEditing(false);
                setFirstName(selectedEvent.firstName || '');
                setLastName(selectedEvent.lastName || '');
                setPhone(selectedEvent.phoneNumber || '');
                setEmail(selectedEvent.email);
                setLocation(selectedEvent.location);
                setNotes(selectedEvent.notes || '');
                setTimeStr(moment(selectedEvent.start).format('HH:mm'));
            } else if (selectedSlot) {
                setIsEditing(false);
                setFirstName('');
                setLastName('');
                setPhone('');
                setEmail('');
                setLocation(locations.length > 0 ? locations[0].name : '');
                setNotes('');
                const hour = moment(selectedSlot.start).format('HH:mm');
                setTimeStr(hour === '00:00' ? '09:00' : hour);
            }
        }
    }, [isOpen, selectedSlot, selectedEvent, locations]);

    const getTimes = () => {
        const times = [];
        for (let i = 8; i <= 18; i++) {
            const hour = i < 10 ? `0${i}` : `${i}`;
            times.push(`${hour}:00`);
            times.push(`${hour}:30`);
        }
        return times;
    };

    const getProposedStart = () => {
        const base = selectedSlot ? selectedSlot.start : (selectedEvent ? selectedEvent.start : new Date());
        const [hours, minutes] = timeStr.split(':').map(Number);
        return moment(base)
            .hour(hours)
            .minute(minutes)
            .second(0)
            .millisecond(0)
            .toDate();
    };

    const isLocationBooked = (locToCheck: string) => {
        const proposedStart = getProposedStart();
        const proposedEnd = moment(proposedStart).add(1, 'hours').toDate();
        return events.some(ev =>
            ev.id !== selectedEvent?.id &&
            ev.location === locToCheck &&
            moment(ev.start).isBefore(proposedEnd) &&
            moment(ev.end).isAfter(proposedStart)
        );
    };

    const handleSubmit = () => {
        const proposedStart = getProposedStart();
        if (!proposedStart || !location) return;

        if (moment(proposedStart).isBefore(new Date()) && !isAdmin) {
            alert("Cannot set time to the past.");
            return;
        }

        if (isEditing && selectedEvent) {
            const updatedEvent: CalendarEvent = {
                ...selectedEvent,
                firstName,
                lastName,
                phoneNumber: phone,
                email,
                location,
                notes,
                start: proposedStart,
                end: moment(proposedStart).add(1, 'hours').toDate(),
                title: `${firstName} ${lastName} ${phone}`,
                status: selectedEvent.status
            };
            onEdit(updatedEvent);
        } else {
            onSave({ firstName, lastName, phoneNumber: phone, email, location, notes, startTimeOverride: proposedStart });
        }
    };

    if (!isOpen) return null;

    if (selectedEvent && !isEditing) {
        return (
            <div className="modal-overlay">
                <div className="modal-content">
                    <h3>Booking Details</h3>
                    <p><strong>Name:</strong> {selectedEvent.firstName} {selectedEvent.lastName}</p>
                    <p><strong>Phone:</strong> {selectedEvent.phoneNumber}</p>
                    <p><strong>Email:</strong> {selectedEvent.email}</p>
                    <p><strong>Location:</strong> {selectedEvent.location}</p>
                    <p><strong>Time:</strong> {moment(selectedEvent.start).format('LLL')}</p>
                    <div className="notes-box"><strong>Notes:</strong><p>{selectedEvent.notes || "No notes."}</p></div>
                    <p><strong>Status:</strong> <span className={`status-${selectedEvent.status}`}>{selectedEvent.status}</span></p>

                    <div className="modal-actions">
                        {isAdmin ? (
                            <>
                                <button onClick={() => setIsEditing(true)} className="btn-primary">Edit</button>
                                {selectedEvent.status === 'pending' && <button onClick={() => onApprove(selectedEvent)} className="btn-success">Approve</button>}
                                <button onClick={() => onDelete(selectedEvent)} className="btn-danger">Delete</button>
                            </>
                        ) : (
                            <p className="info-text">🔒 Admin access required.</p>
                        )}
                        <button onClick={onClose} className="btn-secondary">Close</button>
                    </div>
                </div>
            </div>
        );
    }

    if (!selectedSlot && !selectedEvent) return null;
    if (locations.length === 0) return null;

    const proposedStart = getProposedStart();
    const isPast = proposedStart ? moment(proposedStart).isBefore(new Date()) : false;
    const currentSelectionInvalid = isLocationBooked(location);

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h3>{isEditing ? 'Edit Booking' : 'Book a Slot'}</h3>
                <p className="slot-info">{moment(proposedStart).format('MMMM Do YYYY')}</p>

                <div className="form-stack">
                    <div className="form-row-mobile" style={{ display: 'flex', gap: '10px' }}>
                        <div style={{ flex: 1 }}><label>First Name</label><input value={firstName} onChange={e => setFirstName(e.target.value)} required /></div>
                        <div style={{ flex: 1 }}><label>Last Name</label><input value={lastName} onChange={e => setLastName(e.target.value)} required /></div>
                    </div>

                    <label>Phone Number</label><input type="tel" value={phone} onChange={e => setPhone(e.target.value)} required />
                    <label>Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
                    <label>Start Time</label>
                    <select value={timeStr} onChange={(e) => setTimeStr(e.target.value)}>{getTimes().map(t => <option key={t} value={t}>{t}</option>)}</select>
                    {isPast && !isAdmin && <small className="error-text" style={{ color: '#e74c3c' }}>⚠️ Time is in the past.</small>}

                    <label>Location</label>
                    <select value={location} onChange={(e) => setLocation(e.target.value)} className={currentSelectionInvalid ? 'error-border' : ''}>
                        {locations.map(loc => {
                            const booked = isLocationBooked(loc.name);
                            return <option key={loc.id} value={loc.name} disabled={booked}>{loc.name} {booked ? '(Booked)' : ''}</option>;
                        })}
                    </select>
                    {currentSelectionInvalid && <small className="error-text">⚠️ Location booked.</small>}

                    <label>Notes</label><textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
                    <div className="modal-actions">
                        <button onClick={handleSubmit} className="btn-primary" disabled={!firstName || !lastName || !phone || !email || !location || currentSelectionInvalid || (isPast && !isAdmin)}>{isEditing ? 'Save Changes' : 'Request Booking'}</button>
                        <button onClick={() => { setIsEditing(false); onClose(); }} className="btn-secondary">Cancel</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EventModal;