// FOOD_DB against the USDA records it was verified with (scripts/usda-verified.json, written by
// scripts/usda-verify.js from the SR Legacy dataset). Guards the audited values: a later edit that
// moves one of them away from its source fails here and has to be a deliberate decision.
//
// Run: cd server && node --test utils/usdaCheck.test.js
const test = require('node:test');
const assert = require('node:assert');
const { FOOD_DB } = require('./calculations');
const usda = require('../scripts/usda-verified.json');

// kcal within 10% (or 3 kcal for near-zero foods) and each macro within max(2 g, 20%) — same rule as the audit.
function gap(e, v) {
  const kcalOk = v.cal > 5 ? Math.abs(e.cal - v.cal) / v.cal <= 0.1 : Math.abs(e.cal - v.cal) <= 3;
  const macros = ['p', 'c', 'f'].filter((k) => Math.abs(e[k] - v[k]) > Math.max(2, 0.2 * v[k]));
  return { kcalOk, macros };
}

test('every food verified against USDA still matches its record', () => {
  const off = [];
  for (const v of usda.records) {
    const e = FOOD_DB.find((x) => x.keys.includes(v.key));
    assert.ok(e, `no FOOD_DB entry for "${v.key}"`);
    const g = gap(e, v);
    if (!g.kcalOk || g.macros.length) off.push(`${v.key} (FDC ${v.fdc}): DB ${e.cal}/${e.p}/${e.c}/${e.f} vs USDA ${v.cal}/${v.p}/${v.c}/${v.f}`);
  }
  assert.deepStrictEqual(off, []);
});

test('the corrected entries hold per-100 g values (they used to hold one portion or a different product)', () => {
  const by = (k) => FOOD_DB.find((x) => x.keys.includes(k));
  assert.strictEqual(by('טחינה').cal, 592);
  assert.strictEqual(by('חלבון').cal, 352);
  assert.strictEqual(by('חומוס').cal, 237);
  assert.strictEqual(by('whey'), by('אבקת חלבון'), 'one protein-powder entry, not two');
});

test('no entry has more fibre than carbohydrate (impossible; USDA carbs include fibre)', () => {
  const bad = FOOD_DB.filter((e) => (e.fb || 0) > e.c).map((e) => e.keys[0]);
  assert.deepStrictEqual(bad, []);
});
