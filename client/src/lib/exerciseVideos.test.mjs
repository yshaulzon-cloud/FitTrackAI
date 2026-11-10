// Zero-dependency tests for the exercise → demo clip lookup.
// Run with:  node --test src/lib/exerciseVideos.test.mjs   (from client/)
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { englishKey, getExerciseVideoSlug, getExerciseVideo, EXERCISE_VIDEO_SLUGS } from './exerciseVideos.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (rel) => fs.readFileSync(path.join(here, rel), 'utf8');

// Every "Hebrew (English)" exercise name the app can put in a session.
function allExerciseNames() {
  const names = new Set();
  for (const src of [read('../../../server/utils/calculations.js'), read('../components/WorkoutPlan.jsx')]) {
    for (const m of src.matchAll(/name:\s*(['"])(.+?\(.+?\))\1/g)) names.add(m[2]);
  }
  return [...names];
}

const NO_VIDEO = /zone 2|hiit|walk|jog/i; // cardio blocks have no demo clip

test('englishKey: takes the English part and normalizes punctuation', () => {
  assert.equal(englishKey('סקוואט בולגרי (Bulgarian Split Squat)'), 'bulgarian split squat');
  assert.equal(englishKey('הרמה צדדית עם בקבוקים (Lateral Raise - Bottles)'), 'lateral raise bottles');
  assert.equal(englishKey('Pull Ups'), 'pull ups');
  assert.equal(englishKey(null), '');
});

test('every strength/core exercise in the plans has a demo clip', () => {
  const names = allExerciseNames();
  assert.ok(names.length > 40, `expected the full exercise list, got ${names.length}`);
  const missing = names.filter(n => !NO_VIDEO.test(n) && !getExerciseVideoSlug(n));
  assert.deepEqual(missing, []);
});

test('similar names resolve to different clips', () => {
  assert.equal(getExerciseVideoSlug('דדליפט (Deadlift)'), 'deadlift');
  assert.equal(getExerciseVideoSlug('דדליפט רומני (Romanian Deadlift)'), 'romanian-deadlift');
  assert.equal(getExerciseVideoSlug("לאנג'ים (Lunges)"), 'lunges');
  assert.equal(getExerciseVideoSlug("לאנג'ים (Walking Lunges)"), 'walking-lunges');
  assert.equal(getExerciseVideoSlug('כפיפה בפטיש (Hammer Curl)'), 'hammer-curl');
  assert.equal(getExerciseVideoSlug('כפיפה עם בקבוקים (Hammer Curl - Bottles)'), 'hammer-curl-bottles');
});

test('cardio and unknown names have no clip', () => {
  assert.equal(getExerciseVideo('הליכה מהירה / אופניים'), null);
  assert.equal(getExerciseVideo('אימון HIIT ביתי (Home HIIT Workout)'), null);
  assert.equal(getExerciseVideo(''), null);
});

test('URL respects the base path', () => {
  assert.equal(getExerciseVideo('סקוואט (Squat)'), '/exercise-videos/squat.mp4');
  assert.equal(getExerciseVideo('סקוואט (Squat)', '/app/'), '/app/exercise-videos/squat.mp4');
});

test('every mapped clip exists in public/exercise-videos', () => {
  const dir = path.join(here, '../../public/exercise-videos');
  const missing = EXERCISE_VIDEO_SLUGS.filter(s => !fs.existsSync(path.join(dir, `${s}.mp4`)));
  assert.deepEqual(missing, []);
});
