import React, { useEffect, useState } from 'react';
import { getHistory, riskBadgeClass } from '../utils/api';
import { formatAmount, formatDateTime, riskColor } from '../utils/helpers';

export default function History() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getHistory()
      .then(d => setTransactions(d.transactions))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Loading transaction history...</div>;

  if (error) {
    return (
      <div className="empty-state">
        <div className="empty-icon">⚠️</div>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>Transaction History</h1>
        <p>All simulated transactions and their safety check results.</p>
      </div>

      {transactions.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <p>No transactions yet. Try checking a payment first.</p>
        </div>
      ) : (
        <div className="history-list">
          {transactions.map(tx => {
            const riskLabel = tx.risk_level.replace(/_/g, ' ');
            const badge = riskBadgeClass(riskLabel);
            return (
              <div className="history-item" key={tx.id}>
                <div className="tx-info">
                  <div className="tx-name">
                    {tx.recipient_name}
                    <span className={`recipient-badge ${tx.status === 'cancelled' ? 'cancelled-badge' : 'completed'}`} style={{marginLeft:'8px'}}>
                      {tx.status === 'completed' ? 'Completed' : 'Cancelled'}
                    </span>
                  </div>
                  <div className="tx-upi">{tx.recipient_upi}</div>
                  <div className="tx-context">{tx.context}</div>
                </div>
                <div className="tx-amount" style={{color: riskColor(riskLabel)}}>
                  {formatAmount(tx.amount)}
                </div>
                <div className="tx-meta">
                  <div className="tx-date">{formatDateTime(tx.created_at)}</div>
                  <div style={{marginTop:'4px'}}>
                    <span className={`risk-badge ${badge}`} style={{fontSize:'11px', padding:'3px 8px'}}>
                      {riskLabel}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
