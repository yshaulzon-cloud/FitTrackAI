// Run with:  node --test src/lib/exerciseLibrary.test.mjs   (from client/)
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { EXERCISES, findExercise, getExerciseById, equipmentOk, easierVariant, getAlternatives } from './exerciseLibrary.mjs';
import { getExerciseVideoSlug } from './exerciseVideos.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const EQUIPMENT = ['dumbbells', 'barbell', 'machines', 'bands', 'trx', 'pullup_bar', 'kettlebell', 'none'];

test('ids are unique and every entry is well formed', () => {
  assert.equal(new Set(EXERCISES.map((e) => e.id)).size, EXERCISES.length);
  for (const e of EXERCISES) {
    assert.ok(e.name.includes('(') && e.name.endsWith(')'), e.id);
    assert.ok([1, 2, 3].includes(e.difficulty), e.id);
    assert.ok(e.equipment.length > 0 && e.equipment.every((q) => EQUIPMENT.includes(q)), e.id);
  }
});

test('every exercise with a demo clip has its video file, and clip-less ones are marked', () => {
  const dir = path.join(here, '../../public/exercise-videos');
  for (const e of EXERCISES) {
    const has = fs.existsSync(path.join(dir, `${e.id}.mp4`));
    assert.equal(has, e.video, `${e.id}: video flag ${e.video} but file ${has ? 'exists' : 'is missing'}`);
  }
});

test('every advanced (difficulty 3) exercise has an easier version, and it really is easier', () => {
  for (const e of EXERCISES.filter((q) => q.difficulty === 3)) {
    assert.ok(e.easier, `${e.id} has no easier version`);
    const easier = getExerciseById(e.easier);
    assert.ok(easier, `${e.id} → unknown ${e.easier}`);
    assert.ok(easier.difficulty < e.difficulty, `${e.id} → ${easier.id} is not easier`);
  }
  for (const e of EXERCISES) if (e.easier) assert.ok(getExerciseById(e.easier), `${e.id} → unknown easier id`);
});

test('easier chains end (no loops)', () => {
  for (const e of EXERCISES) {
    const seen = new Set([e.id]);
    let cur = e;
    while (cur.easier) { assert.ok(!seen.has(cur.easier), `loop at ${e.id}`); seen.add(cur.easier); cur = getExerciseById(cur.easier); }
  }
});

test('every exercise the plans use is in the library', () => {
  const src = fs.readFileSync(path.join(here, '../../../server/utils/calculations.js'), 'utf8')
    + fs.readFileSync(path.join(here, '../components/WorkoutPlan.jsx'), 'utf8');
  const names = new Set([...src.matchAll(/name:\s*(['"])(.+?\(.+?\))\1/g)].map((m) => m[2]).filter((n) => !/zone 2|hiit|walk|jog/i.test(n)));
  assert.ok(names.size > 40);
  const missing = [...names].filter((n) => !findExercise(n));
  assert.deepEqual(missing, []);
});

test('findExercise resolves plan names, including look-alikes', () => {
  assert.equal(findExercise('דדליפט (Deadlift)').id, 'deadlift');
  assert.equal(findExercise('דדליפט רומני (Romanian Deadlift)').id, 'romanian-deadlift');
  assert.equal(findExercise("לאנג'ים (Walking Lunges)").id, 'walking-lunges');
  assert.equal(findExercise('מתח בסיוע גומייה (Assisted Pull Ups)').id, 'assisted-pull-ups'); // no clip
  assert.equal(findExercise('לא קיים'), null);
  assert.equal(getExerciseVideoSlug('מתח בסיוע גומייה (Assisted Pull Ups)'), null);
});

test('equipmentOk: bodyweight always; kit must be owned; unknown kit means no filter', () => {
  const bench = findExercise('לחיצת חזה שטוח (Bench Press)');
  assert.equal(equipmentOk(bench, ['dumbbells']), false);
  assert.equal(equipmentOk(bench, ['barbell', 'dumbbells']), true);
  assert.equal(equipmentOk(findExercise('שכיבות סמיכה (Push Ups)'), ['dumbbells']), true);
  assert.equal(equipmentOk(bench, []), true);
  assert.equal(equipmentOk(bench, undefined), true);
  const assisted = findExercise('מתח בסיוע גומייה (Assisted Pull Ups)');
  assert.equal(equipmentOk(assisted, ['pullup_bar']), false); // needs the band too
  assert.equal(equipmentOk(assisted, ['pullup_bar', 'bands']), true);
});

test('getAlternatives: same muscle, kit-compatible, not in session, max 6, no duplicates', () => {
  const alts = getAlternatives('לחיצת חזה שטוח (Bench Press)', { userEquipment: ['dumbbells'], inSession: ['שכיבות סמיכה (Push Ups)'] });
  assert.ok(alts.length > 0 && alts.length <= 6);
  assert.ok(alts.every((a) => a.muscle === 'חזה'));
  assert.ok(alts.every((a) => equipmentOk(a, ['dumbbells'])));
  assert.ok(!alts.some((a) => a.id === 'bench-press' || a.id === 'push-ups'));
  assert.equal(new Set(alts.map((a) => a.id)).size, alts.length);
  assert.equal(getAlternatives('לא קיים').length, 0);
});

test('getAlternatives: the easier version of a hard exercise comes first and is flagged', () => {
  const alts = getAlternatives('מתח (Pull Ups)', { userEquipment: ['pullup_bar', 'bands', 'machines'] });
  assert.equal(alts[0].id, 'assisted-pull-ups');
  assert.equal(alts[0].isEasier, true);
  assert.ok(alts.slice(1).every((a) => !a.isEasier));
  assert.equal(easierVariant('מתח (Pull Ups)').id, 'assisted-pull-ups');
  assert.equal(easierVariant('לחיצת חזה שטוח (Bench Press)'), null);
});

test('getAlternatives: when the easier version needs kit the user lacks, it is left out', () => {
  const alts = getAlternatives('מתח (Pull Ups)', { userEquipment: ['pullup_bar'] });
  assert.ok(!alts.some((a) => a.id === 'assisted-pull-ups'));
  assert.ok(alts.every((a) => a.muscle === 'גב'));
});

import { normalizeUserEquipment } from './exerciseLibrary.mjs';
test('normalizeUserEquipment mirrors the server (legacy values expand, unknown dropped, none only alone)', () => {
  assert.deepEqual(normalizeUserEquipment(['gym']).sort(), ['barbell', 'dumbbells', 'machines']);
  assert.deepEqual(normalizeUserEquipment(['home']).sort(), ['bands', 'dumbbells']);
  assert.deepEqual(normalizeUserEquipment(['none', 'dumbbells']), ['dumbbells']);
  assert.deepEqual(normalizeUserEquipment(['none']), ['none']);
  assert.deepEqual(normalizeUserEquipment(['bogus', 'trx']), ['trx']);
  assert.deepEqual(normalizeUserEquipment(undefined), []);
});
