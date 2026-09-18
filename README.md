# UPIGuard — Your Last Check Before You Pay

**Venture Hackathon 2026 · FinTech / Digital Payment Security**

UPIGuard is a **pre-payment transaction safety layer**. It inserts one extra step into
the usual payment flow:

```
PAYMENT REQUEST → ENTER DETAILS → CHECK PAYMENT → PAUSE & VERIFY → USER DECIDES → SIMULATED PAYMENT
```

It answers three questions before any (simulated) payment:

- **WHO?** Who am I paying? Is this a new / unfamiliar recipient?
- **HOW MUCH?** Is this amount unusual compared with *my own* payment history?
- **WHY?** Does the payment context contain social-engineering signals (cashback, refund, urgency…)?

> ⚠️ **IMPORTANT DISCLAIMER**
> This is a **hackathon MVP / demo application**. It is **NOT** a real UPI or payment app.
> It does **NOT** connect to banks, UPI rails, payment gateways, or move real money.
> All transactions are **simulated**. Authentication is a **demo-only** login using UPI ID + UPI PIN
> (PINs are plaintext in server config, never hashed, never sent to a bank) with in-memory sessions.
> UPIGuard is **not** an AI fraud detector — it uses transparent, explainable, rule-based safety logic.

---

## Philosophy

> **Check → Explain → Pause → Decide**

- UPIGuard **ADVISES**. It **never blocks** and **never decides for you**.
- Every warning explains exactly which signals caused it — in human language, never
  fake scores like "87% fraud".
- The final decision always stays with the user.

## Features

- **Sign In (UPI ID + UPI PIN)** — demo accounts only; each account has fully **isolated history, recipients, and baseline**. Logout via the avatar chip in the nav.
- **Payment limits (hard caps)** — at most **₹1,00,000 per calendar day** and **₹50,000 per single payment** to one payee. Enforced on the backend (`/api/transactions/check` **and** `/complete`) and previewed live on the payment form via the limits strip.
- **Transaction Input Module** — simulate a payment (recipient, UPI ID, amount, context, note).
- **QR Payment Scanner** — scan any UPI QR (camera or pasted) to auto-fill recipient name and UPI ID.
- **QR Tamper Detector** — flags QR codes that are not genuine `upi://` links, have malformed UPI IDs, embed amounts, or contain scam keywords (cashback/reward/lottery…) with a clear DANGER / CAUTION verdict.
- **Context Chips** — payment reason is chosen from required clickable chips (Food, Shopping, Rent, Entertainment…) with an **Other…** option.
- **Demo Mode (locked)** — scenario fields are pre-filled, read-only, and each field explains the condition it demonstrates.
- **Recipient Module** — detects KNOWN vs NEW recipients from the user's *completed* history.
- **Amount Check** — compares against the user's **personal baseline** (no universal threshold).
- **New Recipient Warning** — "First payment to this payee".
- **Transaction History** — all simulated transactions with risk level and action.
- **Personal Baseline** — typical range, average, median, frequent recipients.
- **Risk Alert Module** — risk level with a full explainable signal breakdown.
- **Safety Checklist** — "Is the recipient correct? Did you initiate this? …" before continuing.
- **Pause & Verify Screen** — the deliberate pause before payment; Cancel or Verify & Continue.
- **Payment Completion / Cancellation** — simulated, with a clear "No real money transferred" label.
- **Demo Mode** — one-click pre-built scenarios for the live hackathon presentation. Demo payments are **never recorded** in history — they exist only to understand caution levels.
- **Demo Reset** — `POST /api/reset` wipes and reseeds Supabase to repeat the demo cleanly (guarded, see below).

### Risk levels

Risk levels are **safety levels, not fraud probabilities**. Never displayed as percentages.

| Level | Meaning |
| --- | --- |
| `LOW RISK` | No unusual signals. Routine payment. |
| `CAUTION` | One noteworthy signal. Pause and verify. |
| `HIGH CAUTION` | Multiple strong signals (e.g. new recipient + unusual amount). |
| `CRITICAL` | Extreme combination of signals. Reserved for the most unusual inputs. |

### Risk-engine rules (exact)

