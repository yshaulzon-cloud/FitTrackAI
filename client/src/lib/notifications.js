// Local notifications via Capacitor. No-ops on web (the preferences still
// persist to localStorage and apply once on Android).
//
// What gets scheduled is decided by notifPlan.mjs (pure, tested). This file is
// only the native adapter: permission, Android channels, and "replace the set
// of notifications we manage with the plan". See docs/notifications.md.
import { readPrefs, CHANNELS } from './notifConfig.mjs';
import { buildPlan, isManagedId, LEGACY_IDS } from './notifPlan.mjs';

// Test seam (notifications.test.mjs): lets the adapter run against a fake plugin.
let testHooks = null;
export function _setTestHooks(h) { testHooks = h; }

function isNative() {
  if (testHooks && typeof testHooks.native === 'boolean') return testHooks.native;
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
  if (testHooks?.plugin) return { plugin: testHooks.plugin };
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

// Public: trigger the system notification permission prompt. Safe no-op on
// web. Returns true if granted, false otherwise.
export async function requestNotificationPermission() {
  if (!isNative()) return false;
  try { return await ensurePermission(); } catch { return false; }
}

// Public: current permission state without prompting. 'granted' | 'denied' |
// 'prompt' | null (web/error).
export async function getNotificationPermissionStatus() {
  if (!isNative()) return null;
  try {
    const { plugin: LN } = await getPlugin();
    const perm = await LN.checkPermissions();
    return perm.display;
  } catch { return null; }
}

// ── "state of today" the planner needs ──────────────────────────────
// Kept in memory and mirrored to localStorage for the current calendar day,
// so e.g. "sleep already logged" survives an app restart. Components report
// facts with updateReminderState({...}); each report schedules a (debounced)
// re-sync.
const STATE_KEY = 'notif:state';
const dayKey = (d = new Date()) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

function loadState() {
  try {
    const s = JSON.parse(localStorage.getItem(STATE_KEY) || 'null');
    if (s && s.date === dayKey()) return s.flags || {};
  } catch { /* ignore */ }
  return {};
}
let flags = loadState();

export function getReminderState() {
  if (flags.__date && flags.__date !== dayKey()) flags = {}; // a new day starts clean
  return flags;
}

let syncTimer = null;
let langIsHe = true;

export function updateReminderState(patch, { isHe, sync = true } = {}) {
  const base = getReminderState();
  const next = { ...base, ...patch, __date: dayKey() };
  const changed = Object.keys(patch).some((k) => JSON.stringify(base[k]) !== JSON.stringify(patch[k]));
  flags = next;
  try { localStorage.setItem(STATE_KEY, JSON.stringify({ date: dayKey(), flags: next })); } catch { /* ignore */ }
  if (typeof isHe === 'boolean') langIsHe = isHe;
  if (sync && changed) requestReminderSync();
}

// Debounced: many things can change at once on app open (meals, workouts,
// progression all load), and one rebuild is enough.
export function requestReminderSync({ isHe, delay = 600 } = {}) {
  if (typeof isHe === 'boolean') langIsHe = isHe;
  if (!isNative()) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => { syncReminders({ isHe: langIsHe }).catch(() => null); }, delay);
}

// ── the sync ────────────────────────────────────────────────────────
let chain = Promise.resolve();

async function ensureChannels(LN, isHe) {
  for (const ch of Object.values(CHANNELS)) {
    try {
      await LN.createChannel({
        id: ch.id, name: isHe ? ch.he : ch.en, importance: ch.importance, visibility: 1, vibration: true,
        description: isHe ? 'מוגדר באפליקציית Areto' : 'Managed in the Areto app',
      });
    } catch { /* channels need Android 8+; elsewhere this is a no-op */ }
  }
}

async function migrateLegacy(LN) {
  // Before the rolling window every reminder was ONE repeating alarm with ids
  // 1001–1008. Those would keep firing next to the new ones, so cancel them once.
  try {
    if (localStorage.getItem('notif:schedule:v2') === '1') return;
    await LN.cancel({ notifications: LEGACY_IDS.map((id) => ({ id })) });
    localStorage.setItem('notif:schedule:v2', '1');
  } catch { /* not scheduled / storage unavailable */ }
}

async function doSync({ isHe, askPermission }) {
  if (!isNative()) return { ok: true, scheduled: 0, permission: null };
  const prefs = readPrefs(localStorage);
  const plan = buildPlan({ now: new Date(), prefs, state: getReminderState(), isHe });

  let permission = await getNotificationPermissionStatus();
  if (permission !== 'granted' && plan.length > 0 && askPermission) {
    permission = (await requestNotificationPermission()) ? 'granted' : 'denied';
  }
  const { plugin: LN } = await getPlugin();

  if (permission === 'granted') {
    await ensureChannels(LN, isHe);
    await migrateLegacy(LN);
  }

  // Replace everything this app scheduled. Cancelling is always safe (and is
  // how turning reminders off takes effect even if permission was revoked).
  try {
    const pending = (await LN.getPending()).notifications || [];
    const ours = pending.filter((n) => isManagedId(n.id)).map((n) => ({ id: n.id }));
    if (ours.length) await LN.cancel({ notifications: ours });
  } catch { /* nothing pending */ }

  if (permission !== 'granted') {
    return { ok: plan.length === 0, scheduled: 0, permission };
  }
  if (plan.length) {
    await LN.schedule({
      notifications: plan.map((n) => ({
        id: n.id, title: n.title, body: n.body,
        schedule: { at: n.at, allowWhileIdle: true },
        channelId: CHANNELS[n.category].id,
        smallIcon: 'ic_stat_icon_config_sample',
      })),
    });
  }
  return { ok: true, scheduled: plan.length, permission };
}

// Public. Rebuilds the notification set from the saved preferences plus the
// reported state. Calls are serialized. `askPermission` should be true only
// when the user just switched something on (never prompt out of the blue).
// Returns { ok, scheduled, permission }; ok === false means "wanted to
// schedule but permission is denied", so callers can show the explanation.
export function syncReminders({ isHe = langIsHe, askPermission = false } = {}) {
  langIsHe = isHe;
  const run = () => doSync({ isHe, askPermission });
  const p = chain.then(run, run);
  chain = p.catch(() => null);
  return p;
}
