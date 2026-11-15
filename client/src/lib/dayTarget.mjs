// Which calorie target applies where.
//
// The server (server/utils/targets.js) sends the profile's `nutrition` block with
//   calorieTarget / macros   the plain base target (what Settings edits)
//   today                    the target for the user's local day, shifted for a
//                            training or rest day (weekly average unchanged)
// The ring, the bars, the menu and XP all use `today`; history uses the target
// that was stored with each logged day, so changing weight or goal later doesn't
// rewrite how past days looked.

// The `nutrition` block the day-facing screens use: calorieTarget / macros are
// today's, and the plain base stays available as baseCalorieTarget.
// Without a `today` (old server, or none yet) the block is returned unchanged.
export function todaysNutrition(nutrition) {
  if (!nutrition) return nutrition ?? null;
  const t = nutrition.today;
  if (!t || !Number.isFinite(t.calorieTarget) || t.calorieTarget <= 0) return nutrition;
  return {
    ...nutrition,
    calorieTarget: t.calorieTarget,
    macros: t.macros || nutrition.macros,
    baseCalorieTarget: nutrition.calorieTarget,
    dayType: t.dayType || null,
  };
}

// Did the server send a usable calorie target? Screens must show "target not
// loaded" when it did not, never an invented default.
export function hasTargets(nutrition) {
  return !!nutrition && Number.isFinite(nutrition.calorieTarget) && nutrition.calorieTarget > 0;
}

// The target a logged past day is judged against: the snapshot saved with it,
// else `fallback` (days logged before snapshots existed use the plain base).
export function historyTargetFor(log, fallback) {
  const c = log && log.targetSnapshot && log.targetSnapshot.calories;
  return Number.isFinite(c) && c > 0 ? c : fallback;
}

// How close a set of days came to their own targets, 0–100.
// days: [{ consumed, target }] (only days that were logged). 0 when nothing to judge.
export function adherencePct(days) {
  const used = (days || []).filter((d) => d && d.consumed > 0 && d.target > 0);
  if (!used.length) return 0;
  const avgConsumed = used.reduce((s, d) => s + d.consumed, 0) / used.length;
  const avgTarget = used.reduce((s, d) => s + d.target, 0) / used.length;
  return Math.round((1 - Math.abs(avgConsumed - avgTarget) / avgTarget) * 100);
}
