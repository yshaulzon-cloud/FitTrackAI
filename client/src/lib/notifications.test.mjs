// Native adapter against a fake LocalNotifications plugin.
// Run with:  node --test src/lib/notifications.test.mjs   (from client/)
import test from 'node:test';
import assert from 'node:assert/strict';

// Minimal browser globals the adapter touches.
const store = new Map();
globalThis.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
globalThis.window = { Capacitor: { isNativePlatform: () => true }, dispatchEvent() {} };

const { syncReminders, updateReminderState, _setTestHooks, getNotificationPermissionStatus } = await import('./notifications.js');
const { isManagedId, LEGACY_IDS } = await import('./notifPlan.mjs');

function fakePlugin({ permission = 'granted', pending = [], requestResult = 'granted' } = {}) {
  const calls = { scheduled: [], cancelled: [], channels: [], requested: 0 };
  const p = {
    calls,
    async checkPermissions() { return { display: permission }; },
    async requestPermissions() { calls.requested++; permission = requestResult; return { display: requestResult }; },
    async createChannel(c) { calls.channels.push(c); },
    async getPending() { return { notifications: pending }; },
    async cancel({ notifications }) { calls.cancelled.push(...notifications.map((n) => n.id)); },
    async schedule({ notifications }) { calls.scheduled.push(...notifications); },
  };
  return p;
}
const fresh = () => { store.clear(); updateReminderState({ eatenSlots: [], workedOutToday: false, weeklyGoalMet: false, activityDoneToday: false, sleepLoggedToday: false }, { sync: false }); };

test('schedules a 7-day window with one channel per category, once permission is granted', async () => {
  fresh();
  const plugin = fakePlugin();
  _setTestHooks({ native: true, plugin });
  const res = await syncReminders({ isHe: true });
  assert.equal(res.ok, true);
  assert.ok(res.scheduled > 20);
  assert.equal(plugin.calls.channels.length, 5);
  assert.ok(plugin.calls.channels.every((c) => /^areto_/.test(c.id)));
  const ids = plugin.calls.scheduled.map((n) => n.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(plugin.calls.scheduled.every((n) => n.schedule.at instanceof Date && n.channelId && n.title && n.body));
  assert.ok(plugin.calls.scheduled.every((n) => n.schedule.repeats === undefined)); // one-shots, so a day can be skipped
});

test('legacy repeating alarms (1001–1008) are cancelled exactly once', async () => {
  fresh();
  const plugin = fakePlugin();
  _setTestHooks({ native: true, plugin });
  await syncReminders({ isHe: true });
  for (const id of LEGACY_IDS) assert.ok(plugin.calls.cancelled.includes(id), `legacy ${id}`);
  const before = plugin.calls.cancelled.length;
  await syncReminders({ isHe: true });
  assert.equal(plugin.calls.cancelled.filter((id) => LEGACY_IDS.includes(id)).length, LEGACY_IDS.length, 'not cancelled again');
  assert.ok(plugin.calls.cancelled.length >= before);
});

test('only this app\'s pending notifications are replaced', async () => {
  fresh();
  const pending = [{ id: 100220400 }, { id: 5 }, { id: 100820401 }];
  assert.equal(isManagedId(5), false);
  const plugin = fakePlugin({ pending });
  _setTestHooks({ native: true, plugin });
  await syncReminders({ isHe: true });
  assert.ok(plugin.calls.cancelled.includes(100220400));
  assert.ok(plugin.calls.cancelled.includes(100820401));
  assert.equal(plugin.calls.cancelled.includes(5), false);
});

test('eaten breakfast: today\'s 08:00 is not scheduled', async () => {
  fresh();
  updateReminderState({ eatenSlots: ['breakfast'] }, { sync: false });
  const plugin = fakePlugin();
  _setTestHooks({ native: true, plugin });
  await syncReminders({ isHe: true });
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const breakfast = plugin.calls.scheduled.filter((n) => n.title.includes('ארוחת בוקר'));
  assert.ok(breakfast.every((n) => n.schedule.at > new Date(today.getTime() + 86400000)));
});

test('permission denied: nothing scheduled, ok=false, and we never prompt on a background sync', async () => {
  fresh();
  const plugin = fakePlugin({ permission: 'denied' });
  _setTestHooks({ native: true, plugin });
  const res = await syncReminders({ isHe: true });
  assert.equal(res.ok, false);
  assert.equal(res.permission, 'denied');
  assert.equal(plugin.calls.scheduled.length, 0);
  assert.equal(plugin.calls.requested, 0);
});

test('permission "prompt": only asks when the user just switched something on', async () => {
  fresh();
  const bg = fakePlugin({ permission: 'prompt' });
  _setTestHooks({ native: true, plugin: bg });
  await syncReminders({ isHe: true });
  assert.equal(bg.calls.requested, 0);
  const user = fakePlugin({ permission: 'prompt', requestResult: 'granted' });
  _setTestHooks({ native: true, plugin: user });
  const res = await syncReminders({ isHe: true, askPermission: true });
  assert.equal(user.calls.requested, 1);
  assert.equal(res.ok, true);
  assert.ok(user.calls.scheduled.length > 0);
});

test('everything off (master): clears what was pending, schedules nothing, no prompt', async () => {
  fresh();
  store.set('notif:master', '0');
  const plugin = fakePlugin({ permission: 'prompt', pending: [{ id: 100220400 }] });
  _setTestHooks({ native: true, plugin });
  const res = await syncReminders({ isHe: true, askPermission: true });
  assert.equal(res.ok, true);
  assert.equal(plugin.calls.requested, 0);
  assert.equal(plugin.calls.scheduled.length, 0);
  assert.ok(plugin.calls.cancelled.includes(100220400));
});

test('web (not native): a no-op that reports ok', async () => {
  fresh();
  _setTestHooks({ native: false });
  const res = await syncReminders({ isHe: true });
  assert.deepEqual(res, { ok: true, scheduled: 0, permission: null });
  assert.equal(await getNotificationPermissionStatus(), null);
});
