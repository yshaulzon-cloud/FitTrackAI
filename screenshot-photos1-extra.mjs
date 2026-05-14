import { chromium } from 'playwright';
import { join } from 'node:path';

const PHOTOS_DIR = join(import.meta.dirname, 'photos1');
const CLIENT = 'http://localhost:5173';
const VIEWPORT = { width: 1280, height: 800 };

const snap = (page, name, full = false) =>
  page.screenshot({ path: join(PHOTOS_DIR, `${name}.png`), fullPage: full })
    .then(() => console.log(`✓ ${name}.png`));

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: VIEWPORT });
const page = await ctx.newPage();

await page.goto(CLIENT);
await page.evaluate(() => localStorage.clear());

await page.goto(`${CLIENT}/login`);
await page.waitForSelector('input[type="email"]');
await page.waitForTimeout(800);

const privacy = page.locator('a').filter({ hasText: /פרטיות|Privacy/i }).first();
if (await privacy.count()) {
  await privacy.click();
  await page.waitForTimeout(1000);
  await snap(page, '16-privacy', true);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
} else {
  console.log('No privacy link found');
}

const terms = page.locator('a').filter({ hasText: /שימוש|Terms/i }).first();
if (await terms.count()) {
  await terms.click();
  await page.waitForTimeout(1000);
  await snap(page, '17-terms', true);
} else {
  console.log('No terms link found');
}

await browser.close();
console.log('\n✅ Extras done');
