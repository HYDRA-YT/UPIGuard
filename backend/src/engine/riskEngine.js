const { v4: uuidv4 } = require('uuid');

const SUSPICIOUS_CONTEXTS = [
  { keyword: 'cashback', severity: 'high', message: 'Cashback / reward requests can create false urgency. Verify the source before continuing.' },
  { keyword: 'refund', severity: 'medium', message: 'Refund requests from unknown sources are a common social-engineering tactic. Verify with the original service.' },
  { keyword: 'reward', severity: 'high', message: 'Reward / prize claims can be used to lure payments. Legitimate rewards rarely require upfront payment.' },
  { keyword: 'prize', severity: 'high', message: 'Prize claims that require payment are a common fraud pattern. Verify the source independently.' },
  { keyword: 'urgent', severity: 'medium', message: 'Urgency is a common social-engineering signal. Take a moment to verify before acting.' },
  { keyword: 'emergency', severity: 'medium', message: 'Emergency requests can pressure you into quick decisions. Verify the situation independently.' },
  { keyword: 'kyc', severity: 'high', message: 'KYC-related payments to individuals are suspicious. Banks never ask for KYC verification via UPI.' },
  { keyword: 'account verification', severity: 'high', message: 'Account verification should be done through official bank channels, not UPI transfers.' },
  { keyword: 'send money to receive', severity: 'high', message: '"Send money to receive money" is a classic fraud pattern. No legitimate service requires this.' },
  { keyword: 'verify', severity: 'medium', message: 'Payment verification requests to individuals should be treated with caution.' },
  { keyword: 'caller', severity: 'medium', message: 'Payments requested by unknown callers should be verified through official channels.' },
  { keyword: 'lottery', severity: 'high', message: 'Lottery payments are a well-known scam. You should never pay to receive a lottery prize.' },
  { keyword: 'investment', severity: 'medium', message: 'Investment-related payments should be thoroughly verified through official registered channels.' },
  { keyword: 'tax', severity: 'medium', message: 'Tax payments should be made through official government portals, not to individuals.' },
];

const NORMAL_CONTEXTS = [
  'rent', 'food', 'college fee', 'shopping', 'friend', 'bills',
  'groceries', 'travel', 'gift', 'utilities', 'internet', 'phone',
  'medical', 'education', 'donation', 'subscription', 'emi',
];

function analyzeContext(context) {
  if (!context || context.trim() === '') {
    return { isNormal: true, isSuspicious: false, signals: [], normalized: '' };
  }

  const normalized = context.toLowerCase().trim();

  // If the context matches a normal context keyword and contains NO suspicious
  // keyword, treat it as a normal payment context.
  const normalMatch = NORMAL_CONTEXTS.some(c => normalized.includes(c));
  if (normalMatch && !SUSPICIOUS_CONTEXTS.some(s => normalized.includes(s.keyword))) {
    return { isNormal: true, isSuspicious: false, signals: [], normalized };
  }

  const suspiciousMatches = SUSPICIOUS_CONTEXTS.filter(s => normalized.includes(s.keyword));

  if (suspiciousMatches.length > 0) {
    // Emit ONE consolidated signal using the highest-severity match so a single
    // context input produces a single, clear explainable warning.
    const strongest = suspiciousMatches.sort((a, b) => {
      const order = { high: 0, medium: 1 };
      return (order[a.severity] ?? 2) - (order[b.severity] ?? 2);
    })[0];

    return {
      isNormal: false,
      isSuspicious: true,
      signals: [{
        keyword: strongest.keyword,
        severity: strongest.severity,
        message: strongest.message,
      }],
      normalized,
      matchedKeywords: suspiciousMatches.map(m => m.keyword),
    };
  }

  return { isNormal: true, isSuspicious: false, signals: [], normalized };
}

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.ceil(sorted.length * p) - 1);
  return sorted[Math.max(0, idx)];
}

function calculateBaseline(transactions) {
  if (!transactions || transactions.length === 0) {
    return {
      count: 0,
      average: 0,
      min: 0,
      max: 0,
      typicalRange: { low: 0, high: 0 },
      frequentRecipients: [],
      totalAmount: 0,
    };
  }

  const amounts = transactions.map(t => t.amount);
  const totalAmount = amounts.reduce((sum, a) => sum + a, 0);
  const average = totalAmount / amounts.length;
  const sorted = [...amounts].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const min = sorted[0];
  const max = sorted[sorted.length - 1];

  // "Typical range" reflects routine payments, excluding large one-off
  // payments (e.g. rent, college fees) which would skew the baseline.
  const routineThreshold = Math.max(median * 4, 5000);
  const routineSorted = sorted.filter(a => a <= routineThreshold);
  const routineMax = routineSorted.length > 0 ? routineSorted[routineSorted.length - 1] : max;

  const roundTo = (v, step) => Math.round(v / step) * step;
  const low = Math.max(min, roundTo(median * 0.6, 50));
  const high = Math.max(roundTo(median * 2.5, 100), roundTo(routineMax * 1.1, 100));

  const recipientCounts = {};
  transactions.forEach(t => {
    const key = t.recipient_upi;
    if (!recipientCounts[key]) {
      recipientCounts[key] = { name: t.recipient_name, upi: t.recipient_upi, count: 0 };
    }
    recipientCounts[key].count++;
  });

  const frequentRecipients = Object.values(recipientCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    count: transactions.length,
    average: Math.round(average),
    median: Math.round(median),
    min,
    max,
    typicalRange: { low, high },
    frequentRecipients,
    totalAmount,
  };
}

