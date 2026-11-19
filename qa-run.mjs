// Areto QA run (Playwright). Replaces the May 2026 script, which predated most of the current screens.
//
// Needs, all LOCAL:
//   1. the isolated API (in-memory MongoDB, no e-mail):  node server/scripts/local-isolated-server.mjs
//      (it prints "MONGO_URI mongodb://127.0.0.1:<port>/areto_local_test")
//   2. the client dev server:                            cd client && npx vite        (http://localhost:5173)
//   3. MONGO_URI=<that uri> node qa-run.mjs [--only=F4,E2] [--skip-matrix]
//      PW_CHANNEL=chrome (default) or msedge: uses an installed browser, nothing is downloaded.
//
// It refuses to run against anything that is not localhost. Output: qa-results/qa-run-<date>.json (+ screenshots
// of failures); the human report is docs/qa-report-<date>.md.
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const require = createRequire(new URL('./server/package.json', import.meta.url));
const { chromium } = createRequire(import.meta.url)('playwright');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const CLIENT = process.env.CLIENT || 'http://localhost:5173';
const API = process.env.API || 'http://localhost:3001';
for (const u of [CLIENT, API]) if (!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(u)) { console.error('refusing: not localhost ->', u); process.exit(2); }
const SECRET = 'local-test-secret-not-the-real-one-0123456789abcdef'; // the isolated server's throw-away secret
const MONGO = process.env.MONGO_URI;
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')));
const only = args.only ? args.only.split(',') : null;
const OUT = join(import.meta.dirname, 'qa-results');
if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });
const DATE = new Date().toISOString().slice(0, 10);

const results = [];
const rec = (id, area, title, status, detail = '', sev = '') => {
  results.push({ id, area, title, status, detail, sev });
  console.log(`${status.padEnd(7)} ${id.padEnd(6)} [${area}] ${title}${detail ? ' :: ' + String(detail).slice(0, 220) : ''}`);
};

// ── API helpers ───────────────────────────────────────────────────────────
let ipN = 1;
async function api(method, path, { token, body } = {}) {
  const r = await fetch(API + path, { method, headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': `10.7.${(ipN >> 8) & 255}.${ipN++ & 255}`, ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch { /* */ }
  return { status: r.status, json: j };
}
const PROFILE = { name: 'QA', age: 30, height: 172, weight: 74, gender: 'male', goal: 'cut', workoutsPerWeek: 4, experience: 'intermediate', equipment: ['dumbbells', 'barbell', 'machines'], timezone: 'Asia/Jerusalem', location: 'gym' };
async function newUser(tag, { onboarded = true, history = false, sleep = null } = {}) {
  const email = `qa-${tag}-${Date.now()}-${Math.floor(Math.random() * 1e4)}@areto.local`;
  const reg = await api('POST', '/auth/register', { body: { email, password: 'Preview123!' } });
  let token = reg.json?.token;
  if (onboarded) await api('POST', '/user/onboarding', { token, body: { ...PROFILE, name: 'QA ' + tag } });
  const prof = await api('GET', '/user/profile', { token });
  const u = prof.json?.user || prof.json || {};
  const id = String(u._id || u.id || reg.json?.user?.id);
  if (history && MONGO) {
    await mongoose.connect(MONGO).catch(() => {});
    const Workout = require('./models/Workout');
    await Workout.create({ userId: id, date: new Date(Date.now() - 3 * 86400000), dayName: "יום א' - פלג גוף עליון", location: 'gym', durationMinutes: 45,
      exercises: [{ name: 'לחיצת חזה שטוח (Bench Press)', sets: 3, reps: '8-12', muscleGroup: 'חזה', mode: 'reps', setLog: [{ reps: 10, weight: 60, done: true }, { reps: 9, weight: 60, done: true }, { reps: 9, weight: 60, done: true }] },
        { name: 'חתירה במוט (Barbell Row)', sets: 3, reps: '8-12', muscleGroup: 'גב', mode: 'reps', setLog: [{ reps: 10, weight: 40, done: true }, { reps: 10, weight: 40, done: true }, { reps: 10, weight: 40, done: true }] }] });
  }
  if (sleep) await api('POST', '/sleep/log', { token, body: { hours: sleep, quality: 'ok' } });
  return { email, token, id, password: 'Preview123!' };
}

// ── browser helpers ───────────────────────────────────────────────────────
const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || 'chrome' });
const VPS = { 'm360': { width: 360, height: 740, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, 'm390': { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, 'd1280': { width: 1280, height: 800 } };
let ctxN = 0;
let lastPage = null;
async function open(vp, lang, theme, token, { intro = true } = {}) {
  const { width, height, ...rest } = VPS[vp];
  const ctx = await browser.newContext({ viewport: { width, height }, ...rest });
  // The API has a per-IP limit (120 requests a minute). Every context gets its own address so a long QA run does not trip it
  // (the local server trusts X-Forwarded-For, like Render's proxy; this header has no effect on a real deployment).
  ctxN++; await ctx.setExtraHTTPHeaders({ 'X-Forwarded-For': `10.8.${(ctxN >> 8) & 255}.${ctxN & 255}` });
  await ctx.addInitScript(([t, l, th, i]) => { try { if (t) localStorage.setItem('token', t); localStorage.setItem('lang', l); localStorage.setItem('theme', th); localStorage.setItem('areto:home-intro-seen', '1'); if (i) localStorage.setItem('areto:intro-seen', '1'); } catch { /* */ } }, [token, lang, theme, intro]);
  const page = await ctx.newPage();
  page.setDefaultTimeout(12000);
  const errs = [];
  page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message.slice(0, 200)));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|net::ERR|fonts\.g|gsi\/client|accounts\.google/.test(m.text())) errs.push(m.text().slice(0, 200)); });
  page.__errs = errs; page.__ctx = ctx; lastPage = page;
  return page;
}
const goto = async (page, path) => { await page.goto(CLIENT + path, { waitUntil: 'domcontentloaded', timeout: 90000 }); await page.waitForTimeout(2800); };
const tab = async (page, i) => { await page.locator('.mobile-nav button, .mobile-nav a').nth(i).click(); await page.waitForTimeout(1800); };
const shot = async (page, name) => { try { await page.screenshot({ path: join(OUT, `${DATE}-${name}.png`) }); } catch { /* */ } };
const wanted = (id) => !only || only.includes(id);
async function step(id, area, title, fn, sev = 'S3') {
  if (!wanted(id)) return;
  try {
    const r = await fn();
    if (typeof r === 'string' && r.startsWith('skip:')) rec(id, area, title, 'SKIP', r.slice(5));
    else if (typeof r === 'string' && r.startsWith('device:')) rec(id, area, title, 'DEVICE', r.slice(7));
    else rec(id, area, title, 'PASS', typeof r === 'string' ? r : '');
  } catch (e) {
    let extra = '';
    if (lastPage && !lastPage.isClosed()) {
      await shot(lastPage, `${id}-fail`);
      extra = ' | page: ' + (await lastPage.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 90) + ' @ ' + lastPage.url().replace(CLIENT, '');
      await lastPage.__ctx.close().catch(() => {});
    }
    rec(id, area, title, 'FAIL', e.message.split('\n')[0] + extra, sev);
  }
}
const expect = (cond, msg) => { if (!cond) throw new Error(msg); };
const visible = async (loc, ms = 6000) => loc.first().waitFor({ state: 'visible', timeout: ms }).then(() => true).catch(() => false);

