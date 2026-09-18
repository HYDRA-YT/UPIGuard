const express = require('express');
const { body, validationResult } = require('express-validator');
const { evaluateRisk } = require('../engine/riskEngine');
const { enforceLimits } = require('../engine/limits');
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
  const parsedAmount = parseFloat(amount);

  // Hard limits come first — no point running the risk check on a payment
  // that cannot legally go through today.
  const spentToday = await db.getSpentToday(req.userId);
  const limitError = enforceLimits({ amount: parsedAmount, spentToday });
  if (limitError) {
    return res.status(400).json({ success: false, code: limitError.code, message: limitError.message });
  }

  const userTransactions = await db.getCompletedTransactionsForUser(req.userId);

  const result = evaluateRisk({
    recipientUpi,
    amount: parsedAmount,
    context,
    transactions: userTransactions,
  });

  res.json({
    success: true,
    spentToday,
    check: {
      recipientName,
      recipientUpi,
      amount: parsedAmount,
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
  const parsedAmount = parseFloat(amount);

  // Re-enforce limits at completion as well, so the daily/per-payment caps
  // hold even if the client skipped the /check call.
  if (action === 'completed') {
    const spentToday = await db.getSpentToday(req.userId);
    const limitError = enforceLimits({ amount: parsedAmount, spentToday });
    if (limitError) {
      return res.status(400).json({ success: false, code: limitError.code, message: limitError.message });
    }
  }

  let recipient = await db.findRecipientByUpi(req.userId, recipientUpi);
  if (!recipient) {
    recipient = await db.addRecipient(req.userId, recipientName, recipientUpi);
  }

  const tx = await db.addTransaction(req.userId, {
    recipient_id: recipient.id,
    recipient_name: recipientName,
    recipient_upi: recipientUpi,
    amount: parsedAmount,
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