function isRecipientKnown(recipientUpi, transactions) {
  const matching = transactions.filter(
    t => t.recipient_upi.toLowerCase() === recipientUpi.toLowerCase()
  );
  const newest = matching.length > 0
    ? matching.reduce((prev, cur) =>
        new Date(cur.created_at) > new Date(prev.created_at) ? cur : prev
      )
    : null;

  return {
    isKnown: matching.length > 0,
    timesPaid: matching.length,
    lastPayment: newest ? newest.created_at : null,
  };
}

function isAmountUnusual(amount, baseline) {
  if (baseline.count === 0) {
    return { isUnusual: true, severity: 'high', reason: 'No payment history to compare against.' };
  }

  const { typicalRange, average } = baseline;

  if (amount > typicalRange.high) {
    const factor = average > 0 ? (amount / average).toFixed(1) : 'N/A';
    if (amount > typicalRange.high * 10) {
      return {
        isUnusual: true,
        severity: 'severe',
        reason: `₹${amount.toLocaleString('en-IN')} is an extreme amount far above your usual payment range of ₹${typicalRange.low.toLocaleString('en-IN')} – ₹${typicalRange.high.toLocaleString('en-IN')}.`,
        factor,
      };
    }
    if (amount > typicalRange.high * 3) {
      return {
        isUnusual: true,
        severity: 'high',
        reason: `₹${amount.toLocaleString('en-IN')} is much higher than your usual payment range of ₹${typicalRange.low.toLocaleString('en-IN')} – ₹${typicalRange.high.toLocaleString('en-IN')}.`,
        factor,
      };
    }
    return {
      isUnusual: true,
      severity: 'medium',
      reason: `₹${amount.toLocaleString('en-IN')} is above your typical range of ₹${typicalRange.low.toLocaleString('en-IN')} – ₹${typicalRange.high.toLocaleString('en-IN')}.`,
      factor,
    };
  }

  if (amount < typicalRange.low * 0.2 && baseline.count > 5) {
    return {
      isUnusual: false,
      severity: 'low',
      reason: `₹${amount.toLocaleString('en-IN')} is lower than your typical range, but unusually low amounts are less of a concern.`,
    };
  }

  return { isUnusual: false, severity: 'none', reason: 'Amount is within your typical range.' };
}

function evaluateRisk({ recipientUpi, amount, context, transactions }) {
  const signals = [];
  let score = 0;

  const recipient = isRecipientKnown(recipientUpi, transactions);
  const baseline = calculateBaseline(transactions);
  const amountCheck = isAmountUnusual(amount, baseline);
  const contextCheck = analyzeContext(context);

  if (!recipient.isKnown) {
    signals.push({
      id: 'new_recipient',
      label: 'NEW RECIPIENT',
      description: `First payment to this payee.`,
      detail: recipient.timesPaid === 0
        ? `You have never paid ${recipientUpi} before.`
        : `First payment to this payee.`,
      severity: 'high',
      icon: 'user',
    });
    score += 3;
  } else {
    signals.push({
      id: 'known_recipient',
      label: 'KNOWN RECIPIENT',
      description: `Previously paid ${recipient.timesPaid} time${recipient.timesPaid > 1 ? 's' : ''}.`,
      detail: `This is a familiar payee in your history.`,
      severity: 'good',
      icon: 'user-check',
    });
  }

  if (amountCheck.isUnusual) {
    signals.push({
      id: 'unusual_amount',
      label: 'UNUSUAL AMOUNT',
      description: amountCheck.reason,
      detail: `Your usual payments are around ₹${baseline.typicalRange.low.toLocaleString('en-IN')} – ₹${baseline.typicalRange.high.toLocaleString('en-IN')}.`,
      severity: amountCheck.severity === 'severe' ? 'severe' : (amountCheck.severity === 'high' ? 'high' : 'medium'),
      icon: 'trending-up',
    });
    if (amountCheck.severity === 'severe') {
      score += 4;
    } else if (amountCheck.severity === 'high') {
      score += 3;
    } else {
      score += 2;
    }
  }

  if (contextCheck.isSuspicious) {
    contextCheck.signals.forEach(sig => {
      signals.push({
        id: `context_${sig.keyword}`,
        label: 'CONTEXT NEEDS VERIFICATION',
        description: sig.message,
        detail: `Payment context "${context}" contains signals that deserve extra attention.`,
        severity: sig.severity === 'high' ? 'high' : 'medium',
        icon: 'alert-triangle',
      });
      score += sig.severity === 'high' ? 2 : 1;
    });
  }

  let riskLevel;
  if (score >= 9) {
    riskLevel = 'CRITICAL';
  } else if (score >= 5) {
    riskLevel = 'HIGH CAUTION';
  } else if (score >= 2) {
    riskLevel = 'CAUTION';
  } else {
    riskLevel = 'LOW RISK';
  }

  const cautionSignals = signals.filter(s => s.severity !== 'good');

  return {
    riskLevel,
    score,
    signals,
    signalCount: cautionSignals.length,
    summary: cautionSignals.length === 0
      ? 'No unusual signals detected. This payment looks routine.'
      : `${cautionSignals.length} unusual signal${cautionSignals.length > 1 ? 's' : ''} detected.`,
    recipient,
    baseline,
    amountCheck,
    contextCheck,
  };
}

module.exports = {
  evaluateRisk,
  calculateBaseline,
  isRecipientKnown,
  isAmountUnusual,
  analyzeContext,
};
