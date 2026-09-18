// API base: use VITE_API_URL when the backend is hosted separately
// (e.g. VITE_API_URL=https://upiguard-api.onrender.com), otherwise
// default to /api which the Vite dev proxy forwards to localhost:3001.
import { clearToken, getToken } from './auth';

const BASE = import.meta.env.VITE_API_URL || '/api';
const UNAUTHORIZED_EVENT = 'upiguard:unauthorized';
const AUTH_PATHS = ['/auth/login', '/auth/logout', '/auth/me'];

function broadcastUnauthorized() {
  try {
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
  } catch {
    // window may be unavailable in non-browser contexts
  }
}

function extractMessage(data) {
  if (!data) return null;
  if (data.message) return data.message;
  if (Array.isArray(data.errors) && data.errors.length > 0) {
    return data.errors.map(e => e.msg).join(' · ');
  }
  return null;
}

async function request(path, options = {}) {
  const token = getToken();
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...options,
    });
  } catch {
    throw new Error('Cannot reach the UPIGuard server. Is the backend running?');
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    // non-JSON response body — fall through with data = null
  }

  if (!res.ok) {
    if (res.status === 401 && !AUTH_PATHS.some(p => path.startsWith(p))) {
      clearToken();
      broadcastUnauthorized();
    }
    throw new Error(extractMessage(data) || `Request failed (${res.status})`);
  }
  return data;
}

export function login(upiId, pin) {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ upiId, pin }),
  });
}

export function logout() {
  return request('/auth/logout', { method: 'POST' }).catch(() => null);
}

export function getMe() {
  return request('/auth/me');
}

export function checkTransaction(payload) {
  return request('/transactions/check', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function completeTransaction(payload) {
  return request('/transactions/complete', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getHistory() {
  return request('/transactions/history');
}

export function getBaseline() {
  return request('/baseline');
}

export function getRecipients() {
  return request('/recipients');
}

export function getDemoScenarios() {
  return request('/demo');
}

export function getDashboard() {
  return request('/dashboard');
}

export function getLimits() {
  return request('/limits');
}

export function resetDemoData() {
  return request('/reset', { method: 'POST' });
}

export function onUnauthorized(cb) {
  try {
    window.addEventListener(UNAUTHORIZED_EVENT, cb);
  } catch {
    // non-browser context
  }
  return () => {
    try {
      window.removeEventListener(UNAUTHORIZED_EVENT, cb);
    } catch {
      // non-browser context
    }
  };
}

export { UNAUTHORIZED_EVENT };

// Shared risk-level → badge-class mapping so every page renders
// CRITICAL (and everything else) consistently.
export function riskBadgeClass(riskLevel) {
  switch (riskLevel) {
    case 'LOW RISK': return 'low';
    case 'CAUTION': return 'caution';
    case 'HIGH CAUTION': return 'high-caution';
    case 'CRITICAL': return 'critical';
    default: return 'caution';
  }
}
