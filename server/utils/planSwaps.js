// "Swap this exercise in my plan" (task 11).
//
// The weekly plan is not stored: generateWorkoutPlan(profile) rebuilds it on
// every profile read. A permanent swap is therefore stored as a small list of
// replacements on the profile — profile.planSwaps = [{ from, to, muscleGroup }]
// where `from` is the exercise name the generator produces and `to` is what the
// user wants instead — and applied on top of the generated plan.

// Apply swaps to a plan ({ days: [{ day, exercises: [...] }] }) without
// mutating it. A swap affects every day that contains `from`, keeps sets /
// reps, and takes the replacement's muscle group when it has one. Unknown
// swaps (the generator stopped producing `from`) are simply ignored.
function applyPlanSwaps(plan, swaps) {
  if (!plan || !Array.isArray(plan.days) || !Array.isArray(swaps) || swaps.length === 0) return plan;
  const byFrom = new Map(swaps.filter((s) => s && s.from && s.to).map((s) => [s.from, s]));
  return {
    ...plan,
    days: plan.days.map((day) => ({
      ...day,
      exercises: (day.exercises || []).map((ex) => {
        const swap = byFrom.get(ex.name);
        if (!swap) return ex;
        return { ...ex, name: swap.to, muscleGroup: swap.muscleGroup || ex.muscleGroup };
      }),
    })),
  };
}

// Record "the user now wants `to` where the plan currently shows `from`".
// `from` is what the client sees, which may already be a replacement, so map it
// back to the generator's original name. Returns the new list (never mutates).
//   - swapping back to the original removes the entry
//   - an exercise can only be replaced by one thing at a time
function recordSwap(swaps, { from, to, muscleGroup }) {
  const list = (swaps || []).map((s) => ({ from: s.from, to: s.to, muscleGroup: s.muscleGroup }));
  const existing = list.find((s) => s.to === from);
  const original = existing ? existing.from : from;
  const rest = list.filter((s) => s.from !== original);
  if (to === original) return rest;
  rest.push({ from: original, to, muscleGroup: muscleGroup || undefined });
  return rest;
}

// Bound what we store: plenty for a real user, small enough to never matter.
const MAX_SWAPS = 60;

module.exports = { applyPlanSwaps, recordSwap, MAX_SWAPS };
