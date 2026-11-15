// Picking a food from the search list: choose how much, see what it is worth and how
// much of today's target it takes, then log exactly those numbers. Pure helpers (no
// React). A food from GET /nutrition/search is
//   { name, nameHe, nameEn, cal, p, c, f, fb, serving }   — values per 100 g,
// `serving` = grams of one natural portion (an egg, a pita) or null when unknown.

export const MIN_GRAMS = 1;
export const MAX_GRAMS = 2000;

// The amount the picker opens with: one serving when the portions table knows it, else 100 g.
export const defaultGrams = (food) => (food && food.serving > 0 ? Math.round(food.serving) : 100);

// What the user typed → whole grams, or null when it is not a usable amount.
export function parseGrams(text) {
  const s = String(text ?? '').trim().replace(',', '.');
  if (s === '') return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n < MIN_GRAMS || n > MAX_GRAMS) return null;
  return Math.round(n);
}

// The food at a given weight.
export function portionNumbers(food, grams) {
  const g = Math.round(grams);
  const k = g / 100;
  return {
    grams: g,
    calories: Math.round(food.cal * k),
    protein: Math.round(food.p * k),
    carbs: Math.round(food.c * k),
    fat: Math.round(food.f * k),
    fiber: Math.round((food.fb || 0) * k),
  };
}

// value as a percent of a target; null when there is no usable target (never divides by 0).
export function shareOfTarget(value, target) {
  const v = Number(value);
  const t = Number(target);
  if (!(t > 0) || !Number.isFinite(v)) return null;
  return Math.round((v / t) * 100);
}

// The POST /nutrition/log body for this pick. The numbers are the ones the user saw
// in the picker, so what is saved is exactly what was on screen.
export function pickPayload(food, grams, isHe) {
  const n = portionNumbers(food, grams);
  const name = isHe ? (food.nameHe || food.name) : (food.nameEn || food.name);
  return {
    description: isHe ? `${n.grams} גרם ${name}` : `${n.grams} g ${name}`,
    nutrition: {
      calories: n.calories, protein: n.protein, carbs: n.carbs, fat: n.fat, fiber: n.fiber,
      englishName: food.nameEn || null,
      source: 'database',
    },
  };
}
