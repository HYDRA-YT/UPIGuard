const express = require('express');
const db = require('../db/database');
const { requireAuth } = require('../middleware/auth');
const {
  PER_PAYMENT_MAX,
  DAILY_MAX,
  startOfToday,
  inIndianRupees,
} = require('../engine/limits');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();

router.use(requireAuth);

// GET /api/limits — the user's remaining spend headroom for today. The
// frontend renders this as a compact strip under the payment form.
router.get('/', asyncHandler(async (req, res) => {
  const spentToday = await db.getSpentToday(req.userId);
  const remainingToday = Math.max(0, DAILY_MAX - spentToday);

  res.json({
    success: true,
    limits: {
      perPaymentMax: PER_PAYMENT_MAX,
      dailyMax: DAILY_MAX,
      spentToday,
      remainingToday,
      formatted: {
        perPaymentMax: inIndianRupees(PER_PAYMENT_MAX),
        dailyMax: inIndianRupees(DAILY_MAX),
        spentToday: inIndianRupees(spentToday),
        remainingToday: inIndianRupees(remainingToday),
      },
      todayDate: startOfToday().toISOString(),
    },
  });
}));

module.exports = router;