// ── Per-user in-process serialization ───────────────────────────────────────
// The progression flow is a series of read-modify-write cycles on a single
// Progression document with no DB-level locking. Two concurrent requests for
// the same user (a double-tapped "finish workout", or a meal + sleep logged at
// once) can interleave and clobber each other's writes — lost XP, double streak
// increments. Serialising per user removes that race.
//
// Scope/limitation: this lock is process-local. It is sufficient because the
// app runs as a single Render instance; if the backend is ever scaled to
// multiple instances this must be replaced with a distributed lock (or the
// mutations reworked to atomic `$inc`/`findOneAndUpdate` operators).

const chains = new Map(); // userId -> Promise (tail of that user's queue)

// Run `fn` exclusively for `userId`: each call waits for the previous one for
// the same user to settle, then runs. Returns fn()'s result/rejection.
function withUserLock(userId, fn) {
  const key = String(userId);
  const prev = chains.get(key) || Promise.resolve();
  // Chain regardless of whether the previous task resolved or rejected.
  const run = prev.then(fn, fn);
  // Keep the queue from growing forever: once this is the tail and it settles,
  // drop the map entry so idle users don't leak memory.
  const tail = run.catch(() => {}).finally(() => {
    if (chains.get(key) === tail) chains.delete(key);
  });
  chains.set(key, tail);
  return run;
}

module.exports = { withUserLock };