1. **New recipient + high/unusual amount** → HIGH CAUTION
2. **Amount significantly above the user's usual range** → CAUTION (or higher)
3. **New recipient + unusual amount + suspicious context** → HIGH CAUTION / CRITICAL
4. **Known recipient + normal amount + normal context** → LOW RISK

Signals are scored transparently:

| Signal | Score |
| --- | --- |
| New recipient | +3 |
| Unusual amount (much higher than range) | +3 |
| Unusual amount (above range) | +2 |
| Very high context signal (cashback, reward, KYC, "send money to receive"…) | +2 |
| Medium context signal (refund, urgent, emergency…) | +1 |

Thresholds: `0–1 → LOW RISK`, `2–4 → CAUTION`, `5–8 → HIGH CAUTION`, `≥9 → CRITICAL`.

### Personal baseline

The baseline is computed from the user's **completed** transactions only (cancelled
payments never make a recipient "known" and never shape the baseline):

- typical payment range `[low, high]` derived from the median of routine payments
- average, median, min, max amount
- total spent and most frequent recipients

Example from seed data: the demo user's typical range is **₹500 – ₹2,000**, so:

- User checking ₹18,500 → **UNUSUAL**
- A recipient of ₹18,500 that they pay monthly would naturally be reflected in their own history.

## Tech stack

| Layer | Tech |
| --- | --- |
| Frontend | React 18, Vite 5, React Router |
| Backend | Node.js, Express 4, express-validator |
| Database | **Supabase (Postgres) — the only data layer** |
| API | REST + JSON |
| Risk engine | Pure rule-based JavaScript (no ML, no black box) |

### Architecture

```
React/Vite frontend
        ↓  REST (fetch /api/...)
Node.js + Express
        ↓
Risk Engine (rules, personal baseline, context detection)
        ↓
Supabase (Postgres) via src/db/database.js → src/db/supabaseData.js
```

## Folder structure

```
UPIGuard/
├── backend/
│   ├── src/
│   │   ├── server.js            # Express app entry (auth gate + routes)
│   │   ├── routes/              # REST API routes (incl. auth.js, limits.js)
│   │   ├── auth/                # demo accounts + in-memory sessions
│   │   ├── middleware/auth.js   # Bearer-token session guard (requireAuth)
│   │   ├── engine/riskEngine.js # rule-based risk engine (the core logic)
│   │   ├── engine/limits.js     # ₹50k/payment + ₹1L/day hard caps
│   │   ├── db/
│   │   │   ├── database.js      # data-layer entry (re-exports Supabase)
│   │   │   └── supabaseData.js  # Supabase data layer (the only one)
│   │   ├── seed/demoData.js     # canonical seed used by schema.sql + reset
│   │   └── utils/asyncHandler.js
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── App.jsx              # session gate + routes + nav + background FX
│   │   ├── pages/               # Login, Dashboard, PaymentCheck, DemoMode, History
│   │   ├── utils/auth.js        # token helpers (localStorage)
│   │   ├── utils/api.js         # fetch wrapper (Bearer header)
│   │   ├── utils/helpers.js     # formatting helpers
│   │   └── index.css            # design system (aurora/grid background FX)
│   └── vite.config.js           # proxies /api → :3001
├── supabase/schema.sql          # Supabase tables + seed (3 accounts, for live mode)
├── test/                        # E2E tests (puppeteer-core, headless Edge/Chrome)
└── package.json                 # convenience scripts
```

## API endpoints

