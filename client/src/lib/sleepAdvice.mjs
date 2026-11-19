// What last night's sleep should (and should not) change. Pure and
// deterministic: same inputs in → same advice out. The evidence behind every
// threshold is in docs/sleep-research.md — nothing here is invented.
//
// Inputs
//   hours          tonight-before's sleep, logged TODAY (null/undefined = not logged)
//   range          { min, max } for the user's age, from the server's getSleepRecommendation
//   isTrainingDay  true when the user is about to train, false on a rest day / not training
//   previousHours  the night before that, if it was logged (for "two nights in a row")
//
// Output
//   { level: 'none' | 'note' | 'adjust',
//     short:  last night was a "short night" (≤ 6 h),
//     ease:   when the user approves, load suggestions drop one weight step,
//     reason: { code, hours, min, max, previousHours, consecutive }  (machine-readable),
//     he, en: one sentence in each language (null when level is 'none') }
//
// Levels:  none   → say nothing        note → a quiet sentence, no behaviour change
//          adjust → a card the user approves or skips; only 'adjust' can change anything

// Craven et al. 2022 (Sports Med) define "sleep loss" as ≤ 6 h in 24 h; below this
// the meta-analysis finds lower performance on average, above it there is no
// evidence worth acting on.
export const SHORT_NIGHT_MAX_HOURS = 6;

const DEFAULT_RANGE = { min: 7, max: 9 };

const valid = (h) => typeof h === 'number' && Number.isFinite(h) && h > 0 && h <= 24;
const fmt = (h) => (Number.isInteger(h) ? String(h) : String(Math.round(h * 10) / 10));

export function sleepAdvice({ hours, range, isTrainingDay = false, previousHours = null } = {}) {
  const r = range && Number.isFinite(range.min) && Number.isFinite(range.max) ? range : DEFAULT_RANGE;
  const base = { level: 'none', short: false, ease: false, he: null, en: null };

  // No log today → nothing to go on. No guessing from older nights.
  if (!valid(hours)) return { ...base, reason: { code: 'no_log', hours: null, min: r.min, max: r.max, previousHours: null, consecutive: false } };

  const short = hours <= SHORT_NIGHT_MAX_HOURS;
  const consecutive = short && valid(previousHours) && previousHours <= SHORT_NIGHT_MAX_HOURS;
  const prev = valid(previousHours) ? previousHours : null;
  const reason = (code) => ({ code, hours, min: r.min, max: r.max, previousHours: prev, consecutive });
  const h = fmt(hours);

  if (short && isTrainingDay) {
    if (consecutive) {
      return {
        level: 'adjust', short: true, ease: true, reason: reason('short_consecutive_training'),
        he: `זה הלילה השני ברצף עם שינה קצרה (${fmt(previousHours)} ו-${h} שעות). אחרי כמה לילות כאלה אימון מרגיש קשה יותר מהרגיל. אפשר להתחיל צעד משקל אחד קל יותר מההצעה, ולהעלות אם מרגישים טוב.`,
        en: `That's a second short night in a row (${fmt(previousHours)} and ${h} h). After a few nights like that, training feels harder than usual. You can start one weight step lighter than suggested, and go up if it feels good.`,
      };
    }
    return {
      level: 'adjust', short: true, ease: true, reason: reason('short_training'),
      he: `ישנת ${h} שעות. אחרי שינה קצרה אימון מרגיש בדרך כלל קשה יותר והביצועים יורדים מעט. אפשר להתחיל צעד משקל אחד קל יותר מההצעה, ולהעלות אם מרגישים טוב.`,
      en: `You slept ${h} h. After short sleep a workout usually feels harder and performance dips slightly. You can start one weight step lighter than suggested, and go up if it feels good.`,
    };
  }

  if (short) {
    return {
      level: 'note', short: true, ease: false, reason: reason('short_rest'),
      he: `ישנת ${h} שעות, מתחת לטווח המומלץ (${r.min}–${r.max}). אין צורך לשנות משהו היום. כדאי להקדים לישון הלילה.`,
      en: `You slept ${h} h, below the recommended ${r.min}–${r.max}. Nothing needs to change today. Try an earlier night tonight.`,
    };
  }

  if (hours < r.min) {
    return {
      level: 'note', short: false, ease: false, reason: reason('below_range'),
      he: `ישנת ${h} שעות, קצת מתחת לטווח המומלץ לגילך (${r.min}–${r.max}). אין צורך לשנות את האימון.`,
      en: `You slept ${h} h, a little below the ${r.min}–${r.max} range recommended for your age. There's no need to change your workout.`,
    };
  }

  return { ...base, reason: reason('in_range') };
}

// The night before today's log, from /sleep/history (newest first). Entries are
// stored at the user's local midnight, so "the day before" is ~24 h earlier;
// rounding absorbs the 23/25-hour days around a clock change.
export function previousNightHours(sleep, history) {
  if (!sleep?.date || !Array.isArray(history)) return null;
  const t = new Date(sleep.date).getTime();
  if (!Number.isFinite(t)) return null;
  const prev = history.find((e) => Math.round((t - new Date(e?.date).getTime()) / 86400000) === 1);
  return prev && valid(prev.hours) ? prev.hours : null;
}

// A short night is the only thing the nutrition tab mentions. It never touches
// the calorie target: sleep does not change energy expenditure
// (Al Khatib 2017), it changes how much people tend to eat.
export function nutritionNote(advice) {
  if (!advice || !advice.short) return null;
  const h = fmt(advice.reason.hours);
  return {
    he: `ישנת ${h} שעות. במחקרים, שינה קצרה העלתה את צריכת הקלוריות בכ-385 קק״ל ביום בממוצע, כך שרעב חזק יותר היום הוא צפוי. היעד שלך לא משתנה.`,
    en: `You slept ${h} h. In studies, short sleep raised calorie intake by about 385 kcal a day on average, so stronger hunger today is expected. Your target doesn't change.`,
  };
}

// ── The user's answer ("approve" / "skip"), kept for one calendar day ────────
const CHOICE_KEY = 'areto:sleepAdvice:choice';

// Local calendar day, YYYY-MM-DD.
export function dayKey(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// → 'accepted' | 'skipped' | null. Re-logging a different number of hours
// invalidates an earlier answer: it was an answer to different sleep.
export function getChoice(hours, day = dayKey(), storage = globalThis.localStorage) {
  try {
    const saved = JSON.parse(storage.getItem(CHOICE_KEY) || 'null');
    if (!saved || saved.day !== day || saved.hours !== hours) return null;
    return saved.choice === 'accepted' || saved.choice === 'skipped' ? saved.choice : null;
  } catch { return null; }
}

export function setChoice(choice, hours, day = dayKey(), storage = globalThis.localStorage) {
  try {
    if (choice === 'accepted' || choice === 'skipped') storage.setItem(CHOICE_KEY, JSON.stringify({ day, hours, choice }));
    else storage.removeItem(CHOICE_KEY);
  } catch { /* ignore */ }
}

// The one question the workout screens ask: is the lighter start in effect?
export const easeActive = (advice, choice) => !!advice?.ease && choice === 'accepted';
