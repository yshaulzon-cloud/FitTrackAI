import { chromium } from 'playwright';
import { mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PHOTOS_DIR = join(__dirname, 'photos');
const CLIENT_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:3001';
const VIEWPORT = { width: 1280, height: 800 };

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

async function dismissSplash(page) {
  // Splash screen auto-dismisses after 2 seconds
  await page.waitForTimeout(2500);
}

async function main() {
  const email = `screenshot-${Date.now()}@example.com`;
  const password = 'testpass123';

  // Pre-create the user via API so onboarding has a real account behind it
  const regRes = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const regData = await regRes.json();
  if (!regRes.ok) throw new Error(`Register failed: ${regData.message}`);
  const token = regData.token;
  console.log(`Registered test user: ${email}`);

  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: VIEWPORT });
  const page = await context.newPage();

  // === PUBLIC PAGES ===
  // Login page
  await page.goto(`${CLIENT_URL}/login`);
  await dismissSplash(page);
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  await snap(page, '01-login-empty');

  // Login page - filled
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await snap(page, '02-login-filled');

  // Login page - forgot password
  await page.goto(`${CLIENT_URL}/login`);
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  // Click "forgot password" link
  const forgotLink = page.locator('a').filter({ hasText: /שכחת|forgot/i });
  if (await forgotLink.count()) {
    await forgotLink.first().click();
    await page.waitForTimeout(500);
    await snap(page, '03-forgot-password');
  }

  // Register page
  await page.goto(`${CLIENT_URL}/register`);
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  await snap(page, '04-register-empty');

  await page.fill('input[type="email"]', `new-${Date.now()}@example.com`);
  await page.fill('input[type="password"]', 'newpass123');
  await snap(page, '05-register-filled');

  // === LOG IN AS OUR USER ===
  // Inject token into localStorage so we don't trigger the rate limiter
  await page.goto(CLIENT_URL);
  await page.evaluate((t) => localStorage.setItem('token', t), token);

  // === ONBOARDING ===
  await page.goto(`${CLIENT_URL}/onboarding`);
  await page.waitForSelector('input', { timeout: 10000 });
  await page.waitForTimeout(500);
  await snapFull(page, '06-onboarding-empty');

  // Fill onboarding form
  const nameInput = page.locator('input[type="text"]').first();
  await nameInput.fill('משתמש בדיקה');
  await page.fill('input[placeholder="25"]', '28');
  // Height & weight - find the next two number inputs
  const numberInputs = await page.locator('input[type="number"]').all();
  if (numberInputs.length >= 3) {
    await numberInputs[1].fill('178');
    await numberInputs[2].fill('75');
  }

  // Goal - select bulk via radio/option
  const bulkBtn = page.locator('text=/מסה|bulk/i').first();
  if (await bulkBtn.count()) await bulkBtn.click().catch(() => {});

  // Experience - intermediate
  const intermediateBtn = page.locator('text=/בינוני|intermediate/i').first();
  if (await intermediateBtn.count()) await intermediateBtn.click().catch(() => {});

  await page.waitForTimeout(500);
  await snapFull(page, '07-onboarding-filled');

  // Submit onboarding
  const submitBtn = page.locator('button[type="submit"]').first();
  await submitBtn.click();
  await page.waitForURL(/dashboard/, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1500);

  // === DASHBOARD TABS ===
  const tabs = [
    { id: 'overview', name: '08-dashboard-overview' },
    { id: 'workout', name: '09-dashboard-workout' },
    { id: 'nutrition', name: '10-dashboard-nutrition' },
    { id: 'goals', name: '11-dashboard-goals' },
    { id: 'xp', name: '12-dashboard-xp' },
    { id: 'progress', name: '13-dashboard-progress' },
    { id: 'settings', name: '14-dashboard-settings' },
  ];

  for (const tab of tabs) {
    // Click the tab button by matching its data attribute or by its text
    const clicked = await page.evaluate((tabId) => {
      const buttons = Array.from(document.querySelectorAll('button'));
      // Match by onClick handler isn't possible, but tabs use icon emojis. Try data hooks.
      // Simpler: find buttons in the nav and click by index based on tab id.
      const tabIds = ['overview', 'workout', 'nutrition', 'goals', 'xp', 'progress', 'settings'];
      const idx = tabIds.indexOf(tabId);
      // The Dashboard renders tabs in two places (top + bottom). Just click whatever matches.
      const navButtons = document.querySelectorAll('.tabs-nav button, nav button, .bottom-nav button');
      if (navButtons[idx]) {
        navButtons[idx].click();
        return true;
      }
      return false;
    }, tab.id);

    if (!clicked) {
      // Fallback: click by tab text label
      console.log(`  fallback click for ${tab.id}`);
    }
    await page.waitForTimeout(1500);
    await snapFull(page, tab.name);
  }

  // === NUTRITION + DAILY MENU ===
  // Re-navigate to nutrition tab and try to open the daily menu
  await page.evaluate(() => {
    const buttons = document.querySelectorAll('.tabs-nav button, nav button, .bottom-nav button');
    if (buttons[2]) buttons[2].click();
  });
  await page.waitForTimeout(1000);

  const menuBtn = page.locator('button').filter({ hasText: /תפריט יומי מומלץ|Suggested Daily Menu/i }).first();
  if (await menuBtn.count()) {
    await menuBtn.click();
    await page.waitForTimeout(2000);
    await snapFull(page, '15-daily-menu');
  }

  await browser.close();
  console.log('\nאל הצילומים: ' + PHOTOS_DIR);
}

main().catch(err => {
  console.error('Screenshot script error:', err);
  process.exit(1);
});
