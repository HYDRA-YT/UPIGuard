import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getDashboard, getBaseline } from '../utils/api';
import { formatAmount } from '../utils/helpers';

export default function Dashboard({ user }) {
  const [data, setData] = useState(null);
  const [baseline, setBaseline] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([getDashboard(), getBaseline()])
      .then(([d, b]) => {
        setData(d);
        setBaseline(b.baseline);
      })
      .catch(err => setError(err.message));
  }, []);

  if (error) {
    return (
      <div className="empty-state">
        <div className="empty-icon">⚠️</div>
        <p>{error}</p>
      </div>
    );
  }

  if (!data) return <div className="loading">Loading...</div>;

  const firstName = user?.name?.split(' ')[0] || 'there';

  return (
    <div>
      <div className="page-header">
        <h1 className="gradient-text">Welcome back, {firstName}</h1>
        <p>Signed in as <strong>{user?.upiId}</strong> · Your Last Check Before You Pay.</p>
      </div>

      <div className="philosophy">
        <div className="tagline">Check → Explain → Pause → Decide</div>
        <div className="sub">UPIGuard doesn't decide for you. Your money. Your decision.</div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value accent">{data.stats.totalTransactions}</div>
          <div className="stat-label">Total Transactions</div>
        </div>
        <div className="stat-card">
          <div className="stat-value good">{data.stats.completedPayments}</div>
          <div className="stat-label">Payments Completed</div>
        </div>
        <div className="stat-card">
          <div className="stat-value warn">{data.stats.flaggedPayments}</div>
          <div className="stat-label">Payments Flagged</div>
        </div>
        <div className="stat-card">
          <div className="stat-value crit">{data.stats.cancelledPayments}</div>
          <div className="stat-label">Payments Cancelled</div>
        </div>
      </div>

      <div className="card two-col">
        <div>
          <div className="stat-label">Known Recipients</div>
          <div className="stat-value good" style={{ fontSize: '24px' }}>{data.stats.knownRecipients}</div>
          <div className="stat-label">Familiar payees in your history</div>
        </div>
        <div>
          <div className="stat-label">Unique Recipients</div>
          <div className="stat-value accent" style={{ fontSize: '24px' }}>{data.stats.uniqueRecipients}</div>
          <div className="stat-label">Different payees overall</div>
        </div>
      </div>

      {baseline && baseline.count > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <h3 className="section-title">Personal Baseline</h3>
          <div className="baseline-grid">
            <div className="baseline-stat">
              <div className="bl-value">{formatAmount(baseline.typicalRange.low)} – {formatAmount(baseline.typicalRange.high)}</div>
              <div className="bl-label">Typical Payment Range</div>
            </div>
            <div className="baseline-stat">
              <div className="bl-value">{formatAmount(baseline.average)}</div>
              <div className="bl-label">Average Amount</div>
            </div>
            <div className="baseline-stat">
              <div className="bl-value">{formatAmount(baseline.median)}</div>
              <div className="bl-label">Median Amount</div>
            </div>
            <div className="baseline-stat">
              <div className="bl-value">{formatAmount(baseline.totalAmount)}</div>
              <div className="bl-label">Total Spent</div>
            </div>
          </div>
          {baseline.frequentRecipients.length > 0 && (
            <div className="card">
              <div className="stat-label" style={{ marginBottom: '8px' }}>Most Frequent Recipients</div>
              {baseline.frequentRecipients.map((r, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-soft)' }}>
                  <span style={{ fontSize: '14px' }}>{r.name}</span>
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{r.count} payments</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="home-actions">
        <Link to="/check" className="btn btn-primary btn-lg">Check a Payment</Link>
        <Link to="/demo" className="btn btn-outline btn-lg">Try Demo Scenarios</Link>
      </div>
    </div>
  );
}
