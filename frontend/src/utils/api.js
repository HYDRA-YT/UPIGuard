// API base: use VITE_API_URL when the backend is hosted separately
// (e.g. VITE_API_URL=https://upiguard-api.onrender.com), otherwise
// default to /api which the Vite dev proxy forwards to localhost:3001.
const BASE = import.meta.env.VITE_API_URL || '/api';

function extractMessage(data) {
  if (!data) return null;
  if (data.message) return data.message;
  if (Array.isArray(data.errors) && data.errors.length > 0) {
    return data.errors.map(e => e.msg).join(' · ');
  }
  return null;
}

async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      headers: { 'Content-Type': 'application/json' },
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
    throw new Error(extractMessage(data) || `Request failed (${res.status})`);
  }
  return data;
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

export function resetDemoData() {
  return request('/reset', { method: 'POST' });
}

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
