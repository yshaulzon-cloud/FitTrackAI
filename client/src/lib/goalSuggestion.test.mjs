// Run with:  node --test src/lib/goalSuggestion.test.mjs   (from client/)
import test from 'node:test';
import assert from 'node:assert/strict';
import { goalSheetContent, isSuggestionOff, setSuggestionOff } from './goalSuggestion.mjs';

const mem = () => { const m = new Map(); return { m, getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) }; };
const he = (o) => goalSheetContent({ done: 3, goal: 3, isHe: true, ...o });
const en = (o) => goalSheetContent({ done: 3, goal: 3, isHe: false, ...o });
// every line of text the sheet would put on screen
const shown = (c) => [c.title, c.notSaved, c.count, c.suggestion, c.tomorrow, c.maximum].filter(Boolean);

test('"don\'t suggest again" is kept per user', () => {
  const s = mem();
  assert.equal(isSuggestionOff('u1', s), false);
  setSuggestionOff('u1', s);
  assert.equal(isSuggestionOff('u1', s), true);
  assert.equal(isSuggestionOff('u2', s), false);
  assert.deepEqual([...s.m.keys()], ['areto:goalSuggestion:off:u1']);
});

test('no user id: nothing is read or written', () => {
  const s = mem();
  for (const id of [undefined, null, '']) { setSuggestionOff(id, s); assert.equal(isSuggestionOff(id, s), false); }
  assert.equal(s.m.size, 0);
});

test('storage that throws: the suggestion is shown and nothing breaks', () => {
  const broken = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('full'); } };
  assert.equal(isSuggestionOff('u1', broken), false);
  assert.doesNotThrow(() => setSuggestionOff('u1', broken));
  // no localStorage at all (default argument)
  assert.equal(isSuggestionOff('u1'), false);
  assert.doesNotThrow(() => setSuggestionOff('u1'));
});

test('the normal sheet: count, suggestion, settings button', () => {
  const c = he({});
  assert.equal(c.title, 'כבר הגעת ליעד האימונים שלך');
  assert.equal(c.count, 'השלמת 3 מתוך 3 אימונים.');
  assert.ok(c.suggestion && c.offerSettings);
  assert.equal(c.tomorrow, null);
  assert.equal(c.notSaved, null);
  assert.equal(c.maximum, null);
  assert.equal(en({}).count, "You've completed 3 of 3 workouts.");
  assert.equal(en({}).settingsLabel, 'Change goal in Settings');
});

test('already logged a workout today → the "from tomorrow" line', () => {
  assert.match(he({ loggedToday: true }).tomorrow, /ממחר/);
  assert.match(en({ loggedToday: true }).tomorrow, /tomorrow/);
});

test('goal lowered during the cycle, and singular grammar', () => {
  assert.equal(he({ done: 4, goal: 3 }).count, 'השלמת 4 אימונים, והיעד שלך הוא 3.');
  assert.equal(en({ done: 4, goal: 3 }).count, "You've completed 4 workouts, and your goal is 3.");
  assert.equal(he({ done: 1, goal: 1 }).count, 'השלמת אימון אחד מתוך אחד.');
  assert.equal(en({ done: 1, goal: 1 }).count, "You've completed 1 of 1 workout.");
  assert.equal(he({ done: 3, goal: 1 }).count, 'השלמת 3 אימונים, והיעד שלך הוא אימון אחד.');
  assert.equal(en({ done: 3, goal: 1 }).count, "You've completed 3 workouts, and your goal is 1 workout.");
});

test('a refused save says the workout was not saved', () => {
  assert.equal(he({ saveFailed: true }).notSaved, 'האימון לא נשמר.');
  assert.equal(en({ saveFailed: true }).notSaved, "This workout wasn't saved.");
});

test('a refused save while the app\'s count is stale shows no numbers', () => {
  for (const c of [he({ done: 2, known: false, saveFailed: true }), en({ done: 2, known: false, saveFailed: true })]) {
    assert.doesNotMatch(c.count, /\d/);
  }
});

test('goal 7 is the maximum: no settings button (and no checkbox, which follows it)', () => {
  const c = he({ done: 7, goal: 7, loggedToday: true });
  assert.equal(c.offerSettings, false);
  assert.equal(c.suggestion, null);
  assert.equal(c.tomorrow, null);
  assert.equal(c.maximum, '7 אימונים בשבוע הם המקסימום.');
  assert.equal(en({ done: 7, goal: 7 }).maximum, '7 workouts a week is the maximum.');
});

test('suggestion switched off: title, count, (not saved) and Close only — no mention of changing the goal', () => {
  for (const isHe of [true, false]) {
    for (const goal of [1, 3, 7]) {
      for (const saveFailed of [false, true]) {
        const c = goalSheetContent({ done: goal, goal, suggestionOff: true, loggedToday: true, saveFailed, isHe });
        assert.equal(c.offerSettings, false);
        assert.deepEqual(shown(c), [c.title, saveFailed ? c.notSaved : null, c.count].filter(Boolean));
        assert.doesNotMatch(shown(c).join(' '), /הגדרות|לשנות|שינוי|ממחר|מקסימום|Settings|change|tomorrow|maximum/i);
      }
    }
  }
});
