const test = require('node:test');
const assert = require('node:assert');
const { normalizeEquipment, EQUIPMENT } = require('./equipment');

test('passes through current values', () => {
  assert.deepEqual(normalizeEquipment(['dumbbells', 'trx']), ['dumbbells', 'trx']);
});

test('expands the legacy coarse values', () => {
  assert.deepEqual(normalizeEquipment(['gym']), ['dumbbells', 'barbell', 'machines']);
  assert.deepEqual(normalizeEquipment(['home']), ['dumbbells', 'bands']);
  assert.deepEqual(normalizeEquipment(['none']), ['none']);
});

test('de-dupes across a legacy + current mix', () => {
  assert.deepEqual(normalizeEquipment(['home', 'dumbbells', 'bands']), ['dumbbells', 'bands']);
});

test('returns EQUIPMENT order regardless of input order', () => {
  assert.deepEqual(normalizeEquipment(['kettlebell', 'barbell', 'dumbbells']), ['dumbbells', 'barbell', 'kettlebell']);
});

test("'none' loses to any real kit", () => {
  assert.deepEqual(normalizeEquipment(['none', 'dumbbells']), ['dumbbells']);
  assert.deepEqual(normalizeEquipment(['none', 'gym']), ['dumbbells', 'barbell', 'machines']);
});

test('drops unknown and malformed entries', () => {
  assert.deepEqual(normalizeEquipment(['dumbbells', 'spaceship', '', null, 42]), ['dumbbells']);
  assert.deepEqual(normalizeEquipment(['nonsense']), []);
});

test('tolerates non-arrays', () => {
  assert.deepEqual(normalizeEquipment(null), []);
  assert.deepEqual(normalizeEquipment('gym'), []);
});

test('every real kit value survives a round trip', () => {
  const kit = EQUIPMENT.filter((v) => v !== 'none');
  assert.deepEqual(normalizeEquipment(kit), kit);
});
