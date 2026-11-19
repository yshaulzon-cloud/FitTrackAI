// Regression tests for the findings fixed in docs/security-audit-r2.md:
//   • the auth middleware accepts only HS256 tokens whose userId is a 24-hex string;
//   • the error handler answers client mistakes (bad JSON, oversized body, blocked origin) with 4xx.
//
// Run: cd server && node --test utils/securityHardening.test.js
const test = require('node:test');
const assert = require('node:assert');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test-secret-for-the-hardening-tests-0123456789abcdef';
const User = require('../models/User');
const auth = require('../middleware/auth');
const { errorHandler, statusOf } = require('./errorHandler');

const UID = '65f0000000000000000000aa';
let lookups = 0;
User.findById = (id) => ({ select: async () => { lookups++; return String(id) === UID ? { _id: UID, passwordChangedAt: null } : null; } });

function run(headers) {
  return new Promise((resolve) => {
    const req = { headers };
    const res = { statusCode: null, body: null, status(c) { this.statusCode = c; return this; }, json(b) { this.body = b; resolve({ res: this, nextCalled: false, req }); return this; } };
    auth(req, res, () => resolve({ res, nextCalled: true, req }));
  });
}
const bearer = (t) => ({ authorization: `Bearer ${t}` });
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const SECRET = process.env.JWT_SECRET;

test('auth: a valid HS256 token for an existing user passes and sets req.userId', async () => {
  const r = await run(bearer(jwt.sign({ userId: UID }, SECRET)));
  assert.strictEqual(r.nextCalled, true);
  assert.strictEqual(r.req.userId, UID);
});

test('auth: no header, garbage, expired, wrong secret, alg:none and a tampered payload are all 401', async () => {
  const now = Math.floor(Date.now() / 1000);
  const tampered = (() => { const p = jwt.sign({ userId: UID }, SECRET).split('.'); p[1] = b64({ userId: '65f0000000000000000000bb', iat: now }); return p.join('.'); })();
  const cases = {
    'no header': {},
    'garbage': bearer('not.a.jwt'),
    'expired': bearer(jwt.sign({ userId: UID, iat: now - 100, exp: now - 10 }, SECRET)),
    'wrong secret': bearer(jwt.sign({ userId: UID }, 'another-secret')),
    'alg none': bearer(`${b64({ alg: 'none', typ: 'JWT' })}.${b64({ userId: UID, iat: now })}.`),
    'tampered payload': bearer(tampered),
  };
  for (const [name, h] of Object.entries(cases)) {
    const r = await run(h);
    assert.strictEqual(r.res.statusCode, 401, name);
  }
});

test('auth: a token signed with the right secret but another algorithm (HS512) is refused', async () => {
  const r = await run(bearer(jwt.sign({ userId: UID }, SECRET, { algorithm: 'HS512' })));
  assert.strictEqual(r.res.statusCode, 401);
  assert.strictEqual(r.nextCalled, false);
});

test('auth: a userId that is not a 24-hex string never reaches the database', async () => {
  lookups = 0;
  for (const bad of [{ $ne: null }, ['x'], 12345, 'abc', '65f0000000000000000000aZ', null]) {
    const r = await run(bearer(jwt.sign({ userId: bad }, SECRET)));
    assert.strictEqual(r.res.statusCode, 401, JSON.stringify(bad));
  }
  assert.strictEqual(lookups, 0, 'a query was made with a malformed userId');
});

test('auth: a token issued before the last password change is refused', async () => {
  const issued = Math.floor(Date.now() / 1000) - 1000;
  User.findById = () => ({ select: async () => ({ _id: UID, passwordChangedAt: new Date() }) });
  const r = await run(bearer(jwt.sign({ userId: UID, iat: issued }, SECRET)));
  assert.strictEqual(r.res.statusCode, 401);
});

function handle(err) {
  const logged = [];
  const origErr = console.error; console.error = (...a) => logged.push(a.join(' '));
  const res = { statusCode: null, body: null, status(c) { this.statusCode = c; return this; }, json(b) { this.body = b; return this; } };
  try { errorHandler(err, {}, res, () => {}); } finally { console.error = origErr; }
  return { res, logged };
}

test('error handler: malformed JSON → 400, body too large → 413, blocked CORS origin → 403, none of them logged as errors', () => {
  const syntax = Object.assign(new SyntaxError('Unexpected token'), { status: 400, type: 'entity.parse.failed' });
  const tooBig = Object.assign(new Error('request entity too large'), { status: 413, type: 'entity.too.large' });
  const cors = new Error('CORS blocked: https://evil.example');
  const deep = new RangeError('Maximum call stack size exceeded');
  for (const [err, code] of [[syntax, 400], [tooBig, 413], [cors, 403], [deep, 400]]) {
    const { res, logged } = handle(err);
    assert.strictEqual(res.statusCode, code, err.message);
    assert.deepStrictEqual(logged, [], 'a client mistake must not write a stack trace');
    assert.ok(res.body.message && res.body.messageHe);
    assert.ok(!/Unexpected token|evil\.example|entity/.test(JSON.stringify(res.body)), 'the body must not echo parser internals or the origin');
  }
});

test('error handler: a real server error is still a 500, logged, and leaks nothing', () => {
  const { res, logged } = handle(new Error('boom: mongodb://user:pass@host'));
  assert.strictEqual(res.statusCode, 500);
  assert.strictEqual(logged.length, 1);
  assert.ok(!JSON.stringify(res.body).includes('mongodb://'));
  assert.strictEqual(statusOf({ status: 200 }), 500);
  assert.strictEqual(statusOf(null), 500);
});
