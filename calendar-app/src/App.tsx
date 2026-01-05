import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import axios from 'axios';

import Login from './pages/Login';
import CalendarPage from './pages/CalendarPage';
import { API_URL, getAuthHeaders } from './config';
import { CalendarEvent, LocationData } from './model';
import './App.css';

const App: React.FC = () => {
    const [isAdmin, setIsAdmin] = useState<boolean>(false);
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [locations, setLocations] = useState<LocationData[]>([]);

    useEffect(() => {
        const interceptor = axios.interceptors.response.use(
            response => response,
            error => {
                if (error.response && error.response.status === 401) {
                    console.warn("Session expired.");
                    localStorage.removeItem('token');
                    setIsAdmin(false);
                }
                return Promise.reject(error);
            }
        );
        return () => axios.interceptors.response.eject(interceptor);
    }, []);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) setIsAdmin(true);
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const eventsRes = await axios.get(`${API_URL}/events`);
            const formattedEvents = eventsRes.data.map((ev: any) => ({
                ...ev,
                start: new Date(ev.start),
                end: new Date(ev.end)
            }));
            setEvents(formattedEvents);
            const locRes = await axios.get(`${API_URL}/locations`);
            setLocations(locRes.data);
        } catch (error) { console.error("Error fetching data:", error); }
    };

    const handleLogin = (token: string) => { setIsAdmin(true); };
    const handleLogout = () => { localStorage.removeItem('token'); setIsAdmin(false); };

    const handleAddLocation = async (newLoc: string) => {
        if (!locations.some(l => l.name === newLoc)) {
            try { await axios.post(`${API_URL}/locations`, { name: newLoc }, { headers: getAuthHeaders() }); fetchData(); }
            catch (err) { console.error(err); }
        } else { alert('Location already exists!'); }
    };

    const handleRemoveLocation = async (locToRemove: string) => {
        try { await axios.delete(`${API_URL}/locations/${locToRemove}`, { headers: getAuthHeaders() }); fetchData(); }
        catch (err) { console.error(err); }
    };

    const handleEditEvent = async (updatedEvent: CalendarEvent) => {
        try { await axios.put(`${API_URL}/events/${updatedEvent.id}`, updatedEvent, { headers: getAuthHeaders() }); fetchData(); }
        catch (error) { console.error(error); }
    };

    return (
        <Router>
            <div className="App">
                <nav className="navbar">
                    <div className="nav-brand">CalendarApp (TS)</div>
                    <div className="nav-links">
                        <Link to="/">Calendar</Link>
                        {!isAdmin ? <Link to="/login">Login</Link> : <button onClick={handleLogout} className="btn-link">Logout</button>}
                    </div>
                </nav>
                <Routes>
                    <Route path="/" element={<CalendarPage isAdmin={isAdmin} events={events} locations={locations} refreshData={fetchData} onAddLocation={handleAddLocation} onRemoveLocation={handleRemoveLocation} onEditEvent={handleEditEvent} />} />
                    <Route path="/login" element={<Login onLogin={handleLogin} />} />
                </Routes>
            </div>
        </Router>
    );
}

export default App;