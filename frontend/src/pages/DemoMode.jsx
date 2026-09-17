import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDemoScenarios, resetDemoData } from '../utils/api';

const ICONS = {
  'check-circle': '✅',
  'trending-up': '📈',
  'user-plus': '👤',
  'alert-triangle': '⚠️',
  'shield': '🛡️',
};

export default function DemoMode() {
  const navigate = useNavigate();
  const [scenarios, setScenarios] = useState([]);
  const [resetting, setResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState('');

  useEffect(() => {
    getDemoScenarios().then(d => setScenarios(d.scenarios));
  }, []);

  const selectScenario = (s) => {
    navigate('/check', {
      state: {
        prefill: {
          recipientName: s.recipientName,
          recipientUpi: s.recipientUpi,
          amount: s.amount,
          context: s.context,
        },
      },
    });
  };

  const handleReset = async () => {
    setResetting(true);
    setResetMessage('');
    try {
      const res = await resetDemoData();
      setResetMessage(res.message || 'Database reset to seeded demo state.');
    } catch (err) {
      setResetMessage(err.message);
    } finally {
      setResetting(false);
    }
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h1>Demo Mode</h1>
          <p>Select a pre-built scenario to see UPIGuard in action. One click fills the form.</p>
        </div>
        <button className="btn btn-outline" onClick={handleReset} disabled={resetting} title="Restore seeded demo data (requires RESET_ALLOW_UNSAFE=true on the backend)">
          {resetting ? 'Resetting...' : '↺ Reset Demo Data'}
        </button>
      </div>
      {resetMessage && (
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '-16px', marginBottom: '16px' }}>{resetMessage}</p>
      )}

      <div className="philosophy" style={{ marginBottom: '24px' }}>
        <div className="tagline">Select a scenario → Click Check → See the safety check</div>
        <div className="sub">All scenarios pass through the real risk engine. No hardcoded results.</div>
      </div>

      <div className="scenarios-grid">
        {scenarios.map(s => (
          <button
            key={s.id}
            className="scenario-card"
            onClick={() => selectScenario(s)}
            aria-label={`Load scenario: ${s.name}`}
          >
            <div className="scenario-icon">{ICONS[s.icon] || '📋'}</div>
            <h3>{s.name}</h3>
            <p>{s.description}</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
              <span className="scenario-expected">Expected: {s.expectedRisk}</span>
              <span style={{ fontSize: '13px', color: 'var(--accent)', fontWeight: '600' }}>Use this →</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
