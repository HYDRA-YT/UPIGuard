const { createClient } = require('@supabase/supabase-js');
const { DEMO_USER_ID, SEED_RECIPIENTS, SEED_TRANSACTIONS } = require('../seed/demoData');

// The one and only data layer: Supabase (Postgres), accessed from the backend
// with the service-role key. It implements the public API every route uses.
// NEVER pass SUPABASE_SERVICE_ROLE_KEY anywhere near the frontend.

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!url || !key) {
  throw new Error(
    'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in backend/.env. ' +
    'Copy backend/.env.example and fill them in.'
  );
}

const supabase = createClient(url, key);

function table(name) {
  return supabase.from(name);
}

// Wrap a Supabase call and turn PostgREST failures into thrown Errors so the
// Express error middleware reports them instead of silently returning null.
async function run(label, query) {
  const { data, error } = await query;
  if (error) {
    const err = new Error(`${label}: ${error.message}`);
    err.code = error.code;
    throw err;
  }
  return data;
}

async function getUser() {
  const rows = await run('getUser', table('users').select('*').eq('id', DEMO_USER_ID).limit(1));
  if (rows && rows.length > 0) return rows[0];
  // Self-heal: the demo user row was removed — recreate it.
  const inserted = await run(
    'getUser(insert)',
    table('users').insert({ id: DEMO_USER_ID, name: 'Demo User', upi_id: 'demo@upiguard' }).select().single()
  );
  return inserted;
}

async function getRecipients() {
  const data = await run('getRecipients', table('recipients').select('*').order('name'));
  return data || [];
}

async function findRecipientByUpi(upiId) {
  const data = await run(
    'findRecipientByUpi',
    table('recipients').select('*').eq('user_id', DEMO_USER_ID).eq('upi_id', upiId).maybeSingle()
  );
  return data || null;
}

async function addRecipient(name, upiId) {
  const existing = await findRecipientByUpi(upiId);
  if (existing) return existing;
  const data = await run(
    'addRecipient',
    table('recipients').insert({ user_id: DEMO_USER_ID, name, upi_id: upiId }).select().single()
  );
  return data;
}

async function getTransactions() {
  const data = await run(
    'getTransactions',
    table('transactions').select('*').order('created_at', { ascending: false })
  );
  return data || [];
}

async function getTransactionsForUser(userId) {
  const data = await run(
    'getTransactionsForUser',
    table('transactions').select('*').eq('user_id', userId).order('created_at', { ascending: false })
  );
  return data || [];
}

async function getCompletedTransactionsForUser(userId) {
  const data = await run(
    'getCompletedTransactionsForUser',
    table('transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
  );
  return data || [];
}

async function addTransaction(tx) {
  const data = await run(
    'addTransaction',
    table('transactions')
      .insert({ user_id: DEMO_USER_ID, ...tx, risk_signals: tx.risk_signals ?? [] })
      .select()
      .single()
  );
  return data;
}

async function getStats() {
  const txns = await getTransactions();
  const completed = await getCompletedTransactionsForUser(DEMO_USER_ID);

  const completedSet = new Set();
  const countByRecipient = {};
  completed.forEach(t => {
    if (!completedSet.has(t.recipient_upi)) {
      completedSet.add(t.recipient_upi);
      countByRecipient[t.recipient_upi] = 0;
    }
    countByRecipient[t.recipient_upi]++;
  });

  return {
    totalTransactions: txns.length,
    uniqueRecipients: completedSet.size,
    knownRecipients: Object.values(countByRecipient).filter(c => c > 1).length,
    newRecipients: Object.values(countByRecipient).filter(c => c === 1).length,
    flaggedPayments: txns.filter(t => t.risk_level !== 'LOW_RISK').length,
    cancelledPayments: txns.filter(t => t.status === 'cancelled').length,
    completedPayments: completed.length,
  };
}

// Reset = wipe app data and restore the exact seeded demo state, so the
// hackathon demo can be repeated cleanly (matches supabase/schema.sql).
async function resetDemoData() {
  await run('reset(transactions)', table('transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000'));
  await run('reset(recipients)', table('recipients').delete().neq('id', '00000000-0000-0000-0000-000000000000'));

  await run(
    'reset(recipients seed)',
    table('recipients').insert(SEED_RECIPIENTS.map(r => ({ ...r, user_id: DEMO_USER_ID })))
  );
  await run(
    'reset(transactions seed)',
    table('transactions').insert(
      SEED_TRANSACTIONS.map(({ daysAgo, ...tx }) => ({
        ...tx,
        user_id: DEMO_USER_ID,
        risk_signals: [],
        created_at: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString(),
      }))
    )
  );
}

module.exports = {
  getUser,
  getRecipients,
  findRecipientByUpi,
  addRecipient,
  getTransactions,
  getTransactionsForUser,
  getCompletedTransactionsForUser,
  addTransaction,
  getStats,
  resetDemoData,
};
