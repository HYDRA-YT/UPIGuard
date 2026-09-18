import React, { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { checkTransaction, completeTransaction, getLimits, riskBadgeClass } from '../utils/api';
import { formatAmount, PAYMENT_CONTEXTS, UPI_LIMITS } from '../utils/helpers';
import { analyzeQr } from '../utils/qr';
import QrScannerModal from '../components/QrScanner';

function PaymentDoneAnimation({ cancelled }) {
  const color = cancelled ? 'var(--red)' : 'var(--green)';
  const track = cancelled ? 'rgba(248, 113, 113, 0.15)' : 'rgba(52, 211, 153, 0.18)';
  const glow = cancelled
    ? 'radial-gradient(circle, rgba(248, 113, 113, 0.35), transparent 70%)'
    : 'radial-gradient(circle, rgba(52, 211, 153, 0.4), transparent 70%)';
  const path = cancelled ? 'M44 44 l44 44 M88 44 l-44 44' : 'M46 66 l16 16 l31 -33';

  return (
    <div className={`pay-success ${cancelled ? 'is-cancelled' : ''}`}>
      <div className="glow" style={{ background: glow }} />
      <svg viewBox="0 0 132 132" role="img" aria-label={cancelled ? 'Payment cancelled' : 'Payment successful'}>
        <circle className="ring-track" cx="66" cy="66" r="52" style={{ stroke: track }} />
        <circle className="ring" cx="66" cy="66" r="52" style={{ stroke: color }} />
        <path className="check" d={path} style={{ stroke: color }} />
      </svg>
    </div>
  );
}

const STATES = {
  FORM: 'form',
  CHECKING: 'checking',
  SAFETY: 'safety',
  RESULT: 'result',
};

export default function PaymentCheck() {
  const location = useLocation();

  const prefill = location.state?.prefill || {};
  const isDemo = Boolean(location.state?.demo) && Object.keys(prefill).length > 0;
  const fieldNotes = location.state?.explain || {};

  const [formState, setFormState] = useState(STATES.FORM);
  const [recipientName, setRecipientName] = useState(prefill.recipientName || '');
  const [recipientUpi, setRecipientUpi] = useState(prefill.recipientUpi || '');
  const [amount, setAmount] = useState(prefill.amount || '');
  const [context, setContext] = useState(prefill.context || '');
  const [checkResult, setCheckResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [qrResult, setQrResult] = useState(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [limits, setLimits] = useState(null);
  const [otherMode, setOtherMode] = useState(
    () => Boolean(prefill.context) && !PAYMENT_CONTEXTS.includes(prefill.context)
  );

  useEffect(() => {
    getLimits()
      .then(d => setLimits(d.limits))
      .catch(() => {/* ambient strip — backend still enforces */});
  }, []);

  const limitsInfo = limits || {
    perPaymentMax: UPI_LIMITS.perPaymentMax,
    dailyMax: UPI_LIMITS.dailyMax,
    spentToday: 0,
    remainingToday: UPI_LIMITS.dailyMax,
  };

  const isOtherContext = otherMode || (Boolean(context) && !PAYMENT_CONTEXTS.includes(context));

  const [checklist, setChecklist] = useState({
    recipient: false,
    initiated: false,
    expecting: false,
    verified: false,
  });
  const allChecked = Object.values(checklist).every(Boolean);

  const handleCheck = async (e) => {
    e.preventDefault();
    setError('');

    if (!recipientName.trim()) return setError('Enter recipient name');
    if (!recipientUpi.trim()) return setError('Enter UPI ID');
    if (!amount || parseFloat(amount) <= 0) return setError('Enter a valid amount');
    if (!context.trim()) return setError('Select a payment context/reason');

    const amt = parseFloat(amount);
    if (amt > limitsInfo.perPaymentMax) {
      return setError(`Maximum ${formatAmount(limitsInfo.perPaymentMax)} per single payment to one payee.`);
    }
    if (limitsInfo.spentToday + amt > limitsInfo.dailyMax) {
      return setError(
        `Daily payment limit of ${formatAmount(limitsInfo.dailyMax)} would be exceeded. ` +
        `You have ${formatAmount(limitsInfo.remainingToday)} left today.`
      );
    }

    setLoading(true);
    setFormState(STATES.CHECKING);

    try {
      const res = await checkTransaction({
        recipientName: recipientName.trim(),
        recipientUpi: recipientUpi.trim(),
        amount: amt,
        context: context.trim(),
      });
      setCheckResult(res.check);
      setFormState(STATES.SAFETY);
    } catch (err) {
      setError(err.message);
      setFormState(STATES.FORM);
    } finally {
      setLoading(false);
    }
  };

  const handleQrScan = (text) => {
    const analysis = analyzeQr(text);
    const p = analysis.parsed || {};
    if (p.recipientUpi) setRecipientUpi(p.recipientUpi);
    if (p.recipientName) setRecipientName(p.recipientName);
    setQrResult({
      ok: analysis.ok,
      level: analysis.level,
      reasons: analysis.reasons,
      name: p.recipientName || '',
      upi: p.recipientUpi || '',
    });
    setScannerOpen(false);
    setError('');
  };

  const handleComplete = async (action) => {
    if (isDemo) {
      setCheckResult(prev => ({ ...prev, action }));
      setFormState(STATES.RESULT);
      return;
    }
    try {
      const res = await completeTransaction({
        recipientName: checkResult.recipientName,
        recipientUpi: checkResult.recipientUpi,
        amount: checkResult.amount,
        context: checkResult.context,
        riskLevel: checkResult.riskLevel,
        action,
      });
      setCheckResult(prev => ({ ...prev, actionResult: res, action }));
      setFormState(STATES.RESULT);
    } catch (err) {
      setError(err.message);
    }
  };

  const resetForm = () => {
    setFormState(STATES.FORM);
    setCheckResult(null);
    setError('');
    setRecipientName('');
    setRecipientUpi('');
    setAmount('');
    setContext('');
    setOtherMode(false);
    setChecklist({ recipient: false, initiated: false, expecting: false, verified: false });
  };

  if (formState === STATES.CHECKING) {
    return (
      <div style={{textAlign:'center', padding:'80px 0'}}>
        <div className="spinner" style={{width:40, height:40, margin:'0 auto 16px', borderWidth:3}} />
        <p style={{color:'var(--text-secondary)'}}>Analyzing payment safety...</p>
      </div>
    );
  }

  if (formState === STATES.SAFETY && checkResult) {
    const rc = riskBadgeClass(checkResult.riskLevel);

    return (
      <div className="safety-screen">
        <div className="safety-header">
          <h2>UPIGuard Safety Check</h2>
          <p style={{color:'var(--text-muted)', fontSize:'14px'}}>
            Before the money moves, here is what we found.
          </p>
          <div className="risk-display" style={{marginTop:'16px'}}>
            <span className={`risk-badge ${rc}`} style={{fontSize:'15px', padding:'8px 20px'}}>
              {checkResult.riskLevel}
            </span>
          </div>
          {checkResult.signalCount > 0 && (
            <p style={{marginTop:'8px', fontSize:'14px', color:'var(--text-secondary)'}}>
              {checkResult.signalCount} unusual signal{checkResult.signalCount > 1 ? 's' : ''} detected
            </p>
          )}
        </div>

        <div className="safety-tx-summary">
          <div style={{fontSize:'13px', color:'var(--text-muted)', marginBottom:'4px'}}>You are about to send</div>
          <div className="amount">{formatAmount(checkResult.amount)}</div>
          <div className="recipient">to {checkResult.recipientName} ({checkResult.recipientUpi})</div>
        </div>

        {checkResult.signals.length > 0 && (
          <div className="signals-section">
            <h3>What UPIGuard found</h3>
            {checkResult.signals.filter(s => s.severity !== 'good').map((signal, i) => (
              <div className="signal-card" key={i}>
                <div className={`signal-icon ${signal.severity}`}>
                  {signal.severity === 'high' ? '!' : signal.severity === 'medium' ? '~' : '✓'}
                </div>
                <div className="signal-content">
                  <h4 style={{color: signal.severity === 'high' ? 'var(--red)' : signal.severity === 'medium' ? 'var(--yellow)' : 'var(--green)'}}>
                    {signal.label}
                  </h4>
                  <p>{signal.description}</p>
                  {signal.detail && signal.detail !== signal.description && (
                    <p style={{fontSize:'12px', color:'var(--text-muted)', marginTop:'4px'}}>{signal.detail}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <details style={{marginBottom:'16px', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', padding:'12px 16px', background:'var(--bg-card)', color:'var(--text-secondary)', fontSize:'14px'}}>
          <summary style={{cursor:'pointer', fontWeight:'600', color:'var(--text)', outline:'none'}}>
            Why am I seeing this?
          </summary>
          <p style={{marginTop:'8px', fontSize:'13px', lineHeight:'1.6'}}>
            UPIGuard compares this payment against your own history — who you have paid before,
            how much you normally send, and the reason for the payment. These are unusual signals,
            not judgments. UPIGuard does not block you and never decides for you. Pause, verify, then decide.
          </p>
        </details>

        <div className="checklist">
          <h3>Before continuing, check:</h3>
          {[
            { key: 'recipient', text: 'Is the recipient correct?' },
            { key: 'initiated', text: 'Did you initiate this payment?' },
            { key: 'expecting', text: 'Are you expecting this request?' },
            { key: 'verified', text: 'Have you verified the source?' },
          ].map(item => (
            <div className="checklist-item" key={item.key}>
              <input
                type="checkbox"
                id={`check-${item.key}`}
                checked={checklist[item.key]}
                onChange={(e) => setChecklist(prev => ({...prev, [item.key]: e.target.checked}))}
                aria-label={item.text}
              />
              <label htmlFor={`check-${item.key}`}>{item.text}</label>
            </div>
          ))}
        </div>

        <div className="safety-actions">
          <button className="btn btn-danger btn-lg" onClick={() => handleComplete('cancelled')}>
            Cancel Payment
          </button>
          <button
            className="btn btn-primary btn-lg"
            onClick={() => handleComplete('completed')}
            disabled={!allChecked}
            title={!allChecked ? 'Please check all items first' : 'Verify and continue'}
          >
            Verify & Continue
          </button>
        </div>
        {!allChecked && (
          <p style={{textAlign:'center', fontSize:'12px', color:'var(--text-muted)', marginTop:'8px'}}>
            Please check all items before continuing
          </p>
        )}
      </div>
    );
  }

  if (formState === STATES.RESULT && checkResult) {
    const isCancelled = checkResult.action === 'cancelled';
    return (
      <div className="result-screen">
        <PaymentDoneAnimation cancelled={isCancelled} />
        <h2>{isCancelled ? 'Payment Cancelled' : 'Payment Done'}</h2>
        <div className="result-amount">{formatAmount(checkResult.amount)}</div>
        <div className="result-detail">To: {checkResult.recipientName}</div>
        <div className="result-detail">UPI: {checkResult.recipientUpi}</div>
        <div className="result-detail" style={{marginTop:'8px'}}>
          Status: <strong style={{color: isCancelled ? 'var(--red)' : 'var(--green)'}}>
            {isCancelled ? 'CANCELLED' : 'SIMULATED PAYMENT'}
          </strong>
        </div>
        <div className="result-disclaimer">
          {isDemo
            ? 'Demo scenario — this payment was NOT recorded in your history. No real money was transferred.'
            : 'No real money was transferred. This is a simulated transaction.'}
        </div>
        <div className="result-actions">
          <Link to="/" className="btn btn-outline" style={{textDecoration:'none'}}>Back to Dashboard</Link>
          <button className="btn btn-primary" onClick={resetForm}>Check Another Payment</button>
          <Link to="/history" className="btn btn-ghost" style={{textDecoration:'none'}}>View History</Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>{isDemo ? 'Demo Mode — Payment Check' : 'Check Payment Safety'}</h1>
        <p>{isDemo ? 'Fields are pre-filled and locked. Each one explains the condition it represents.' : 'Enter payment details and UPIGuard will check for unusual signals.'}</p>
      </div>

      {isDemo && (
        <div className="demo-banner">
          <span className="demo-lock">🔒</span>
          <span><strong>Demo preview — fields cannot be changed.</strong> Read the note under each field to see which condition it demonstrates.</span>
        </div>
      )}

      {error && (
        <div style={{background:'var(--red-bg)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:'var(--radius-sm)', padding:'12px 16px', marginBottom:'20px', fontSize:'14px', color:'var(--red)'}}>
          {error}
        </div>
      )}

      {qrResult && (
        <div className={`qr-banner ${qrResult.ok ? 'ok' : qrResult.level === 'danger' ? 'alert' : 'warn'}`}>
          <span className="qr-banner-icon">{qrResult.ok ? '✅' : '⚠️'}</span>
          <div style={{flex:1}}>
            <strong>
              {qrResult.ok
                ? 'QR Verified — Safe to proceed'
                : qrResult.level === 'danger'
                  ? 'DANGER — Do not pay this QR'
                  : 'CAUTION — Verify before paying'}
            </strong>
            {qrResult.ok ? (
              <p>Recipient filled from QR: {qrResult.name || qrResult.upi}</p>
            ) : (
              <ul>
                {qrResult.reasons.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            )}
          </div>
          <button type="button" className="qr-banner-close" onClick={() => setQrResult(null)} aria-label="Dismiss QR warning">✕</button>
        </div>
      )}

      <div className="limits-strip" aria-label="Payment limits">
        <span className="limits-chip">
          <span className="limits-dot" />
          Used today: <strong>{formatAmount(limitsInfo.spentToday)}</strong> / {formatAmount(limitsInfo.dailyMax)}
        </span>
        <span className="limits-chip">Remaining today: <strong>{formatAmount(limitsInfo.remainingToday)}</strong></span>
        <span className="limits-chip">Max per payment: <strong>{formatAmount(limitsInfo.perPaymentMax)}</strong></span>
      </div>

      <form onSubmit={handleCheck} className="payment-form">
        {!isDemo && (
          <button type="button" className="qr-scan-btn" onClick={() => setScannerOpen(true)}>
            📷 Scan UPI QR
          </button>
        )}

        <div className="form-group">
          <label className="form-label" htmlFor="recipient-name">Recipient Name</label>
          <input
            className="form-input"
            id="recipient-name"
            type="text"
            placeholder="e.g. Rahul S."
            value={recipientName}
            disabled={isDemo}
            onChange={(e) => setRecipientName(e.target.value)}
          />
          {isDemo && fieldNotes.recipientName && <p className="field-note">{fieldNotes.recipientName}</p>}
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="recipient-upi">Recipient UPI ID</label>
          <input
            className="form-input"
            id="recipient-upi"
            type="text"
            placeholder="e.g. rahul@okbank"
            value={recipientUpi}
            disabled={isDemo}
            onChange={(e) => setRecipientUpi(e.target.value)}
          />
          {isDemo && fieldNotes.recipientUpi && <p className="field-note">{fieldNotes.recipientUpi}</p>}
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="amount">Amount</label>
          <div className="amount-input-wrapper">
            <span className="currency">₹</span>
            <input
              className="form-input"
              id="amount"
              type="number"
              min="1"
              max="10000000"
              placeholder="0"
              value={amount}
              disabled={isDemo}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          {isDemo && fieldNotes.amount && <p className="field-note">{fieldNotes.amount}</p>}
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="context">
            Payment Context / Reason <span className="required-mark">*</span>
          </label>
          <div className="context-pills" role="group" aria-label="Payment context">
            {PAYMENT_CONTEXTS.map(c => (
              <button
                type="button"
                key={c}
                className={`context-pill ${context === c ? 'active' : ''}`}
                disabled={isDemo}
                onClick={() => { setContext(c); setOtherMode(false); }}
                aria-pressed={context === c}
              >
                {c}
              </button>
            ))}
            <button
              type="button"
              className={`context-pill other ${isOtherContext ? 'active' : ''}`}
              disabled={isDemo}
              onClick={() => {
                setOtherMode(true);
                setContext('');
                requestAnimationFrame(() => document.getElementById('context')?.focus());
              }}
              aria-pressed={isOtherContext}
            >
              Other…
            </button>
          </div>
          {isOtherContext && (
            <input
              className="form-input context-other-input"
              id="context"
              type="text"
              placeholder="Describe the reason (e.g. Cashback / Reward, Refund, Urgent…)"
              value={context}
              disabled={isDemo}
              onChange={(e) => setContext(e.target.value)}
            />
          )}
          {isDemo && fieldNotes.context && <p className="field-note">{fieldNotes.context}</p>}
        </div>

        <button type="submit" className="btn btn-primary btn-lg btn-full" disabled={loading}>
          {loading ? <><span className="spinner" /> Checking...</> : 'Check Payment'}
        </button>
      </form>

      {scannerOpen && (
        <QrScannerModal
          onClose={() => setScannerOpen(false)}
          onScan={handleQrScan}
        />
      )}
    </div>
  );
}