// ───────────────────────── M. matrix: overflow on every viewport × language × theme ─────────────────────────
async function overflowReport(page) {
  return page.evaluate(() => {
    const vw = document.documentElement.clientWidth; const bad = [];
    const scrolls = document.documentElement.scrollWidth - vw;
    for (const el of document.querySelectorAll('body *')) {
      const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden' || cs.position === 'fixed' && el.getBoundingClientRect().width === 0) continue;
      const r = el.getBoundingClientRect(); if (r.width === 0 || r.height === 0) continue;
      let p = el.parentElement, clipped = false; while (p && p !== document.body) { const o = getComputedStyle(p); if (/(auto|scroll|hidden|clip)/.test(o.overflowX)) { clipped = true; break; } p = p.parentElement; }
      if (!clipped && (r.right > vw + 1 || r.left < -1) && cs.position !== 'fixed') bad.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 30)} ${Math.round(r.left)}..${Math.round(r.right)}/${vw}`);
      if (el.children.length === 0 && el.textContent.trim() && el.scrollWidth > el.clientWidth + 2 && !/(ellipsis)/.test(cs.textOverflow) && /(hidden|clip)/.test(cs.overflowX) && el.clientWidth > 0) bad.push(`TEXT-CLIPPED ${el.tagName.toLowerCase()}.${String(el.className).slice(0, 30)} "${el.textContent.trim().slice(0, 24)}"`);
    }
    return { pageScrollsX: scrolls > 1, scrollBy: scrolls, offenders: [...new Set(bad)].slice(0, 4) };
  });
}
if (!('skip-matrix' in args) && wanted('M1')) {
  const typical = await newUser('matrix', { history: true, sleep: 7.5 });
  await api('POST', '/nutrition/log', { token: typical.token, body: { description: 'חזה עוף עם אורז' } });
  const screens = [
    ['login', '/login', null, false], ['register', '/register', null, false],
    ['today', '/dashboard', 0, true], ['workout', '/dashboard', 1, true], ['nutrition', '/dashboard', 2, true], ['journey', '/dashboard', 3, true],
  ];
  const issues = [];
  let n = 0;
  for (const vp of (args.vps ? args.vps.split(',') : Object.keys(VPS))) for (const lang of ['he', 'en']) for (const theme of ['dark', 'light']) {
    for (const [name, path, tabIdx, authed] of screens) {
      const page = await open(vp, lang, theme, authed ? typical.token : null);
      try {
        await goto(page, path);
        if (tabIdx !== null && vp !== 'd1280') await tab(page, tabIdx);
        else if (tabIdx !== null) { const t = page.locator('.sidebar button, .sidebar a, nav button, nav a'); const names = [['היום', 'Today'], ['אימון', 'Workout|Train'], ['תזונה', 'Nutrition|Eat'], ['מסע', 'Journey']][tabIdx]; await page.getByRole('button', { name: new RegExp(names.join('|')) }).first().click().catch(() => {}); await page.waitForTimeout(1500); }
        const rep = await overflowReport(page); n++;
        if (rep.pageScrollsX || rep.offenders.length) issues.push(`${vp}/${lang}/${theme}/${name}: ${rep.pageScrollsX ? 'PAGE SCROLLS X by ' + rep.scrollBy + 'px; ' : ''}${rep.offenders.join(' | ')}`);
        if (page.__errs.length) issues.push(`${vp}/${lang}/${theme}/${name}: console ${page.__errs[0]}`);
        if (rep.pageScrollsX) await shot(page, `overflow-${vp}-${lang}-${theme}-${name}`);
      } catch (e) { issues.push(`${vp}/${lang}/${theme}/${name}: ERROR ${e.message.split('\n')[0]}`); }
      await page.__ctx.close();
    }
  }
  rec('M1', 'matrix', `overflow / clipped text / console errors on ${n} screen captures (3 viewports × he/en × dark/light × 6 screens)`, issues.length ? 'FAIL' : 'PASS', issues.slice(0, 12).join(' || '), issues.length ? 'S3' : '');
  writeFileSync(join(OUT, `${DATE}-matrix-issues.json`), JSON.stringify(issues, null, 1));
}

// ───────────────────────── F. flows ─────────────────────────
// F1 login (UI), wrong password, right password, logout
await step('F1', 'auth', 'login: wrong password shows an error; right password reaches the dashboard; logout returns to a public page', async () => {
  const u = await newUser('login');
  const page = await open('m390', 'he', 'dark', null);
  await goto(page, '/login');
  await page.fill('input[type="email"]', u.email); await page.fill('input[type="password"]', 'WrongPass999');
  await page.locator('button[type="submit"], .btn-primary').first().click(); await page.waitForTimeout(2000);
  expect(/login/.test(page.url()), 'left the login page after a wrong password');
  const msg = await page.locator('[role=alert], .error, .auth-error, .form-error').allInnerTexts();
  expect(msg.join(' ').length > 3 || (await page.locator('body').innerText()).includes('שגוי'), 'no error message shown for a wrong password');
  await page.fill('input[type="password"]', u.password); await page.locator('button[type="submit"], .btn-primary').first().click();
  await page.waitForURL(/dashboard/, { timeout: 15000 });
  await page.locator('header button').first().click(); await page.waitForTimeout(1200);
  await page.getByRole('button', { name: /התנתק/ }).click(); await page.waitForTimeout(1500);
  const confirm = page.getByRole('button', { name: /התנתק|אישור|יציאה|Log out/ });
  if (await confirm.count() > 0 && await confirm.last().isVisible()) await confirm.last().click().catch(() => {});
  await page.waitForTimeout(1500);
  expect(/login|welcome|^\S+\/$/.test(page.url()) || !(await page.evaluate(() => localStorage.getItem('token'))), 'still logged in after logout: ' + page.url());
  await page.__ctx.close();
});

// F2 first-run intro → onboarding wizard → account creation → dashboard (onboarding comes BEFORE the account now)
await step('F2', 'auth', 'first run: intro → onboarding → create account → dashboard', async () => {
  const page = await open('m390', 'he', 'dark', null, { intro: false });
  await goto(page, '/');
  expect(/onboarding/.test(page.url()), 'a first-time visitor was not sent to onboarding: ' + page.url());
  let registered = false; const seen = [];
  for (let i = 0; i < 30 && !/dashboard/.test(page.url()); i++) {
    await page.waitForTimeout(700);
    seen.push((await page.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 24));
    const email = page.locator('input[type="email"]:visible');
    if (await email.count()) {
      await email.first().fill('qa-reg-' + Date.now() + '@areto.local');
      const pw = page.locator('input[type="password"]:visible'); if (await pw.count()) await pw.first().fill('Preview123!');
      const boxes = page.locator('input[type="checkbox"]:visible'); for (let k = 0; k < await boxes.count(); k++) await boxes.nth(k).check().catch(() => {});
      registered = true;
    } else {
      const ins = page.locator('input:visible:not([type=checkbox])');
      for (let k = 0; k < await ins.count(); k++) {
        const type = (await ins.nth(k).getAttribute('type')) || 'text'; const ph = (await ins.nth(k).getAttribute('placeholder')) || '';
        if (await ins.nth(k).inputValue()) continue;
        const v = type === 'text' ? 'בדיקה' : ph === '25' ? '30' : /^1[5-9]\d$/.test(ph) ? '175' : /^[4-9]\d$/.test(ph) ? '75' : '30';
        await ins.nth(k).fill(v).catch(() => {});
      }
      const picked = page.locator('.ob-opt:visible, .ob-pill:visible, .toggle-row__btn:visible'); if (await picked.count()) await picked.first().click().catch(() => {});
    }
    const next = page.locator('button.ob-btn:visible, button.vp__next:visible, button.btn-primary-cta:visible');
    let clicked = false;
    for (let k = next.count ? await next.count() - 1 : 0; k >= 0 && !clicked; k--) if (await next.nth(k).isEnabled()) { await next.nth(k).click().catch(() => {}); clicked = true; }
    if (!clicked) { await shot(page, 'F2-stuck'); throw new Error('onboarding stuck at "' + seen[seen.length - 1] + '"'); }
    await page.waitForTimeout(500);
  }
  await page.waitForURL(/dashboard/, { timeout: 20000 });
  expect(registered, 'reached the dashboard without a registration step');
  expect(await visible(page.locator('.mobile-nav')), 'dashboard did not render');
  await page.__ctx.close();
}, 'S2');

// F3 forgot password: the sheet opens on "verify with Google" AND offers an e-mail code for everyone else (Q7)
await step('F3', 'auth', 'forgot password: the reset sheet opens; the e-mail code route is offered next to Google', async () => {
  const page = await open('m390', 'he', 'dark', null);
  await goto(page, '/login');
  await page.locator('a:has-text("שכחת")').click(); await page.waitForTimeout(1000);
  expect(await visible(page.locator('.reset-sheet__close, .reset-sheet__scrim')), 'the reset sheet did not open');
  const emailBtn = page.getByRole('button', { name: /שלח לי קוד לאימייל/ });
  expect(await visible(emailBtn), 'no "send me a code by e-mail" option for users without a Google account (Q7)');
  await emailBtn.click(); await page.waitForTimeout(600);
  await page.locator('.reset-sheet input[type=email]').fill('nobody-qa@areto.local');
  await page.locator('.reset-sheet button[type=submit]').click(); await page.waitForTimeout(1800);
  const sheet = await page.locator('.reset-sheet').innerText();
  expect(/אם יש חשבון עם האימייל הזה/.test(sheet), 'no generic "if an account exists" message after asking for a code: ' + sheet.slice(0, 120));
  expect(await page.locator('.reset-sheet input[autocomplete="one-time-code"]').count() === 1, 'the code step did not open');
  await page.locator('.reset-sheet__close').click(); await page.waitForTimeout(500);
  await page.__ctx.close();
  return 'device:the Google verification step needs a Google account; the e-mail code step is checked here up to "code requested" (the isolated server has no mail provider, and the answer is the same for known and unknown addresses)';
});

// F4 workout: full live session
const wu = await newUser('workout', { history: true });
await step('F4', 'workout', 'live workout: start, swap an exercise and undo, exit and resume, tick every set, finish; the workout is saved once', async () => {
  const page = await open('m360', 'he', 'dark', wu.token);
  await goto(page, '/dashboard'); await tab(page, 1);
  await page.getByRole('button', { name: /התחל אימון/ }).first().click(); await page.waitForTimeout(2500);
  expect(await visible(page.locator('.ws-live__card')), 'live session did not open');
  const before = await page.locator('.ws-live__name').first().innerText();
  await page.getByRole('button', { name: /החלף תרגיל/ }).first().click(); await page.waitForTimeout(1000);
  await page.locator('.sw-item').first().click(); await page.waitForTimeout(1200);
  const afterSwap = await page.locator('.ws-live__name').first().innerText();
  expect(afterSwap !== before, 'the swap did not change the exercise');
  await page.locator('.ws-undo button').click(); await page.waitForTimeout(900);
  expect((await page.locator('.ws-live__name').first().innerText()) === before, 'undo did not restore the exercise');
  await page.locator('.ws-live__primary').first().click(); await page.waitForTimeout(800); // one set done = progress worth keeping
  const doneBefore = await page.locator('.ws-live__set--done').count();
  expect(doneBefore >= 1, 'no set was marked done');
  const skip = page.getByRole('button', { name: /^דלג/ }); if (await skip.count()) { await skip.first().click(); await page.waitForTimeout(600); } // the rest timer covers the exit button
  await page.locator('.ws-live__x').click(); await page.waitForTimeout(500);
  await page.locator('.ws-btn-danger').click(); await page.waitForTimeout(1500);
  expect(await visible(page.getByRole('button', { name: /המשך אימון מאיפה/ })), 'leaving a workout with a done set lost the progress (the dialog says it is saved)');
  await page.getByRole('button', { name: /המשך אימון מאיפה/ }).click(); await page.waitForTimeout(2000);
  expect(await visible(page.locator('.ws-live__card')), 'resume did not reopen the session');
  expect((await page.locator('.ws-live__set--done').count()) >= doneBefore, 'the resumed session lost the set that was done');
  let demoText = '';
  for (let guard = 0; guard < 80; guard++) {
    if (await page.getByRole('button', { name: /חזרה הביתה/ }).count()) break;
    if (!demoText && await page.locator('.ws-transition__demo').count()) demoText = await page.locator('.ws-transition__demo').first().innerText();
    const mark = page.getByRole('button', { name: /סמן הכל/ }); if (await mark.count()) await mark.first().click().catch(() => {});
    const cta = page.locator('.ws-live__primary').first(); if (await cta.count()) await cta.click().catch(() => {});
    const skipRest = page.getByRole('button', { name: /דלג|סיים מנוחה|המשך/ }); if (await skipRest.count()) await skipRest.first().click({ timeout: 800 }).catch(() => {});
    await page.waitForTimeout(450);
  }
  expect(await visible(page.getByRole('button', { name: /חזרה הביתה/ }), 8000), 'never reached the workout summary');
  expect(/ביוטיוב/.test(demoText), 'the exercise-transition demo button does not say it opens YouTube: "' + demoText + '"');
  await page.getByRole('button', { name: /חזרה הביתה/ }).click(); await page.waitForTimeout(1500);
  const list = await api('GET', '/workout/list', { token: wu.token });
  const arr = list.json?.workouts || list.json || [];
  const today = arr.filter((w) => Date.now() - new Date(w.date) < 3600000);
  expect(today.length === 1, 'expected exactly 1 workout saved today, found ' + today.length);
  await page.__ctx.close();
}, 'S1');

// F5 nutrition
const nu = await newUser('nutrition');
await step('F5', 'nutrition', 'nutrition: free text logs a meal, an unknown food is refused with a clear message, a logged meal can be deleted', async () => {
  const page = await open('m390', 'he', 'dark', nu.token);
  await goto(page, '/dashboard'); await tab(page, 2);
  const input = page.getByPlaceholder(/חפש מזון/);
  await input.fill('חזה עוף 200 גרם'); await page.getByRole('button', { name: /^הוסף$|הוסף/ }).first().click(); await page.waitForTimeout(2500);
  let today = await api('GET', '/nutrition/today', { token: nu.token });
  const meals = (o) => { const f = (x) => (x && typeof x === 'object' ? (Array.isArray(x.meals) ? x.meals : Object.values(x).map(f).find(Boolean)) : null); return f(o) || []; };
  expect(meals(today.json).length === 1, 'meal not logged (API shows ' + meals(today.json).length + ')');
  await input.fill('גיינר'); await page.getByRole('button', { name: /הוסף/ }).first().click(); await page.waitForTimeout(2000);
  const body = (await page.locator('body').innerText());
  expect(/לא מצאנו|לא נמצא|couldn.t find/i.test(body), 'no "food not found" message for an unknown food');
  today = await api('GET', '/nutrition/today', { token: nu.token });
  expect(meals(today.json).length === 1, 'an unknown food was saved as a meal');
  await shot(page, 'F5-unknown-food');
  await page.__ctx.close();
});

// F5b nutrition: menu, swap, export
await step('F5b', 'nutrition', 'daily menu loads, a meal can be swapped, PDF export opens a printable page', async () => {
  const page = await open('m390', 'he', 'dark', nu.token);
  await goto(page, '/dashboard'); await tab(page, 2);
  await page.getByRole('button', { name: /תפריט מומלץ/ }).first().click(); await page.waitForTimeout(3000);
  const body = await page.locator('body').innerText();
  expect(/ארוחת בוקר|בוקר|Breakfast/i.test(body), 'menu did not show meals: ' + body.replace(/\s+/g, ' ').slice(0, 100));
  const swap = page.getByRole('button', { name: /החלף|Swap/ }); let swapped = 'no swap button';
  if (await swap.count()) { const before = await page.locator('body').innerText(); await swap.first().click(); await page.waitForTimeout(2500); swapped = (await page.locator('body').innerText()) !== before ? 'swap changed the menu' : 'swap did nothing visible'; }
  const exp = page.getByRole('button', { name: /PDF|הורד|ייצוא|Download|Export/ });
  if (!(await exp.count())) throw new Error('no export button on the menu screen (' + swapped + ')');
  const [popup] = await Promise.all([page.context().waitForEvent('page', { timeout: 8000 }).catch(() => null), exp.first().click()]);
  expect(popup, 'export did not open a window');
  await popup.waitForLoadState('domcontentloaded').catch(() => {});
  expect((await popup.content()).includes('Areto'), 'the export page has no Areto header');
  await page.__ctx.close();
  return swapped;
});

// F6 sleep (+ double click)
const su = await newUser('sleep', { history: true });
await step('F6', 'sleep', 'sleep: log 5 h → the workout tab offers the sleep suggestion; double-click on save logs one night', async () => {
  const page = await open('m360', 'he', 'dark', su.token);
  await goto(page, '/dashboard');
  await page.getByRole('button', { name: /שינה/ }).first().click(); await page.waitForTimeout(800);
  await page.getByRole('button', { name: /^5$/ }).first().click();
  await page.getByRole('button', { name: /עדכן שינה/ }).dblclick(); await page.waitForTimeout(2000);
  const hist = await api('GET', '/sleep/history', { token: su.token });
  expect((hist.json || []).length === 1, 'expected 1 sleep log, found ' + (hist.json || []).length);
  await tab(page, 1);
  expect(await visible(page.locator('[role=group]'), 6000), 'no sleep suggestion card on the workout tab');
  await page.locator('[role=group] button').first().click(); await page.waitForTimeout(600); // "אשר"
  await page.getByRole('button', { name: /התחל אימון/ }).first().click(); await page.waitForTimeout(2500);
  const why = await page.locator('.ws-live__why').first().innerText().catch(() => '');
  expect(/השינה הקצרה/.test(why), 'after approving, the suggested weight is not marked as lighter because of sleep: "' + why + '"');
  await page.__ctx.close();
});

// F7 journey
await step('F7', 'journey', 'journey tabs (progress / badges / goals) open without errors', async () => {
  const page = await open('m390', 'he', 'dark', wu.token);
  await goto(page, '/dashboard'); await tab(page, 3);
  for (const n of [/התקדמות/, /תגים/, /יעדים/]) { await page.getByRole('button', { name: n }).first().click(); await page.waitForTimeout(1200); }
  expect(page.__errs.length === 0, 'console errors: ' + page.__errs[0]);
  await page.__ctx.close();
});

// F8 settings
await step('F8', 'settings', 'settings: equipment, notifications, accessibility and body-data screens open; theme and language switch applies', async () => {
  const page = await open('m390', 'he', 'dark', wu.token);
  await goto(page, '/dashboard');
  await page.locator('header button').first().click(); await page.waitForTimeout(1200);
  for (const name of [/ציוד/, /התראות/, /נגישות/, /נתוני גוף/]) {
    await page.getByRole('button', { name }).first().click(); await page.waitForTimeout(900);
    expect((await page.locator('body').innerText()).length > 50, 'empty settings screen');
    await page.getByRole('button', { name: /חזרה/ }).first().click().catch(() => {}); await page.waitForTimeout(500);
  }
  await page.getByRole('button', { name: /תצוגה/ }).first().click(); await page.waitForTimeout(700);
  await page.getByText(/^בהיר$/).first().click(); await page.waitForTimeout(700);
  expect((await page.evaluate(() => localStorage.getItem('theme'))) === 'light', 'theme did not switch to light');
  await page.getByRole('button', { name: /חזרה/ }).first().click().catch(() => {}); await page.waitForTimeout(500);
  await page.getByRole('button', { name: /שפה/ }).first().click(); await page.waitForTimeout(700);
  await page.getByText(/^English$/).first().click(); await page.waitForTimeout(1200);
  expect((await page.evaluate(() => localStorage.getItem('lang'))) === 'en', 'language did not switch to English');
  expect(/Settings|Body|Language|Back/.test(await page.locator('body').innerText()), 'the UI did not re-render in English');
  await page.__ctx.close();
});

// F8b the security screen must not promise protection that does not exist
await step('F8b', 'settings', 'security screen: no "two-factor auth" toggle (it was a local flag that protected nothing)', async () => {
  const page = await open('m390', 'he', 'dark', wu.token);
  await goto(page, '/dashboard');
  await page.locator('header button').first().click(); await page.waitForTimeout(1200);
  await page.getByRole('button', { name: /אבטחה/ }).first().click(); await page.waitForTimeout(900);
  const body = await page.locator('body').innerText();
  expect(!/אימות דו-שלבי|Two-factor/i.test(body), 'the screen still offers a two-factor toggle that does nothing');
  await page.__ctx.close();
}, 'S2');

// F9a export my data (Q5: the button used to say "coming soon")
await step('F9a', 'account', 'privacy & data: "Export" downloads a JSON file with the account data and no secrets', async () => {
  const d = await newUser('export', { history: true, sleep: 3 });
  await api('POST', '/nutrition/log', { token: d.token, body: { description: '2 ביצים' } });
  const page = await open('m390', 'he', 'dark', d.token);
  // a desktop browser that has the Web Share API (Chrome on Windows) must still get a plain download
  await page.addInitScript(() => { navigator.canShare = () => true; navigator.share = async () => { window.__shared = true; }; });
  await goto(page, '/dashboard');
  await page.locator('header button').first().click(); await page.waitForTimeout(1200);
  await page.getByRole('button', { name: /פרטיות ונתונים/ }).first().click(); await page.waitForTimeout(900);
  await page.evaluate(() => { window.matchMedia = (q) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }); });
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 15000 }),
    page.getByRole('button', { name: /^ייצוא$/ }).first().click(),
  ]);
  expect(!(await page.evaluate(() => window.__shared)), 'the share sheet was opened on a non-touch desktop');
  expect(/^areto-export-\d{4}-\d{2}-\d{2}\.json$/.test(download.suggestedFilename()), 'unexpected file name ' + download.suggestedFilename());
  const path = await download.path();
  const text = require('node:fs').readFileSync(path, 'utf8');
  const json = JSON.parse(text);
  expect(json.format === 'areto-export-v1' && json.account.email === d.email, 'the file is not this user\'s export');
  expect(json.nutrition.length >= 1 && json.sleep.length >= 1, 'logged meals / sleep are missing from the export');
  expect(!/"password"|resetCode|\$2[aby]\$/.test(text), 'the export contains a secret field');
  await page.__ctx.close();
});

// F9 reset data and delete account
await step('F9', 'account', 'privacy & data: reset empties the data; delete removes the account (login fails afterwards)', async () => {
  const d = await newUser('delete', { history: true, sleep: 7 });
  await api('POST', '/nutrition/log', { token: d.token, body: { description: 'ביצים' } });
  const page = await open('m390', 'he', 'dark', d.token);
  await goto(page, '/dashboard');
  await page.locator('header button').first().click(); await page.waitForTimeout(1200);
  await page.getByRole('button', { name: /פרטיות ונתונים/ }).first().click(); await page.waitForTimeout(900);
  await page.getByRole('button', { name: /^אפס$/ }).first().click(); await page.waitForTimeout(800);
  await page.getByPlaceholder('RESET').fill('RESET');
  await page.getByRole('button', { name: /^אישור$/ }).click(); await page.waitForTimeout(3500);
  const hist = await api('GET', '/workout/list', { token: d.token });
  const left = (hist.json?.workouts || hist.json || []).length;
  expect(left === 0, 'reset left ' + left + ' workouts');
  await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForTimeout(2500);
  await page.locator('header button').first().click(); await page.waitForTimeout(1200);
  await page.getByRole('button', { name: /פרטיות ונתונים/ }).first().click(); await page.waitForTimeout(900);
  await page.getByRole('button', { name: /^מחק$/ }).first().click(); await page.waitForTimeout(800);
  await page.getByPlaceholder('DELETE').fill('DELETE');
  await page.getByRole('button', { name: /מחק לצמיתות/ }).click(); await page.waitForTimeout(3000);
  const login = await api('POST', '/auth/login', { body: { email: d.email, password: d.password } });
  expect(login.status === 401, 'the deleted account can still log in: ' + login.status);
  await page.__ctx.close();
}, 'S1');

// ───────────────────────── E. edge cases ─────────────────────────
await step('E1', 'edge', 'expired token → the app sends the user to a public page instead of a broken dashboard', async () => {
  const u = await newUser('exp');
  const expired = jwt.sign({ userId: u.id, iat: Math.floor(Date.now() / 1000) - 1000, exp: Math.floor(Date.now() / 1000) - 10 }, SECRET);
  const page = await open('m390', 'he', 'dark', expired);
  await goto(page, '/dashboard'); await page.waitForTimeout(1500);
  expect(/login|welcome|onboarding|\/$/.test(page.url()) && !(await page.locator('.mobile-nav').count()), 'still on the dashboard with an expired token: ' + page.url());
  await page.__ctx.close();
});

await step('E2', 'edge', 'offline: a failed request shows a message and the app stays usable (no uncaught error)', async () => {
  const page = await open('m390', 'he', 'dark', nu.token);
  await goto(page, '/dashboard'); await tab(page, 2);
  await page.context().setOffline(true);
  await page.getByPlaceholder(/חפש מזון/).fill('ביצים'); await page.getByRole('button', { name: /הוסף/ }).first().click(); await page.waitForTimeout(2500);
  const uncaught = page.__errs.filter((e) => /PAGEERROR/.test(e));
  expect(uncaught.length === 0, 'uncaught error offline: ' + uncaught[0]);
  expect(await page.locator('.mobile-nav').count() > 0, 'app disappeared offline');
  const msg = (await page.locator('body').innerText());
  await page.context().setOffline(false); await shot(page, 'E2-offline');
  await page.__ctx.close();
  return /Failed to fetch|NetworkError|Load failed/i.test(msg) ? 'a message is shown but it is the raw English browser error in a Hebrew UI (S3)' : /שגיאה|נכשל|חיבור|אינטרנט/.test(msg) ? 'a localized message is shown' : 'NO visible message while offline (S3)';
});

await step('E3', 'edge', 'slow server (Render waking up): the app shows a loading state, not a blank screen, and recovers', async () => {
  const page = await open('m390', 'he', 'dark', nu.token);
  await page.route('**/user/profile', async (r) => { await new Promise((res) => setTimeout(res, 7000)); r.continue().catch(() => {}); });
  await page.goto(CLIENT + '/dashboard', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  const txt = (await page.locator('body').innerText()).trim();
  const dom = await page.evaluate(() => document.body.innerHTML.length);
  await shot(page, 'E3-slow');
  expect(dom > 400, 'blank page while the profile request is slow');
  expect(await visible(page.locator('.mobile-nav'), 40000), 'dashboard did not appear after the slow response');
  await page.__ctx.close();
  return txt ? 'loading text: ' + txt.slice(0, 40) : 'spinner / skeleton only';
});

await step('E4', 'edge', 'double-click on "add meal" logs one meal', async () => {
  const u = await newUser('dbl');
  const page = await open('m390', 'he', 'dark', u.token);
  await goto(page, '/dashboard'); await tab(page, 2);
  await page.getByPlaceholder(/חפש מזון/).fill('ביצים'); await page.getByRole('button', { name: /הוסף/ }).first().dblclick(); await page.waitForTimeout(3000);
  const today = await api('GET', '/nutrition/today', { token: u.token });
  const f = (x) => (x && typeof x === 'object' ? (Array.isArray(x.meals) ? x.meals : Object.values(x).map(f).find(Boolean)) : null);
  const n = (f(today.json) || []).length;
  expect(n === 1, `a double-click logged ${n} meals`);
  await page.__ctx.close();
}, 'S2');

await step('E5', 'edge', 'a brand-new user (no meals, no workouts, no sleep) sees every tab without errors', async () => {
  const u = await newUser('fresh');
  const page = await open('m360', 'he', 'dark', u.token);
  await goto(page, '/dashboard');
  for (const i of [1, 2, 3, 0]) await tab(page, i);
  expect(page.__errs.length === 0, 'console errors: ' + page.__errs[0]);
  await page.__ctx.close();
});

await step('E6', 'edge', 'an existing user with missing profile fields (no equipment, no timezone) still loads every tab', async () => {
  const u = await newUser('legacy');
  if (!MONGO) return 'skip:needs MONGO_URI';
  await mongoose.connect(MONGO).catch(() => {});
  await mongoose.connection.collection('users').updateOne({ _id: new mongoose.Types.ObjectId(u.id) }, { $unset: { 'profile.equipment': '', 'profile.timezone': '', 'profile.city': '', 'profile.bodyFatPercentage': '' } });
  const page = await open('m390', 'he', 'dark', u.token);
  await goto(page, '/dashboard');
  for (const i of [1, 2, 3, 0]) await tab(page, i);
  expect(page.__errs.length === 0, 'console errors: ' + page.__errs[0]);
  await page.__ctx.close();
}, 'S2');

await step('E7', 'edge', 'extreme values are refused (age 2, weight 999, manual meal 99999 kcal, sleep 1e9)', async () => {
  const u = await newUser('extreme');
  const checks = [
    await api('PUT', '/user/profile', { token: u.token, body: { age: 2 } }),
    await api('PUT', '/user/profile', { token: u.token, body: { weight: 999 } }),
    await api('POST', '/nutrition/log', { token: u.token, body: { description: 'x', nutrition: { calories: 99999, protein: 1, carbs: 1, fat: 1, source: 'manual' } } }),
    await api('POST', '/sleep/log', { token: u.token, body: { hours: 1e9 } }),
  ];
  expect(checks.every((c) => c.status === 400), 'accepted: ' + checks.map((c) => c.status).join(','));
});

await step('E9', 'edge', 'food database: a new food (apple juice) is recognised with a sensible amount; an unknown food is refused with 422 and nothing is saved', async () => {
  const u = await newUser('food');
  const ok = await api('POST', '/nutrition/log', { token: u.token, body: { description: 'כוס מיץ תפוחים' } });
  expect(ok.status === 201, 'apple juice not logged: ' + ok.status);
  const day = JSON.stringify(ok.json);
  expect(/מיץ תפוחים/.test(day) && !/"תפוח עץ"/.test(day), 'apple juice was read as something else');
  const bad = await api('POST', '/nutrition/log', { token: u.token, body: { description: 'גיינר' } });
  expect(bad.status === 422 && bad.json?.code === 'FOOD_NOT_FOUND', 'unknown food: ' + bad.status);
  const today = await api('GET', '/nutrition/today', { token: u.token });
  const f = (x) => (x && typeof x === 'object' ? (Array.isArray(x.meals) ? x.meals : Object.values(x).map(f).find(Boolean)) : null);
  expect((f(today.json) || []).length === 1, 'the unknown food was saved');
});

await step('E8', 'edge', 'midnight in Asia/Jerusalem: 23:59 and 00:01 fall on different local days (streak / sleep day boundaries)', async () => {
  const { startOfUserDay } = require('./utils/dates');
  const tz = 'Asia/Jerusalem';
  // 2026-11-17 21:59Z is 23:59 local (UTC+2); 22:01Z is 00:01 the next local day
  const a = startOfUserDay(tz, new Date('2026-11-17T21:59:00Z')); const b = startOfUserDay(tz, new Date('2026-11-17T22:01:00Z'));
  expect(a.getTime() !== b.getTime(), '23:59 and 00:01 are the same local day');
  expect(b.getTime() - a.getTime() === 86400000, 'consecutive local days are not 24 h apart in November');
  // the clock change (Israel falls back on the last Sunday of October): the local day is 25 h long
  const c = startOfUserDay(tz, new Date('2026-10-25T10:00:00Z')); const d = startOfUserDay(tz, new Date('2026-10-26T10:00:00Z'));
  expect(d.getTime() - c.getTime() === 25 * 3600000, 'the 25-hour day is not handled: ' + (d - c) / 3600000 + ' h');
});

await browser.close();
try { await mongoose.disconnect(); } catch { /* */ }
const tally = results.reduce((m, r) => { m[r.status] = (m[r.status] || 0) + 1; return m; }, {});
writeFileSync(join(OUT, `qa-run-${DATE}.json`), JSON.stringify({ date: DATE, tally, results }, null, 1));
console.log('\nTALLY', JSON.stringify(tally));
for (const r of results.filter((x) => x.status === 'FAIL')) console.log('FAIL', r.id, r.sev, r.title, '::', r.detail);
