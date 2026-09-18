// Express middleware that protects /api/* routes behind a demo session token.
// The frontend sends `Authorization: Bearer <token>`; the token maps to an
// in-memory session (see sessions.js). On success it attaches req.userId and
// req.user, which every route uses instead of a hardcoded demo user.

const { getSession } = require('../auth/sessions');

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

module.exports = { requireAuth };