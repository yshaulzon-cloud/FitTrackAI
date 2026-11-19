// Dynamic security tests for the Areto API (docs/security-audit-r2.md). LOCAL ONLY.
//
//   1. Start the isolated server (in-memory MongoDB, throw-away secrets, no e-mail):
//        node scripts/local-isolated-server.mjs      (see the header of that file)
//   2. In another terminal, with the Mongo URI it printed ("MONGO_URI mongodb://127.0.0.1:...") :
//        MONGO_URI=mongodb://127.0.0.1:<port>/areto_local_test node scripts/security-local-tests.mjs
//
// It refuses to run against anything but localhost. It never touches production: the isolated server
// overrides MONGODB_URI, JWT_SECRET and the mail settings from server/.env.
import { createRequire } from 'node:module';
const require = createRequire(new URL('../package.json', import.meta.url));
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const B = process.env.TARGET || 'http://localhost:3001';
if (!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(B)) { console.error('refusing: target is not localhost'); process.exit(2); }
const SECRET = 'local-test-secret-not-the-real-one-0123456789abcdef';
const MONGO = process.env.MONGO_URI;

let ipN = 1;
const freshIp = () => `10.1.${(ipN >> 8) & 255}.${ipN++ & 255}`;
async function call(method, path, { token, body, headers = {}, ip, raw } = {}) {
  const h = { 'X-Forwarded-For': ip || freshIp(), ...headers };
  if (body !== undefined && (!raw || !headers['Content-Type'])) h['Content-Type'] = 'application/json';
  if (token) h.Authorization = 'Bearer ' + token;
  const t0 = Date.now();
  let res; let text = '';
  try { res = await fetch(B + path, { method, headers: h, body: raw ? body : body !== undefined ? JSON.stringify(body) : undefined }); text = await res.text(); }
  catch (e) { return { status: 0, error: e.message, ms: Date.now() - t0 }; }
  let json = null; try { json = JSON.parse(text); } catch { /* not json */ }
  return { status: res.status, json, text, ms: Date.now() - t0, headers: res.headers };
}
const results = [];
const rec = (area, name, ok, detail = '') => { results.push({ area, name, ok, detail }); console.log(`${ok === true ? 'PASS' : ok === false ? 'FAIL' : 'INFO'} [${area}] ${name}${detail ? ' :: ' + detail : ''}`); };

async function mkUser(tag) {
  const email = `sec-${tag}-${Date.now()}@areto.local`;
  const r = await call('POST', '/auth/register', { body: { email, password: 'Preview123!', name: 'Sec ' + tag } });
  const l = await call('POST', '/auth/login', { body: { email, password: 'Preview123!' } });
  const token = l.json?.token;
  await call('POST', '/user/onboarding', { token, body: { name: 'Sec ' + tag, age: 30, height: 172, weight: 74, gender: 'male', goal: 'cut', workoutsPerWeek: 4, experience: 'intermediate', equipment: ['dumbbells'], timezone: 'Asia/Jerusalem', location: 'gym' } });
  const p = await call('GET', '/user/profile', { token });
  const u = p.json?.user || p.json;
  return { email, token, id: String(u?._id || u?.id), reg: r };
}

const A = await mkUser('a');
const Bu = await mkUser('b');
rec('setup', 'two users created', !!(A.token && Bu.token && A.id && Bu.id && A.id !== Bu.id), `A=${A.id} B=${Bu.id}`);

