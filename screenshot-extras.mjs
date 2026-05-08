import { chromium } from 'playwright';
import { mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PHOTOS_DIR = join(__dirname, 'photos');
const CLIENT_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:3001';
const VIEWPORT = { width: 1280, height: 800 };
const MOBILE_VIEWPORT = { width: 390, height: 844 };

if (!existsSync(PHOTOS_DIR)) mkdirSync(PHOTOS_DIR, { recursive: true });

async function snap(page, name) {
  const path = join(PHOTOS_DIR, `${name}.png`);
  await page.screenshot({ path, fullPage: false });
  console.log(`✓ ${name}.png`);
}
async function snapFull(page, name) {
  const path = join(PHOTOS_DIR, `${name}.png`);
  await page.screenshot({ path, fullPage: true });
  console.log(`✓ ${name}.png (full page)`);
}

async function main() {
  // Pre-create a test user via API for nutrition logging flow
  const email = `extras-${Date.now()}@example.com`;
  const password = 'testpass123';
  const regRes = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const regData = await regRes.json();
  if (!regRes.ok) throw new Error(`Register failed: ${regData.message}`);
  const token = regData.token;
  console.log(`Registered: ${email}`);

  // Complete onboarding via API
  const onboardRes = await fetch(`${API_URL}/user/onboarding`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      name: 'נועם',
      age: 28, height: 178, weight: 75,
      gender: 'male', goal: 'bulk', workoutsPerWeek: 4, experience: 'intermediate',
    }),
  });
  if (!onboardRes.ok) {
    const o = await onboardRes.json();
    console.warn('Onboarding API note:', o.message);
  }

  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: VIEWPORT });
  const page = await context.newPage();

  // ── 16: Splash screen ─────────────────────────────────
  await page.goto(CLIENT_URL);
  await page.waitForTimeout(400); // catch the splash before fade
  await snap(page, '16-splash-screen');
  await page.waitForTimeout(2200); // let splash finish

  // ── 17: Login with error ──────────────────────────────
  await page.goto(`${CLIENT_URL}/login`);
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  await page.fill('input[type="email"]', 'doesnotexist@example.com');
  await page.fill('input[type="password"]', 'wrongpassword');
  await page.locator('button[type="submit"]').first().click();
  await page.waitForSelector('.error-message', { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(400);
  await snap(page, '17-login-error');

  // ── 18: Forgot password code step ─────────────────────
  await page.goto(`${CLIENT_URL}/login`);
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  const forgotLink = page.locator('a').filter({ hasText: /שכחת|forgot/i });
  await forgotLink.first().click();
  await page.waitForTimeout(400);
  // Fill email and click "שלח קוד"
  await page.fill('input[type="email"]', email);
  await page.locator('button[type="submit"]').first().click();
  // Wait for the code input to appear
  await page.waitForSelector('input[autocomplete="one-time-code"]', { timeout: 10000 });
  await page.waitForTimeout(400);
  await snap(page, '18-reset-code');

  // Fill code partially to show the styled input
  await page.fill('input[autocomplete="one-time-code"]', '123456');
  await page.fill('input[autocomplete="new-password"]', 'newpassword123');
  await page.waitForTimeout(300);
  await snap(page, '19-reset-code-filled');

  // ── 20: Onboarding with BMI gauge active ──────────────
  // Use a fresh user for onboarding (so we can re-trigger the form)
  const obEmail = `ob-${Date.now()}@example.com`;
  const obReg = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: obEmail, password }),
  });
  const obData = await obReg.json();
  await page.goto(CLIENT_URL);
  await page.evaluate((t) => localStorage.setItem('token', t), obData.token);

  await page.goto(`${CLIENT_URL}/onboarding`);
  await page.waitForSelector('input', { timeout: 10000 });
  await page.waitForTimeout(400);

  // Fill so BMI gauge appears
  await page.locator('input[type="text"]').first().fill('נועם');
  await page.fill('input[placeholder="25"]', '28');
  const numberInputs = await page.locator('input[type="number"]').all();
  if (numberInputs.length >= 3) {
    await numberInputs[1].fill('178'); // height
    await numberInputs[2].fill('75');  // weight
  }
  // Pick a goal
  const goalCard = page.locator('button').filter({ hasText: /עלייה במסה|bulk/i }).first();
  if (await goalCard.count()) await goalCard.click().catch(() => {});
  // Pick experience
  const expCard = page.locator('button').filter({ hasText: /בינוני|intermediate/i }).first();
  if (await expCard.count()) await expCard.click().catch(() => {});

  await page.waitForTimeout(500);
  await snapFull(page, '20-onboarding-bmi-active');

  // ── 21: Nutrition with logged meal (timeline filled) ──
  // Log a meal via API for the 1st test user, then navigate
  await fetch(`${API_URL}/nutrition/log`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ description: 'חזה עוף 200 גרם עם אורז' }),
  }).catch(() => {});
  await fetch(`${API_URL}/nutrition/log`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ description: '2 ביצים מקושקשות' }),
  }).catch(() => {});

  await page.goto(CLIENT_URL);
  await page.evaluate((t) => localStorage.setItem('token', t), token);
  await page.goto(`${CLIENT_URL}/dashboard`);
  await page.waitForTimeout(2500);
  // Click nutrition tab
  await page.evaluate(() => {
    const buttons = document.querySelectorAll('.sidebar-nav button, nav button');
    const ids = ['overview','workout','nutrition','goals','xp','progress','settings'];
    const idx = ids.indexOf('nutrition');
    if (buttons[idx]) buttons[idx].click();
  });
  await page.waitForTimeout(1500);
  await snapFull(page, '21-nutrition-logged-meals');

  // ── 22: Nutrition with full timeline (meals + recommended menu) ──
  const menuBtn = page.locator('button').filter({ hasText: /תפריט מומלץ|recommended menu/i }).first();
  if (await menuBtn.count()) {
    await menuBtn.click();
    await page.waitForTimeout(2500);
    await snapFull(page, '22-nutrition-timeline-full');
  }

  // ── 23: Mobile login ──────────────────────────────────
  const mobileContext = await browser.newContext({ viewport: MOBILE_VIEWPORT });
  const mobile = await mobileContext.newPage();
  await mobile.goto(`${CLIENT_URL}/login`);
  await mobile.waitForTimeout(2400);
  await mobile.waitForSelector('input[type="email"]', { timeout: 10000 });
  await snapFull(mobile, '23-mobile-login');

  // ── 24: Mobile dashboard overview ─────────────────────
  await mobile.evaluate((t) => localStorage.setItem('token', t), token);
  await mobile.goto(`${CLIENT_URL}/dashboard`);
  await mobile.waitForTimeout(2500);
  await snapFull(mobile, '24-mobile-dashboard');

  await browser.close();
  console.log('\nאל הצילומים: ' + PHOTOS_DIR);
}

main().catch(err => {
  console.error('Screenshot script error:', err);
  process.exit(1);
});
