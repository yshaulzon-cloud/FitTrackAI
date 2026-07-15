// Zero-dependency unit tests for the search ranking logic.
// Run with:  node --test src/lib/searchRank.test.mjs   (from client/)
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalize, editDistance, scoreField, rankItems, highlightParts } from './searchRank.mjs';

test('normalize: lowercase, trim, collapse spaces, drop punctuation', () => {
  assert.equal(normalize('  Weight & Height  '), 'weight height');
  assert.equal(normalize('Cut, bulk!'), 'cut bulk');
  assert.equal(normalize(null), '');
});

test('normalize: strips Hebrew niqqud', () => {
  assert.equal(normalize('שָׂפָה'), normalize('שפה'));
});

test('editDistance: basic and capped', () => {
  assert.equal(editDistance('kitten', 'sitting'), 3 > 2 ? 3 : 3); // true distance 3
  assert.equal(editDistance('reminder', 'reminders', 2), 1);       // plural = 1 edit
  assert.ok(editDistance('abc', 'xyz', 2) > 2);                     // beyond cap
});

test('scoreField: tier ordering exact > prefix > word-start > substring', () => {
  const exact  = scoreField(normalize('theme'), 'Theme');
  const prefix = scoreField(normalize('them'),  'Theme');
  const word   = scoreField(normalize('height'), 'Weight & Height'); // word-start
  const sub    = scoreField(normalize('eigh'),   'Weight & Height'); // substring
  assert.equal(exact, 100);
  assert.ok(exact > prefix && prefix > word && word > sub && sub > 0);
});

test('scoreField: case-insensitive (the original bug)', () => {
  assert.ok(scoreField(normalize('weight'), 'Weight & Height') > 0);
});

test('scoreField: typo and singular/plural tolerance', () => {
  assert.ok(scoreField(normalize('remindr'), 'Workout reminder') > 0); // typo
  assert.ok(scoreField(normalize('reminders'), 'Meal reminder') > 0);  // plural
  assert.equal(scoreField(normalize('zzzz'), 'Language'), -1);         // no match
});

test('rankItems: title relevance ordering, filtered, stable', () => {
  const items = [
    { screen: 'display', label: 'Theme' },
    { screen: 'display', label: 'Language' },
    { screen: 'access',  label: 'Text size' },
    { screen: 'body',    label: 'Weight & Height' },
  ];
  const ranked = rankItems('the', items, (it) => ({ title: it.label }));
  assert.equal(ranked[0].item.label, 'Theme');          // best match first
  assert.ok(ranked.every(r => r.score > 0));            // no non-matches
  assert.ok(!ranked.some(r => r.item.label === 'Language')); // filtered out
});

test('rankItems: empty / whitespace query returns nothing', () => {
  const items = [{ screen: 'x', label: 'Theme' }];
  assert.deepEqual(rankItems('', items, (it) => ({ title: it.label })), []);
  assert.deepEqual(rankItems('   ', items, (it) => ({ title: it.label })), []);
});

test('highlightParts: marks the literal match, single segment when none', () => {
  const parts = highlightParts('Weight & Height', 'height');
  assert.ok(parts.some(p => p.hit && /height/i.test(p.text)));
  assert.equal(parts.map(p => p.text).join(''), 'Weight & Height'); // lossless
  const none = highlightParts('Theme', 'zzz');
  assert.deepEqual(none, [{ text: 'Theme', hit: false }]);
});

test('highlightParts: Hebrew match is lossless', () => {
  const parts = highlightParts('משקל וגובה', 'גובה');
  assert.equal(parts.map(p => p.text).join(''), 'משקל וגובה');
  assert.ok(parts.some(p => p.hit));
});