// ───────── 1. authentication on every route ─────────
const OID = '65f0000000000000000000aa';
const ROUTES = [
  ['GET', '/user/profile'], ['POST', '/user/onboarding', {}], ['PUT', '/user/profile', {}],
  ['GET', '/user/measurements'], ['GET', '/user/export'], ['POST', '/user/measurements', {}], ['DELETE', `/user/measurements/${OID}`], ['POST', '/user/reset-data'],
  ['DELETE', '/user/account', { confirm: 'NOPE' }], ['POST', '/user/set-password', {}], ['PUT', '/user/plan-swap', {}],
  ['POST', '/workout/complete', {}], ['POST', '/workout/performance', {}], ['DELETE', `/workout/${OID}`], ['GET', '/workout/list'], ['GET', '/workout/history'],
  ['POST', '/nutrition/log', {}], ['DELETE', `/nutrition/meal/${OID}`], ['GET', '/nutrition/today'], ['GET', '/nutrition/history'], ['GET', '/nutrition/search?q=a'],
  ['GET', '/nutrition/day-type'], ['GET', '/nutrition/daily-menu'], ['GET', '/nutrition/weekly-menu'], ['GET', '/nutrition/swap-meal'],
  ['GET', '/progression/status'], ['POST', '/sleep/log', {}], ['GET', '/sleep/today'], ['GET', '/sleep/history'], ['GET', '/admin/stats'], ['GET', '/admin/users'],
];
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const now = Math.floor(Date.now() / 1000);
const tokens = {
  'no token': undefined,
  'garbage': 'not.a.jwt',
  'expired': jwt.sign({ userId: A.id, iat: now - 1000, exp: now - 10 }, SECRET),
  'wrong secret': jwt.sign({ userId: A.id }, 'some-other-secret'),
  'alg none': `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ userId: A.id, iat: now, exp: now + 3600 })}.`,
  'alg none (empty sig, uppercase NONE)': `${b64({ alg: 'NONE', typ: 'JWT' })}.${b64({ userId: A.id, iat: now, exp: now + 3600 })}.`,
  'tampered payload': (() => { const t = jwt.sign({ userId: A.id }, SECRET).split('.'); t[1] = b64({ userId: Bu.id, iat: now, exp: now + 3600 }); return t.join('.'); })(),
  'HS512 same secret': jwt.sign({ userId: A.id }, SECRET, { algorithm: 'HS512' }),
  'userId as object': jwt.sign({ userId: { $ne: null } }, SECRET),
  'unknown user id': jwt.sign({ userId: OID }, SECRET),
};
for (const [label, tk] of Object.entries(tokens)) {
  const bad = [];
  for (const [m, p, body] of ROUTES) {
    const r = await call(m, p, { token: tk, body });
    if (r.status !== 401) bad.push(`${m} ${p}=${r.status}`);
  }
  const expectAccepted = label === 'HS512 same secret'; // signed with the right secret: accepting it is expected (HS256 is not pinned)
  rec('auth', `all ${ROUTES.length} protected routes → 401 with: ${label}`, expectAccepted ? undefined : bad.length === 0, bad.slice(0, 5).join(', '));
}
// regular user on admin routes
const adm = [await call('GET', '/admin/stats', { token: A.token }), await call('GET', '/admin/users', { token: A.token })];
rec('auth', 'admin routes with a regular user → 403', adm.every((r) => r.status === 403), adm.map((r) => r.status).join(','));
// account deleted → old token dead
const C = await mkUser('c');
await call('DELETE', '/user/account', { token: C.token, body: { confirm: 'DELETE' } });
const afterDel = await call('GET', '/user/profile', { token: C.token });
rec('auth', 'token of a deleted account → 401', afterDel.status === 401, String(afterDel.status));

