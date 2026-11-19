// QA Q3: "Failed to fetch" must never reach a Hebrew screen as-is.
// Run: cd client && node --test src/lib/netError.test.mjs
import test from 'node:test';
import assert from 'node:assert';
import { isNetworkError, friendlyError, fetchOrNetworkError, readJsonSafe, networkMessage } from './netError.mjs';

test('browser network failures are recognised, other errors are not', () => {
  assert.ok(isNetworkError(new TypeError('Failed to fetch')));
  assert.ok(isNetworkError(new TypeError('NetworkError when attempting to fetch resource.')));
  assert.ok(isNetworkError(new TypeError('Load failed')));
  assert.ok(!isNetworkError(new Error('Failed to fetch')), 'only a TypeError from fetch counts, not any error with that text');
  assert.ok(!isNetworkError(new Error('אימייל או סיסמה שגויים')));
  assert.ok(!isNetworkError(Object.assign(new Error('x'), { name: 'AbortError' })));
  assert.ok(isNetworkError(Object.assign(new Error('x'), { code: 'NETWORK' })));
  assert.ok(!isNetworkError(null));
});

test('friendlyError: Hebrew and English sentence for a dropped connection, the server text otherwise', () => {
  const net = new TypeError('Failed to fetch');
  assert.strictEqual(friendlyError(net, true), 'אין חיבור לשרת. בדוק את האינטרנט ונסה שוב.');
  assert.match(friendlyError(net, false), /Can’t reach the server/);
  assert.ok(!/Failed to fetch/.test(friendlyError(net, true)));
  assert.strictEqual(friendlyError(new Error('קוד שגוי'), true), 'קוד שגוי');
  assert.strictEqual(friendlyError(new Error('Unexpected token < in JSON at position 0'), true), 'שגיאת שרת, נסה שוב עוד רגע.');
  assert.strictEqual(friendlyError(undefined, false, 'fallback'), 'fallback');
});

test('fetchOrNetworkError turns a rejected fetch into a coded, localised error and lets a response through', async () => {
  await assert.rejects(
    () => fetchOrNetworkError(async () => { throw new TypeError('Failed to fetch'); }, '/x', {}, true),
    (e) => e.code === 'NETWORK' && e.status === 0 && e.message === networkMessage(true),
  );
  const res = await fetchOrNetworkError(async () => ({ ok: true, status: 200 }), '/x', {}, false);
  assert.strictEqual(res.status, 200);
  await assert.rejects(
    () => fetchOrNetworkError(async () => { throw Object.assign(new Error('aborted'), { name: 'AbortError' }); }, '/x', {}, true),
    (e) => e.name === 'AbortError',
  );
});

test('readJsonSafe: JSON or {} (a proxy error page is not JSON)', async () => {
  assert.deepStrictEqual(await readJsonSafe({ json: async () => ({ a: 1 }) }), { a: 1 });
  assert.deepStrictEqual(await readJsonSafe({ json: async () => { throw new SyntaxError('Unexpected token <'); } }), {});
});
