const express = require('express');
const db = require('../db/database');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();

// Restores Supabase data to the seeded demo state so the hackathon demo can
// be repeated cleanly without restarting the server.
//
// SAFETY GUARD: disabled (403) unless RESET_ALLOW_UNSAFE=true is set, because
// this endpoint deletes every transaction and recipient in the database.
// Never expose it publicly without that deliberate opt-in.
router.post('/reset', asyncHandler(async (req, res) => {
  if (process.env.RESET_ALLOW_UNSAFE !== 'true') {
    return res.status(403).json({
      success: false,
      message: 'Reset is disabled. Set RESET_ALLOW_UNSAFE=true in backend/.env to enable it (it wipes and reseeds all data).',
    });
  }

  await db.resetDemoData();
  res.json({ success: true, message: 'Database reset to seeded demo state.' });
}));

module.exports = router;