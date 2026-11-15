// What a meal being logged is worth — the decision POST /nutrition/log makes, kept
// free of Express and Mongo so it can be tested.
const { estimateNutrition } = require('./calculations');

// Where a meal's numbers came from. A client may restate it only to restore a meal
// exactly as it was (undo of a delete) or to mark a hand-typed one; anything else
// is stored as 'database'.
const KNOWN_SOURCES = ['database', 'manual', 'ai', 'default'];

// A suggested-menu meal already has exact totals (and the user may have edited
// its foods), so the menu flow sends them along instead of having the server
// guess them again from the description. A hand-typed meal (the food was not found)
// and the undo of a delete use the same door. Anything out of range is ignored.
function parseNutritionOverride(n) {
  if (!n || typeof n !== 'object') return null;
  const limits = { calories: 3000, protein: 400, carbs: 600, fat: 300 };
  const out = {};
  for (const [k, max] of Object.entries(limits)) {
    const v = Number(n[k]);
    if (n[k] === '' || n[k] === null || !Number.isFinite(v) || v < 0 || v > max) return null;
    out[k] = Math.round(v);
  }
  const fiber = Number(n.fiber);
  const englishName = typeof n.englishName === 'string' && n.englishName.trim() ? n.englishName.trim().slice(0, 120) : null;
  return {
    ...out,
    fiber: Number.isFinite(fiber) && fiber >= 0 && fiber <= 200 ? Math.round(fiber * 10) / 10 : 0,
    source: KNOWN_SOURCES.includes(n.source) ? n.source : 'database',
    englishName,
  };
}

// → { estimated } when the meal has numbers, otherwise { estimated: null, reason }:
//   'not-found'      the text names no food in the database;
//   'invalid-manual' the user typed their own numbers and they are not usable.
//
// A text the database cannot read is NOT turned into a made-up meal: it used to be saved
// as 350 kcal / 15 g protein / 40 g carbs / 12 g fat, which then counted toward the day's
// total, the ring and the calorie-goal XP. It is not logged; the user is told, and can
// search the list or type the numbers themselves (source 'manual').
function resolveMealEstimate(description, nutritionOverride) {
  const override = parseNutritionOverride(nutritionOverride);
  if (override) return { estimated: override };
  // A hand-typed meal with bad numbers must not quietly fall back to guessing the
  // description — the user asked for exactly these numbers.
  if (nutritionOverride && typeof nutritionOverride === 'object' && nutritionOverride.source === 'manual') {
    return { estimated: null, reason: 'invalid-manual' };
  }
  const estimated = estimateNutrition(description);
  if (estimated) return { estimated };
  return { estimated: null, reason: 'not-found' };
}

// The HTTP answer for a meal that could not be priced (both languages; the client
// picks one). `code` lets the app react without parsing text.
function failureResponse(reason) {
  if (reason === 'invalid-manual') {
    return {
      status: 400,
      body: {
        code: 'INVALID_VALUES',
        message: 'Please enter valid numbers (calories up to 3000, protein up to 400 g, carbs up to 600 g, fat up to 300 g).',
        messageHe: 'יש להזין מספרים תקינים (עד 3000 קק״ל, 400 ג׳ חלבון, 600 ג׳ פחמימות ו-300 ג׳ שומן).',
      },
    };
  }
  return {
    status: 422,
    body: {
      code: 'FOOD_NOT_FOUND',
      message: "We couldn't find that food. Search the list, describe it differently, or enter the values yourself.",
      messageHe: 'לא מצאנו את המאכל הזה. אפשר לחפש אותו ברשימה, לנסח אחרת או להזין את הערכים ידנית.',
    },
  };
}

module.exports = { parseNutritionOverride, resolveMealEstimate, failureResponse };
