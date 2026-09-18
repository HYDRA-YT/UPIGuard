const express = require('express');
const { calculateBaseline } = require('../engine/riskEngine');
const db = require('../db/database');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();

router.get('/', asyncHandler(async (req, res) => {
  const userTransactions = await db.getCompletedTransactionsForUser(req.userId);
  const baseline = calculateBaseline(userTransactions);
  res.json({ success: true, baseline });
}));

module.exports = router;