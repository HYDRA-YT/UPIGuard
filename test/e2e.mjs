// Headless end-to-end test of UPIGuard using Edge/Chrome via CDP.
// Uses puppeteer-core pointed at the system browser. Run with:
//   node test/e2e.mjs
import puppeteer from 'puppeteer-core';
import { createWriteStream } from 'fs';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const executablePath = await import('fs').then(fs => {
  return fs.existsSync(EDGE) ? EDGE : CHROME;
});

const BASE = 'http://localhost:5173';
const API = 'http://localhost:3001/api';
const results = [];
let browser;
let TOKEN = '';

function log(ok, msg) {
  const tag = ok ? 'PASS' : 'FAIL';
  results.push({ ok, msg });
  console.log(`[${tag}] ${msg}`);
}

async function waitFor(selector, page, timeout = 8000) {
  await page.waitForSelector(selector, { timeout });
}

// API helpers share one demo session so the reset endpoint (now behind auth)
// and the transaction-history probe can run.
async function apiLogin(upiId, pin) {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ upiId, pin }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`apiLogin failed: ${data.message || res.status}`);
  TOKEN = data.token;
}

async function apiRequest(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: { ...(options.headers || {}), Authorization: `Bearer ${TOKEN}` },
  });
  return res.json();
}

async function resetDemo() {
  await apiRequest('/reset', { method: 'POST' });
  await new Promise(r => setTimeout(r, 300));
}

async function apiTxCount() {
  const data = await apiRequest('/transactions/history');
  return data.transactions.length;
}

// Sign in through the real UI (login page, UPI ID + PIN, submit).
async function uiLogin(page, upiId, pin) {
  await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 15000 });
  await waitFor('#login-upi', page, 10000);
  await page.type('#login-upi', upiId);
  await page.type('#login-pin', pin);
  await page.click('.login-submit');
  await waitFor('.nav-links', page, 10000);
}

