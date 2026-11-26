// "Has the user reached the workout goal?" — the one answer shared by the
// reminders, the workout tab and the home tab. Pure (takes `now`), unit-tested.
//
// A cycle is the 7 days from the first workout of a series, NOT a Sunday–
// Saturday week. It is what the server enforces on POST /workout/complete
// (server/utils/calculations.js → calculateCycleStatus).

export const CYCLE_MS = 7 * 86400000;
export const DEFAULT_GOAL = 4;

const ms = (value) => new Date(value ?? NaN).getTime();

// The latest cycle in a list of workouts: how many it holds and when it started.
// Same walk as the server's.
function latestCycle(workouts) {
  const times = workouts.map((w) => ms(w?.date)).filter(Number.isFinite).sort((a, b) => a - b);
  if (times.length === 0) return { count: 0, startMs: null };
  let startMs = times[0];
  let count = 0;
  for (const t of times) {
    if (t - startMs >= CYCLE_MS) { startMs = t; count = 1; } else count++;
  }
  return { count, startMs };
}

// history: the GET /workout/history response ({ workouts, cycle? }) or null.
// goal:    profile.workoutsPerWeek (undefined while the profile is not loaded).
// → { goal, done, met, endsAt }
//     done   workouts in the running cycle, 0 once its 7 days are over
//     met    the goal is reached AND that cycle is still running
//     endsAt ms epoch the full cycle ends, null while not met
//
// `history` is not reloaded when the app returns to the foreground, so every
// answer is checked against `now`: an old response can never keep a finished
// cycle "full".
export function cycleStatus(history, goal, now = Date.now()) {
  const target = Number(goal) || DEFAULT_GOAL;
  const server = history?.cycle;
  const workouts = history?.workouts || [];
  let done;
  let endsAt = null; // end of the running cycle, when known
  let reached;

  if (server) {
    done = Number(server.cycleCount) || 0;
    const fullEnd = ms(server.cycleEndsAt);
    if (Number.isFinite(fullEnd)) {
      endsAt = fullEnd;
    } else if (done > 0) {
      // A cycle that is not full carries no end time. Its workouts are the
      // newest `done` ones (the list is sorted newest first), so the oldest of
      // those opened it.
      const times = workouts.map((w) => ms(w?.date)).filter(Number.isFinite).sort((a, b) => b - a);
      if (times.length >= done) endsAt = times[done - 1] + CYCLE_MS;
    }
    // The server judged against the goal at the time of the request. If the goal
    // was raised since (and the history reload failed), the old "full" is stale.
    reached = server.limitReached === true && Number.isFinite(fullEnd) && (!goal || done >= target);
  } else {
    // A server without `cycle`: the same definition, from the loaded workouts.
    const local = latestCycle(workouts);
    done = local.count;
    if (local.startMs !== null) endsAt = local.startMs + CYCLE_MS;
    reached = done >= target;
  }

  if (endsAt !== null && now >= endsAt) return { goal: target, done: 0, met: false, endsAt: null };
  const met = reached && endsAt !== null;
  return { goal: target, done, met, endsAt: met ? endsAt : null };
}
