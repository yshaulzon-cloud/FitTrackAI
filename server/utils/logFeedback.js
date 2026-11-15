// What a meal log (or a delete) tells the app about the day: today's target, how much
// of it is left, and whether it is a training or rest day. Every path that changes
// the day's totals returns this, so the screen can say "נשארו 640 קק״ל" right after
// the action instead of the user doing the maths. Pure, so it can be tested.

const r = (n) => Math.round(Number(n) || 0);

// daily   { totalCalories, totalProtein, totalCarbs, totalFat }  — the day AFTER the change
// targets the object from utils/targets.js (getDailyTargets), or null when the profile
//         is incomplete — then there is nothing to compare with and all three are null.
// remaining is target − eaten, so a negative number means "over the target by that much".
function feedbackFor(daily, targets) {
  const none = { target: null, remaining: null, dayType: null };
  const t = targets && targets.today;
  if (!t || !(Number(t.calories) > 0)) return none;
  const d = daily || {};
  const target = { calories: r(t.calories), protein: r(t.protein), carbs: r(t.carbs), fat: r(t.fat) };
  return {
    target,
    remaining: {
      calories: target.calories - r(d.totalCalories),
      protein: target.protein - r(d.totalProtein),
      carbs: target.carbs - r(d.totalCarbs),
      fat: target.fat - r(d.totalFat),
    },
    dayType: (targets.dayType && targets.dayType.type) || null,
  };
}

module.exports = { feedbackFor };
