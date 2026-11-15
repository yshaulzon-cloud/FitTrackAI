// Zero-dependency tests for the onboarding equipment picker.
// Run with:  node --test src/lib/equipmentPick.test.mjs   (from client/)
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { GYM_KIT, EQUIPMENT_OPTIONS, toggleEquipment, isGymKitOn, toggleGymKit } from './equipmentPick.mjs';

const require = createRequire(import.meta.url);
const { EQUIPMENT, normalizeEquipment } = require('../../../server/utils/equipment.js');

const sorted = (a) => [...a].sort();

test('GYM_KIT is every real server equipment value (everything but none)', () => {
  assert.deepEqual(sorted(GYM_KIT), sorted(EQUIPMENT.filter((x) => x !== 'none')));
  assert.equal(GYM_KIT.length, 7);
  assert.ok(!GYM_KIT.includes('gym'));
});

test('EQUIPMENT_OPTIONS: one chip per server value, in server order, with both languages', () => {
  assert.deepEqual(EQUIPMENT_OPTIONS.map((o) => o.value), EQUIPMENT);
  for (const o of EQUIPMENT_OPTIONS) assert.ok(o.he && o.en, o.value);
});

test('single chip: toggles on and off', () => {
  assert.deepEqual(toggleEquipment([], 'trx'), ['trx']);
  assert.deepEqual(toggleEquipment(['trx', 'bands'], 'trx'), ['bands']);
});

test('single chip: "none" and a kit evict each other', () => {
  assert.deepEqual(toggleEquipment(['barbell', 'trx'], 'none'), ['none']);
  assert.deepEqual(toggleEquipment(['none'], 'trx'), ['trx']);
  assert.deepEqual(toggleEquipment(['none'], 'none'), []);
});

test('gym chip from empty selects the whole kit', () => {
  const out = toggleGymKit([]);
  assert.deepEqual(sorted(out), sorted(GYM_KIT));
  assert.ok(isGymKitOn(out));
});

test('gym chip when "none" is selected removes it', () => {
  const out = toggleGymKit(['none']);
  assert.ok(!out.includes('none'));
  assert.deepEqual(sorted(out), sorted(GYM_KIT));
});

test('gym chip pressed twice clears everything', () => {
  const out = toggleGymKit(toggleGymKit([]));
  assert.deepEqual(out, []);
  assert.ok(!isGymKitOn(out));
});

test('removing one item (TRX) turns the gym chip off and keeps the rest', () => {
  const out = toggleEquipment(toggleGymKit([]), 'trx');
  assert.ok(!isGymKitOn(out));
  assert.equal(out.length, 6);
  assert.ok(!out.includes('trx'));
});

test('gym chip unions with a partial selection, no duplicates', () => {
  const out = toggleGymKit(['dumbbells', 'kettlebell']);
  assert.deepEqual(sorted(out), sorted(GYM_KIT));
  assert.equal(new Set(out).size, out.length);
});

test('picking "none" after the gym chip leaves only none', () => {
  const out = toggleEquipment(toggleGymKit([]), 'none');
  assert.deepEqual(out, ['none']);
  assert.ok(!isGymKitOn(out));
});

test('turning the gym chip off keeps unrelated picks (none other exist today, list is only real kit)', () => {
  // Every real item is part of GYM_KIT, so switching it off empties the list.
  assert.deepEqual(toggleGymKit([...GYM_KIT]), []);
});

test('payload with the gym chip on survives normalizeEquipment: 7 existing values, no gym', () => {
  const out = toggleGymKit([]);
  const norm = normalizeEquipment(out);
  assert.equal(norm.length, 7);
  assert.deepEqual(sorted(norm), sorted(GYM_KIT));
  assert.ok(!out.includes('gym'));
});