const pv = await call('POST', '/user/preview-plan', { body: { goal: 'cut', workoutsPerWeek: 3, experience: 'beginner' } });
const pvBad = await call('POST', '/user/preview-plan', { body: { goal: { $ne: 1 }, workoutsPerWeek: 99 } });
rec('auth', '/user/preview-plan is public BY DESIGN (pre-signup plan preview): valid input → 200 with no token, bad input → 400', pv.status === 200 && pvBad.status === 400, `${pv.status}/${pvBad.status}`);
// ───────── 2. IDOR ─────────
const meas = await call('POST', '/user/measurements', { token: A.token, body: { type: 'waist', value: 80 } });
const measId = meas.json?.measurement?._id || meas.json?._id || meas.json?.id;
const meal = await call('POST', '/nutrition/log', { token: A.token, body: { description: 'ביצים' } });
const findMeals = (o) => { if (!o || typeof o !== 'object') return null; if (Array.isArray(o.meals)) return o.meals; for (const v of Object.values(o)) { const r = findMeals(v); if (r) return r; } return null; };
const todayA = await call('GET', '/nutrition/today', { token: A.token });
const mealId = findMeals(todayA.json)?.[0]?._id;
const wk = await call('POST', '/workout/complete', { token: A.token, body: { dayName: 'x', durationMinutes: 30, location: 'gym', exercises: [{ name: 'Squat', sets: 1, reps: '5', mode: 'reps', setLog: [{ reps: 5, weight: 50, done: true }] }] } });
const wkId = wk.json?.workout?._id || wk.json?._id;
rec('idor', 'victim data created (measurement, meal, workout)', !!(measId && mealId && wkId), `${measId} ${mealId} ${wkId}`);
const d1 = await call('DELETE', `/user/measurements/${measId}`, { token: Bu.token });
const d2 = await call('DELETE', `/nutrition/meal/${mealId}`, { token: Bu.token });
const d3 = await call('DELETE', `/workout/${wkId}`, { token: Bu.token });
rec('idor', "user B cannot delete user A's measurement / meal / workout (404, nothing removed)", [d1, d2, d3].every((r) => r.status === 404), [d1, d2, d3].map((r) => r.status).join(','));
const aMeas = await call('GET', '/user/measurements', { token: A.token });
const aToday = await call('GET', '/nutrition/today', { token: A.token });
const aHist = await call('GET', '/workout/list', { token: A.token });
const stillThere = JSON.stringify(aMeas.json).includes(String(measId)) && JSON.stringify(aToday.json).includes(String(mealId)) && JSON.stringify(aHist.json).includes(String(wkId));
rec('idor', "A's data is still there after B's attempts", stillThere);
const bMeas = await call('GET', '/user/measurements', { token: Bu.token });
const bToday = await call('GET', '/nutrition/today', { token: Bu.token });
const bHist = await call('GET', '/workout/list', { token: Bu.token });
rec('idor', "B's lists do not contain A's records", !JSON.stringify([bMeas.json, bToday.json, bHist.json]).includes(String(measId)) && !JSON.stringify(bToday.json).includes(String(mealId)) && !JSON.stringify(bHist.json).includes(String(wkId)));
const d4 = await call('DELETE', `/workout/${wkId}`, { token: A.token });
rec('idor', 'the owner can delete their own workout (control)', d4.status === 200, String(d4.status));