> All `/api` routes **except `/api/auth/login` and `/api/health`** require an
> `Authorization: Bearer <token>` header from `POST /api/auth/login`.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/auth/login` | Sign in with `{upiId, pin}` → `{token, user}`. |
| `POST` | `/api/auth/logout` | Invalidate the current session token. |
| `GET` | `/api/auth/me` | Validate a stored token and return the signed-in user. |
| `POST` | `/api/transactions/check` | Evaluate a payment before sending. Body: `{recipientName, recipientUpi, amount, context}`. Returns risk level + explainable signals. Rejects amounts above the limits (`400`). |
| `POST` | `/api/transactions/complete` | Record a **simulated** outcome. Body includes `riskLevel` and `action: 'completed' \| 'cancelled'`. Re-enforces limits before a `completed` action. |
| `GET` | `/api/transactions/history` | All simulated transactions **for the signed-in user**. |
| `GET` | `/api/baseline` | Personal payment baseline. |
| `GET` | `/api/recipients` | Recipients enriched with known/new status. |
| `GET` | `/api/dashboard` | Summary stats for the signed-in user. |
| `GET` | `/api/limits` | `{perPaymentMax, dailyMax, spentToday, remainingToday}` + formatted strings. |
| `GET` | `/api/demo` | Demo scenarios (and `/api/demo/:id`). |
| `POST` | `/api/reset` | Wipe + reseed the database (all three accounts). **Disabled (403) unless `RESET_ALLOW_UNSAFE=true`** — it deletes all data. |
| `GET` | `/api/health` | Health + Supabase connectivity (`503` when the database is unreachable). |

Input validation covers: missing recipient, invalid UPI ID, invalid/negative amounts,
extreme amounts (capped at 1,00,00,000), missing context, and missing auth token (`401`).

### Demo accounts

| UPI ID | UPI PIN | What it demonstrates |
| --- | --- | --- |
| `demo@upiguard` | `1234` | Flagship demo — the full 18-transaction history, baseline ₹500 – ₹2,000. |
| `asha@okbank` | `4321` | **Daily limit** story — ₹90,000 already spent today (₹10,000 left). |
| `ravi@gpay` | `2468` | A lighter, different history. |

PINs live in `backend/src/auth/accounts.js` (server-side only, plaintext on purpose — demo).

## Setup

### 1. Install dependencies

```bash
# from project root
npm install --prefix backend
npm install --prefix frontend
```

### 2. Set up Supabase (required — the only data layer)

1. Create a Supabase project.
2. Open the SQL Editor and run **`supabase/schema.sql`** (creates `users`, `recipients`, `transactions` + seed data for the three demo accounts; idempotent).
3. Copy **`backend/.env.example`** to `backend/.env` and fill in:

```env
PORT=3001
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=service-role-key   # server-only, NEVER on the frontend
CORS_ORIGIN=                                  # optional in dev; set in production
RESET_ALLOW_UNSAFE=false                      # flip to true to enable POST /api/reset
```

See **`backend/.env.example`** for every supported variable.

4. Start the backend.

> The backend **will not start without Supabase credentials** — there is no in-memory
> fallback anymore. The service-role key is read **only** on the server and is never
> exposed to the frontend. Check `GET /api/health` → `{ "status": "ok", "database": "connected" }`.

### 3. Run

```bash
# Terminal 1 — backend
npm run dev --prefix backend        # http://localhost:3001

# Terminal 2 — frontend
npm run dev --prefix frontend       # http://localhost:5173
```

Open **http://localhost:5173**.

## Deployment checklist

The app is two deployables: a **static React bundle** (`frontend/dist`) and a **Node service** (`backend`).

### 1. Backend — Render / Railway / Fly.io / any Node host
- [ ] Set env vars: `NODE_ENV=production`, `PORT` (host-provided), `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
- [ ] Set `CORS_ORIGIN=https://your-frontend-domain` so the API only accepts requests from your UI.
- [ ] Leave `RESET_ALLOW_UNSAFE` unset in production — `/api/reset` stays disabled.
- [ ] Remember sessions are **in-memory**: a restart logs everyone out. The frontend treats any `401` from a data call as "session expired" — it clears the token and returns to the login screen (see `frontend/src/utils/api.js`). Fine for a demo; use a real session store for production.
- [ ] Health check path for your host: `/api/health` → `200` with `"database": "connected"`, `503` when Supabase is unreachable.

### 2. Frontend — Vercel / Netlify / static hosting
- [ ] Build with `npm run build` inside `frontend/`, deploy the `frontend/dist` folder.
- [ ] If the API lives on a different domain, set `VITE_API_URL=https://your-api-domain/api` at **build time** (default `/api` relies on a same-origin proxy, which Vite dev provides automatically).
- [ ] SPA fallback: serve `index.html` for unknown routes (Vercel/Netlify SPA presets do this out of the box).

