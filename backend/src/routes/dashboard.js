const express = require('express');
const db = require('../db/database');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();

router.get('/', asyncHandler(async (req, res) => {
  const stats = await db.getStatsForUser(req.userId);
  const user = await db.getUserById(req.userId);
  res.json({ success: true, stats, user });
}));

module.exports = router;
