// Run with:  node --test src/lib/sleepAdvice.test.mjs   (from client/)
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  sleepAdvice, nutritionNote, dayKey, getChoice, setChoice, easeActive, previousNightHours, SHORT_NIGHT_MAX_HOURS,
} from './sleepAdvice.mjs';
import { easeForSleep, recommend, explain } from './workoutAdapt.mjs';

const ADULT = { min: 7, max: 9 };
const TEEN = { min: 8, max: 10 };
const mem = () => { const m = {}; return { getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: (k) => { delete m[k]; } }; };

test('no log today → nothing, with no guesses from older nights', () => {
  for (const hours of [undefined, null, NaN, 0, -3, 'x', 30]) {
    const a = sleepAdvice({ hours, range: ADULT, isTrainingDay: true, previousHours: 4 });
    assert.equal(a.level, 'none');
    assert.equal(a.ease, false);
    assert.equal(a.reason.code, 'no_log');
    assert.equal(a.he, null);
    assert.equal(a.en, null);
  }
  assert.equal(sleepAdvice({}).level, 'none');
});

test('8 hours (inside the recommended range) → no advice', () => {
  for (const day of [true, false]) {
    const a = sleepAdvice({ hours: 8, range: ADULT, isTrainingDay: day });
    assert.deepEqual([a.level, a.short, a.ease, a.reason.code, a.he], ['none', false, false, 'in_range', null]);
  }
  assert.equal(sleepAdvice({ hours: 7, range: ADULT, isTrainingDay: true }).level, 'none'); // lower edge
  assert.equal(sleepAdvice({ hours: 9, range: ADULT, isTrainingDay: true }).level, 'none'); // upper edge
});

test('5 hours on a training day → an "adjust" card that offers one lighter step', () => {
  const a = sleepAdvice({ hours: 5, range: ADULT, isTrainingDay: true });
  assert.deepEqual([a.level, a.short, a.ease, a.reason.code], ['adjust', true, true, 'short_training']);
  assert.match(a.he, /ישנת 5 שעות/);
  assert.match(a.en, /You slept 5 h/);
  assert.equal(a.reason.hours, 5);
  assert.equal(a.reason.consecutive, false);
});

test('5 hours on a rest day → a note only, no change to the workout', () => {
  const a = sleepAdvice({ hours: 5, range: ADULT, isTrainingDay: false });
  assert.deepEqual([a.level, a.short, a.ease, a.reason.code], ['note', true, false, 'short_rest']);
  assert.ok(a.he.length > 10 && a.en.length > 10);
});

test('two short nights in a row → the "second night" wording, same single step', () => {
  const a = sleepAdvice({ hours: 5.5, range: ADULT, isTrainingDay: true, previousHours: 5 });
  assert.deepEqual([a.level, a.ease, a.reason.code, a.reason.consecutive, a.reason.previousHours], ['adjust', true, 'short_consecutive_training', true, 5]);
  assert.match(a.he, /הלילה השני ברצף/);
  assert.match(a.en, /second short night/);
  // the night before was fine → it is not "in a row"
  const single = sleepAdvice({ hours: 5.5, range: ADULT, isTrainingDay: true, previousHours: 7.5 });
  assert.equal(single.reason.code, 'short_training');
  assert.equal(single.reason.consecutive, false);
  // an unlogged previous night is not assumed short
  assert.equal(sleepAdvice({ hours: 5.5, range: ADULT, isTrainingDay: true, previousHours: null }).reason.consecutive, false);
  // a short previous night alone does nothing when today's sleep is fine
  assert.equal(sleepAdvice({ hours: 8, range: ADULT, isTrainingDay: true, previousHours: 4 }).level, 'none');
});

test('under 18 (range 8–10): 7 h is below range → a note, never a load change', () => {
  const teen = sleepAdvice({ hours: 7, range: TEEN, isTrainingDay: true });
  assert.deepEqual([teen.level, teen.ease, teen.short, teen.reason.code], ['note', false, false, 'below_range']);
  assert.match(teen.he, /8–10/);
  // the same 7 h is fine for an adult
  assert.equal(sleepAdvice({ hours: 7, range: ADULT, isTrainingDay: true }).level, 'none');
  // 8 h is inside the teen range
  assert.equal(sleepAdvice({ hours: 8, range: TEEN, isTrainingDay: true }).level, 'none');
  // a really short night still triggers the same short-night rule for a teen
  assert.equal(sleepAdvice({ hours: 5, range: TEEN, isTrainingDay: true }).level, 'adjust');
});

