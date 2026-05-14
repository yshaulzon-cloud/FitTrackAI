import { chromium } from 'playwright';
import { mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const QA_DIR = join(import.meta.dirname, 'qa-results');
const CLIENT = 'http://localhost:5173';
const API = 'http://localhost:3001';

if (!existsSync(QA_DIR)) mkdirSync(QA_DIR, { recursive: true });

const VIEWPORTS = {
  mobile: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  desktop: { width: 1280, height: 800 },
};

const findings = []; // { device, severity, area, issue }

function note(device, severity, area, issue) {
  findings.push({ device, severity, area, issue });
  console.log(`[${severity}] (${device}) ${area}: ${issue}`);
}

async function snap(page, device, name) {
  const path = join(QA_DIR, `${device}-${name}.png`);
  await page.screenshot({ path, fullPage: true });
}

async function runFlow(device, viewport) {
  console.log(`\n=== ${device.toUpperCase()} ===`);
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();

  // Console error collector
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push(`PAGEERROR: ${err.message}`));

  // Register a fresh test user
  const email = `qa-${device}-${Date.now()}@example.com`;
  const password = 'TestPass123!';
  const reg = await fetch(`${API}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!reg.ok) {
    note(device, 'CRITICAL', 'register API', `Register failed: ${await reg.text()}`);
    await browser.close();
    return;
  }
  const { token } = await reg.json();

  // ── 1. Splash + Login ──
  await page.goto(CLIENT);
  await page.waitForTimeout(2500);
  await snap(page, device, '01-splash');

  await page.goto(`${CLIENT}/login`);
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  await snap(page, device, '02-login');

  // Check: GIS script in page
  const gisLoaded = await page.evaluate(() => !!document.querySelector('script[src*="gsi/client"]'));
  if (!gisLoaded) note(device, 'HIGH', 'login/google', 'GIS script not loaded');

  // Check: autoFocus on email
  const focusedEmail = await page.evaluate(() => document.activeElement?.type === 'email');
  if (!focusedEmail) note(device, 'MEDIUM', 'login/a11y', 'Email field not auto-focused on load');

  // Check: hero hidden on mobile
  if (device === 'mobile') {
    const heroVisible = await page.locator('.auth-split__hero').isVisible().catch(() => false);
    if (heroVisible) note(device, 'HIGH', 'login/layout', 'Hero "בנה גוף..." still visible on mobile (should be hidden)');
  }

  // Forgot password flow
  await page.click('a:has-text("שכחת"), a:has-text("Forgot")').catch(() => {});
  await page.waitForTimeout(800);
  const stepIndicator = await page.locator('.reset-step-indicator').isVisible().catch(() => false);
  if (!stepIndicator) note(device, 'MEDIUM', 'forgot/UX', 'Step indicator missing on reset-email step');
  await snap(page, device, '03-forgot-step1');

  await page.goto(`${CLIENT}/login`);
  await page.waitForSelector('input[type="email"]');

  // ── 2. Register ──
  await page.goto(`${CLIENT}/register`);
  await page.waitForSelector('input[type="email"]');
  await snap(page, device, '04-register-empty');

  // Check: in Hebrew
  const registerTitle = await page.locator('h1').first().textContent();
  if (registerTitle && !/חשבון|create/i.test(registerTitle)) {
    note(device, 'LOW', 'register/i18n', `Unexpected title: "${registerTitle}"`);
  }
  if (registerTitle && /create your account/i.test(registerTitle)) {
    note(device, 'HIGH', 'register/i18n', 'Register page still shows English when Hebrew is the app default');
  }

  // Check: no Confirm password field
  const confirmFields = await page.locator('input[autocomplete="new-password"]').count();
  if (confirmFields > 1) note(device, 'MEDIUM', 'register/UX', `Found ${confirmFields} new-password fields (expected 1, no "Confirm")`);

  // Check: terms checkbox
  const termsBox = await page.locator('.checkbox-row input[type="checkbox"]').count();
  if (termsBox === 0) note(device, 'HIGH', 'register/legal', 'Terms checkbox missing');

  // Fill password and check strength bars
  await page.fill('input[type="email"]', `qa-r-${Date.now()}@example.com`);
  await page.fill('input[autocomplete="new-password"]', 'short');
  await page.waitForTimeout(300);
  await snap(page, device, '05-register-weak');

  await page.fill('input[autocomplete="new-password"]', 'StrongPass1!');
  await page.waitForTimeout(300);
  await snap(page, device, '06-register-strong');

  const strengthBars = await page.locator('.pw-strength__bars span').count();
  if (strengthBars !== 3) note(device, 'MEDIUM', 'register/UX', `Password-strength bars: ${strengthBars} (expected 3)`);

  // ── 3. Onboarding wizard ──
  await page.goto(CLIENT);
  await page.evaluate((t) => localStorage.setItem('token', t), token);
  await page.goto(`${CLIENT}/onboarding`);
  await page.waitForSelector('.wizard-progress', { timeout: 10000 });
  await snap(page, device, '07-onboarding-step1');

  // Verify step 1: name + gender + age
  const step1Fields = await page.locator('input[type="text"], input[type="number"], .toggle-row__btn').count();
  if (step1Fields < 3) note(device, 'HIGH', 'onboarding/step1', `Step 1 has ${step1Fields} interactive fields (expected name, gender, age)`);

  // Verify Continue is disabled initially
  const continueBtn = page.locator('.btn-primary').filter({ hasText: /המשך|Continue|התחל/i }).first();
  const initiallyDisabled = await continueBtn.isDisabled();
  if (!initiallyDisabled) note(device, 'MEDIUM', 'onboarding/validation', 'Continue button enabled with empty form');

  // Fill step 1
  await page.locator('input[type="text"]').first().fill('בדיקה QA');
  await page.locator('.toggle-row__btn').first().click();
  await page.fill('input[placeholder="25"]', '30');
  await page.waitForTimeout(300);
  await continueBtn.click();
  await page.waitForTimeout(600);
  await snap(page, device, '08-onboarding-step2');

  // Verify step 2: height + weight + body fat fields
  const step2Inputs = await page.locator('input[type="number"]').count();
  if (step2Inputs < 2) note(device, 'HIGH', 'onboarding/step2', `Step 2 missing height/weight inputs`);

  await page.fill('input[placeholder="175"]', '180');
  await page.fill('input[placeholder="75"]', '78');
  await page.waitForTimeout(500);
  // BMI gauge should appear
  const bmiVisible = await page.locator('text=/BMI/').count();
  if (bmiVisible === 0) note(device, 'MEDIUM', 'onboarding/step2', 'BMI gauge did not render after entering height+weight');

  await continueBtn.click();
  await page.waitForTimeout(600);
  await snap(page, device, '09-onboarding-step3');

  // Step 3: goal cards
  const goalCards = await page.locator('.goal-option').count();
  if (goalCards < 3) note(device, 'HIGH', 'onboarding/step3', `Goal step has ${goalCards} cards (expected 3)`);
  await page.locator('.goal-option').first().click();
  await page.waitForTimeout(300);

  await continueBtn.click();
  await page.waitForTimeout(600);
  await snap(page, device, '10-onboarding-step4');

  // Step 4: chip selector + experience
  const chips = await page.locator('.chip-row__chip').count();
  if (chips !== 7) note(device, 'MEDIUM', 'onboarding/step4', `Workouts/week chips: ${chips} (expected 7)`);

  await page.locator('.goal-option').first().click();
  await page.waitForTimeout(300);
  await continueBtn.click(); // Should submit
  await page.waitForURL(/dashboard/, { timeout: 15000 }).catch(() => {
    note(device, 'HIGH', 'onboarding/submit', 'Did not navigate to dashboard after onboarding submit');
  });
  await page.waitForTimeout(2000);
  await snap(page, device, '11-dashboard-overview');

  // ── 4. Dashboard mobile bottom-nav ──
  if (device === 'mobile') {
    const navBtns = await page.locator('.mobile-nav button').count();
    if (navBtns !== 6) note(device, 'HIGH', 'dashboard/nav', `Bottom nav has ${navBtns} tabs (expected 6 including XP)`);

    // Check XP is reachable
    const xpBtn = page.locator('.mobile-nav button').filter({ hasText: /XP|⚔️/ }).first();
    if (await xpBtn.count() === 0) {
      note(device, 'HIGH', 'dashboard/nav', 'XP tab not present in mobile bottom nav');
    }

    // Check sidebar is hidden
    const sidebarVisible = await page.locator('.sidebar').isVisible().catch(() => false);
    if (sidebarVisible) note(device, 'HIGH', 'dashboard/layout', 'Desktop sidebar still visible on mobile');
  } else {
    const sidebarVisible = await page.locator('.sidebar').isVisible().catch(() => false);
    if (!sidebarVisible) note(device, 'HIGH', 'dashboard/layout', 'Sidebar missing on desktop');
    const mobileNavVisible = await page.locator('.mobile-nav').isVisible().catch(() => false);
    if (mobileNavVisible) note(device, 'MEDIUM', 'dashboard/layout', 'Mobile bottom nav shown on desktop');
  }

  // Check: no "תובנת היום" card
  const insightCard = await page.locator('.insight-card').count();
  if (insightCard > 0) note(device, 'HIGH', 'overview', '"תובנת היום" card still present (should be removed)');

  // ── 5. Navigate to Workout tab ──
  const workoutNav = device === 'mobile'
    ? page.locator('.mobile-nav button').nth(1)
    : page.locator('.sidebar-nav button').nth(1);
  await workoutNav.click();
  await page.waitForTimeout(1500);
  await snap(page, device, '12-workout');

  // Workout day tabs visible?
  const dayTabs = await page.locator('.workout-day-tab').count();
  if (dayTabs === 0) note(device, 'MEDIUM', 'workout', 'No day-tab selector (one-day view requires at least 1 day)');

  // FAB present?
  const fab = await page.locator('.workout-fab').isVisible().catch(() => false);
  if (!fab) note(device, 'MEDIUM', 'workout/fab', 'FAB "סיימתי אימון" not visible');

  // ── 6. Nutrition tab + daily menu ──
  const nutritionNav = device === 'mobile'
    ? page.locator('.mobile-nav button').nth(2)
    : page.locator('.sidebar-nav button').nth(2);
  await nutritionNav.click();
  await page.waitForTimeout(1500);
  await snap(page, device, '13-nutrition');

  // Hidden daily summary (no meals logged)
  const dailySummary = await page.locator('.card-header').filter({ hasText: /סיכום יומי|Daily summary/ }).count();
  if (dailySummary > 0) note(device, 'LOW', 'nutrition/empty', 'Daily summary card visible with no meals (should be hidden when calories=0)');

  // Test the "not in DB" rejection
  await page.fill('input[placeholder*="מזון"], input[placeholder*="food"]', 'xyz-impossible-food-zzz');
  await page.click('button:has-text("הוסף"), button:has-text("Add")').catch(() => {});
  await page.waitForTimeout(1500);
  const rejectMsg = await page.locator('text=/לא נמצא|not found/i').count();
  if (rejectMsg === 0) note(device, 'HIGH', 'nutrition/strict-db', 'Server did not reject unknown food with "not in database" message');
  await snap(page, device, '14-nutrition-rejected');

  // Open daily menu
  await page.locator('button').filter({ hasText: /תפריט מומלץ|Recommended menu/i }).first().click().catch(() => {});
  await page.waitForTimeout(8000); // AI menu generation
  const menuMeals = await page.locator('.meal-row').count();
  if (menuMeals > 0) {
    // Check for "הבא" badge
    const nextBadge = await page.locator('.meal-row--now').count();
    if (nextBadge === 0) note(device, 'MEDIUM', 'nutrition/menu', '"הבא" badge missing on the current meal');
    await snap(page, device, '15-daily-menu');
  } else {
    note(device, 'MEDIUM', 'nutrition/menu', 'Daily menu did not load (AI may have failed)');
  }

  // ── 7. XP tab (mobile only - test reachability) ──
  if (device === 'mobile') {
    const xpBtn = page.locator('.mobile-nav button').filter({ hasText: /XP|⚔️/ }).first();
    if (await xpBtn.count() > 0) {
      await xpBtn.click();
      await page.waitForTimeout(1500);
      await snap(page, device, '16-xp');

      // Check ring size
      const ringWidth = await page.locator('.xp-hero__ring-wrap').first().evaluate(
        (el) => parseInt(getComputedStyle(el).width)
      ).catch(() => 0);
      if (ringWidth < 150) note(device, 'MEDIUM', 'xp/ring', `XP ring rendered at ${ringWidth}px (expected 168-200px)`);
    }
  }

  // ── 8. Progress tab ──
  const progressNav = device === 'mobile'
    ? page.locator('.mobile-nav button').filter({ hasText: /התקדמות|Progress/ }).first()
    : page.locator('.sidebar-nav button').nth(5);
  await progressNav.click();
  await page.waitForTimeout(1500);
  await snap(page, device, '17-progress');

  // Range tabs
  const rangeTabs = await page.locator('.range-tabs__btn').count();
  if (rangeTabs !== 3) note(device, 'MEDIUM', 'progress/range', `Range tabs: ${rangeTabs} (expected 3: 7d/30d/90d)`);

  // Test 30d range
  await page.locator('.range-tabs__btn').nth(1).click();
  await page.waitForTimeout(500);
  await snap(page, device, '18-progress-30d');

  // Mobile-only: journey hero on Progress
  if (device === 'mobile') {
    const journeyOnProgress = await page.locator('.journey-chart--vertical').isVisible().catch(() => false);
    if (!journeyOnProgress) note(device, 'MEDIUM', 'progress/journey-hero', 'Journey hero card not surfaced on Progress (mobile)');
  } else {
    const journeyOnProgress = await page.locator('.mobile-only .journey-chart').isVisible().catch(() => false);
    if (journeyOnProgress) note(device, 'MEDIUM', 'progress/journey-hero', 'Mobile-only journey card visible on desktop');
  }

  // ── 9. Settings + push navigation ──
  const settingsNav = device === 'mobile'
    ? page.locator('.mobile-nav button').filter({ hasText: /הגדרות|Settings/ }).first()
    : page.locator('.sidebar-nav button').filter({ hasText: /הגדרות|Settings/ }).first();
  await settingsNav.click();
  await page.waitForTimeout(1000);
  await snap(page, device, '19-settings-list');

  if (device === 'mobile') {
    // On mobile, list view first
    const inDetail = await page.locator('.settings-layout--in-detail').count();
    if (inDetail > 0) note(device, 'LOW', 'settings/nav', 'Settings starts in detail view on mobile (should start in list)');

    // Tap a category
    await page.locator('.settings-nav__item').first().click();
    await page.waitForTimeout(600);
    const backBtn = await page.locator('.settings-back').isVisible().catch(() => false);
    if (!backBtn) note(device, 'HIGH', 'settings/push-nav', 'Back button missing after tapping a settings category');
    await snap(page, device, '20-settings-detail');
  }

  // ── 10. Console errors ──
  if (consoleErrors.length > 0) {
    consoleErrors.slice(0, 5).forEach((err) => {
      note(device, 'HIGH', 'console', err.substring(0, 200));
    });
    if (consoleErrors.length > 5) {
      note(device, 'INFO', 'console', `+ ${consoleErrors.length - 5} more console errors`);
    }
  }

  await browser.close();
}

// Run both viewports
await runFlow('mobile', VIEWPORTS.mobile);
await runFlow('desktop', VIEWPORTS.desktop);

// Write report
const grouped = findings.reduce((acc, f) => {
  acc[f.severity] = acc[f.severity] || [];
  acc[f.severity].push(f);
  return acc;
}, {});

const order = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];
const report = [
  '# QA Report — Areto',
  `_Generated ${new Date().toISOString()}_`,
  '',
  `**Total findings**: ${findings.length}`,
  '',
  ...order.flatMap((sev) => {
    const arr = grouped[sev] || [];
    if (arr.length === 0) return [];
    return [
      `## ${sev} (${arr.length})`,
      ...arr.map((f) => `- **(${f.device})** \`${f.area}\` — ${f.issue}`),
      '',
    ];
  }),
];
const reportPath = join(QA_DIR, 'REPORT.md');
writeFileSync(reportPath, report.join('\n'));
console.log(`\n✅ QA done. Report: ${reportPath}`);
console.log(`   Findings: ${findings.length}`);
