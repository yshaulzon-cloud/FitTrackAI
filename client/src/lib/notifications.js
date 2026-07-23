// Schedules/cancels recurring local notifications via Capacitor.
// No-ops on web (the toggles still persist to localStorage so the
// preferences survive across sessions and apply once on Android).

const IDS = {
  workout: 1001,
  meal_morning: 1002,
  meal_afternoon: 1003,
  meal_evening: 1004,
  streak: 1005,
  weekly: 1006,
  sleep_prompt: 1007,
  sleep_followup: 1008,
};

function isNative() {
  try {
    return typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.() === true;
  } catch { return false; }
}

// Wrapped in { plugin } rather than returned directly: a Capacitor plugin
// object intercepts *any* property access (including `.then`) and forwards
// it to a native method call. If this async function resolved directly to
// the plugin object, `await getPlugin()` would make JS's promise machinery
// probe it for a `.then` method to see if it's itself a thenable — which
// the proxy "answers" by attempting a real native call to a method literally
// named "then", throwing "LocalNotifications.then() is not implemented on
// android" and silently breaking every call in this file. A plain wrapper
// object has no `.then`, so no such probing happens.
async function getPlugin() {
  const { LocalNotifications } = await import('@capacitor/local-notifications');
  return { plugin: LocalNotifications };
}

async function ensurePermission() {
  const { plugin: LN } = await getPlugin();
  const perm = await LN.checkPermissions();
  if (perm.display !== 'granted') {
    const req = await LN.requestPermissions();
    return req.display === 'granted';
  }
  return true;
}

// Public: trigger the system notification permission prompt early.
// Safe no-op on web. Returns true if granted, false otherwise.
export async function requestNotificationPermission() {
  if (!isNative()) return false;
  try { return await ensurePermission(); } catch { return false; }
}

// Public: check current permission state without prompting. Returns
// 'granted' | 'denied' | 'prompt' | null (web/error).
export async function getNotificationPermissionStatus() {
  if (!isNative()) return null;
  try {
    const { plugin: LN } = await getPlugin();
    const perm = await LN.checkPermissions();
    return perm.display;
  } catch { return null; }
}

async function cancelById(id) {
  if (!isNative()) return true;
  try {
    const { plugin: LN } = await getPlugin();
    await LN.cancel({ notifications: [{ id }] });
  } catch { /* not scheduled */ }
  return true;
}

// Returns true once scheduled, false if permission was denied (so callers
// can revert their toggle and tell the user to enable it manually).
async function scheduleDaily({ id, hour, minute, title, body }) {
  if (!isNative()) return true;
  const ok = await ensurePermission();
  if (!ok) return false;
  const { plugin: LN } = await getPlugin();
  await LN.cancel({ notifications: [{ id }] }).catch(() => {});
  await LN.schedule({
    notifications: [{
      id, title, body,
      schedule: { on: { hour, minute }, allowWhileIdle: true, repeats: true },
      smallIcon: 'ic_stat_icon_config_sample',
    }],
  });
  return true;
}

async function scheduleWeekly({ id, weekday, hour, minute, title, body }) {
  if (!isNative()) return true;
  const ok = await ensurePermission();
  if (!ok) return false;
  const { plugin: LN } = await getPlugin();
  await LN.cancel({ notifications: [{ id }] }).catch(() => {});
  await LN.schedule({
    notifications: [{
      id, title, body,
      schedule: { on: { weekday, hour, minute }, allowWhileIdle: true, repeats: true },
      smallIcon: 'ic_stat_icon_config_sample',
    }],
  });
  return true;
}

// One-shot notification for a specific Date — unlike scheduleDaily/Weekly,
// this fires once and doesn't repeat, so cancelling it only affects that
// single occurrence (used by the sleep prompts, which need to be
// cancellable "just for today" without killing tomorrow's reminder).
async function scheduleOneTime({ id, when, title, body }) {
  if (!isNative()) return true;
  const ok = await ensurePermission();
  if (!ok) return false;
  const { plugin: LN } = await getPlugin();
  await LN.cancel({ notifications: [{ id }] }).catch(() => {});
  await LN.schedule({
    notifications: [{
      id, title, body,
      schedule: { at: when, allowWhileIdle: true },
      smallIcon: 'ic_stat_icon_config_sample',
    }],
  });
  return true;
}

