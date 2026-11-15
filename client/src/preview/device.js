// Client for the local device bridge (scripts/device-bridge.mjs). Talks to the
// real phone over adb via the bridge's HTTP endpoints. Dev-only, like the rest
// of src/preview.
const BASE = 'http://127.0.0.1:8787';

export async function deviceInfo() {
  const res = await fetch(`${BASE}/device/info`);
  if (!res.ok) throw new Error('bridge not reachable');
  return res.json();
}

// Fetch one screen frame as an object URL. Caller revokes the previous one.
export async function fetchFrame(signal) {
  const res = await fetch(`${BASE}/device/frame`, { signal, cache: 'no-store' });
  if (!res.ok) throw new Error(`frame ${res.status}`);
  return URL.createObjectURL(await res.blob());
}

const post = (path, body) =>
  fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
  }).then(async (r) => {
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || `${r.status}`);
    return d;
  });

export const tap = (x, y) => post('/device/tap', { x, y });
export const swipe = (x1, y1, x2, y2, ms) => post('/device/swipe', { x1, y1, x2, y2, ms });
export const key = (k) => post('/device/key', { key: k });
export const launch = (pkg) => post('/device/launch', pkg ? { pkg } : {});

export const BRIDGE_BASE = BASE;
