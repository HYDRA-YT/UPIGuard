const express = require('express');
const { isRecipientKnown } = require('../engine/riskEngine');
const db = require('../db/database');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();

router.get('/', asyncHandler(async (req, res) => {
  const recipients = await db.getRecipients();
  const user = await db.getUser();
  const userTransactions = await db.getCompletedTransactionsForUser(user.id);

  const enriched = recipients.map(r => {
    const known = isRecipientKnown(r.upi_id, userTransactions);
    return {
      id: r.id,
      name: r.name,
      upiId: r.upi_id,
      isKnown: known.isKnown,
      timesPaid: known.timesPaid,
      lastPayment: known.lastPayment,
    };
  });

  res.json({ success: true, recipients: enriched });
}));

module.exports = router;