// ───────── 3. mass assignment ─────────
await mongoose.connect(MONGO);
const Users = mongoose.connection.collection('users');
const oid = (s) => new mongoose.Types.ObjectId(s);
const M = await mkUser('m');
const regEvil = await call('POST', '/auth/register', { body: { email: `evil-${Date.now()}@areto.local`, password: 'Preview123!', name: 'Evil', isAdmin: true, onboardingComplete: true, role: 'admin', 'profile': { age: 5 } } });
const evilDoc = await Users.findOne({ email: { $regex: '^evil-' } });
rec('mass-assignment', 'POST /auth/register ignores isAdmin / onboardingComplete / profile', evilDoc && evilDoc.isAdmin === false && evilDoc.onboardingComplete === false && !(evilDoc.profile && evilDoc.profile.age === 5), JSON.stringify({ isAdmin: evilDoc?.isAdmin, onb: evilDoc?.onboardingComplete, age: evilDoc?.profile?.age }));
const evilPut = await call('PUT', '/user/profile', { token: M.token, body: { weight: 80, isAdmin: true, email: 'hijack@areto.local', password: 'Hacked1234', passwordChangedAt: new Date(0), onboardingComplete: false, resetCode: 'x', profile: { age: 5 }, 'profile.age': 5, _id: A.id, createdAt: '2000-01-01' } });
let md = await Users.findOne({ _id: oid(M.id) });
rec('mass-assignment', 'PUT /user/profile ignores isAdmin / email / password / _id / profile.age', evilPut.status < 500 && md.isAdmin === false && md.email === M.email && md.profile.age === 30 && String(md._id) === M.id, `status=${evilPut.status} weight=${md.profile.weight}`);
const stillLogin = await call('POST', '/auth/login', { body: { email: M.email, password: 'Preview123!' } });
rec('mass-assignment', 'password was not changed through PUT /user/profile', stillLogin.status === 200);
const evilOnb = await call('POST', '/user/onboarding', { token: M.token, body: { name: 'M', age: 31, height: 172, weight: 74, gender: 'male', goal: 'cut', workoutsPerWeek: 4, experience: 'intermediate', isAdmin: true, email: 'x@y.z' } });
md = await Users.findOne({ _id: oid(M.id) });
rec('mass-assignment', 'POST /user/onboarding ignores isAdmin / email', md.isAdmin === false && md.email === M.email, String(evilOnb.status));
const wEvil = await call('POST', '/workout/complete', { token: M.token, body: { dayName: 'evil', durationMinutes: 30, location: 'gym', userId: Bu.id, date: '2001-01-01', totalVolume: 99999999, caloriesBurned: 999999, xp: 99999, completed: false, exercises: [{ name: 'Squat', sets: 1, reps: '5', mode: 'reps', setLog: [{ reps: 5, weight: 50, done: true }] }] } });
const wDoc = await mongoose.connection.collection('workouts').findOne({ dayName: 'evil' });
rec('mass-assignment', 'POST /workout/complete ignores userId / date / totalVolume / caloriesBurned', wDoc && String(wDoc.userId) === M.id && wDoc.date.getFullYear() >= 2026 && wDoc.totalVolume < 1000 && wDoc.caloriesBurned < 5000, JSON.stringify({ owner: String(wDoc?.userId) === M.id, year: wDoc?.date?.getFullYear(), vol: wDoc?.totalVolume, kcal: wDoc?.caloriesBurned }));
const nEvil = await call('POST', '/nutrition/log', { token: M.token, body: { description: 'ביצים', userId: Bu.id, date: '2001-01-01', createdAt: '2001-01-01', calories: 1, mealType: 'x' } });
const nDoc = await mongoose.connection.collection('nutritions').findOne({ userId: oid(M.id) });
rec('mass-assignment', 'POST /nutrition/log ignores userId / date / calories at top level', !!nDoc && String(nDoc.userId) === M.id && new Date(nDoc.date).getFullYear() >= 2026 && nDoc.meals?.[0]?.calories > 50 && !nDoc.meals?.[0]?.userId, JSON.stringify({ year: new Date(nDoc?.date).getFullYear(), kcal: nDoc?.meals?.[0]?.calories, status: nEvil.status }));
const sEvil = await call('POST', '/sleep/log', { token: M.token, body: { hours: 7, quality: 'good', userId: Bu.id, xp: 9999 } });
const sDoc = await mongoose.connection.collection('sleeps').findOne({ userId: oid(M.id) });
rec('mass-assignment', 'POST /sleep/log ignores userId', !!sDoc && String(sDoc.userId) === M.id, String(sEvil.status));
const mEvil = await call('POST', '/user/measurements', { token: M.token, body: { type: 'arm', value: 30, userId: Bu.id, date: '2001-01-01' } });
const mDoc = await mongoose.connection.collection('measurements').findOne({ type: 'arm', userId: oid(M.id) });
rec('mass-assignment', 'POST /user/measurements ignores userId', !!mDoc && String(mDoc.userId) === M.id, String(mEvil.status));
const proto = await call('PUT', '/user/profile', { token: M.token, raw: true, body: '{"weight":79,"__proto__":{"isAdmin":true},"constructor":{"prototype":{"isAdmin":true}}}' });
const probe = await call('GET', '/user/profile', { token: M.token });
md = await Users.findOne({ _id: oid(M.id) });
rec('mass-assignment', 'prototype-pollution payload in PUT /user/profile has no effect', md.isAdmin === false && ({}).isAdmin === undefined && proto.status < 500, `status=${proto.status}`);

