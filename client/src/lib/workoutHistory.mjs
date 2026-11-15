// Pure helpers for the "recent workouts" section: what to show for one logged
// workout, and how each exercise compares with the last time it was done.

// The sets that were actually completed. Old records have no setLog (only the
// legacy sets/reps summary), so fall back to that.
export function doneSets(ex) {
  const log = Array.isArray(ex?.setLog) ? ex.setLog : [];
  if (log.length > 0) return log.filter((s) => s.done);
  return [];
}

// A fully skipped exercise (it has a setLog but nothing was ticked) is hidden.
export function wasPerformed(ex) {
  const log = Array.isArray(ex?.setLog) ? ex.setLog : [];
  return log.length === 0 ? (ex?.sets || 0) > 0 : log.some((s) => s.done);
}

export function exerciseDetail(ex) {
  const sets = doneSets(ex);
  if (sets.length === 0) {
    // legacy record: planned summary only
    return { kind: 'legacy', sets: ex?.sets || 0, reps: ex?.reps || '' };
  }
  if (ex.mode === 'time') {
    return { kind: 'time', seconds: sets.reduce((n, s) => n + (s.durationSec || 0), 0), sets: sets.length };
  }
  const top = sets.reduce((m, s) => ((s.weight || 0) > (m?.weight || 0) ? s : m), sets[0]);
  return {
    kind: 'reps',
    sets: sets.length,
    reps: top.reps ?? null,
    weight: top.weight ?? null,
    totalReps: sets.reduce((n, s) => n + (s.reps || 0), 0),
  };
}

export function summarizeWorkout(w) {
  const performed = (w?.exercises || []).filter(wasPerformed);
  return {
    exerciseCount: performed.length,
    setCount: performed.reduce((n, ex) => n + (doneSets(ex).length || ex.sets || 0), 0),
    volume: w?.totalVolume || 0,
    minutes: w?.durationMinutes || 0,
  };
}

// Compare one exercise against the most recent EARLIER workout that has it.
// `workouts` is newest-first (as the API returns it); `index` is the workout
// being shown. Returns null when there is nothing to compare with, else
// { direction: 'up' | 'down' | 'same', delta, unit: 'kg' | 'reps' | 'sec' }.
// Weighted lifts compare the heaviest set; bodyweight sets compare total reps;
// timed holds compare total seconds.
export function compareWithPrevious(workouts, index, exerciseName) {
  const current = (workouts[index]?.exercises || []).find((e) => e.name === exerciseName);
  if (!current) return null;
  const now = exerciseDetail(current);
  if (now.kind === 'legacy') return null;
  for (let i = index + 1; i < workouts.length; i++) {
    const prevEx = (workouts[i].exercises || []).find((e) => e.name === exerciseName);
    if (!prevEx) continue;
    const before = exerciseDetail(prevEx);
    if (before.kind === 'legacy' || before.kind !== now.kind) return null;
    let a, b, unit;
    if (now.kind === 'time') { a = now.seconds; b = before.seconds; unit = 'sec'; }
    else if ((now.weight || 0) > 0 || (before.weight || 0) > 0) { a = now.weight || 0; b = before.weight || 0; unit = 'kg'; }
    else { a = now.totalReps; b = before.totalReps; unit = 'reps'; }
    const delta = Math.round((a - b) * 100) / 100;
    return { direction: delta > 0 ? 'up' : delta < 0 ? 'down' : 'same', delta, unit };
  }
  return null;
}
