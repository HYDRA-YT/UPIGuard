const { createClient } = require('@supabase/supabase-js');
const { DEMO_USERS } = require('../seed/demoData');
const { startOfToday } = require('../engine/limits');

// The one and only data layer: Supabase (Postgres), accessed from the backend
// with the service-role key. It implements the public API every route uses.
// NEVER pass SUPABASE_SERVICE_ROLE_KEY anywhere near the frontend.
//
// Every query is scoped by userId so each logged-in account only ever sees —
// and writes — its OWN recipients and transactions (history isolation).

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

// Recreate a seeded user row if it was removed (self-heal). Seed profiles are
// static config in demoData.js.
async function ensureUser(userId) {
  const seed = DEMO_USERS.find(u => u.id === userId);
  const rows = await run('getUserById', table('users').select('id').eq('id', userId).limit(1));
  if (rows && rows.length > 0) return;
  await run(
    'getUserById(insert)',
    table('users').insert({ id: userId, name: seed.name, upi_id: seed.upiId }).select().single()
  );
}

async function getUserById(userId) {
  await ensureUser(userId);
  const rows = await run('getUserById', table('users').select('*').eq('id', userId).limit(1));
  return rows[0];
}

async function getRecipientsForUser(userId) {
  const data = await run(
    'getRecipientsForUser',
    table('recipients').select('*').eq('user_id', userId).order('name')
  );
  return data || [];
}

async function findRecipientByUpi(userId, upiId) {
  const data = await run(
    'findRecipientByUpi',
    table('recipients').select('*').eq('user_id', userId).eq('upi_id', upiId).maybeSingle()
  );
  return data || null;
}

async function addRecipient(userId, name, upiId) {
  const existing = await findRecipientByUpi(userId, upiId);
  if (existing) return existing;
  const data = await run(
    'addRecipient',
    table('recipients').insert({ user_id: userId, name, upi_id: upiId }).select().single()
  );
  return data;
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

async function getSpentToday(userId) {
  const data = await run(
    'getSpentToday',
    table('transactions')
      .select('amount')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .gte('created_at', startOfToday().toISOString())
  );
  return (data || []).reduce((sum, t) => sum + Number(t.amount), 0);
}

async function addTransaction(userId, tx) {
  const data = await run(
    'addTransaction',
    table('transactions')
      .insert({ user_id: userId, ...tx, risk_signals: tx.risk_signals ?? [] })
      .select()
      .single()
  );
  return data;
}

async function getStatsForUser(userId) {
  const txns = await getTransactionsForUser(userId);
  const completed = txns.filter(t => t.status === 'completed');

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

// Reset = wipe app data and restore the exact seeded demo state (all three
// accounts), so the hackathon demo can be repeated cleanly — matches
// supabase/schema.sql. Deleting users cascades to recipients + transactions.
async function resetDemoData() {
  await run('reset(users)', table('users').delete().neq('id', '00000000-0000-0000-0000-000000000000'));

  for (const user of DEMO_USERS) {
    await run(
      'reset(users seed)',
      table('users').insert({ id: user.id, name: user.name, upi_id: user.upiId }).select().single()
    );
    if (user.recipients && user.recipients.length > 0) {
      await run(
        'reset(recipients seed)',
        table('recipients').insert(user.recipients.map(r => ({ ...r, user_id: user.id })))
      );
    }
    if (user.transactions && user.transactions.length > 0) {
      await run(
        'reset(transactions seed)',
        table('transactions').insert(
          user.transactions.map(({ daysAgo, ...tx }) => ({
            ...tx,
            user_id: user.id,
            risk_signals: [],
            created_at: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString(),
          }))
        )
      );
    }
  }
}

// Lightweight health probe (avoids touching demo seed assumptions).
async function ping() {
  await run('ping', table('users').select('id').limit(1));
}

module.exports = {
  ping,
  getUserById,
  getRecipientsForUser,
  findRecipientByUpi,
  addRecipient,
  getTransactionsForUser,
  getCompletedTransactionsForUser,
  getSpentToday,
  addTransaction,
  getStatsForUser,
  resetDemoData,
};