// ───────── 4. input limits, NoSQL operators ─────────
const nosql = [
  await call('POST', '/auth/login', { body: { email: { $gt: '' }, password: { $gt: '' } } }),
  await call('POST', '/auth/login', { body: { email: { $ne: null }, password: 'Preview123!' } }),
  await call('POST', '/auth/forgot-password', { body: { email: { $gt: '' } } }),
  await call('POST', '/auth/reset-password', { body: { email: { $gt: '' }, code: { $gt: '' }, newPassword: 'Abcdefg12' } }),
  await call('POST', '/auth/login', { raw: true, body: '{"email":{"$where":"1"},"password":"x"}' }),
];
rec('input', 'NoSQL operators in login / forgot / reset → 400/401 (never 200 or 500)', nosql.every((r) => r.status === 400 || r.status === 401 || r.status === 429), nosql.map((r) => r.status).join(','));
const qinj = [
  await call('GET', '/nutrition/search?q[$ne]=x', { token: A.token }),
  await call('GET', '/workout/list?limit[$gt]=1&before[$ne]=1', { token: A.token }),
  await call('GET', '/workout/list?limit=1e9', { token: A.token }),
  await call('GET', '/workout/list?limit=-5', { token: A.token }),
  await call('GET', '/nutrition/history?days=999999', { token: A.token }),
  await call('GET', '/workout/list?before=notadate', { token: A.token }),
];
rec('input', 'query-string operators / absurd limits → no 500', qinj.every((r) => r.status < 500), qinj.map((r) => r.status).join(','));
const big = await Promise.all([
  call('POST', '/auth/register', { body: { email: 'a'.repeat(5000) + '@x.com', password: 'Preview123!' } }),
  call('POST', '/auth/register', { body: { email: `big-${Date.now()}@areto.local`, password: 'a1'.repeat(200000), name: 'x'.repeat(100000) } }),
  call('POST', '/nutrition/log', { token: A.token, body: { description: 'ביצים '.repeat(20000) } }),
  call('POST', '/workout/complete', { token: A.token, body: { exercises: Array.from({ length: 5000 }, () => ({ name: 'x', sets: 1 })) } }),
  call('POST', '/workout/complete', { token: A.token, body: { exercises: [{ name: 'x'.repeat(100000), sets: 1 }] } }),
  call('POST', '/workout/complete', { token: A.token, body: { durationMinutes: 1e12, exercises: [{ name: 'x', sets: 1, setLog: [{ reps: 1e12, weight: 1e308, done: true }] }] } }),
  call('POST', '/sleep/log', { token: A.token, body: { hours: 1e9 } }),
  call('POST', '/sleep/log', { token: A.token, body: { hours: 'abc' } }),
  call('POST', '/user/measurements', { token: A.token, body: { type: 'waist', value: 1e308 } }),
  call('POST', '/user/measurements', { token: A.token, body: { type: 'waist', value: 80, notes: 'n'.repeat(100000) } }),
  call('PUT', '/user/profile', { token: A.token, body: { name: { $ne: 1 }, weight: [1, 2, 3], equipment: 'barbell' } }),
]);
rec('input', 'oversized / extreme / wrong-type bodies are rejected with 4xx (never 5xx, never accepted)', big.every((r) => r.status >= 400 && r.status < 500), big.map((r) => r.status).join(','));
const deep = await call('POST', '/auth/login', { raw: true, body: '['.repeat(100000) + ']'.repeat(100000) });
rec('input', 'deeply nested JSON → 4xx (no crash)', deep.status >= 400 && deep.status < 500, String(deep.status));
const over = await call('POST', '/auth/login', { raw: true, body: JSON.stringify({ email: 'a@b.co', password: 'x'.repeat(1_100_000) }) });
rec('input', 'body over 1 MB → 413', over.status === 413, String(over.status));
const alive = await call('GET', '/health');
rec('input', 'server still healthy after the abuse above', alive.status === 200);
const badType = await call('POST', '/auth/login', { raw: true, headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ email: 'a@b.co', password: 'x' }) });
rec('input', 'JSON sent as text/plain is not parsed (no CSRF-style form posting of JSON)', badType.status === 400 || badType.status === 401, String(badType.status));

