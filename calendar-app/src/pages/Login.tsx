import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../config';

interface LoginProps {
    onLogin: (token: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            const res = await axios.post(`${API_URL}/login`, { username, password });
            localStorage.setItem('token', res.data.token);
            onLogin(res.data.token);
            navigate('/');
        } catch (err) {
            setError('Invalid username or password');
        }
    };

    return (
        <div className="login-container">
            <h2>Admin Login</h2>
            <form onSubmit={handleLogin} className="form-stack">
                <input type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} required />
                <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
                {error && <div style={{ color: 'red', marginBottom: '10px' }}>{error}</div>}
                <button type="submit" className="btn-primary">Log In</button>
            </form>
        </div>
    );
};

export default Login;