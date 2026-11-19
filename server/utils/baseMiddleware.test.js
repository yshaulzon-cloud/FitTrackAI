// The real helmet → CORS → rate-limiter stack (utils/baseMiddleware.js) behind a real HTTP socket.
//   • QA Q4: a 429 still carries the CORS headers, so the browser can read "try again in a minute";
//   • the limiter counts per signed-in user, so users sharing one IP (carrier NAT, an office) do not
//     share one quota, and a forged token cannot pick a fresh bucket.
//
// Run: cd server && node --test utils/baseMiddleware.test.js
const test = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const express = require('express');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test-secret-for-the-base-middleware-0123456789abcdef';
const { applyBaseMiddleware, limiterKey } = require('./baseMiddleware');
const { errorHandler } = require('./errorHandler');

const ORIGIN = 'https://app.example.com';
const UA = '65f0000000000000000000aa';
const UB = '65f0000000000000000000bb';
const tokenFor = (userId, opts = {}) => jwt.sign({ userId }, process.env.JWT_SECRET, opts);

async function withServer(limitMax, fn) {
  const app = express();
  applyBaseMiddleware(app, { limitMax, corsOrigin: ORIGIN });
  app.get('/ping', (_req, res) => res.json({ ok: true }));
  app.use(errorHandler);
  const server = http.createServer(app);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const get = (headers = {}) => fetch(`${base}/ping`, { headers: { Origin: ORIGIN, ...headers } });
  try { await fn(get); } finally { await new Promise((r) => server.close(r)); }
}

test('Q4: the 429 of the global limiter carries the CORS headers', async () => {
  await withServer(2, async (get) => {
    assert.strictEqual((await get()).status, 200);
    assert.strictEqual((await get()).status, 200);
    const limited = await get();
    assert.strictEqual(limited.status, 429);
    assert.strictEqual(limited.headers.get('access-control-allow-origin'), ORIGIN, 'without it the browser says "CORS error"');
    const body = await limited.json();
    assert.match(body.messageHe, /נסה שוב/);
  });
});

test('limiter: two signed-in users on the same IP each get their own quota', async () => {
  await withServer(2, async (get) => {
    const a = { Authorization: `Bearer ${tokenFor(UA)}` };
    const b = { Authorization: `Bearer ${tokenFor(UB)}` };
    assert.strictEqual((await get(a)).status, 200);
    assert.strictEqual((await get(a)).status, 200);
    assert.strictEqual((await get(a)).status, 429, 'user A used up their 2');
    assert.strictEqual((await get(b)).status, 200, 'user B is not punished for A');
    assert.strictEqual((await get(b)).status, 200);
    assert.strictEqual((await get(b)).status, 429);
  });
});

test('limiter: a forged or foreign token cannot pick a fresh bucket (it counts against the IP)', async () => {
  await withServer(2, async (get) => {
    const forged = [
      `Bearer ${jwt.sign({ userId: UA }, 'some-other-secret')}`,
      `Bearer ${jwt.sign({ userId: UB }, process.env.JWT_SECRET, { algorithm: 'HS512' })}`,
      `Bearer ${jwt.sign({ userId: { $ne: null } }, process.env.JWT_SECRET)}`,
      'Bearer not-a-token',
    ];
    assert.strictEqual((await get({ Authorization: forged[0] })).status, 200);
    assert.strictEqual((await get({ Authorization: forged[1] })).status, 200);
    assert.strictEqual((await get({ Authorization: forged[2] })).status, 429, 'same IP bucket, whatever the forged token says');
    assert.strictEqual((await get({ Authorization: forged[3] })).status, 429);
    assert.strictEqual((await get()).status, 429, 'and anonymous requests share that same bucket');
  });
});

test('limiterKey: user for a valid token, ip for everything else', () => {
  const req = (authorization) => ({ headers: authorization ? { authorization } : {}, ip: '203.0.113.7' });
  assert.strictEqual(limiterKey(req(`Bearer ${tokenFor(UA)}`)), `user:${UA}`);
  assert.strictEqual(limiterKey(req(`Bearer ${tokenFor(UA, { expiresIn: -10 })}`)), 'ip:203.0.113.7', 'expired');
  assert.strictEqual(limiterKey(req(`Bearer ${tokenFor('not-hex')}`)), 'ip:203.0.113.7', 'userId must be 24 hex');
  assert.strictEqual(limiterKey(req()), 'ip:203.0.113.7');
});

test('a blocked CORS origin is still refused (the order change did not open anything)', async () => {
  await withServer(50, async (get) => {
    const res = await get({ Origin: 'https://evil.example.net' });
    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.headers.get('access-control-allow-origin'), null);
  });
});
