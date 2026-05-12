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
};

function isNative() {
  try {
    return typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.() === true;
  } catch { return false; }
}

async function getPlugin() {
  const { LocalNotifications } = await import('@capacitor/local-notifications');
  return LocalNotifications;
}

async function ensurePermission() {
  const LN = await getPlugin();
  const perm = await LN.checkPermissions();
  if (perm.display !== 'granted') {
    const req = await LN.requestPermissions();
    return req.display === 'granted';
  }
  return true;
}

async function cancelById(id) {
  if (!isNative()) return;
  try {
    const LN = await getPlugin();
    await LN.cancel({ notifications: [{ id }] });
  } catch { /* not scheduled */ }
}

async function scheduleDaily({ id, hour, minute, title, body }) {
  if (!isNative()) return;
  const ok = await ensurePermission();
  if (!ok) return;
  const LN = await getPlugin();
  await LN.cancel({ notifications: [{ id }] }).catch(() => {});
  await LN.schedule({
    notifications: [{
      id, title, body,
      schedule: { on: { hour, minute }, allowWhileIdle: true, repeats: true },
      smallIcon: 'ic_stat_icon_config_sample',
    }],
  });
}

async function scheduleWeekly({ id, weekday, hour, minute, title, body }) {
  if (!isNative()) return;
  const ok = await ensurePermission();
  if (!ok) return;
  const LN = await getPlugin();
  await LN.cancel({ notifications: [{ id }] }).catch(() => {});
  await LN.schedule({
    notifications: [{
      id, title, body,
      schedule: { on: { weekday, hour, minute }, allowWhileIdle: true, repeats: true },
      smallIcon: 'ic_stat_icon_config_sample',
    }],
  });
}

export async function applyWorkoutReminder(enabled, isHe) {
  if (!enabled) return cancelById(IDS.workout);
  return scheduleDaily({
    id: IDS.workout, hour: 18, minute: 0,
    title: isHe ? 'זמן לאימון 💪' : 'Time to train 💪',
    body:  isHe ? 'יום נהדר להתקדם — בוא נזיז את הגוף.' : 'Great day to make progress — let’s move.',
  });
}

export async function applyMealReminder(enabled, isHe) {
  if (!enabled) {
    await cancelById(IDS.meal_morning);
    await cancelById(IDS.meal_afternoon);
    await cancelById(IDS.meal_evening);
    return;
  }
  await scheduleDaily({
    id: IDS.meal_morning, hour: 8, minute: 0,
    title: isHe ? 'ארוחת בוקר 🥗' : 'Breakfast 🥗',
    body:  isHe ? 'תרשום את ארוחת הבוקר ב-Areto.' : 'Log your breakfast in Areto.',
  });
  await scheduleDaily({
    id: IDS.meal_afternoon, hour: 13, minute: 0,
    title: isHe ? 'ארוחת צהריים 🍽️' : 'Lunch 🍽️',
    body:  isHe ? 'אל תשכח לתעד את הצהריים.' : 'Don’t forget to log lunch.',
  });
  await scheduleDaily({
    id: IDS.meal_evening, hour: 19, minute: 0,
    title: isHe ? 'ארוחת ערב 🌙' : 'Dinner 🌙',
    body:  isHe ? 'תעד את ארוחת הערב לפני שאתה שוכח.' : 'Log dinner before you forget.',
  });
}

export async function applyStreakReminder(enabled, isHe) {
  if (!enabled) return cancelById(IDS.streak);
  return scheduleDaily({
    id: IDS.streak, hour: 21, minute: 0,
    title: isHe ? 'שמור על הרצף 🔥' : 'Keep your streak 🔥',
    body:  isHe ? 'עוד לא סיימת היום — אל תפסיד את הרצף.' : 'Don’t lose your streak today.',
  });
}

export async function applyWeeklyReport(enabled, isHe) {
  if (!enabled) return cancelById(IDS.weekly);
  // Capacitor weekday: 1=Sunday … 7=Saturday
  return scheduleWeekly({
    id: IDS.weekly, weekday: 1, hour: 10, minute: 0,
    title: isHe ? 'סיכום שבועי 📊' : 'Weekly recap 📊',
    body:  isHe ? 'זמן להסתכל על ההתקדמות של השבוע.' : 'Time to review this week’s progress.',
  });
}
