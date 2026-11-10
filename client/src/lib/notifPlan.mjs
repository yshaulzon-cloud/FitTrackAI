// Decides which local notifications should be scheduled right now. Pure
// (no Capacitor, no DOM, takes `now`), so the rules are unit-tested.
//
// Why a rolling window instead of repeating alarms: a repeating alarm cannot
// be told "skip today". Capacitor's LocalNotifications has no "check a
// condition just before firing" hook, so to stop a "log your lunch" reminder
// after lunch was already logged, each day gets its own one-shot notification
// and today's is simply not scheduled. The window (7 days) is rebuilt every
// time the app opens, returns to the foreground, or the relevant state changes.
import { NOTIF_TYPES, USER_TYPES, getCopy, isActive } from './notifConfig.mjs';

export const WINDOW_DAYS = 7;
const MIN_LEAD_MS = 30 * 1000; // never schedule something that is "now"

// Days since 1970-01-01 of the *local* calendar date. Used to build ids that
// are stable per (type, date): 1002 * 100000 + 20400 = 100,220,400 < 2^31.
export function epochDay(date) {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
}

export function idFor(baseId, date) {
  return baseId * 100000 + epochDay(date);
}

// Is a notification id one this app scheduled (new scheme)? Legacy repeating
// ids (1001–1008) are handled separately by the migration.
export function isManagedId(id) {
  const base = Math.floor(id / 100000);
  return Object.values(NOTIF_TYPES).some((t) => t.baseId === base);
}
export const LEGACY_IDS = Object.values(NOTIF_TYPES).map((t) => t.baseId);

function at(day0, offsetDays, time) {
  const d = new Date(day0);
  d.setDate(d.getDate() + offsetDays);
  d.setHours(time.hour, time.minute, 0, 0);
  return d;
}

// ── "was this meal already eaten today?" ────────────────────────────
// Decision (task 9): a reminder slot counts as eaten when EITHER
//  (a) a menu row of that meal type was ticked "eaten" today, OR
//  (b) the user logged any meal today whose time falls in that slot's window:
//      breakfast 04:00–10:59, lunch 11:00–15:59, dinner 16:00–23:59.
// Snacks have no reminder, so a ticked snack changes nothing.
export const SLOT_WINDOWS = { breakfast: [4, 11], lunch: [11, 16], dinner: [16, 24] };

export function slotOfHour(hour) {
  for (const [slot, [from, to]] of Object.entries(SLOT_WINDOWS)) if (hour >= from && hour < to) return slot;
  return null;
}

export function eatenSlots({ loggedMeals = [], menuMeals = [], menuTicked = [] }) {
  const out = new Set();
  for (const m of loggedMeals) {
    const t = new Date(m?.time ?? m?.createdAt ?? NaN);
    if (!Number.isNaN(t.getTime())) { const s = slotOfHour(t.getHours()); if (s) out.add(s); }
  }
  for (const idx of menuTicked) {
    const type = menuMeals?.[idx]?.type;
    if (type === 'breakfast' || type === 'lunch' || type === 'dinner') out.add(type);
  }
  return out;
}

// ── the plan ────────────────────────────────────────────────────────
// state: {
//   eatenSlots: Set<'breakfast'|'lunch'|'dinner'>   eaten today (see above)
//   workedOutToday: boolean
//   weeklyGoalMet: boolean                           weekly workout target reached
//   restDayToday: boolean                            today is a planned rest day
//   activityDoneToday: boolean                       today already counts for the streak
// }
// Returns [{ id, type, category, at: Date, title, body }] sorted by time.
export function buildPlan({ now = new Date(), prefs, state = {}, isHe = true, windowDays = WINDOW_DAYS }) {
  const out = [];
  const day0 = new Date(now); day0.setHours(0, 0, 0, 0);
  const eaten = state.eatenSlots instanceof Set ? state.eatenSlots : new Set(state.eatenSlots || []);
  const push = (type, when) => {
    if (when.getTime() - now.getTime() < MIN_LEAD_MS) return;
    const cfg = NOTIF_TYPES[type];
    const { title, body } = getCopy(type, isHe);
    out.push({ id: idFor(cfg.baseId, when), type, category: cfg.category, at: when, title, body });
  };

  for (const type of USER_TYPES) {
    if (!isActive(prefs, type)) continue;
    const cfg = NOTIF_TYPES[type];
    const { time, weekday } = prefs.items[type];

    if (cfg.kind === 'daily') {
      for (let i = 0; i < windowDays; i++) {
        const today = i === 0;
        if (type === 'workout' && state.weeklyGoalMet) break;               // quiet until the new week
        if (today && type === 'workout' && (state.workedOutToday || state.restDayToday)) continue;
        if (today && cfg.slot && eaten.has(cfg.slot)) continue;             // already ate / logged it
        if (today && type === 'streak' && state.activityDoneToday) continue; // streak is safe today
        if (today && type === 'sleep_prompt' && state.sleepLoggedToday) continue; // already logged
        const when = at(day0, i, time);
        push(type, when);
        if (type === 'sleep_prompt') {            // one follow-up 2h later, then silence
          const follow = new Date(when); follow.setHours(follow.getHours() + NOTIF_TYPES.sleep_followup.offsetHours);
          push('sleep_followup', follow);
        }
      }
    } else if (cfg.kind === 'weekly') {
      for (let i = 0; i < 14; i++) {
        const d = at(day0, i, time);
        if (d.getDay() === weekday) push(type, d);
      }
    }
  }
  return out.sort((a, b) => a.at - b.at);
}

// ── facts derived from workout history ──────────────────────────────
const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };

// Did the user already train today (device-local day)?
export function workedOutToday(workouts = [], now = new Date()) {
  const t = startOfDay(now).getTime();
  return workouts.some((w) => startOfDay(new Date(w.date)).getTime() === t);
}

// Has the weekly workout target been reached? Calendar week, Sunday start:
// the same maths as the home tab's week strip (kept from the earlier
// "pause the reminder once the weekly goal is met" change).
export function weeklyGoalMet(workouts = [], perWeek = 4, now = new Date()) {
  const today = startOfDay(now);
  const weekStart = new Date(today); weekStart.setDate(today.getDate() - today.getDay());
  const count = workouts.filter((w) => { const d = startOfDay(new Date(w.date)); return d >= weekStart && d <= today; }).length;
  return count >= (perWeek || 4);
}
