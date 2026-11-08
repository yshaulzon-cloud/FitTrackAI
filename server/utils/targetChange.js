// When the user changes their weight or goal, their daily targets change. This
// works out "what were the targets, what are they now, and is the change big
// enough to tell the user and rebuild the menu" — all server-side, so the
// server stays the single source of truth for targets.
const { calculateTDEE, calculateCalorieTarget, calculateMacros } = require('./calculations');

// A weight change smaller than this does not count as "the weight changed".
const WEIGHT_TRIGGER_KG = 1;

// Targets for a profile, or null when the profile is too incomplete to compute.
function computeTargets(profile) {
  try {
    if (!profile || !profile.weight || !profile.height || !profile.age || !profile.gender) return null;
    const { tdee } = calculateTDEE(profile);
    const calorieTarget = calculateCalorieTarget(tdee, profile.goal, profile.weight, profile.bodyFatPercentage);
    const macros = calculateMacros(profile.weight, calorieTarget, profile.goal, profile.experience, profile.bodyFatPercentage);
    return { calorieTarget, protein: macros.protein, carbs: macros.carbs, fat: macros.fat };
  } catch {
    return null;
  }
}

// Returns null when nothing worth announcing changed, else
//   { reason: 'weight' | 'goal' | 'both', from: {...targets}, to: {...targets} }
// A change is announced when the goal changed, or the weight moved by at least
// 1 kg, and in either case the calorie target actually differs.
function describeTargetChange({ before, after, weightBefore, weightAfter, goalChanged }) {
  if (!before || !after) return null;
  const weightMoved = Number.isFinite(weightBefore) && Number.isFinite(weightAfter)
    && Math.abs(weightAfter - weightBefore) >= WEIGHT_TRIGGER_KG;
  if (!goalChanged && !weightMoved) return null;
  if (Math.round(before.calorieTarget) === Math.round(after.calorieTarget) && Math.round(before.protein) === Math.round(after.protein)) return null;
  return { reason: goalChanged && weightMoved ? 'both' : goalChanged ? 'goal' : 'weight', from: before, to: after };
}

module.exports = { computeTargets, describeTargetChange, WEIGHT_TRIGGER_KG };
