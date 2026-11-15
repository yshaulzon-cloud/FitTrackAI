// A meal the user types in by hand, when the food is not in the database.
// Pure helpers (no React) so the rules can be tested.
//
// The server accepts the numbers as body.nutrition with source 'manual' and applies
// the same ranges (server/utils/mealEstimate.js) — keep LIMITS in step with it.

export const MANUAL_LIMITS = { calories: 3000, protein: 400, carbs: 600, fat: 300 };

const FIELDS = ['calories', 'protein', 'carbs', 'fat'];

// A typed number: '' = empty, otherwise a finite, non-negative number. Accepts a decimal comma ("12,5").
function readNumber(raw) {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim().replace(',', '.');
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

// → { ok: true, description, nutrition } | { ok: false, errors: { name?, calories?, protein?, carbs?, fat? } }
// Calories are required. Protein / carbs / fat may be left empty — they count as 0.
// An error value is a code, not a sentence, so the screen can word it in either language.
export function validateManualMeal({ name, calories, protein, carbs, fat }) {
  const errors = {};
  const description = String(name || '').trim();
  if (!description) errors.name = 'required';
  else if (description.length > 500) errors.name = 'too-long';

  const raw = { calories, protein, carbs, fat };
  const values = {};
  for (const f of FIELDS) {
    const n = readNumber(raw[f]);
    if (n === null) {
      if (f === 'calories') errors.calories = 'required';
      else values[f] = 0;
    } else if (Number.isNaN(n) || n < 0) {
      errors[f] = 'invalid';
    } else if (n > MANUAL_LIMITS[f]) {
      errors[f] = 'too-big';
    } else {
      values[f] = Math.round(n);
    }
  }
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, description, nutrition: { ...values, source: 'manual' } };
}

// The sentence for one field's error, in the user's language.
export function manualErrorText(field, code, isHe) {
  const names = {
    name: isHe ? 'שם הארוחה' : 'The meal name',
    calories: isHe ? 'קלוריות' : 'Calories',
    protein: isHe ? 'חלבון' : 'Protein',
    carbs: isHe ? 'פחמימות' : 'Carbs',
    fat: isHe ? 'שומן' : 'Fat',
  };
  const unit = field === 'calories' ? (isHe ? 'קק״ל' : 'kcal') : (isHe ? 'ג׳' : 'g');
  if (code === 'required') return isHe ? `${names[field]}: חובה למלא` : `${names[field]} is required`;
  if (code === 'too-long') return isHe ? 'השם ארוך מדי (עד 500 תווים)' : 'The name is too long (500 characters at most)';
  if (code === 'too-big' && MANUAL_LIMITS[field] !== undefined) {
    const max = `${MANUAL_LIMITS[field].toLocaleString('en-US')} ${unit}`;
    return isHe ? `${names[field]}: עד ${max}` : `${names[field]}: ${max} at most`;
  }
  return isHe ? `${names[field]}: יש להזין מספר` : `${names[field]}: enter a number`;
}