test('the short-night threshold is 6 h inclusive (Craven 2022)', () => {
  assert.equal(SHORT_NIGHT_MAX_HOURS, 6);
  assert.equal(sleepAdvice({ hours: 6, range: ADULT, isTrainingDay: true }).level, 'adjust');
  const justOver = sleepAdvice({ hours: 6.5, range: ADULT, isTrainingDay: true });
  assert.deepEqual([justOver.level, justOver.ease, justOver.reason.code], ['note', false, 'below_range']);
});

test('missing or broken range falls back to 7–9; output is deterministic', () => {
  assert.equal(sleepAdvice({ hours: 6.5, isTrainingDay: true }).reason.min, 7);
  assert.equal(sleepAdvice({ hours: 6.5, range: { min: 'a' }, isTrainingDay: true }).reason.max, 9);
  const input = { hours: 5, range: ADULT, isTrainingDay: true, previousHours: 5 };
  assert.deepEqual(sleepAdvice(input), sleepAdvice(input));
});

test('every code that can be returned has a Hebrew and an English sentence', () => {
  const cases = [
    { hours: 5, range: ADULT, isTrainingDay: true },
    { hours: 5, range: ADULT, isTrainingDay: true, previousHours: 5 },
    { hours: 5, range: ADULT, isTrainingDay: false },
    { hours: 6.5, range: ADULT, isTrainingDay: true },
  ];
  for (const c of cases) {
    const a = sleepAdvice(c);
    assert.ok(a.he && a.en, a.reason.code);
    assert.ok(!/undefined|NaN/.test(a.he + a.en), a.reason.code);
  }
});

