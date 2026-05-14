import { chromium } from 'playwright';
import { join } from 'node:path';

const PHOTOS_DIR = join(import.meta.dirname, 'photos1');
const CLIENT = 'http://localhost:5173';
const API = 'http://localhost:3001';
const VIEWPORT = { width: 1280, height: 800 };

const snap = (page, name, full = false) =>
  page.screenshot({ path: join(PHOTOS_DIR, `${name}.png`), fullPage: full })
    .then(() => console.log(`✓ ${name}.png`));

const email = `menu-${Date.now()}@example.com`;
const password = 'testpass123';

const reg = await fetch(`${API}/auth/register`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
});
if (!reg.ok) throw new Error('Register failed: ' + (await reg.text()));
const { token } = await reg.json();

const ob = await fetch(`${API}/user/onboarding`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  body: JSON.stringify({
    name: 'משתמש בדיקה',
    age: 28, height: 178, weight: 75,
    gender: 'male', goal: 'bulk',
    workoutsPerWeek: 4, experience: 'intermediate',
  }),
});
if (!ob.ok) throw new Error('Onboarding failed: ' + (await ob.text()));
console.log(`Onboarded: ${email}`);

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: VIEWPORT });
const page = await ctx.newPage();

await page.goto(CLIENT);
await page.evaluate((t) => localStorage.setItem('token', t), token);
await page.goto(`${CLIENT}/dashboard`);
await page.waitForTimeout(3000);

// Click nutrition tab by text
const nutritionTab = page.locator('button').filter({ hasText: /^תזונה|Nutrition$/ }).first();
if (await nutritionTab.count()) {
  await nutritionTab.click();
  console.log('Clicked nutrition tab');
} else {
  // Fallback: click third tab in nav
  await page.evaluate(() => {
    const btns = document.querySelectorAll('.tabs-nav button, nav button, .bottom-nav button');
    if (btns[2]) btns[2].click();
  });
  console.log('Fallback: clicked tab index 2');
}
await page.waitForTimeout(2000);

// Find the menu button — try both the chip and the empty-state button
const menuBtn = page.locator('button').filter({ hasText: /טען תפריט מומלץ|תפריט מומלץ|Recommended menu/i }).first();
const count = await menuBtn.count();
console.log(`Menu buttons matching: ${count}`);

if (count > 0) {
  await menuBtn.click();
  console.log('Clicked menu button — waiting for AI menu...');
  // Wait for any meal type to render (Anthropic call can take 10-20s)
  await page.waitForFunction(
    () => /ארוחת בוקר|ארוחת צהריים|ארוחת ערב|Breakfast|Lunch|Dinner/.test(document.body.innerText),
    { timeout: 45000 }
  ).catch(() => console.log('AI menu didnt render in 45s — capturing anyway'));
  await page.waitForTimeout(1500);
  await snap(page, '15-daily-menu', true);
} else {
  // No menu button — capture what's on screen for debugging
  await snap(page, '15-nutrition-debug', true);
  console.log('No menu button found — saved nutrition-debug screenshot');
}

await browser.close();
console.log('\n✅ Done');
