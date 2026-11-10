// Progressive-overload recommendations, computed from what the user actually
// did. Pure and deterministic: same history in → same suggestion out.
//
// Input per exercise: `recent` = up to 3 latest sessions of that exercise,
// newest first, each { date, sets: [{ reps, weight }] } (done sets only).
// `targetReps` is the plan's range string ("8-12", "12", "10-15 חזרות").
//
// Rules (double progression):
//   • every set reached the top of the range  → increase (weight; bodyweight: +1 rep)
//   • the user flagged it as too hard recently, or the bottom of the range was
//     missed in two sessions in a row         → decrease ~10 %
//   • otherwise                                → hold the weight, aim 1 rep higher
// The result carries a machine-readable `reason`; `explain()` turns it into a sentence.

export const TOO_HARD_WINDOW_DAYS = 14;

// "8-12" → { min: 8, max: 12 }; "12" → { min: 12, max: 12 }; unparsable → null
export function parseRepRange(str) {
  const s = String(str ?? '');
  const range = s.match(/(\d+)\s*[-–]\s*(\d+)/);
  if (range) {
    const a = parseInt(range[1], 10); const b = parseInt(range[2], 10);
    return { min: Math.min(a, b), max: Math.max(a, b) };
  }
  const one = s.match(/(\d+)/);
  if (one) { const n = parseInt(one[1], 10); return { min: n, max: n }; }
  return null;
}

// How much to add to a barbell/dumbbell/machine load.
export function weightStep(weight) {
  if (weight < 20) return 1;
  if (weight < 60) return 2.5;
  return 5;
}

const roundHalf = (n) => Math.round(n * 2) / 2;

function sessionStats(session, range) {
  const sets = (session?.sets || []).filter((s) => Number.isFinite(s.reps) && s.reps > 0);
  if (sets.length === 0) return null;
  const weight = Math.max(...sets.map((s) => s.weight || 0));
  // Judge sets at the working weight only (a light warm-up set must not hide a miss).
  const work = sets.filter((s) => (s.weight || 0) === weight);
  return {
    weight,
    minReps: Math.min(...work.map((s) => s.reps)),
    hitTop: work.every((s) => s.reps >= range.max),
    missedBottom: work.some((s) => s.reps < range.min),
  };
}

// → null when there is nothing to base a suggestion on, else
// { action: 'increase'|'hold'|'decrease', weight, reps, reason: { code, ... } }
export function recommend({ recent, targetReps, tooHardAt = null, now = Date.now() }) {
  const range = parseRepRange(targetReps);
  if (!range || !Array.isArray(recent) || recent.length === 0) return null;
  const last = sessionStats(recent[0], range);
  if (!last) return null;
  const prev = recent[1] ? sessionStats(recent[1], range) : null;
  const bodyweight = last.weight === 0;

  const flaggedAt = tooHardAt ? new Date(tooHardAt).getTime() : NaN;
  const lastAt = recent[0].date ? new Date(recent[0].date).getTime() : 0;
  const tooHard = Number.isFinite(flaggedAt)
    && now - flaggedAt <= TOO_HARD_WINDOW_DAYS * 86400000
    && flaggedAt > lastAt;

  const missedTwice = last.missedBottom && !!prev && prev.missedBottom && prev.weight >= last.weight;

  if ((tooHard || missedTwice) && !bodyweight) {
    const lowered = Math.max(0, roundHalf(last.weight * 0.9));
    if (lowered < last.weight) {
      return { action: 'decrease', weight: lowered, reps: range.min, reason: { code: tooHard ? 'tooHard' : 'missedTwice', from: last.weight } };
    }
  }
  if (last.hitTop) {
    if (bodyweight) return { action: 'increase', weight: 0, reps: last.minReps + 1, reason: { code: 'topRangeBodyweight', reps: last.minReps } };
    return { action: 'increase', weight: last.weight + weightStep(last.weight), reps: range.min, reason: { code: 'topRange', reps: range.max, from: last.weight } };
  }
  const reps = Math.min(range.max, Math.max(range.min, last.minReps + 1));
  return { action: 'hold', weight: last.weight, reps, reason: { code: last.missedBottom ? 'missedOnce' : 'building', reps: last.minReps } };
}

// ── "too hard" flags and the on/off preference (client-only) ────────────
const FLAGS_KEY = 'areto:adapt:tooHard';
const PREF_KEY = 'areto:adapt:enabled';

export function isAdaptEnabled(storage = globalThis.localStorage) {
  try { return storage.getItem(PREF_KEY) !== '0'; } catch { return true; }
}
export function setAdaptEnabled(on, storage = globalThis.localStorage) {
  try { storage.setItem(PREF_KEY, on ? '1' : '0'); } catch { /* ignore */ }
}
export function markTooHard(name, storage = globalThis.localStorage, now = new Date()) {
  try {
    const all = JSON.parse(storage.getItem(FLAGS_KEY) || '{}');
    all[name] = now.toISOString();
    storage.setItem(FLAGS_KEY, JSON.stringify(all));
  } catch { /* ignore */ }
}
export function tooHardAtFor(name, storage = globalThis.localStorage) {
  try { return JSON.parse(storage.getItem(FLAGS_KEY) || '{}')[name] || null; } catch { return null; }
}

// One sentence for the UI, in the user's language.
export function explain(rec, isHe) {
  const r = rec.reason;
  const kg = isHe ? 'ק״ג' : 'kg';
  switch (r.code) {
    case 'topRange': return isHe ? `הגעת ל-${r.reps} חזרות בכל הסטים עם ${r.from} ${kg}` : `You hit ${r.reps} reps on every set at ${r.from} ${kg}`;
    case 'topRangeBodyweight': return isHe ? `עשית ${r.reps} חזרות בכל הסטים, אפשר להוסיף חזרה` : `You did ${r.reps} reps on every set — add one`;
    case 'tooHard': return isHe ? 'סימנת שהתרגיל היה קשה מדי, אז מורידים קצת' : 'You flagged it as too hard, so a little lighter';
    case 'missedTwice': return isHe ? 'פעמיים ברציפות לא הגעת למינימום החזרות, אז מורידים קצת' : 'You missed the minimum reps twice in a row, so a little lighter';
    case 'missedOnce': return isHe ? 'בפעם שעברה לא הגעת למינימום החזרות, נשארים באותו משקל' : 'You missed the minimum reps last time — same weight';
    default: return isHe ? 'אותו משקל, חזרה אחת יותר מפעם שעברה' : 'Same weight, one more rep than last time';
  }
}
