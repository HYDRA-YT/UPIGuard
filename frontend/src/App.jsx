import React from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import PaymentCheck from './pages/PaymentCheck';
import DemoMode from './pages/DemoMode';
import History from './pages/History';

function Nav() {
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
      <div className="demo-badge"><span className="dot" /> DEMO MODE</div>
    </nav>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Nav />
      <main className="container">
        <Routes>
          <Route path="/" element={<Dashboard />} />
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
