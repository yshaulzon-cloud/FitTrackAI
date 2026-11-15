// Calorie-goal XP and the calorie-goal streak must stay in step (finding L5):
// when the meal that earned the XP is deleted, the streak it advanced has to go
// back too, not just the daily flag. No database: the Progression model is
// stubbed with an in-memory document.
//
// Run: cd server && node --test utils/progressionGoals.test.js
const test = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const Progression = require('../models/Progression');
const { checkNutritionGoals, revokeXP, XP_REWARDS } = require('./progression');
const { startOfUserDay, startOfUserDayOffset } = require('./dates');

const TZ = 'Asia/Jerusalem';
const TARGETS = { calorieTarget: 2000, macros: { protein: 150 } };

function withProgression(fields, fn) {
  const doc = new Progression({ userId: new mongoose.Types.ObjectId(), ...fields });
  doc.save = async () => doc; // never touch Mongo
  const original = Progression.findOne;
  Progression.findOne = async () => doc;
  return Promise.resolve(fn(doc, doc.userId)).finally(() => { Progression.findOne = original; });
}

const today = () => startOfUserDay(TZ);
const yesterday = () => startOfUserDayOffset(TZ, -1, today());
const sameDay = (a, b) => a && b && startOfUserDay(TZ, new Date(a)).getTime() === startOfUserDay(TZ, new Date(b)).getTime();

test('L5: hitting the calorie goal advances the streak; deleting the meal restores it exactly', async () => {
  await withProgression({ calorieStreak: 3, lastCalorieGoalDate: yesterday() }, async (prog, userId) => {
    const xpBefore = prog.totalXP;
    await checkNutritionGoals(userId, { totalCalories: 2000, totalProtein: 0 }, TARGETS, TZ);
    assert.strictEqual(prog.calorieStreak, 4);
    assert.ok(prog.dailyFlags.calorieGoalMet);
    assert.strictEqual(prog.totalXP, xpBefore + XP_REWARDS.calorie_goal);

    await revokeXP(userId, 'calorie_goal', TZ);
    assert.strictEqual(prog.dailyFlags.calorieGoalMet, false);
    assert.strictEqual(prog.totalXP, xpBefore);
    assert.strictEqual(prog.calorieStreak, 3, 'the streak the meal advanced must be given back');
    assert.ok(sameDay(prog.lastCalorieGoalDate, yesterday()), 'lastCalorieGoalDate must go back to yesterday');
  });
});

test('L5: a first-ever hit that is undone leaves no streak and no date', async () => {
  await withProgression({}, async (prog, userId) => {
    await checkNutritionGoals(userId, { totalCalories: 1900, totalProtein: 0 }, TARGETS, TZ);
    assert.strictEqual(prog.calorieStreak, 1);
    await revokeXP(userId, 'calorie_goal', TZ);
    assert.strictEqual(prog.calorieStreak, 0);
    assert.strictEqual(prog.lastCalorieGoalDate, null);
  });
});

test('L5: after an undo, hitting the goal again counts the day once (3 → 4, never 5)', async () => {
  await withProgression({ calorieStreak: 3, lastCalorieGoalDate: yesterday() }, async (prog, userId) => {
    await checkNutritionGoals(userId, { totalCalories: 2000, totalProtein: 0 }, TARGETS, TZ);
    await revokeXP(userId, 'calorie_goal', TZ);
    await checkNutritionGoals(userId, { totalCalories: 2050, totalProtein: 0 }, TARGETS, TZ);
    assert.strictEqual(prog.calorieStreak, 4);
  });
});

test('L5 (guard): revoking a goal that was never granted today changes nothing', async () => {
  await withProgression({ calorieStreak: 5, lastCalorieGoalDate: yesterday(), totalXP: 200 }, async (prog, userId) => {
    await revokeXP(userId, 'calorie_goal', TZ);
    assert.strictEqual(prog.totalXP, 200);
    assert.strictEqual(prog.calorieStreak, 5);
    assert.ok(sameDay(prog.lastCalorieGoalDate, yesterday()));
  });
});

test('L5 (guard): outside 90%–110% of the target nothing is awarded', async () => {
  await withProgression({ calorieStreak: 2, lastCalorieGoalDate: yesterday() }, async (prog, userId) => {
    await checkNutritionGoals(userId, { totalCalories: 1700, totalProtein: 0 }, TARGETS, TZ);
    assert.strictEqual(prog.dailyFlags.calorieGoalMet, false);
    assert.strictEqual(prog.calorieStreak, 2);
  });
});
