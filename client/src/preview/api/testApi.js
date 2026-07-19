// Host-side calls to the REAL server. The harness drives auth/seed/reset the
// same way the app does — through the actual endpoints — so nothing here is a
// mock. In dev the API is CORS-open, so we hit it directly at :3001 (the vite
// proxy only forwards a subset of prefixes).
const API = 'http://localhost:3001';

async function req(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!res.ok) throw new Error(data.message || `${res.status} ${path}`);
  return data;
}

// Reuse a persona if it exists, otherwise create it. Returns { token, created }.
export async function registerOrLogin(email, password) {
  try {
    const data = await req('/auth/login', { method: 'POST', body: { email, password } });
    return { token: data.token, user: data.user, created: false };
  } catch {
    const data = await req('/auth/register', { method: 'POST', body: { email, password } });
    return { token: data.token, user: data.user, created: true };
  }
}

export function onboard(token, profile) {
  return req('/user/onboarding', { method: 'POST', token, body: profile });
}

export function getProfile(token) {
  return req('/user/profile', { token });
}

// Seed a realistic day: one workout, a couple of meals, a night of sleep.
// Best-effort — /workout/complete rejects a second workout the same day, so a
// re-seed simply skips it rather than failing the whole batch.
export async function seedDemo(token) {
  const results = {};
  try {
    results.workout = await req('/workout/complete', {
      method: 'POST', token,
      body: {
        dayName: "יום א' - פלג גוף עליון",
        durationMinutes: 45,
        location: 'gym',
        exercises: [
          { name: 'לחיצת חזה (Bench Press)', sets: 4, reps: '8-10', muscleGroup: 'חזה', mode: 'reps',
            setLog: [{ reps: 10, weight: 40, done: true }, { reps: 9, weight: 42.5, done: true }, { reps: 8, weight: 45, done: true }] },
          { name: 'חתירה בכבל (Cable Row)', sets: 3, reps: '10-12', muscleGroup: 'גב', mode: 'reps',
            setLog: [{ reps: 12, weight: 50, done: true }, { reps: 11, weight: 52.5, done: true }] },
        ],
      },
    });
  } catch (e) { results.workout = { skipped: String(e.message) }; }

  for (const desc of ['חזה עוף עם אורז', 'יוגורט יווני עם גרנולה', 'שייק חלבון בננה']) {
    try { await req('/nutrition/log', { method: 'POST', token, body: { description: desc } }); }
    catch { /* one bad parse shouldn't stop the batch */ }
  }
  results.meals = 'logged';

  try { results.sleep = await req('/sleep/log', { method: 'POST', token, body: { hours: 7.5, quality: 'good' } }); }
  catch (e) { results.sleep = { skipped: String(e.message) }; }

  return results;
}

export function resetData(token) {
  return req('/user/reset-data', { method: 'POST', token });
}

export function deleteUser(token) {
  return req('/user/account', { method: 'DELETE', token, body: { confirm: 'DELETE' } });
}
