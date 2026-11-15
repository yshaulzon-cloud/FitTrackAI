// One place that decides WHEN each meal of a suggested menu is eaten, and
// which meal is "next". The menu data carries only a meal *type*
// (breakfast / snack / lunch / dinner), and a plan has two snacks, so a
// type → time table gives both snacks the same hour. The time is therefore
// derived from the meal's slot in the day: a snack before lunch is the
// mid-morning one, a snack after lunch is the afternoon one.
//
// Menu meals are swapped one-for-one on the client (swap-meal returns a fresh
// meal object without a time), so deriving the time from the slot keeps it
// stable across swaps. The notification code uses the same slot times.

export const SLOT_TIMES = {
  breakfast: '07:30',
  snackMorning: '10:30',
  lunch: '13:00',
  snackAfternoon: '16:30',
  dinner: '19:30',
};

const toMin = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
const fromMin = (n) => `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;

// Times for a day's meals, by position. Always strictly increasing in plan
// order: if the data is odd (e.g. two snacks before lunch) the later one is
// pushed 30 minutes past the one before it rather than duplicating its hour.
export function mealTimes(meals) {
  const out = [];
  let lunchSeen = false;
  let prev = -1;
  for (const meal of meals || []) {
    let slot;
    switch (meal?.type) {
      case 'breakfast': slot = SLOT_TIMES.breakfast; break;
      case 'lunch': slot = SLOT_TIMES.lunch; lunchSeen = true; break;
      case 'dinner': slot = SLOT_TIMES.dinner; break;
      case 'snack': slot = lunchSeen ? SLOT_TIMES.snackAfternoon : SLOT_TIMES.snackMorning; break;
      default: slot = null;
    }
    let min = slot ? toMin(slot) : (prev >= 0 ? prev + 60 : toMin(SLOT_TIMES.breakfast));
    if (min <= prev) min = prev + 30;
    out.push(fromMin(min));
    prev = min;
  }
  return out;
}

// Original indexes in chronological order (stable for equal times).
export function chronologicalOrder(meals) {
  const times = mealTimes(meals);
  return times.map((t, i) => ({ i, m: toMin(t) })).sort((a, b) => a.m - b.m || a.i - b.i).map(x => x.i);
}

// The first meal, in time order, the user has not eaten yet; -1 when the
// whole menu is eaten. `eaten` is a Set (or array) of original indexes.
export function nextMealIndex(meals, eaten) {
  const done = eaten instanceof Set ? eaten : new Set(eaten || []);
  for (const i of chronologicalOrder(meals)) if (!done.has(i)) return i;
  return -1;
}

const sum = (meals, key, idxs) => idxs.reduce((n, i) => n + (Number(meals[i]?.[key]) || 0), 0);

// Calories / protein / carbs / fat of the meals the user ticked as eaten.
export function eatenTotals(meals, eaten) {
  const idxs = [...(eaten instanceof Set ? eaten : new Set(eaten || []))].filter(i => meals?.[i]);
  return {
    count: idxs.length,
    calories: sum(meals, 'calories', idxs),
    protein: sum(meals, 'protein', idxs),
    carbs: sum(meals, 'carbs', idxs),
    fat: sum(meals, 'fat', idxs),
  };
}
