const express = require('express');
const { body, validationResult } = require('express-validator');
const { evaluateRisk, calculateBaseline } = require('../engine/riskEngine');
const db = require('../db/database');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();

router.post('/check', [
  body('recipientName').trim().notEmpty().withMessage('Recipient name is required'),
  body('recipientUpi').trim().notEmpty().withMessage('UPI ID is required'),
  body('amount').isFloat({ min: 1, max: 10000000 }).withMessage('Amount must be between 1 and 1,00,00,000'),
  body('context').trim().notEmpty().withMessage('Payment context is required'),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { recipientName, recipientUpi, amount, context } = req.body;

  const user = await db.getUser();
  const userTransactions = await db.getCompletedTransactionsForUser(user.id);

  const result = evaluateRisk({
    recipientUpi,
    amount: parseFloat(amount),
    context,
    transactions: userTransactions,
  });

  res.json({
    success: true,
    check: {
      recipientName,
      recipientUpi,
      amount: parseFloat(amount),
      context,
      riskLevel: result.riskLevel,
      score: result.score,
      signalCount: result.signalCount,
      signals: result.signals,
      summary: result.summary,
      recipient: result.recipient,
      baseline: result.baseline,
    },
  });
}));

router.post('/complete', [
  body('recipientName').trim().notEmpty(),
  body('recipientUpi').trim().notEmpty(),
  body('amount').isFloat({ min: 1 }),
  body('context').trim().notEmpty(),
  body('riskLevel').trim().notEmpty(),
  body('action').isIn(['completed', 'cancelled']),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { recipientName, recipientUpi, amount, context, riskLevel, action } = req.body;

  const user = await db.getUser();
  let recipient = await db.findRecipientByUpi(recipientUpi);
  if (!recipient) {
    recipient = await db.addRecipient(recipientName, recipientUpi);
  }

  const tx = await db.addTransaction({
    user_id: user.id,
    recipient_id: recipient.id,
    recipient_name: recipientName,
    recipient_upi: recipientUpi,
    amount: parseFloat(amount),
    context,
    risk_level: riskLevel === 'LOW RISK' ? 'LOW_RISK' : riskLevel.replace(' ', '_').toUpperCase(),
    risk_signals: [],
    status: action,
  });

  res.json({
    success: true,
    transaction: tx,
    message: action === 'cancelled'
      ? 'Payment cancelled. No money was transferred.'
      : 'Simulated payment complete. No real money was transferred.',
  });
}));

module.exports = router;