// ───────── 5. account enumeration and rate limits ─────────
const known = A.email;
const lKnownBad = await call('POST', '/auth/login', { body: { email: known, password: 'WrongPass123' } });
const lUnknown = await call('POST', '/auth/login', { body: { email: 'nobody-' + Date.now() + '@areto.local', password: 'WrongPass123' } });
rec('auth', 'login: wrong password and unknown email give the same status and message', lKnownBad.status === lUnknown.status && lKnownBad.json?.message === lUnknown.json?.message, `${lKnownBad.status}/${lUnknown.status}`);
const tK = []; const tU = [];
for (let i = 0; i < 3; i++) { tK.push((await call('POST', '/auth/login', { body: { email: known, password: 'WrongPass123' } })).ms); tU.push((await call('POST', '/auth/login', { body: { email: 'nobody-' + i + Date.now() + '@areto.local', password: 'WrongPass123' } })).ms); }
rec('auth', 'login timing: known vs unknown email', 'info' === 'x' ? true : undefined, `known ~${Math.round(tK.reduce((a, b) => a + b) / 3)} ms, unknown ~${Math.round(tU.reduce((a, b) => a + b) / 3)} ms (bcrypt cost 12 only runs for a known user)`);
const regDup = await call('POST', '/auth/register', { body: { email: known, password: 'Preview123!', name: 'dup' } });
const regNew = await call('POST', '/auth/register', { body: { email: `fresh-${Date.now()}@areto.local`, password: 'Preview123!', name: 'new' } });
rec('auth', 'register: an existing email answers like a new one (no enumeration)', regDup.status === regNew.status, `${regDup.status}/${regNew.status} dupToken=${!!regDup.json?.token} newToken=${!!regNew.json?.token}`);
const fpKnown = await call('POST', '/auth/forgot-password', { body: { email: known } });
const fpUnknown = await call('POST', '/auth/forgot-password', { body: { email: 'nobody@areto.local' } });
rec('auth', 'forgot-password: known and unknown email answer the same', fpKnown.status === fpUnknown.status && fpKnown.json?.message === fpUnknown.json?.message, `${fpKnown.status}/${fpUnknown.status}`);
// rate limits (fixed IP)
const ipL = '10.9.9.9';
const lim = [];
for (let i = 0; i < 14; i++) lim.push((await call('POST', '/auth/login', { ip: ipL, body: { email: known, password: 'WrongPass123' } })).status);
rec('auth', 'login is rate limited per IP (429 appears within 14 wrong attempts)', lim.includes(429), lim.join(','));
const ipF = '10.9.9.8'; const lf = [];
for (let i = 0; i < 8; i++) lf.push((await call('POST', '/auth/forgot-password', { ip: ipF, body: { email: known } })).status);
rec('auth', 'forgot-password is rate limited per IP', lf.includes(429), lf.join(','));
const ipR = '10.9.9.7'; const lr = [];
for (let i = 0; i < 18; i++) lr.push((await call('POST', '/auth/reset-password', { ip: ipR, body: { email: known, code: '000000', newPassword: 'Abcdefg12' } })).status);
rec('auth', 'reset-password is rate limited per IP', lr.includes(429), lr.join(','));
// reset code brute force on one account: 5 wrong codes kill the code
const ipR2 = '10.9.9.6';
await call('POST', '/auth/forgot-password', { ip: ipR2, body: { email: M.email } });
const codeAfter = await Users.findOne({ _id: oid(M.id) }, { projection: { resetCode: 1 } });
const attempts = [];
for (let i = 0; i < 7; i++) attempts.push((await call('POST', '/auth/reset-password', { ip: `10.9.8.${i}`, body: { email: M.email, code: String(100000 + i), newPassword: 'Abcdefg12' } })).status);
const killed = await Users.findOne({ _id: oid(M.id) }, { projection: { resetCode: 1, resetCodeAttempts: 1 } });
rec('auth', 'reset code is invalidated after 5 wrong guesses (even from rotating IPs)', killed.resetCode === null || killed.resetCode === undefined, `had=${!!codeAfter.resetCode} attempts=${attempts.join(',')}`);
const gl = await call('POST', '/auth/google', { body: { idToken: 'x.y.z' } });
rec('auth', '/auth/google rejects a bogus ID token', gl.status === 400 || gl.status === 401, String(gl.status));