### 3. Pre-flight sanity checks
- [ ] `/api/health` reports the expected `mode`.
- [ ] Run `npm run test:e2e` locally (against dev servers) before deploying.
- [ ] Walk the flagship demo flow once on the deployed URL: Demo Mode → scenario 5 → HIGH CAUTION → cancel → re-run → verify & continue.

## Demo Mode

Open **Demo Mode** in the nav (or use the scenario cards on the Dashboard):

| Scenario | Expected result |
| --- | --- |
| 1. Safe normal payment (known, normal, normal) | `LOW RISK` |
| 2. Unusual high amount (known recipient) | `CAUTION` |
| 3. New recipient (normal amount) | `CAUTION` |
| 4. Suspicious cashback context | `HIGH CAUTION` |
| 5. **Rahul S. · rahul@okbank · ₹18,500 · Cashback / Reward** | `HIGH CAUTION` — **3 signals** |

All scenarios pass through the real risk engine — nothing is hardcoded.

### The flagship demo flow

1. Open **UPIGuard** → sign in with the `demo@upiguard` / `1234` account → click **Demo Mode**.
2. Select **"New Recipient + Unusual Amount + Cashback"** (or scenario 5).
3. Shows: Rahul S. · rahul@okbank · ₹18,500 · Cashback / Reward.
4. Click **CHECK PAYMENT**.
5. Risk engine computes **HIGH CAUTION · 3 unusual signals detected**:
   - ✓ New recipient — first payment to this payee
   - ✓ Amount is much higher than usual — usual range ₹500 – ₹2,000
   - ✓ Payment context needs verification — cashback/reward requests deserve extra verification
6. Checklist: Is the recipient correct? / Did you initiate this payment? / Are you expecting this request? / Have you verified the source?
7. **CANCEL PAYMENT** → "Payment Cancelled. No money was transferred."
8. Run it again → **VERIFY & CONTINUE** → "Payment Done — No real money was transferred."

> Demo-mode payments run to completion are **not added to the transaction history** — they exist purely
> to demonstrate the caution levels. Only payments checked from the normal **Check Payment** page are recorded.

This demonstrates the core idea: **UPIGuard does not block. It explains, pauses, and lets the user decide.**

## Testing

### End-to-end (headless browser)

```bash
# ensure backend + frontend are running, then:
npm run test:e2e                  # uses Edge/Chrome via puppeteer-core
```

The suite covers: login (wrong PIN + correct PIN), dashboard, baseline, full demo scenario,
cancel flow, continue flow, history + per-account history isolation, validation errors,
QR tamper/clean flows, **per-payment and daily payment limits**, and mobile/tablet viewport
checks. It also asserts that no unexpected console or page errors occur.

### Manual test scenarios

1. Normal known recipient → LOW RISK
2. New recipient → CAUTION
3. Unusual amount (known recipient) → CAUTION
4. Suspicious context (cashback) → CAUTION/HIGH CAUTION
5. New recipient + unusual amount + suspicious context → HIGH CAUTION (3 signals)
6. Invalid amount / negative / huge → 400 with clear error
7. Missing recipient / missing context → 400
8. Cancel flow → "Payment Cancelled"
9. Continue flow → "Payment Simulation Complete"

## Security notes (even for a demo)

- No real financial credentials, UPI passwords, or OTPs are ever requested or stored.
- The login uses **demo account PINs** that live server-side in `backend/src/auth/accounts.js` (plaintext on purpose — there is nothing to protect, it is simulated).
- Sessions are random Bearer tokens held in a server-side in-memory map (`backend/src/auth/sessions.js`); tokens are never persisted client-side beyond the frontend's own localStorage.
- Every data query is scoped to the signed-in user (`user_id`), so accounts cannot read each other's history.
- Hard payment caps (₹50,000 per payment, ₹1,00,000 per day) are enforced on the backend, not just the UI.
- No real payment rails are ever contacted; transactions are simulated only.
- All backend inputs are validated and sanitized.
- Keys live in environment variables; the Supabase service role key is **server-only**.
- No AI/ML, no fake fraud percentages, no unnecessary analytics.

## License

MIT — for hackathon/demo purposes. This is not affiliated with any bank or UPI provider.