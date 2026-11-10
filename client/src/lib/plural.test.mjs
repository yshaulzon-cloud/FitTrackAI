// Run with:  node --test src/lib/plural.test.mjs   (from client/)
import test from 'node:test';
import assert from 'node:assert/strict';
import { daysWord, daysLabel, streakHeadline, streakChip } from './plural.mjs';

test('Hebrew: 1 is "יום", everything else "ימים"', () => {
  assert.equal(daysWord(1, true), 'יום');
  for (const n of [0, 2, 3, 7, 11, 100]) assert.equal(daysWord(n, true), 'ימים');
});

test('English: 1 is "day", everything else "days"', () => {
  assert.equal(daysWord(1, false), 'day');
  for (const n of [0, 2, 30]) assert.equal(daysWord(n, false), 'days');
});

test('accepts numeric strings', () => {
  assert.equal(daysWord('1', true), 'יום');
});

test('daysLabel never prints "1 ימים" or "1 days"', () => {
  assert.equal(daysLabel(1, true), '1 יום');
  assert.equal(daysLabel(1, false), '1 day');
  assert.equal(daysLabel(4, true), '4 ימים');
  assert.equal(daysLabel(4, false), '4 days');
});

test('streak phrases', () => {
  assert.equal(streakHeadline(1, true), 'רצף של יום');
  assert.equal(streakHeadline(5, true), 'רצף של 5 ימים');
  assert.equal(streakHeadline(1, false), '1-day streak');
  assert.equal(streakChip(1, true), '1 יום ברצף');
  assert.equal(streakChip(12, true), '12 ימים ברצף');
  assert.equal(streakChip(3, false), '3-day streak');
});
