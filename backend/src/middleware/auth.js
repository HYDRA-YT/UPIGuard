// Express middleware that protects /api/* routes behind a demo session token.
// The frontend sends `Authorization: Bearer <token>`; the token maps to an
// in-memory session (see sessions.js). On success it attaches req.userId and
// req.user, which every route uses instead of a hardcoded demo user.

const { getSession } = require('../auth/sessions');
const { DEMO_ACCOUNTS } = require('../auth/accounts');

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const session = getSession(token);

  if (!session) {
    return res.status(401).json({
      success: false,
      code: 'AUTH_REQUIRED',
      message: 'Please sign in with your UPI ID and PIN to continue.',
    });
  }

  req.userId = session.userId;
  req.user = session.user;
  req.token = token;
  next();
}

// guestAuth keeps the login experience optional: with a valid Bearer token it
// behaves like requireAuth, but without one it silently proceeds as the demo
// user. The login route, sessions and per-account isolation stay intact in
// the codebase, so re-enabling the auth gate is a one-line server change.
function guestAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const session = getSession(token);

  if (session) {
    req.userId = session.userId;
    req.user = session.user;
    req.token = token;
  } else {
    const demo = DEMO_ACCOUNTS[0];
    req.userId = demo.id;
    req.user = { id: demo.id, name: demo.name, upiId: demo.upiId };
  }
  next();
}

module.exports = { requireAuth, guestAuth };