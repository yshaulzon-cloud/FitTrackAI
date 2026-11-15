// Structured items for a suggested-menu meal.
//
// The 300 menu plans store each meal as a free-text line ("2 ביצים קשות + ירקות
// חתוכים + פרוסת לחם מלא") plus the meal's total calories / protein / carbs / fat,
// which are the authoritative numbers. This module splits the line into items
// and gives each one a share of those totals, so the UI can show per-food
// nutrition and the user can edit a single food:
//
//   item = { name: { he, en }, grams, calories, protein, carbs, fat, estimated }
//
// How an item's share is worked out
//   1. find the food in FOOD_DB (values per 100 g) by the longest key contained
//      in the component text; the quantity comes from an explicit amount
//      ("150 גרם", "200 מ״ל"), else a count × a typical unit weight, else 100 g;
//   2. raw nutrition = per-100 g × grams / 100 (0 when the food is not in FOOD_DB);
//   3. the raw values are scaled so the items add up to the meal's totals
//      (largest-remainder rounding: the sums are exactly equal, never off by 1).
// An item is `estimated: true` when the food is not in FOOD_DB (no nutrition basis); `quantityGuessed` marks a quantity
// that was not written in the menu line. The UI marks estimated items with "~".
const { estimator } = require('./calculations');

const MACROS = ['calories', 'protein', 'carbs', 'fat'];

// Foods and quantities are read by the same engine as the meal log (utils/foodText.js),
// so "10 שקדים", "חצי כוס אורז" and "2 ביצים" mean the same grams here as there: a count
// uses that food's piece weight, a cup or tablespoon the weight of THAT food's cup or
// tablespoon (data/portions.js), and an amount nobody wrote is flagged as a guess.

// A menu line can name several foods ("סלט ירקות עם כף שמן זית"); the item stands for the
// most specific one (the longest name), with that food's own quantity.
function analyse(text) {
  const { foods } = estimator.parse(String(text || ''));
  if (!foods.length) return null;
  return foods.reduce((best, f) => (f.name.length > best.name.length ? f : best), foods[0]);
}

// → { grams, guessed } — guessed unless the text states a weight or volume itself.
function quantityOf(text) {
  const f = analyse(text);
  if (!f) return { grams: 100, guessed: true };
  return { grams: Math.round(f.grams), guessed: f.basis !== 'written' };
}

// The FOOD_DB entry the text is about (null when it names no food).
function matchFood(text) {
  const f = analyse(text);
  return f ? f.entry : null;
}

const per = (food, grams) => ({
  calories: (food.cal * grams) / 100,
  protein: (food.p * grams) / 100,
  carbs: (food.c * grams) / 100,
  fat: (food.f * grams) / 100,
});

// Split `total` across `weights` so the integer parts add up to `total` exactly.
function allocate(total, weights) {
  const n = weights.length;
  const sum = weights.reduce((a, b) => a + b, 0);
  const shares = sum > 0 ? weights.map((w) => (total * w) / sum) : weights.map(() => total / n);
  const floors = shares.map(Math.floor);
  let left = Math.round(total) - floors.reduce((a, b) => a + b, 0);
  const order = shares.map((s, i) => ({ i, r: s - Math.floor(s) })).sort((a, b) => b.r - a.r);
  for (let k = 0; left > 0 && k < n; k++, left--) floors[order[k].i] += 1;
  return floors;
}

function splitComponents(line) {
  return String(line || '').split(/\s+\+\s+|\s*\+\s*(?=\S)/).map((s) => s.trim()).filter(Boolean);
}

// Items for one meal ({ he, en, calories, protein, carbs, fat }).
function parseMealItems(meal) {
  const heParts = splitComponents(meal.he);
  const enParts = splitComponents(meal.en);
  const useEn = enParts.length === heParts.length;
  const raw = heParts.map((he, i) => {
    // The Hebrew line first; its English twin only if the Hebrew names no food.
    // Food and quantity come from the same reading, so they always agree.
    const found = analyse(he) || (useEn ? analyse(enParts[i]) : null);
    const food = found ? found.entry : null;
    const q = found ? { grams: Math.round(found.grams), guessed: found.basis !== 'written' } : { grams: 100, guessed: true };
    const nutrition = food ? per(food, q.grams) : { calories: 0, protein: 0, carbs: 0, fat: 0 };
    return { he, en: useEn ? enParts[i] : he, grams: q.grams, estimated: !food, quantityGuessed: q.guessed, nutrition };
  });
  if (raw.length === 0) return [];

  // Calories decide each item's weight; a macro the matched foods lack entirely
  // falls back to the calorie split, so no item ends up with an empty share.
  const calW = raw.map((r) => r.nutrition.calories);
  const out = raw.map((r) => ({ name: { he: r.he, en: r.en }, grams: r.grams, estimated: r.estimated, quantityGuessed: r.quantityGuessed }));
  const calAlloc = allocate(meal.calories || 0, calW);
  calAlloc.forEach((v, i) => { out[i].calories = v; });
  for (const key of ['protein', 'carbs', 'fat']) {
    const w = raw.map((r) => r.nutrition[key]);
    const alloc = allocate(meal[key] || 0, w.some((x) => x > 0) ? w : calW);
    alloc.forEach((v, i) => { out[i][key] = v; });
  }
  return out;
}

// Same meal with `items` attached. Never mutates the input (menu plans are shared).
function withItems(meal) {
  return { ...meal, items: parseMealItems(meal) };
}

function withItemsForMenu(menu) {
  if (!menu || !Array.isArray(menu.meals)) return menu;
  return { ...menu, meals: menu.meals.map(withItems) };
}

// Recompute a meal's totals from its items (used when the user edits a meal).
function sumItems(items) {
  const t = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  for (const it of items || []) for (const k of MACROS) t[k] += it[k] || 0;
  return t;
}

module.exports = { parseMealItems, withItems, withItemsForMenu, sumItems, matchFood, quantityOf, allocate, splitComponents };
