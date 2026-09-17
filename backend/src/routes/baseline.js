const express = require('express');
const { calculateBaseline } = require('../engine/riskEngine');
const db = require('../db/database');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();

router.get('/', asyncHandler(async (req, res) => {
  const user = await db.getUser();
  const userTransactions = await db.getCompletedTransactionsForUser(user.id);
  const baseline = calculateBaseline(userTransactions);
  res.json({ success: true, baseline });
}));

module.exports = router;