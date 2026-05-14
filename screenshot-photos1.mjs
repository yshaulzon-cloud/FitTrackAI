import { chromium } from 'playwright';
import { mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const PHOTOS_DIR = join(import.meta.dirname, 'photos1');
const CLIENT = 'http://localhost:5173';
const API = 'http://localhost:3001';
const VIEWPORT = { width: 1280, height: 800 };

if (!existsSync(PHOTOS_DIR)) mkdirSync(PHOTOS_DIR, { recursive: true });

const snap = (page, name, full = false) =>
  page.screenshot({ path: join(PHOTOS_DIR, `${name}.png`), fullPage: full })
    .then(() => console.log(`✓ ${name}.png`));

const email = `s${Date.now()}@example.com`;
const password = 'testpass123';

// Register a fresh test user via API
const reg = await fetch(`${API}/auth/register`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
});
if (!reg.ok) throw new Error('Register failed: ' + (await reg.text()));
const { token } = await reg.json();
console.log(`Test user: ${email}`);

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: VIEWPORT });
const page = await ctx.newPage();

// Splash
await page.goto(CLIENT);
await page.waitForTimeout(800);
await snap(page, '00-splash');

// Login
await page.goto(`${CLIENT}/login`);
await page.waitForTimeout(2500);
await page.waitForSelector('input[type="email"]');
await snap(page, '01-login-empty');
await page.fill('input[type="email"]', email);
await page.fill('input[type="password"]', password);
await snap(page, '02-login-filled');

// Forgot password
await page.goto(`${CLIENT}/login`);
await page.waitForSelector('input[type="email"]');
const forgot = page.locator('a, button').filter({ hasText: /שכחת|forgot/i }).first();
if (await forgot.count()) {
  await forgot.click();
  await page.waitForTimeout(500);
  await snap(page, '03-forgot-password');
}

// Register
await page.goto(`${CLIENT}/register`);
await page.waitForSelector('input[type="email"]');
await snap(page, '04-register-empty');
await page.fill('input[type="email"]', `new-${Date.now()}@example.com`);
await page.fill('input[type="password"]', 'newpass123');
await snap(page, '05-register-filled');

// Inject token to bypass rate limit on subsequent logins
await page.goto(CLIENT);
await page.evaluate((t) => localStorage.setItem('token', t), token);

// Onboarding
await page.goto(`${CLIENT}/onboarding`);
await page.waitForSelector('input');
await page.waitForTimeout(500);
await snap(page, '06-onboarding-empty', true);

await page.locator('input[type="text"]').first().fill('משתמש בדיקה');
await page.fill('input[placeholder="25"]', '28').catch(() => {});
const nums = await page.locator('input[type="number"]').all();
if (nums.length >= 3) {
  await nums[1].fill('178').catch(() => {});
  await nums[2].fill('75').catch(() => {});
}
const bulk = page.locator('text=/מסה|bulk/i').first();
if (await bulk.count()) await bulk.click().catch(() => {});
const intermediate = page.locator('text=/בינוני|intermediate/i').first();
if (await intermediate.count()) await intermediate.click().catch(() => {});
await page.waitForTimeout(500);
await snap(page, '07-onboarding-filled', true);

await page.locator('button[type="submit"]').first().click();
await page.waitForURL(/dashboard/, { timeout: 15000 }).catch(() => {});
await page.waitForTimeout(1500);

// Dashboard tabs
const tabs = ['overview', 'workout', 'nutrition', 'goals', 'xp', 'progress', 'settings'];
for (let i = 0; i < tabs.length; i++) {
  await page.evaluate((idx) => {
    const btns = document.querySelectorAll('.tabs-nav button, nav button, .bottom-nav button');
    if (btns[idx]) btns[idx].click();
  }, i);
  await page.waitForTimeout(1500);
  await snap(page, `${String(8 + i).padStart(2, '0')}-dashboard-${tabs[i]}`, true);
}

// Daily menu modal (open from nutrition tab)
await page.evaluate(() => {
  const btns = document.querySelectorAll('.tabs-nav button, nav button, .bottom-nav button');
  if (btns[2]) btns[2].click();
});
await page.waitForTimeout(1000);
const menuBtn = page.locator('button').filter({ hasText: /תפריט יומי|Daily Menu/i }).first();
if (await menuBtn.count()) {
  await menuBtn.click();
  await page.waitForTimeout(2000);
  await snap(page, '15-daily-menu', true);
}

// Legal modals (privacy + terms)
await page.goto(`${CLIENT}/login`);
await page.waitForSelector('input[type="email"]');
const privacy = page.locator('a, button').filter({ hasText: /מדיניות פרטיות|Privacy/i }).first();
if (await privacy.count()) {
  await privacy.click();
  await page.waitForTimeout(700);
  await snap(page, '16-privacy', true);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
}
const terms = page.locator('a, button').filter({ hasText: /תנאי שימוש|Terms/i }).first();
if (await terms.count()) {
  await terms.click();
  await page.waitForTimeout(700);
  await snap(page, '17-terms', true);
}

await browser.close();
console.log(`\n✅ Done — ${PHOTOS_DIR}`);
