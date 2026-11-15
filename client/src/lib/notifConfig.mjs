// Single source of truth for every local notification the app can send:
// what it is, which settings category it belongs to, its defaults, its copy,
// and how its preferences are stored. Pure module (no Capacitor, no DOM) so it
// can be unit-tested; every function takes the `storage` it should read.
//
// Storage keys (all in localStorage, shape kept from the earlier code so
// existing users' choices carry over):
//   notif:<type>            '1' | '0'      reminder on/off
//   notif:<type>:time       'HH:MM'        preferred time
//   notif:weekly:weekday    '0'..'6'       day for the weekly recap (0 = Sunday)
//   notif:master            '1' | '0'      everything off when '0'   (new)
//   notif:cat:<category>    '1' | '0'      a whole category off      (new)

export const CATEGORIES = ['workout', 'nutrition', 'streak', 'sleep', 'weekly'];

export const CATEGORY_LABELS = {
  workout:   { he: 'אימון',           en: 'Workout' },
  nutrition: { he: 'תזונה',           en: 'Nutrition' },
  streak:    { he: 'רצף והתקדמות',    en: 'Streak & progress' },
  sleep:     { he: 'שינה',            en: 'Sleep' },
  weekly:    { he: 'סיכום שבועי',     en: 'Weekly recap' },
};

// Android channel per category, so the user can tune sound / importance per
// category in the phone's own settings. Importance 3 = default, 2 = low.
export const CHANNELS = {
  workout:   { id: 'areto_workout',   importance: 4, he: 'תזכורות אימון',    en: 'Workout reminders' },
  nutrition: { id: 'areto_nutrition', importance: 3, he: 'תזכורות תזונה',    en: 'Nutrition reminders' },
  streak:    { id: 'areto_streak',    importance: 3, he: 'רצף והתקדמות',     en: 'Streak & progress' },
  sleep:     { id: 'areto_sleep',     importance: 3, he: 'תזכורות שינה',     en: 'Sleep reminders' },
  weekly:    { id: 'areto_weekly',    importance: 2, he: 'סיכום שבועי',      en: 'Weekly recap' },
};

// kind: 'daily'   → one per day, rolling 7-day window (so a single day can be skipped)
//       'weekly'  → one per week on `weekday`
//       'today'   → armed for today only, cancelled once the thing is done (sleep)
export const NOTIF_TYPES = {
  workout:        { category: 'workout',   baseId: 1001, kind: 'daily',  def: { hour: 18, minute: 0 }, defEnabled: true },
  meal_morning:   { category: 'nutrition', baseId: 1002, kind: 'daily',  def: { hour: 8,  minute: 0 }, defEnabled: true, slot: 'breakfast' },
  meal_afternoon: { category: 'nutrition', baseId: 1003, kind: 'daily',  def: { hour: 13, minute: 0 }, defEnabled: true, slot: 'lunch' },
  meal_evening:   { category: 'nutrition', baseId: 1004, kind: 'daily',  def: { hour: 19, minute: 0 }, defEnabled: true, slot: 'dinner' },
  streak:         { category: 'streak',    baseId: 1005, kind: 'daily',  def: { hour: 21, minute: 0 }, defEnabled: true },
  weekly:         { category: 'weekly',    baseId: 1006, kind: 'weekly', def: { hour: 10, minute: 0 }, defEnabled: false, defWeekday: 0 },
  sleep_prompt:   { category: 'sleep',     baseId: 1007, kind: 'daily',  def: { hour: 8,  minute: 0 }, defEnabled: true },
  sleep_followup: { category: 'sleep',     baseId: 1008, kind: 'daily',  derivedFrom: 'sleep_prompt', offsetHours: 2 },
};

// Types that have their own switch and time in Settings (sleep_followup is
// derived from sleep_prompt, so it has none).
export const USER_TYPES = ['workout', 'meal_morning', 'meal_afternoon', 'meal_evening', 'streak', 'sleep_prompt', 'weekly'];

