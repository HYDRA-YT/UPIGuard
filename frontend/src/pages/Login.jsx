import React, { useState } from 'react';
import { login } from '../utils/api';
import { setToken } from '../utils/auth';

const DEMO_ACCOUNTS = [
  { upiId: 'demo@upiguard', pin: '1234', name: 'Demo User', tag: 'Flagship demo · full history' },
  { upiId: 'asha@okbank', pin: '4321', name: 'Asha Verma', tag: 'Daily limit demo · ₹90k spent today' },
  { upiId: 'ravi@gpay', pin: '2468', name: 'Ravi Kumar', tag: 'Fresh lighter history' },
];

export default function Login({ onLogin }) {
  const [upiId, setUpiId] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!upiId.trim()) return setError('Enter your UPI ID');
    if (!pin.trim()) return setError('Enter your UPI PIN');

    setLoading(true);
    try {
      const res = await login(upiId.trim(), pin.trim());
      setToken(res.token);
      onLogin(res.user);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const selectAccount = (acc) => {
    setUpiId(acc.upiId);
    setPin(acc.pin);
    setError('');
  };

  return (
    <div className="login-wrap">
      <div className="login-hero">
        <div className="login-logo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="#34d399"/>
            <path d="M9 12l2 2 4-4" stroke="#34d399"/>
          </svg>
        </div>
        <h1 className="login-title">Sign in to <span className="gradient-text">UPIGuard</span></h1>
        <p className="login-sub">Your Last Check Before You Pay. Log in with a UPI ID and UPI PIN — no real credentials, everything is simulated.</p>
      </div>

      <form className="login-card" onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="login-upi">UPI ID</label>
          <input
            className="form-input"
            id="login-upi"
            type="text"
            inputMode="email"
            autoComplete="username"
            placeholder="you@bank"
            value={upiId}
            onChange={(e) => setUpiId(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="login-pin">UPI PIN</label>
          <input
            className="form-input"
            id="login-pin"
            type="password"
            inputMode="numeric"
            autoComplete="current-password"
            placeholder="••••"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
          />
        </div>

        {error && (
          <div className="login-error" role="alert">
            {error}
          </div>
        )}

        <button className="btn btn-primary btn-lg btn-full login-submit" type="submit" disabled={loading}>
          {loading ? (<><span className="spinner" /> Signing in...</>) : 'Sign In'}
        </button>

        <div className="login-divider">or use a demo account</div>

        <div className="account-chips" role="group" aria-label="Demo accounts">
          {DEMO_ACCOUNTS.map(acc => (
            <button
              key={acc.upiId}
              type="button"
              className="account-chip"
              onClick={() => selectAccount(acc)}
              aria-label={`Use demo account ${acc.name} (${acc.upiId})`}
            >
              <span className="account-chip-name">{acc.name}</span>
              <span className="account-chip-upi">{acc.upiId}</span>
              <span className="account-chip-tag">{acc.tag}</span>
              <span className="account-chip-pin">PIN {acc.pin}</span>
            </button>
          ))}
        </div>

        <p className="login-note">
          Demo only — no real bank, no real money, no real PIN checks. Pick any account from the list.
        </p>
      </form>
    </div>
  );
}