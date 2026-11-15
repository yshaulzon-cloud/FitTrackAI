// Run with:  node --test src/lib/exerciseLibrary.test.mjs   (from client/)
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { EXERCISES, findExercise, getExerciseById, equipmentOk, easierVariant, getAlternatives, homeOk } from './exerciseLibrary.mjs';
import { homeExerciseMap, toHomeExercises } from './homeExercises.mjs';
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
    + fs.readFileSync(path.join(here, '../components/WorkoutPlan.jsx'), 'utf8')
    + fs.readFileSync(path.join(here, './homeExercises.mjs'), 'utf8');
  const names = new Set([...src.matchAll(/name:\s*(['"])(.+?\(.+?\))\1/g)].map((m) => m[2]).filter((n) => !/zone 2|hiit|walk|jog/i.test(n)));
  assert.ok(names.size > 40);
  const missing = [...names].filter((n) => !findExercise(n));
  assert.deepEqual(missing, []);
});

test('findExercise resolves plan names, including look-alikes', () => {
  assert.equal(findExercise('דדליפט (Deadlift)').id, 'deadlift');
  assert.equal(findExercise('דדליפט רומני (Romanian Deadlift)').id, 'romanian-deadlift');
  assert.equal(findExercise("לאנג'ים (Walking Lunges)").id, 'walking-lunges');
  assert.equal(findExercise('מתח בסיוע גומייה (Assisted Pull Ups)').id, 'assisted-pull-ups');
  assert.equal(findExercise('פלאנק על הברכיים (Knee Plank)').id, 'knee-plank');
  assert.equal(findExercise('לא קיים'), null);
  assert.equal(getExerciseVideoSlug('מתח בסיוע גומייה (Assisted Pull Ups)'), 'assisted-pull-ups');
  assert.equal(getExerciseVideoSlug('פלאנק על הברכיים (Knee Plank)'), 'knee-plank');
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

// ── home / gym audit (see docs/exercise-audit.md) ─────────────────────────────
// Entries of the home map that are real library exercises (cardio / full-body
// placeholders such as "Zone 2" and HIIT live outside the library).
const homePairs = () => Object.entries(homeExerciseMap).flatMap(([gymName, home]) => {
  const out = [{ gymName, homeName: home.name }];
  if (home.alt) out.push({ gymName, homeName: home.alt.name, isAlt: true });
  return out;
});

test('home map: the home exercise trains the SAME muscle group as the gym exercise it replaces', () => {
  let checked = 0;
  for (const { gymName, homeName } of homePairs()) {
    const gym = findExercise(gymName);
    const home = findExercise(homeName);
    if (!gym || !home) continue; // not library exercises (cardio / full-body placeholders)
    assert.equal(home.muscle, gym.muscle, `${gymName} (${gym.muscle}) → ${homeName} (${home.muscle})`);
    checked++;
  }
  assert.ok(checked >= 27, `only ${checked} pairs were comparable`);
});

test('home map: no home exercise needs a machine or a barbell', () => {
  for (const { gymName, homeName } of homePairs()) {
    const home = findExercise(homeName);
    if (!home) continue;
    assert.ok(homeOk(home), `${gymName} → ${homeName} needs ${home.equipment.join('+')}`);
  }
});

test('home map: every library exercise that needs gym kit has a home replacement, and toHomeExercises applies it', () => {
  const gymOnly = EXERCISES.filter((e) => !homeOk(e));
  // every gym-only exercise the plan generator can emit must be mapped
  const planned = ['לחיצת חזה שטוח (Bench Press)', 'חתירה במוט (Barbell Row)', 'לחיצת כתפיים (Overhead Press)', 'פשיטת מרפק בכבל (Tricep Pushdown)',
    'חתירה בכבל (Cable Row)', 'פרפר מכונה (Pec Fly)', 'סקוואט (Squat)', 'דדליפט רומני (Romanian Deadlift)', 'לחיצת רגליים (Leg Press)',
    'מכפוף רגל (Leg Curl)', 'הרמות עקב (Calf Raise)', 'יישור רגל (Leg Extension)', 'דדליפט (Deadlift)'];
  for (const n of planned) assert.ok(homeExerciseMap[n], `${n} has no home replacement`);
  assert.ok(gymOnly.length > 0);
  // ...and so must every gym-only exercise in the library, because a permanent plan
  // swap can put any of them into the (gym) plan that home mode is derived from.
  for (const e of gymOnly) assert.ok(homeExerciseMap[e.name], `${e.id} (${e.equipment.join('+')}) has no home replacement`);
  const out = toHomeExercises([{ name: 'לחיצת חזה שטוח (Bench Press)', sets: 3, reps: '8-10', muscleGroup: 'חזה' }]);
  assert.equal(out[0].name, 'שכיבות סמיכה (Push Ups)');
  assert.equal(out[0].muscleGroup, 'חזה');
});

test('getAlternatives at home never offers a machine or barbell exercise (gym is unrestricted)', () => {
  const gymKit = ['barbell', 'machines', 'dumbbells', 'bands', 'pullup_bar'];
  for (const e of EXERCISES) {
    const home = getAlternatives(e.name, { userEquipment: gymKit, location: 'home', limit: 99 });
    assert.ok(home.every(homeOk), `home alternatives for ${e.id} include gym kit: ${home.filter((a) => !homeOk(a)).map((a) => a.id)}`);
  }
  const gym = getAlternatives('חתירה במוט (Barbell Row)', { userEquipment: gymKit, location: 'gym', limit: 99 });
  assert.ok(gym.some((a) => !homeOk(a)), 'gym mode should still offer machine/barbell alternatives');
  // with no location given the old behaviour is unchanged
  assert.ok(getAlternatives('חתירה במוט (Barbell Row)', { userEquipment: gymKit, limit: 99 }).some((a) => !homeOk(a)));
});

test('easierVariant at home skips an easier version that needs gym kit', () => {
  // Assisted Pull Ups → Lat Pulldown (machine) is fine in the gym, not at home
  assert.equal(easierVariant('מתח בסיוע גומייה (Assisted Pull Ups)').id, 'lat-pulldown');
  assert.equal(easierVariant('מתח בסיוע גומייה (Assisted Pull Ups)', { location: 'home' }), null);
  assert.equal(easierVariant('מתח (Pull Ups)', { location: 'home' }).id, 'assisted-pull-ups');
});
