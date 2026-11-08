// Per-user budget for calls to the external AI estimator (Gemini), so one user
// can't burn the shared free-tier quota. In-memory: resets on restart and is
// per server instance, which is fine for a soft abuse limit. When the budget is
// spent the caller falls back to the generic estimate, so logging never fails.
const WINDOW_MS = 60 * 60 * 1000;
const MAX_CALLS = 30;

const calls = new Map(); // userId -> [timestamps]

function tryConsume(userId, now = Date.now(), max = MAX_CALLS, windowMs = WINDOW_MS) {
  const key = String(userId);
  const recent = (calls.get(key) || []).filter((t) => now - t < windowMs);
  if (recent.length >= max) { calls.set(key, recent); return false; }
  recent.push(now);
  calls.set(key, recent);
  // keep the map from growing without bound
  if (calls.size > 5000) for (const [k, v] of calls) if (!v.some((t) => now - t < windowMs)) calls.delete(k);
  return true;
}

function _reset() { calls.clear(); }

module.exports = { tryConsume, _reset, MAX_CALLS, WINDOW_MS };
