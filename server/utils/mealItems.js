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
const { FOOD_DB } = require('./calculations');

const MACROS = ['calories', 'protein', 'carbs', 'fat'];

// Typical weight of one unit, grams. Only used when a count is written with no
// explicit weight ("2 ביצים", "פרוסת לחם", "תפוח").
const UNIT_GRAMS = [
  [/ביצ(?:ה|ים|ת)|\begg/i, 50],
  [/פרוסת?\s*לחם|פרוסה|bread slice|slice/i, 30],
  [/תפוח(?![֐-׿])|apple/i, 180], // (?![א-ת]) instead of \b: \b ignores Hebrew letters
  [/בננה|banana/i, 120],
  [/אבוקדו|avocado/i, 150],
  [/כף(?![֐-׿])|כפות|tbsp|tablespoon/i, 15],
  [/כפית|tsp|teaspoon/i, 5],
  [/כוס|cup/i, 240],
  [/פיתה|pita/i, 90],
  [/קופסה|can\b|canned/i, 150],
];

const NUM_WORDS = { חצי: 0.5, half: 0.5, רבע: 0.25, quarter: 0.25 };

function quantityOf(text) {
  const t = text.toLowerCase();
  // explicit weight / volume
  let m = t.match(/(\d+(?:[.,]\d+)?)\s*(?:גרם|ג׳|גר׳|ג'|g\b|gr\b|gram)/);
  if (m) return { grams: parseFloat(m[1].replace(',', '.')), guessed: false };
  m = t.match(/(\d+(?:[.,]\d+)?)\s*(?:מ"ל|מ״ל|מל\b|ml\b)/);
  if (m) return { grams: parseFloat(m[1].replace(',', '.')), guessed: false };
  // a count (or a fraction word) × a typical unit
  let count = null;
  m = t.match(/(?:^|\s)(\d+(?:[.,]\d+)?)\s/);
  if (m) count = parseFloat(m[1].replace(',', '.'));
  for (const [w, v] of Object.entries(NUM_WORDS)) if (new RegExp(`(?:^|\\s)${w}(?:\\s|$)`).test(t)) count = v;
  for (const [re, g] of UNIT_GRAMS) if (re.test(t)) return { grams: Math.round((count ?? 1) * g), guessed: true };
  return { grams: 100, guessed: true };
}

// The FOOD_DB entry whose longest key is contained in the text (most specific wins).
function matchFood(text) {
  const t = text.toLowerCase();
  let best = null; let bestLen = 0;
  for (const item of FOOD_DB) {
    for (const key of item.keys) {
      if (key.length > bestLen && t.includes(key.toLowerCase())) { best = item; bestLen = key.length; }
    }
  }
  return best;
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
    const food = matchFood(he) || (useEn ? matchFood(enParts[i]) : null);
    const q = quantityOf(he);
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
