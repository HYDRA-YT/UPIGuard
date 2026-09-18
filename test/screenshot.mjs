import puppeteer from 'puppeteer-core';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
import { existsSync } from 'fs';
const executablePath = existsSync(EDGE) ? EDGE : CHROME;
const BASE = 'http://localhost:5173';

const browser = await puppeteer.launch({ executablePath, headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });

for (const [name, url, setup] of [
  ['0_login', `${BASE}/`, async () => {
    // leave the app on the login screen (no token in a fresh browser)
  }],
  ['1_dashboard', `${BASE}/`, async () => {}],
  ['2_check_form', `${BASE}/check`, async () => {}],
  ['3_demo', `${BASE}/demo`, async () => {}],
  ['4_history', `${BASE}/history`, async () => {}],
  ['5_safety_check', `${BASE}/check`, async () => {
    await page.type('#recipient-name', 'Rahul S.');
    await page.type('#recipient-upi', 'rahul@okbank');
    await page.type('#amount', '18500');
    await page.click('.context-pill.other');
    await page.type('#context', 'Cashback / Reward');
    await page.click('button[type=submit]');
    await page.waitForSelector('.safety-screen', { timeout: 10000 });
  }],
  ['6_result', `${BASE}/check`, async () => {
    // continue flow: check all + verify & continue
    await page.type('#recipient-name', 'Rahul S.');
    await page.type('#recipient-upi', 'rahul@okbank');
    await page.type('#amount', '18500');
    await page.click('.context-pill.other');
    await page.type('#context', 'Cashback / Reward');
    await page.click('button[type=submit]');
    await page.waitForSelector('.safety-screen', { timeout: 10000 });
    const cbs = await page.$$('.checklist input');
    for (const cb of cbs) await cb.click();
    await page.$eval('.safety-actions button:last-child', el => el.click());
    await page.waitForSelector('.result-screen', { timeout: 10000 });
  }],
]) {
  if (name === '0_login') {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 });
    await page.waitForSelector('#login-upi', { timeout: 10000 });
    await new Promise(r => setTimeout(r, 800));
    await page.screenshot({ path: `shots/${name}.png`, fullPage: true });
    console.log('captured', name);

    // sign in for every page after this
    await page.type('#login-upi', 'demo@upiguard');
    await page.type('#login-pin', '1234');
    await page.click('.login-submit');
    await page.waitForSelector('.nav-links', { timeout: 10000 });
    continue;
  }

  await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 });
  if (setup) await setup();
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: `shots/${name}.png`, fullPage: true });
  console.log('captured', name);
}

await browser.close();