test('nutrition: only a short night gets a note, and it never changes the target', () => {
  const short = nutritionNote(sleepAdvice({ hours: 5, range: ADULT, isTrainingDay: false }));
  assert.ok(short.he.includes('הרגל') === false);
  assert.match(short.he, /היעד שלך לא משתנה/);
  assert.match(short.en, /target doesn't change/);
  assert.equal(nutritionNote(sleepAdvice({ hours: 6.5, range: ADULT, isTrainingDay: false })), null); // below range but not short
  assert.equal(nutritionNote(sleepAdvice({ hours: 8, range: ADULT, isTrainingDay: false })), null);
  assert.equal(nutritionNote(sleepAdvice({ range: ADULT })), null);
  assert.equal(nutritionNote(null), null);
});

test('the approve/skip answer is kept for the day and for those exact hours only', () => {
  const st = mem();
  assert.equal(getChoice(5, '2026-11-18', st), null);
  setChoice('accepted', 5, '2026-11-18', st);
  assert.equal(getChoice(5, '2026-11-18', st), 'accepted');
  assert.equal(getChoice(5, '2026-11-19', st), null); // tomorrow: asked again
  assert.equal(getChoice(8, '2026-11-18', st), null); // the sleep log was edited: asked again
  setChoice('skipped', 5, '2026-11-18', st);
  assert.equal(getChoice(5, '2026-11-18', st), 'skipped');
  setChoice(null, 5, '2026-11-18', st);
  assert.equal(getChoice(5, '2026-11-18', st), null);
  assert.equal(getChoice(5, '2026-11-18', { getItem: () => { throw new Error('blocked'); } }), null); // storage unavailable
});

test('previousNightHours finds exactly the night before today\'s log, across a clock change', () => {
  const today = { date: '2026-11-17T22:00:00.000Z', hours: 5 };
  const history = [
    today,
    { date: '2026-11-15T22:00:00.000Z', hours: 4 }, // two days back — not "the night before"
    { date: '2026-11-16T22:00:00.000Z', hours: 5.5 },
  ];
  assert.equal(previousNightHours(today, history), 5.5);
  assert.equal(previousNightHours(today, [today, history[1]]), null);       // the night before wasn't logged
  assert.equal(previousNightHours(today, []), null);
  assert.equal(previousNightHours(null, history), null);
  assert.equal(previousNightHours(today, null), null);
  // 25-hour day (clocks go back): still the previous day
  assert.equal(previousNightHours({ date: '2026-10-25T21:00:00.000Z' }, [{ date: '2026-10-24T21:00:00.000Z', hours: 6 }, { date: '2026-10-24T20:00:00.000Z', hours: 7 }]), 6);
  // garbage hours are not used
  assert.equal(previousNightHours(today, [{ date: '2026-11-16T22:00:00.000Z', hours: 0 }]), null);
  // chained with the advice: two short nights → second-night wording
  const a = sleepAdvice({ hours: today.hours, range: ADULT, isTrainingDay: true, previousHours: previousNightHours(today, history) });
  assert.equal(a.reason.code, 'short_consecutive_training');
});

test('dayKey is the local calendar day', () => {
  assert.equal(dayKey(new Date(2026, 10, 8, 0, 1)), '2026-11-08');
  assert.equal(dayKey(new Date(2026, 10, 8, 23, 59)), '2026-11-08');
});

test('approve changes the load shown, skip leaves the plan alone', () => {
  const advice = sleepAdvice({ hours: 5, range: ADULT, isTrainingDay: true });
  const recent = [{ date: '2026-11-10', sets: [{ reps: 10, weight: 60 }, { reps: 9, weight: 60 }, { reps: 9, weight: 60 }] }];
  const rec = recommend({ recent, targetReps: '8-12' }); // hold at 60
  assert.deepEqual([rec.action, rec.weight], ['hold', 60]);

  const show = (choice) => (easeActive(advice, choice) ? easeForSleep(rec) : rec);
  assert.equal(show('accepted').weight, 57.5); // one step lighter (the 2.5 kg step just under 60)
  assert.equal(show('skipped').weight, 60);    // unchanged
  assert.equal(show(null).weight, 60);         // not answered yet: unchanged
  assert.equal(easeActive(sleepAdvice({ hours: 8, range: ADULT, isTrainingDay: true }), 'accepted'), false);
  assert.equal(easeActive(sleepAdvice({ hours: 5, range: ADULT, isTrainingDay: false }), 'accepted'), false);
});

test('easeForSleep: one weight step off, never below zero, never twice, never on bodyweight', () => {
  const hold = (weight) => ({ action: 'hold', weight, reps: 8, reason: { code: 'building', reps: 8 } });
  assert.equal(easeForSleep(hold(10)).weight, 9);      // 1 kg step under 20 kg
  assert.equal(easeForSleep(hold(40)).weight, 37.5);   // 2.5 kg step
  assert.equal(easeForSleep(hold(100)).weight, 95);    // 5 kg step
  assert.equal(easeForSleep(hold(1)).weight, 0);       // floor at 0
  // a progression bump becomes "stay where you were"
  const bump = recommend({ recent: [{ date: 'd', sets: [{ reps: 12, weight: 40 }, { reps: 12, weight: 40 }] }], targetReps: '8-12' });
  assert.equal(bump.weight, 42.5);
  assert.equal(easeForSleep(bump).weight, 40);
  // already lowered (too hard / missed twice) → not lowered again
  const dec = { action: 'decrease', weight: 36, reps: 8, reason: { code: 'tooHard', from: 40 } };
  assert.equal(easeForSleep(dec), dec);
  // bodyweight and null are untouched
  const bw = { action: 'hold', weight: 0, reps: 10, reason: { code: 'building', reps: 9 } };
  assert.equal(easeForSleep(bw), bw);
  assert.equal(easeForSleep(null), null);
  // the explanation names the sleep and the original weight in both languages
  const eased = easeForSleep(hold(40));
  assert.match(explain(eased, true), /השינה/);
  assert.match(explain(eased, true), /40/);
  assert.match(explain(eased, false), /short sleep/);
  // pure: the input is not mutated
  const src = hold(40);
  easeForSleep(src);
  assert.equal(src.weight, 40);
});
