const express = require('express');
const db = require('../db/database');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();

router.get('/', asyncHandler(async (req, res) => {
  const transactions = await db.getTransactionsForUser(req.userId);
  res.json({ success: true, transactions });
}));

module.exports = router;
