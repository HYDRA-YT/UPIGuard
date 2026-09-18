// In-memory session store (Bearer tokens). Sessions are ephemeral: they live
// only for the lifetime of the backend process, which is fine for a demo.
// A restart of the backend logs everyone out (the frontend validates the token
// on boot via GET /api/auth/me and falls back to the login screen).

const crypto = require('crypto');

const sessions = new Map();

function createSession(account) {
  const token = crypto.randomBytes(24).toString('hex');
  sessions.set(token, {
    userId: account.id,
    user: { id: account.id, name: account.name, upiId: account.upiId },
    createdAt: Date.now(),
  });
  return token;
}

function getSession(token) {
  if (!token) return null;
  return sessions.get(token) || null;
}

function destroySession(token) {
  sessions.delete(token);
}

module.exports = { createSession, getSession, destroySession };