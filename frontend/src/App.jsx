import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import PaymentCheck from './pages/PaymentCheck';
import DemoMode from './pages/DemoMode';
import History from './pages/History';
import Login from './pages/Login';
import { getMe, logout, onUnauthorized } from './utils/api';
import { clearToken, getToken } from './utils/auth';

function BackgroundFX() {
  return (
    <div className="bg-fx" aria-hidden="true">
      <div className="aurora a1" />
      <div className="aurora a2" />
      <div className="aurora a3" />
      <div className="grid-overlay" />
      <div className="scanline" />
    </div>
  );
}

function Nav({ user, onLogout }) {
  const loc = useLocation();
  const isActive = (path) => loc.pathname === path ? 'active' : '';

  return (
    <nav className="nav" role="navigation" aria-label="Main navigation">
      <Link to="/" className="nav-brand">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="#10b981"/>
          <path d="M9 12l2 2 4-4" stroke="#10b981"/>
        </svg>
        <span>UPIGuard</span>
        <small>Your Last Check Before You Pay</small>
      </Link>
      <div className="nav-links">
        <Link to="/" className={isActive('/')}>Dashboard</Link>
        <Link to="/check" className={isActive('/check')}>Check Payment</Link>
        <Link to="/demo" className={isActive('/demo')}>Demo Mode</Link>
        <Link to="/history" className={isActive('/history')}>History</Link>
      </div>
      {user && (
        <div className="nav-user">
          <span className="nav-user-avatar">{user.name.charAt(0)}</span>
          <span className="nav-user-meta">
            <span className="nav-user-name">{user.name}</span>
            <span className="nav-user-upi">{user.upiId}</span>
          </span>
          <button className="logout-btn" onClick={onLogout} aria-label="Log out">Log out</button>
        </div>
      )}
    </nav>
  );
}

export default function App() {
  const [state, setState] = useState({ status: 'loading', user: null });

  // Boot: a stored token is validated once against the server.
  useEffect(() => {
    if (!getToken()) {
      setState({ status: 'anon', user: null });
      return;
    }
    getMe()
      .then(d => setState({ status: 'auth', user: d.user }))
      .catch(() => {
        clearToken();
        setState({ status: 'anon', user: null });
      });
  }, []);

  // Any 401 from a data call means the session expired (in-memory sessions die
  // on a backend restart): drop back to the login screen, never a raw error.
  useEffect(() => {
    const expire = () => {
      clearToken();
      setState({ status: 'anon', user: null });
    };
    return onUnauthorized(expire);
  }, []);

  const handleLogin = (user) => setState({ status: 'auth', user });

  const handleLogout = async () => {
    await logout();
    clearToken();
    setState({ status: 'anon', user: null });
  };

  if (state.status === 'loading') {
    return <div className="loading">Loading...</div>;
  }

  if (state.status === 'anon') {
    return (
      <BrowserRouter>
        <BackgroundFX />
        <main className="container login-container">
          <Login onLogin={handleLogin} />
        </main>
        <footer className="footer">
          <p>UPIGuard — Venture Hackathon 2026 · Simulated Application · No real money is transferred</p>
        </footer>
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <BackgroundFX />
      <Nav user={state.user} onLogout={handleLogout} />
      <main className="container">
        <Routes>
          <Route path="/" element={<Dashboard user={state.user} />} />
          <Route path="/check" element={<PaymentCheck />} />
          <Route path="/demo" element={<DemoMode />} />
          <Route path="/history" element={<History />} />
        </Routes>
      </main>
      <footer className="footer">
        <p>UPIGuard — Venture Hackathon 2026 · Simulated Application · No real money is transferred</p>
      </footer>
    </BrowserRouter>
  );
}