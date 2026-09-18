const express = require('express');
const { body, validationResult } = require('express-validator');
const { findAccount, toPublic } = require('../auth/accounts');
const { createSession, destroySession, getSession } = require('../auth/sessions');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/login
// Sign in with a demo UPI ID + UPI PIN. Returns a Bearer token that the
// frontend stores and sends on every subsequent request.
router.post('/login', [
  body('upiId').trim().notEmpty().withMessage('UPI ID is required'),
  body('pin').trim().notEmpty().withMessage('UPI PIN is required'),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { upiId, pin } = req.body;
  const account = findAccount(upiId, pin);

  if (!account) {
    return res.status(401).json({
      success: false,
      code: 'INVALID_CREDENTIALS',
      message: 'Invalid UPI ID or UPI PIN. Try one of the demo accounts.',
    });
  }

  const token = createSession(account);
  res.json({ success: true, token, user: toPublic(account) });
});

// GET /api/auth/me — validate a stored token on app boot.
router.get('/me', requireAuth, (req, res) => {
  res.json({ success: true, user: req.user });
});

// POST /api/auth/logout — destroy the current session.
router.post('/logout', requireAuth, (req, res) => {
  destroySession(req.token);
  res.json({ success: true, message: 'Logged out.' });
});

module.exports = router;