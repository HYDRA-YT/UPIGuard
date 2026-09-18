// Hard UPI-style payment limits enforced by UPIGuard.
//
// Unlike the risk engine (which ADVISES and never blocks), these are hard caps:
//   - at most ₹1,00,000 in completed/sent payments per calendar day
//   - at most ₹50,000 to a single payee in one payment
// The backend rejects a payment above these BEFORE any check is shown.

const PER_PAYMENT_MAX = 50000;
const DAILY_MAX = 100000;

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function inIndianRupees(value) {
  return `₹${Number(value).toLocaleString('en-IN')}`;
}

// Enforce limits for a proposed payment. `spentToday` is the sum of the user's
// completed payments since the start of today. Returns an error object when a
// limit is exceeded, otherwise null.
function enforceLimits({ amount, spentToday }) {
  if (amount > PER_PAYMENT_MAX) {
    return {
      code: 'LIMIT_PER_PAYMENT',
      message: `Maximum ${inIndianRupees(PER_PAYMENT_MAX)} per single payment to one payee. This payment is ${inIndianRupees(amount)}.`,
    };
  }
  if (spentToday + amount > DAILY_MAX) {
    const remaining = Math.max(0, DAILY_MAX - spentToday);
    return {
      code: 'LIMIT_DAILY',
      message: `Daily payment limit of ${inIndianRupees(DAILY_MAX)} would be exceeded. You have ${inIndianRupees(remaining)} left today, but this payment is ${inIndianRupees(amount)}.`,
    };
  }
  return null;
}

module.exports = { PER_PAYMENT_MAX, DAILY_MAX, startOfToday, enforceLimits, inIndianRupees };