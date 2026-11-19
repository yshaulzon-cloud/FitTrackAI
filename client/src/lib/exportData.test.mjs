// Run: cd client && node --test src/lib/exportData.test.mjs
import test from 'node:test';
import assert from 'node:assert';
import { exportFileName, exportJson, exportCounts, exportDelivery } from './exportData.mjs';

test('file name carries the local date, zero-padded', () => {
  assert.strictEqual(exportFileName(new Date(2026, 10, 9, 23, 59)), 'areto-export-2026-11-09.json');
  assert.strictEqual(exportFileName(new Date(2027, 0, 5, 0, 1)), 'areto-export-2027-01-05.json');
});

test('JSON is readable and round-trips Hebrew text', () => {
  const data = { account: { email: 'a@b.co' }, nutrition: [{ description: '2 ביצים', calories: 156 }] };
  const text = exportJson(data);
  assert.ok(text.includes('\n  "account"'), 'indented');
  assert.ok(text.includes('2 ביצים'), 'Hebrew is not escaped to \\u05d1…');
  assert.deepStrictEqual(JSON.parse(text), data);
  assert.strictEqual(exportJson(undefined), '{}');
});

test('counts per kind, tolerant of missing parts', () => {
  assert.deepStrictEqual(exportCounts({ nutrition: [1, 2], workouts: [1], sleep: [], measurements: undefined }), { meals: 2, workouts: 1, sleep: 0, measurements: 0 });
  assert.deepStrictEqual(exportCounts(null), { meals: 0, workouts: 0, sleep: 0, measurements: 0 });
});

test('delivery: share on a phone, download in a browser (also a desktop that can share), clipboard in the native WebView', () => {
  assert.strictEqual(exportDelivery({ canShareFile: true, isNative: true, isTouch: true, canCopy: true }), 'share');
  assert.strictEqual(exportDelivery({ canShareFile: true, isNative: false, isTouch: true, canCopy: true }), 'share', 'a phone browser');
  assert.strictEqual(exportDelivery({ canShareFile: true, isNative: false, isTouch: false, canCopy: true }), 'download', 'desktop Chrome has the Web Share API but a file download is the expected thing');
  assert.strictEqual(exportDelivery({ canShareFile: false, isNative: false, isTouch: false, canCopy: true }), 'download');
  assert.strictEqual(exportDelivery({ canShareFile: false, isNative: true, isTouch: true, canCopy: true }), 'clipboard');
  assert.strictEqual(exportDelivery({ canShareFile: false, isNative: true, isTouch: true, canCopy: false }), 'download');
});