// ── Sleep-logging reminders ─────────────────────────────────────────
// Modeled as a generic "daily prompt, one follow-up, then silence" pair
// so future reminder types (water, weigh-in) can copy this shape.
//
// Capacitor's LocalNotifications has no "check a condition right before
// firing" hook, so this can't be a single always-on repeating alarm like
// the workout/meal reminders above. Instead: schedule/cancel these two
// one-shot alarms for *today only*, called (a) whenever the app loads and
// sleep hasn't been logged yet, cancelling+re-arming for today's
// remaining slots, and (b) the instant sleep gets logged, cancelling both
// immediately. Tomorrow's occurrence is armed the next time the app opens.
export async function scheduleSleepPrompts(hour = 8, isHe = true) {
  if (!isNative()) return true;
  const now = new Date();

  const promptAt = new Date(now);
  promptAt.setHours(hour, 0, 0, 0);
  const followupAt = new Date(promptAt);
  followupAt.setHours(promptAt.getHours() + 2);

  const ok = await ensurePermission();
  if (!ok) return false;

  // Skip any slot whose time already passed today — don't fire a
  // "good morning" prompt at 3pm.
  if (promptAt > now) {
    await scheduleOneTime({
      id: IDS.sleep_prompt, when: promptAt,
      title: isHe ? 'בוקר טוב 😴' : 'Good morning 😴',
      body:  isHe ? 'כמה שעות ישנת הלילה? עדכון קצר יעזור לך לעקוב אחר השינה שלך.' : 'How many hours did you sleep last night? A quick update will help you track your sleep.',
    });
  }
  if (followupAt > now) {
    await scheduleOneTime({
      id: IDS.sleep_followup, when: followupAt,
      title: isHe ? 'תזכורת קטנה לשינה 😴' : 'A quick sleep reminder 😴',
      body:  isHe ? 'עדיין לא עדכנת את שעות השינה שלך. אפשר לעשות את זה עכשיו בכמה שניות.' : 'You haven’t logged your sleep yet. It only takes a few seconds.',
    });
  }
  return true;
}

export async function cancelSleepPrompts() {
  await cancelById(IDS.sleep_prompt);
  await cancelById(IDS.sleep_followup);
  return true;
}

export async function applyWorkoutReminder(enabled, isHe, time = { hour: 18, minute: 0 }) {
  if (!enabled) return cancelById(IDS.workout);
  return scheduleDaily({
    id: IDS.workout, hour: time.hour, minute: time.minute,
    title: isHe ? 'זמן לאימון 💪' : 'Time to train 💪',
    body:  isHe ? 'האימון שלך מחכה — כמה דקות של תנועה יקדמו אותך עוד צעד.' : 'Your workout is waiting — a little movement can take you one step further.',
  });
}

// Split into three independent reminders (was one combined toggle covering
// all three fixed times) so each meal can be turned on/off and timed on its
// own — someone who only wants a dinner nudge shouldn't also get breakfast
// and lunch ones.
export async function applyMealMorningReminder(enabled, isHe, time = { hour: 8, minute: 0 }) {
  if (!enabled) return cancelById(IDS.meal_morning);
  return scheduleDaily({
    id: IDS.meal_morning, hour: time.hour, minute: time.minute,
    title: isHe ? 'זמן לארוחת בוקר 🥗' : 'Time for breakfast 🥗',
    body:  isHe ? 'כדאי לעדכן עכשיו את ארוחת הבוקר כדי לשמור על מעקב מדויק.' : 'Log your breakfast now to keep your tracking accurate.',
  });
}

export async function applyMealAfternoonReminder(enabled, isHe, time = { hour: 13, minute: 0 }) {
  if (!enabled) return cancelById(IDS.meal_afternoon);
  return scheduleDaily({
    id: IDS.meal_afternoon, hour: time.hour, minute: time.minute,
    title: isHe ? 'זמן לארוחת צהריים 🍽️' : 'Time for lunch 🍽️',
    body:  isHe ? 'עדכון קצר של ארוחת הצהריים יעזור לך להישאר במעקב.' : 'A quick lunch update will help you stay on track.',
  });
}

export async function applyMealEveningReminder(enabled, isHe, time = { hour: 19, minute: 0 }) {
  if (!enabled) return cancelById(IDS.meal_evening);
  return scheduleDaily({
    id: IDS.meal_evening, hour: time.hour, minute: time.minute,
    title: isHe ? 'זמן לארוחת ערב 🌙' : 'Time for dinner 🌙',
    body:  isHe ? 'כדאי לעדכן את ארוחת הערב עכשיו, כל עוד הפרטים עדיין טריים.' : 'Log your dinner while the details are still fresh.',
  });
}

export async function applyStreakReminder(enabled, isHe, time = { hour: 21, minute: 0 }) {
  if (!enabled) return cancelById(IDS.streak);
  return scheduleDaily({
    id: IDS.streak, hour: time.hour, minute: time.minute,
    title: isHe ? 'ממשיכים את הרצף 🔥' : 'Keep your streak going 🔥',
    body:  isHe ? 'עדיין נשאר זמן להשלים את הפעילות של היום ולשמור על הרצף.' : 'There’s still time to complete today’s activity and keep your streak going.',
  });
}

export async function applyWeeklyReport(enabled, isHe, time = { hour: 10, minute: 0 }) {
  if (!enabled) return cancelById(IDS.weekly);
  // Capacitor weekday: 1=Sunday … 7=Saturday
  return scheduleWeekly({
    id: IDS.weekly, weekday: 1, hour: time.hour, minute: time.minute,
    title: isHe ? 'הסיכום השבועי מוכן 📊' : 'Your weekly recap is ready 📊',
    body:  isHe ? 'אפשר לראות מה התקדם השבוע ומה כדאי לקחת איתך לשבוע הבא.' : 'See your progress from this week and what to focus on next.',
  });
}
