// What the app says right after a meal is logged: what was added, how much of today's
// target is left, and anything the food engine had to assume. Pure (no React) so the
// wording and the edge cases — no target loaded, over the target, a guessed amount —
// can be tested. The numbers come from the server (`target`, `remaining` in the
// POST /nutrition/log and DELETE /nutrition/meal responses); nothing is recomputed here.

const r = (n) => Math.round(Number(n) || 0);

// "נשארו 640 קק״ל, 48 ג׳ חלבון להיום" · over the target · null when no target is known.
export function remainingLine(result, isHe) {
  const rem = result && result.remaining;
  const tgt = result && result.target;
  if (!rem || !tgt || !(Number(tgt.calories) > 0)) return null;
  const kcal = r(rem.calories);
  const prot = r(rem.protein);
  if (kcal >= 0) {
    if (prot > 0) return isHe ? `נשארו ${kcal} קק״ל, ${prot} ג׳ חלבון להיום` : `${kcal} kcal and ${prot} g protein left today`;
    return isHe ? `נשארו ${kcal} קק״ל להיום · יעד החלבון הושג` : `${kcal} kcal left today · protein target reached`;
  }
  if (prot > 0) return isHe ? `עברת את יעד היום ב-${-kcal} קק״ל · חסרים עוד ${prot} ג׳ חלבון` : `${-kcal} kcal over today's target · ${prot} g protein still to go`;
  return isHe ? `עברת את יעד היום ב-${-kcal} קק״ל` : `${-kcal} kcal over today's target`;
}

// The amounts the engine guessed because the text did not give them, in words.
function assumedNote(meal, isHe) {
  const items = Array.isArray(meal && meal.items) ? meal.items.filter((i) => i && i.quantityAssumed) : [];
  if (!items.length) return null;
  const list = items.map((i) => `${r(i.grams)} ${isHe ? 'ג׳' : 'g'} ${isHe ? (i.nameHe || i.name) : i.name}`).join(isHe ? ', ' : ', ');
  return isHe
    ? `לא צוינה כמות, ולכן הנחנו: ${list}. לדיוק כתבו כמות, למשל ״150 גרם״.`
    : `No amount was given, so we assumed: ${list}. For accuracy add an amount, e.g. “150 g”.`;
}

// Words of the text the engine did not recognise (and so did not count).
function unmatchedNote(meal, isHe) {
  const words = Array.isArray(meal && meal.unmatched) ? meal.unmatched.filter(Boolean) : [];
  if (!words.length) return null;
  const list = words.join(', ');
  return isHe ? `לא זיהינו: ${list} — לא נספרו בחישוב.` : `Not recognised: ${list} — not counted.`;
}

// → { text, hasNotes }. `text` is up to four lines (joined with \n): what was added,
// where the day stands, then any notes. `hasNotes` lets the screen draw it as a warning.
export function describeLogResult(result, isHe) {
  const m = (result && result.meal) || {};
  const tag = m.source === 'manual' ? (isHe ? ' · הוזן ידנית' : ' · entered by hand') : '';
  const head = isHe
    ? `נוסף: ${m.description} (${r(m.calories)} קק״ל, ${r(m.protein)} ג׳ חלבון)${tag}`
    : `Added: ${m.description} (${r(m.calories)} kcal, ${r(m.protein)} g protein)${tag}`;
  const notes = [assumedNote(m, isHe), unmatchedNote(m, isHe)].filter(Boolean);
  const lines = [head, remainingLine(result, isHe), ...notes].filter(Boolean);
  return { text: lines.join('\n'), hasNotes: notes.length > 0 };
}

// What to send back to POST /nutrition/log so a meal is saved EXACTLY as it was —
// for "log it again" chips and for undoing a delete. Re-sending only the description
// would make the server read it again, and the result can differ (a hand-typed meal
// would not be found at all; an old one could change when the food database does).
export function restoreValuesOf(meal) {
  const m = meal || {};
  return {
    calories: Number(m.calories) || 0,
    protein: Number(m.protein) || 0,
    carbs: Number(m.carbs) || 0,
    fat: Number(m.fat) || 0,
    fiber: Number(m.fiber) || 0,
    englishName: m.englishName || null,
    source: m.source || 'database',
  };
}
