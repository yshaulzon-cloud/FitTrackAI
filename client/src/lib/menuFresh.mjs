// A menu is built for one day and one target. These small rules decide when a
// menu kept on the device (localStorage) no longer applies, and how a menu
// compares with the target it is meant to meet.

// Why a saved menu should be rebuilt, or null when it still applies.
//   savedDate     the local calendar day it was built on (e.g. Date#toDateString)
//   today         today's local calendar day, same format
//   menuTarget    the calorie target it was sized for (from the server)
//   currentTarget today's calorie target now (training / rest adjusted), or null if unknown
// A menu with no recorded day (saved by an older version) counts as old.
export function menuStaleReason({ savedDate, today, menuTarget, currentTarget }) {
  if (!savedDate || savedDate !== today) return 'date';
  if (Number.isFinite(menuTarget) && Number.isFinite(currentTarget)
    && Math.round(menuTarget) !== Math.round(currentTarget)) return 'target';
  return null;
}

// Sum of one field over a menu's meals (the header shows what is really on the
// screen, never a number typed somewhere else).
export function sumMeals(meals, key) {
  return (meals || []).reduce((a, m) => a + (Number(m && m[key]) || 0), 0);
}

// How a total compares with its target: { total, target, gap, over, pct, level }.
//   gap   total − target (negative = under)
//   level 'close' within 5 %, 'near' within 10 %, 'far' beyond that
// null when there is no usable target.
export function menuVsTarget(total, target) {
  if (!Number.isFinite(total) || !(target > 0)) return null;
  const gap = Math.round(total - target);
  const off = Math.abs(total - target) / target;
  return {
    total: Math.round(total),
    target: Math.round(target),
    gap,
    over: gap > 0,
    pct: Math.round((total / target) * 100),
    level: off <= 0.05 ? 'close' : off <= 0.10 ? 'near' : 'far',
  };
}
