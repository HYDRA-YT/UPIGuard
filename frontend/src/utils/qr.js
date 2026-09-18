const SUSPICIOUS_KEYWORDS = [
  'cashback', 'reward', 'prize', 'lottery', 'winner', 'jackpot',
  'refund', 'kyc', 'claim', 'congratulations', 'free', 'bonus',
  'voucher', 'gift', 'lucky', 'luck', 'investment', 'urgent', 'send', 'verify',
];

const lower = (s) => (s || '').toLowerCase();

function hits(text) {
  const s = lower(text);
  return [...new Set(SUSPICIOUS_KEYWORDS.filter(k => s.includes(k)))];
}

export function isValidUpiId(upi) {
  return /^[a-zA-Z0-9._-]{2,}@[a-zA-Z][a-zA-Z0-9._-]{1,}$/.test(upi || '');
}

// Analyzes the raw content of a scanned UPI QR code.
// Returns:
//   ok      - true when no dangerous/cautious signal was found
//   level   - 'ok' | 'warning' | 'danger'
//   reasons - human-readable list of signals found (empty when ok)
//   parsed  - extracted { recipientUpi, recipientName, amount, note } or null
export function analyzeQr(raw) {
  const text = (raw || '').trim();
  if (!text) {
    return {
      ok: false,
      level: 'danger',
      reasons: ['No QR content detected — this QR cannot be scanned safely.'],
      parsed: null,
    };
  }

  let url;
  try {
    url = new URL(text);
  } catch {
    return {
      ok: false,
      level: 'danger',
      reasons: ['This QR does not contain a valid UPI payment link. The code may be corrupted or tampered with.'],
      parsed: null,
    };
  }

  const protocol = (url.protocol || '').replace(':', '').toLowerCase();
  const params = {};
  for (const [key, value] of url.searchParams) params[key.toLowerCase()] = value;

  const pa = (params.pa || '').trim();
  const pn = (params.pn || '').trim();
  const am = params.am !== undefined && params.am !== '' ? Number(params.am) : null;
  const tn = (params.tn || '').trim();

  const reasons = [];

  const upiMalformed = pa && !isValidUpiId(pa);

  if (protocol !== 'upi') {
    reasons.push(`This QR opens a "${protocol}" link instead of a UPI payment (upi://...). QR codes that point to websites are a common tampering trick.`);
  }

  if (!pa) {
    reasons.push('The QR is missing the payee UPI ID. It cannot be used for a safe payment.');
  } else if (upiMalformed) {
    reasons.push(`The payee UPI ID "${pa}" looks malformed. Genuine UPI IDs look like name@bank.`);
  }

  if (pn) {
    const nameHits = hits(pn);
    if (nameHits.length) {
      reasons.push(`The payee name "${pn}" contains suspicious words (${nameHits.join(', ')}) that are commonly used in scams.`);
    }
  }

  if (pa) {
    const upiHits = hits(pa);
    if (upiHits.length) {
      reasons.push(`The UPI ID "${pa}" itself looks suspicious (${upiHits.join(', ')}).`);
    }
  }

  if (tn) {
    const noteHits = hits(tn);
    if (noteHits.length) {
      reasons.push(`The note inside the QR contains suspicious words (${noteHits.join(', ')}).`);
    }
  }

  if (am !== null && am > 0) {
    reasons.push(`This QR has an amount of ₹${am.toLocaleString('en-IN')} embedded in it. Tampered QRs pre-fill amounts to pressure you into paying more than intended.`);
  }

  const parsed = { recipientUpi: pa || undefined, recipientName: pn || undefined, amount: am || undefined, note: tn || undefined };
  const hasParsed = parsed.recipientUpi || parsed.recipientName || parsed.amount;

  if (reasons.length === 0) {
    return { ok: true, level: 'ok', reasons: [], parsed: hasParsed ? parsed : null };
  }

  const structural = protocol !== 'upi' || !pa || upiMalformed;
  return {
    ok: false,
    level: structural ? 'danger' : 'warning',
    reasons,
    parsed: hasParsed ? parsed : null,
  };
}