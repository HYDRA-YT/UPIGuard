export const PAYMENT_CONTEXTS = [
  'Food',
  'Groceries',
  'Shopping',
  'Travel',
  'Entertainment',
  'Rent',
  'Bills',
  'Utilities',
  'Phone',
  'Internet',
  'Medical',
  'Education',
  'Friend',
  'Gift',
  'Donation',
  'Subscription',
  'EMI',
];

export function formatAmount(amount) {
  return `₹${Number(amount).toLocaleString('en-IN')}`;
}

export function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function riskColor(level) {
  switch (level) {
    case 'LOW RISK': return '#34d399';
    case 'CAUTION': return '#fbbf24';
    case 'HIGH CAUTION': return '#f87171';
    case 'CRITICAL': return '#fb7185';
    default: return '#64748b';
  }
}
