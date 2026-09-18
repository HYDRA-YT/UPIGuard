require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db/database');

const app = express();
const PORT = process.env.PORT || 3001;
const isProd = process.env.NODE_ENV === 'production';

app.disable('x-powered-by');
app.use(cors({
  origin: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(s => s.trim())
    : true, // reflect request origin — fine for a demo; set CORS_ORIGIN in production
}));
app.use(express.json({ limit: '32kb' }));

// Minimal security headers (kept dependency-free for the demo).
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  next();
});

// Public routes: auth (login is anonymous; logout/me authenticate internally)
// and health. Everything else under /api requires a session token.
app.use('/api/auth', require('./routes/auth'));

// Health reports the Supabase data layer's status, so a misconfigured
// deployment is visible immediately instead of failing on first use.
app.get('/api/health', async (req, res) => {
  try {
    await db.ping();
    res.json({ status: 'ok', mode: 'supabase', database: 'connected' });
  } catch (err) {
    res.status(503).json({ status: 'degraded', mode: 'supabase', database: 'unreachable', error: err.message });
  }
});

// Session gate: every remaining /api route needs a valid Bearer token
// (see src/middleware/auth.js). Requests set req.userId for the handlers.
app.use('/api', require('./middleware/auth').requireAuth);

app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/transactions/history', require('./routes/history'));
app.use('/api/baseline', require('./routes/baseline'));
app.use('/api/recipients', require('./routes/recipients'));
app.use('/api/demo', require('./routes/demo'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/limits', require('./routes/limits'));
app.use('/api', require('./routes/reset'));

// JSON 404 for unknown API routes (must come after all API routes).
app.use('/api', (req, res) => {
  res.status(404).json({ success: false, message: 'Not found' });
});

// Error middleware must be registered last.
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed' || err.type === 'entity.too.large') {
    return res.status(400).json({ success: false, message: 'Invalid JSON body' });
  }
  console.error('Server error:', err.message);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`\n  UPIGuard Backend running on http://localhost:${PORT}`);
  console.log('  Data layer: Supabase (live mode)');
  console.log(`  Env: ${isProd ? 'production' : 'development'}\n`);
});
