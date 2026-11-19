// "Leave workout?" says "Your progress is saved — you can continue later". It was not: leaving called
// clearActiveSession(), so every set the user had ticked was lost (QA finding F4, S2).
//
// The rule now: leaving keeps the session when at least one set is done (the resume card then offers
// "continue where you left off" or "discard"), and drops it when nothing was done (nothing to resume).
export function hasProgress(exercises) {
  return Array.isArray(exercises) && exercises.some((e) => Array.isArray(e?.sets) && e.sets.some((s) => s && s.done === true));
}

// true → keep the saved session on leave; false → discard it.
export function keepOnLeave(exercises) {
  return hasProgress(exercises);
}