// ───────── 6. misc headers ─────────
const h = await call('GET', '/health');
const hs = {}; for (const k of ['x-content-type-options', 'strict-transport-security', 'x-frame-options', 'content-security-policy', 'referrer-policy', 'x-powered-by', 'access-control-allow-origin']) hs[k] = h.headers.get(k);
rec('headers', 'API response headers (helmet)', 'info' === 'x' ? true : undefined, JSON.stringify(hs));
const e404 = await call('GET', '/nope/../../etc/passwd');
rec('headers', 'unknown path does not leak a stack trace', !/at .*\.js:\d+/.test(e404.text || ''), String(e404.status));
const err500 = await call('POST', '/auth/login', { raw: true, body: '{bad json', headers: { 'Content-Type': 'application/json' } });
rec('headers', 'malformed JSON → clean error without stack', !/at .*\.js:\d+/.test(err500.text || '') && err500.status < 500 || err500.status === 400, `${err500.status} ${String(err500.text).slice(0, 80)}`);

// ───────── 7. data export and the 429 response ─────────
const MEAL_A = 'export-marker-' + Date.now();
const mealA = await call('POST', '/nutrition/log', { token: A.token, body: { description: '2 ביצים ' + MEAL_A, mealType: 'breakfast' } });
const mealB = await call('POST', '/nutrition/log', { token: Bu.token, body: { description: '100 גרם אורז', mealType: 'lunch' } });
const exA = await call('GET', '/user/export', { token: A.token });
const exB = await call('GET', '/user/export', { token: Bu.token });
const textA = exA.text || ''; const textB = exB.text || '';
rec('export', 'GET /user/export returns the signed-in user data as JSON', exA.status === 200 && exA.json?.format === 'areto-export-v1' && exA.json?.account?.email === A.email && Array.isArray(exA.json?.nutrition), `status=${exA.status} meals=${exA.json?.nutrition?.length}`);
rec('export', 'the export holds only the own data of the caller (A sees A, B sees B, never the other)', exA.json?.account?.email === A.email && exB.json?.account?.email === Bu.email && !textA.includes(Bu.email) && !textB.includes(A.email) && !textB.includes(MEAL_A), '');
rec('export', 'the export never contains the password hash, reset code or userId fields', !/\"password\"|resetCode|passwordChangedAt|\"userId\"|\$2[aby]\$/.test(textA), '');
const exNo = await call('GET', '/user/export');
rec('export', 'GET /user/export without a token → 401', exNo.status === 401, String(exNo.status));
const exLim = [];
for (let i = 0; i < 12; i++) exLim.push((await call('GET', '/user/export', { token: A.token })).status);
rec('export', 'export is rate limited per user (429 after 10 an hour)', exLim.includes(429), exLim.join(','));
const exBstill = await call('GET', '/user/export', { token: Bu.token });
rec('export', 'one user hitting the export limit does not block another user on the same IP', exBstill.status === 200, String(exBstill.status));
void mealA; void mealB;
// forgot-password answers the same for a known and an unknown address even when no mail provider is configured
const fpA = await call('POST', '/auth/forgot-password', { body: { email: A.email } });
const fpU = await call('POST', '/auth/forgot-password', { body: { email: 'nobody-' + Date.now() + '@areto.local' } });
rec('auth', 'forgot-password: same status and body for a known and an unknown address, also with no mail provider', fpA.status === 200 && fpU.status === 200 && fpA.json?.message === fpU.json?.message, `${fpA.status}/${fpU.status}`);

await mongoose.disconnect();
const fails = results.filter((r) => r.ok === false);
console.log(`\nSUMMARY: ${results.filter((r) => r.ok === true).length} pass, ${fails.length} fail, ${results.filter((r) => r.ok === undefined).length} info`);
for (const f of fails) console.log('FAILED:', f.area, f.name, f.detail);