try {
  browser = await puppeteer.launch({
    executablePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu'],
  });
  await apiLogin('demo@upiguard', '1234');
  await resetDemo();
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  const errors = [];
  const unauthorized = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', err => errors.push(String(err)));
  page.on('response', r => {
    if (r.status() === 401) unauthorized.push(new URL(r.url()).pathname);
  });

  // 0. Auth gate: fresh browser has no token → login screen
  await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 15000 });
  await waitFor('#login-upi', page, 10000);
  log(true, 'Login screen shown when not signed in (auth gate works)');

  await page.type('#login-upi', 'demo@upiguard');
  await page.type('#login-pin', '0000');
  await page.click('.login-submit');
  await waitFor('.login-error', page, 8000);
  const wrongPinText = await page.evaluate(() => document.body.innerText);
  log(wrongPinText.includes('Invalid UPI ID or UPI PIN'), 'Wrong UPI PIN shows a clear error');

  await page.$eval('#login-pin', el => el.select());
  await page.type('#login-pin', '1234');
  await page.click('.login-submit');
  await waitFor('.nav-links', page, 10000);
  log(true, 'Login with the correct UPI ID + PIN loads the app');

  // 1. Dashboard loads
  await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 15000 });
  await waitFor('h1', page);
  log(true, 'Dashboard loads');
  log((await page.evaluate(() => document.body.textContent)).includes('Welcome back'), 'Dashboard greets the signed-in user');
  await page.waitForSelector('.stat-card', { timeout: 8000 });
  await page.waitForFunction(() => document.body.textContent.includes('Personal Baseline'), { timeout: 8000 }).catch(() => {});
  const statsText = await page.evaluate(() => document.body.textContent);
  log(statsText.includes('Total Transactions'), 'Dashboard shows stats');
  log(statsText.includes('Personal Baseline'), 'Dashboard shows personal baseline');
  log(statsText.includes('Typical Payment Range'), 'Dashboard shows typical range values');

  // 2. Go to check page
  await page.goto(`${BASE}/check`, { waitUntil: 'networkidle2' });
  await waitFor('#recipient-name', page);

  // 3. Fill the FULL DEMO scenario
  await page.type('#recipient-name', 'Rahul S.');
  await page.type('#recipient-upi', 'rahul@okbank');
  await page.type('#amount', '18500');
  await page.click('.context-pill.other');
  await page.type('#context', 'Cashback / Reward');
  await page.click('button[type=submit]');
  await waitFor('.safety-screen', page, 10000);
  log(true, 'Safety check screen appears');
  const safetyText = await page.evaluate(() => document.body.innerText);
  log(safetyText.includes('HIGH CAUTION'), 'Shows HIGH CAUTION');
  log(safetyText.includes('3 unusual signals'), 'Shows 3 unusual signals');
  log(safetyText.includes('NEW RECIPIENT'), 'Shows NEW RECIPIENT signal');
  log(safetyText.includes('UNUSUAL AMOUNT'), 'Shows UNUSUAL AMOUNT signal');
  log(safetyText.includes('CONTEXT NEEDS VERIFICATION'), 'Shows CONTEXT signal');

  // checklist should start with buttons disabled
  const verifyDisabled = await page.$eval('.safety-actions button:last-child', el => el.disabled);
  log(verifyDisabled === true, 'Verify & Continue disabled until checklist checked');

  // 4. CANCEL flow
  const buttons = await page.$$('.safety-actions button');
  await buttons[0].click(); // Cancel
  await waitFor('.result-screen', page, 10000);
  const cancelText = await page.evaluate(() => document.body.innerText);
  log(cancelText.includes('Payment Cancelled'), 'Cancel shows Payment Cancelled');
  log(cancelText.includes('No real money was transferred'), 'Shows disclaimer');

  // 5. Re-run and CONTINUE flow (recipient must still be NEW)
  await page.goto(`${BASE}/check`, { waitUntil: 'networkidle2' });
  await waitFor('#recipient-name', page);
  await page.type('#recipient-name', 'Rahul S.');
  await page.type('#recipient-upi', 'rahul@okbank');
  await page.type('#amount', '18500');
  await page.click('.context-pill.other');
  await page.type('#context', 'Cashback / Reward');
  await page.click('button[type=submit]');
  await waitFor('.safety-screen', page, 10000);
  const rerunText = await page.evaluate(() => document.body.innerText);
  log(rerunText.includes('NEW RECIPIENT'), 'Re-run still flags Rahul as NEW RECIPIENT');

  // check all checklist items
  const checkboxes = await page.$$('.checklist input');
  for (const cb of checkboxes) await cb.click();
  const verifyEnabled = await page.$$('.safety-actions button');
  await waitFor('button:not(:disabled)', page);
  await page.$eval('.safety-actions button:last-child', el => el.click());
  await waitFor('.result-screen', page, 10000);
  const completeText = await page.evaluate(() => document.body.innerText);
  log(completeText.includes('Payment Done'), 'Continue shows Payment Done');
  log(completeText.includes('SIMULATED PAYMENT'), 'Shows SIMULATED PAYMENT');
  log(completeText.includes('No real money was transferred'), 'Shows disclaimer on completion');

  // 6. Demo mode scenarios
  await page.goto(`${BASE}/demo`, { waitUntil: 'networkidle2' });
  await waitFor('.scenario-card', page, 10000);
  const demoCount = await page.$$eval('.scenario-card', els => els.length);
  log(demoCount >= 5, `Demo mode shows ${demoCount} scenarios`);

  // 6b. Demo mode payments must NOT be recorded in history
  const demoCountBefore = await apiTxCount();
  await page.click('.scenario-card');
  await waitFor('.demo-banner', page, 10000);
  const lockState = await page.evaluate(() => ({
    disabled: [...document.querySelectorAll('.form-input')].every(i => i.disabled),
    notes: document.querySelectorAll('.field-note').length,
  }));
  log(lockState.disabled === true, 'Demo form fields are locked (read-only)');
  log(lockState.notes >= 4, `Demo form shows per-field explanations (${lockState.notes})`);
  await page.click('button[type=submit]');
  await waitFor('.safety-screen', page, 10000);
  const demoCheckboxes = await page.$$('.checklist input');
  for (const cb of demoCheckboxes) await cb.click();
  await page.$eval('.safety-actions button:last-child', el => el.click());
  await waitFor('.result-screen', page, 10000);
  const demoResultText = await page.evaluate(() => document.body.innerText);
  const demoCountAfter = await apiTxCount();
  log(demoCountBefore === demoCountAfter, `Demo completion does NOT add to history (${demoCountBefore} === ${demoCountAfter})`);
  log(demoResultText.includes('NOT recorded in your history'), 'Demo result screen explains history is skipped');

  // 7. History page (demo user: 18 seeds + 1 cancelled + 1 completed = 20)
  await page.goto(`${BASE}/history`, { waitUntil: 'networkidle2' });
  await waitFor('.history-item', page, 10000);
  const historyCount = await page.$$eval('.history-item', els => els.length);
  log(historyCount >= 2, `History shows ${historyCount} transactions`);

  // 8. Validation errors on frontend
  await page.goto(`${BASE}/check`, { waitUntil: 'networkidle2' });
  await waitFor('button[type=submit]', page);
  await page.click('button[type=submit]');
  const errText = await page.evaluate(() => document.body.innerText);
  log(errText.includes('recipient') || errText.includes('amount') || errText.includes('UPI'), 'Frontend validation shows error for empty form');

  // 8b. QR scanner — paste a tampered UPI QR, it must warn and fill fields
  await page.goto(`${BASE}/check`, { waitUntil: 'networkidle2' });
  await waitFor('.qr-scan-btn', page, 10000);
  await page.click('.qr-scan-btn');
  await waitFor('.qr-overlay', page, 10000);
  await page.type('.qr-paste input', 'http://free-rewards.example/pay?pa=lucky@rewards&pn=Cashback%20Reward%20Winner&am=18500');
  await page.click('.qr-analyze');
  await waitFor('.qr-banner.alert', page, 10000);
  const qrBannerText = await page.evaluate(() => document.querySelector('.qr-banner').innerText);
  log(qrBannerText.includes('DANGER'), 'QR scanner flags tampered QR as DANGER');
  log(qrBannerText.includes('lucky@rewards'), 'QR warning explains the suspicious UPI ID');
  const qrFields = await page.evaluate(() => ({
    name: document.querySelector('#recipient-name').value,
    upi: document.querySelector('#recipient-upi').value,
  }));
  log(qrFields.name.includes('Cashback Reward Winner'), 'QR scan fills recipient name');
  log(qrFields.upi === 'lucky@rewards', 'QR scan fills recipient UPI ID');

  // 8c. QR scanner — a clean UPI QR must be accepted (green, fields filled)
  await page.goto(`${BASE}/check`, { waitUntil: 'networkidle2' });
  await waitFor('.qr-scan-btn', page, 10000);
  await page.click('.qr-scan-btn');
  await waitFor('.qr-overlay', page, 10000);
  await page.type('.qr-paste input', 'upi://pay?pa=priya@okbank&pn=Priya%20Sharma');
  await page.click('.qr-analyze');
  await waitFor('.qr-banner.ok', page, 10000);
  const qrOkFields = await page.evaluate(() => document.querySelector('#recipient-upi').value);
  log(qrOkFields === 'priya@okbank', 'Clean QR is accepted and fills UPI ID');

  // 9. MOBILE viewport (375x667) — safety screen must be usable
  await resetDemo();
  await page.setViewport({ width: 375, height: 667 });
  await page.goto(`${BASE}/check`, { waitUntil: 'networkidle2' });
  await waitFor('#recipient-name', page);
  await page.type('#recipient-name', 'Rahul S.');
  await page.type('#recipient-upi', 'rahul@okbank');
  await page.type('#amount', '18500');
  await page.click('.context-pill.other');
  await page.type('#context', 'Cashback / Reward');
  await page.click('button[type=submit]');
  await waitFor('.safety-screen', page, 10000);
  const mobileText = await page.evaluate(() => document.body.innerText);
  log(mobileText.includes('HIGH CAUTION'), 'Mobile: safety check shows HIGH CAUTION');

  const mobileVerifyBtn = await page.$('.safety-actions button:last-child');
  const btnBox = await mobileVerifyBtn.boundingBox();
  const btnOk = btnBox && btnBox.width >= 300 && btnBox.y >= 0;
  log(btnOk === true, 'Mobile: Verify & Continue button fits viewport');

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  log(overflow === false, 'Mobile: no horizontal overflow on safety screen');

  // 10. TABLET viewport (768x1024) — dashboard must not overflow
  await page.setViewport({ width: 768, height: 1024 });
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle2' });
  await waitFor('.stat-card', page);
  await new Promise(r => setTimeout(r, 400));
  const tabletOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  log(tabletOverflow === false, 'Tablet: no horizontal overflow on dashboard');
  const navVisible = await page.evaluate(() => {
    const links = document.querySelectorAll('.nav-links a');
    return links.length === 4 && links[3].getBoundingClientRect().right <= innerWidth;
  });
  log(navVisible === true, 'Tablet: all nav links visible on one row');

  // 11. Limits strip + per-payment limit (demo user, ₹0 spent today)
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`${BASE}/check`, { waitUntil: 'networkidle2' });
  await waitFor('.limits-strip', page, 10000);
  const stripText = await page.evaluate(() => document.querySelector('.limits-strip').innerText);
  log(stripText.includes('Used today') && stripText.includes('Max per payment'), 'Limits strip renders on check page');
  log(stripText.includes('₹50,000'), 'Limits strip shows the per-payment cap');

  await page.type('#recipient-name', 'Rahul S.');
  await page.type('#recipient-upi', 'rahul@okbank');
  await page.type('#amount', '50001');
  await page.click('.context-pill.other');
  await waitFor('#context', page);
  await page.type('#context', 'Cashback / Reward');
  await page.click('button[type=submit]');
  const perPaymentErr = await page.evaluate(() => document.body.innerText);
  log(perPaymentErr.includes('per single payment'), 'Per-payment limit blocks ₹50,001');

  // 12. Logout → daily-limit story as Asha (₹90,000 used today)
  await page.click('.logout-btn');
  await waitFor('#login-upi', page, 10000);
  log(true, 'Logout returns to the login screen');

  await page.$eval('#login-upi', el => el.select());
  await page.type('#login-upi', 'asha@okbank');
  await page.type('#login-pin', '4321');
  await page.click('.login-submit');
  await waitFor('.nav-links', page, 10000);
  const ashaNav = await page.evaluate(() => document.body.innerText);
  log(ashaNav.includes('asha@okbank'), 'Asha sign-in shows her UPI ID in the nav');

  await page.goto(`${BASE}/check`, { waitUntil: 'networkidle2' });
  await waitFor('.limits-strip', page, 10000);
  const ashaStrip = await page.evaluate(() => document.querySelector('.limits-strip').innerText);
  log(ashaStrip.includes('₹90,000') && ashaStrip.includes('₹10,000'), 'Asha limits strip shows ₹90,000 used / ₹10,000 left');

  // ₹20,000 would exceed her ₹1,00,000 daily cap
  await page.type('#recipient-name', 'Rahul S.');
  await page.type('#recipient-upi', 'rahul@okbank');
  await page.type('#amount', '20000');
  await page.click('.context-pill.other');
  await waitFor('#context', page);
  await page.type('#context', 'Friend');
  await page.click('button[type=submit]');
  const dailyErr = await page.evaluate(() => document.body.innerText);
  log(dailyErr.includes('Daily payment limit'), 'Daily-limit blocks ₹20,000 when ₹90,000 already spent today');

  // ₹5,000 is within the ₹10,000 remaining — proceeds to the safety check
  await page.$eval('#amount', el => el.select());
  await page.type('#amount', '5000');
  await page.click('button[type=submit]');
  await waitFor('.safety-screen', page, 10000);
  log(true, 'Within-limit ₹5,000 payment proceeds to the safety check');
  const ashaSafetyButtons = await page.$$('.safety-actions button');
  await ashaSafetyButtons[0].click(); // Cancel
  await waitFor('.result-screen', page, 10000);

  // 13. History isolation: each account sees only its own transactions
  await page.goto(`${BASE}/history`, { waitUntil: 'networkidle2' });
  await waitFor('.history-item', page, 10000);
  const ashaHistoryText = await page.evaluate(() => document.body.innerText);
  log(ashaHistoryText.includes('invest@wealth'), 'Asha sees her own seeded history');
  log(!ashaHistoryText.includes('priya@okbank'), 'Asha history does NOT show demo user‘s private recipient (isolation)');
  const ashaCount = await page.$$eval('.history-item', els => els.length);
  log(ashaCount !== historyCount, `History isolation: asha(${ashaCount}) ≠ demo(${historyCount})`);

  // 14. Stale session: backend restarts wipe in-memory tokens. Invalidate the
  // browser's session via the API, then navigate (client-side, no reload) to the
  // Dashboard. The failed data fetch must bounce to the login screen instead of
  // showing the raw "Please sign in..." 401 error inline on the dashboard.
  const browserToken = await page.evaluate(() => localStorage.getItem('upiguard_token'));
  await fetch(`${API}/auth/logout`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${browserToken}` },
  });
  await page.click('.nav-links a:first-child');
  await waitFor('#login-upi', page, 10000);
  const bouncedText = await page.evaluate(() => document.body.innerText);
  log(!bouncedText.includes('Please sign in with your UPI ID'), 'Stale session bounces to login instead of showing the raw auth error');

  // report errors. A 401 on /api/auth/login is the intentional wrong-PIN test;
  // 401s on the dashboard fetches are the intentional stale-session test (14).
  const badAuths = unauthorized.filter(u =>
    !u.includes('/api/auth/login') &&
    !u.includes('/api/dashboard') &&
    !u.includes('/api/baseline')
  );
  log(badAuths.length === 0, badAuths.length === 0 ? 'No unexpected 401 responses' : `Unexpected 401s: ${badAuths.join(', ')}`);
  const realErrors = errors.filter(e =>
    !e.includes('favicon') &&
    !e.includes('Download the React DevTools') &&
    !e.includes('401 (Unauthorized)')
  );
  log(realErrors.length === 0, realErrors.length === 0 ? 'No console/page errors' : `Console errors: ${realErrors.join(' | ')}`);
  if (realErrors.length) console.log(realErrors.join('\n'));

} catch (err) {
  console.error('E2E FAILED:', err.message);
  results.push({ ok: false, msg: err.message });
} finally {
  if (browser) await browser.close();
}

const failed = results.filter(r => !r.ok).length;
console.log(`\n=== E2E SUMMARY: ${results.length - failed}/${results.length} passed ===`);
process.exit(failed > 0 ? 1 : 0);