// Wording approved in 3dcec53 ("align notification wording with spec").
// Kept verbatim; only the code that uses it moved here.
export const COPY = {
  workout: {
    he: { title: 'זמן לאימון 💪', body: 'האימון שלך מחכה — כמה דקות של תנועה יקדמו אותך עוד צעד.' },
    en: { title: 'Time to train 💪', body: 'Your workout is waiting — a little movement can take you one step further.' },
  },
  meal_morning: {
    he: { title: 'זמן לארוחת בוקר 🥗', body: 'כדאי לעדכן עכשיו את ארוחת הבוקר כדי לשמור על מעקב מדויק.' },
    en: { title: 'Time for breakfast 🥗', body: 'Log your breakfast now to keep your tracking accurate.' },
  },
  meal_afternoon: {
    he: { title: 'זמן לארוחת צהריים 🍽️', body: 'עדכון קצר של ארוחת הצהריים יעזור לך להישאר במעקב.' },
    en: { title: 'Time for lunch 🍽️', body: 'A quick lunch update will help you stay on track.' },
  },
  meal_evening: {
    he: { title: 'זמן לארוחת ערב 🌙', body: 'כדאי לעדכן את ארוחת הערב עכשיו, כל עוד הפרטים עדיין טריים.' },
    en: { title: 'Time for dinner 🌙', body: 'Log your dinner while the details are still fresh.' },
  },
  streak: {
    he: { title: 'ממשיכים את הרצף 🔥', body: 'עדיין נשאר זמן להשלים את הפעילות של היום ולשמור על הרצף.' },
    en: { title: 'Keep your streak going 🔥', body: 'There’s still time to complete today’s activity and keep your streak going.' },
  },
  weekly: {
    he: { title: 'הסיכום השבועי מוכן 📊', body: 'אפשר לראות מה התקדם השבוע ומה כדאי לקחת איתך לשבוע הבא.' },
    en: { title: 'Your weekly recap is ready 📊', body: 'See your progress from this week and what to focus on next.' },
  },
  sleep_prompt: {
    he: { title: 'בוקר טוב 😴', body: 'כמה שעות ישנת הלילה? עדכון קצר יעזור לך לעקוב אחר השינה שלך.' },
    en: { title: 'Good morning 😴', body: 'How many hours did you sleep last night? A quick update will help you track your sleep.' },
  },
  sleep_followup: {
    he: { title: 'תזכורת קטנה לשינה 😴', body: 'עדיין לא עדכנת את שעות השינה שלך. אפשר לעשות את זה עכשיו בכמה שניות.' },
    en: { title: 'A quick sleep reminder 😴', body: 'You haven’t logged your sleep yet. It only takes a few seconds.' },
  },
};

export function getCopy(type, isHe) {
  const c = COPY[type];
  return c ? (isHe ? c.he : c.en) : { title: '', body: '' };
}

// ── storage helpers ────────────────────────────────────────────────

const read = (storage, key) => { try { return storage?.getItem?.(key) ?? null; } catch { return null; } };
const write = (storage, key, val) => { try { storage?.setItem?.(key, val); } catch { /* storage unavailable */ } };

export const fmtTime = (t) => `${String(t.hour).padStart(2, '0')}:${String(t.minute).padStart(2, '0')}`;

export function parseTime(hhmm, fallback) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || ''));
  if (!m) return fallback;
  const hour = Number(m[1]), minute = Number(m[2]);
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59 ? { hour, minute } : fallback;
}

// Everything the planner needs, with defaults for anything not saved yet.
// "notif:meal" was the old single toggle for all three meals: it seeds the
// three independent ones so an existing choice carries over.
export function readPrefs(storage) {
  const legacyMeal = read(storage, 'notif:meal');
  const on = (key, def) => {
    const v = read(storage, `notif:${key}`);
    return v === null ? def : v === '1';
  };
  const items = {};
  for (const type of USER_TYPES) {
    const cfg = NOTIF_TYPES[type];
    let def = cfg.defEnabled;
    if (cfg.slot && legacyMeal !== null) def = legacyMeal === '1';
    const item = {
      enabled: on(type, def),
      time: parseTime(read(storage, `notif:${type}:time`), cfg.def),
    };
    if (cfg.kind === 'weekly') {
      const wd = Number(read(storage, `notif:${type}:weekday`));
      item.weekday = Number.isInteger(wd) && wd >= 0 && wd <= 6 ? wd : cfg.defWeekday;
    }
    items[type] = item;
  }
  const categories = {};
  for (const c of CATEGORIES) categories[c] = on(`cat:${c}`, true);
  return { master: on('master', true), categories, items };
}

export function writeEnabled(storage, type, enabled) { write(storage, `notif:${type}`, enabled ? '1' : '0'); }
export function writeTime(storage, type, hhmm) { write(storage, `notif:${type}:time`, hhmm); }
export function writeWeekday(storage, type, weekday) { write(storage, `notif:${type}:weekday`, String(weekday)); }
export function writeMaster(storage, enabled) { write(storage, 'notif:master', enabled ? '1' : '0'); }
export function writeCategory(storage, category, enabled) { write(storage, `notif:cat:${category}`, enabled ? '1' : '0'); }

// Whether a reminder will actually fire, given the master and category switches.
export function isActive(prefs, type) {
  const cfg = NOTIF_TYPES[type];
  const item = prefs.items[cfg.derivedFrom || type];
  return !!(prefs.master && prefs.categories[cfg.category] && item?.enabled);
}

// 23:00–05:59 is when a notification is most likely to wake someone up.
export function isQuietTime(time) {
  return time.hour >= 23 || time.hour < 6;
}
