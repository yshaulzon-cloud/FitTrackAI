// Looping demo clips for the live workout screen.
//
// Each clip lives at public/exercise-videos/<slug>.mp4 (1080×1080, silent,
// seamless loop). They are byte-for-byte copies of the masters in
// "פרויקט סרטוני תרגילים/NN-<slug>/<slug>.mp4", made by
// scripts/export-exercise-videos.mjs. Never re-encode them: quality must not
// drop. They ship inside the app bundle so they start instantly and play
// offline, which matters in a gym with poor reception.
//
// Exercise names arrive as "Hebrew (English)" (server plan + home
// substitutes in WorkoutPlan.jsx); the lookup keys on the English part.

const SLUG_BY_ENGLISH = {
  'bench press': 'bench-press',
  'barbell row': 'barbell-row',
  'overhead press': 'overhead-press',
  'pull ups': 'pull-ups',
  'bicep curl': 'bicep-curl',
  'tricep pushdown': 'tricep-pushdown',
  'incline db press': 'incline-db-press',
  'lateral raise': 'lateral-raise',
  'cable row': 'cable-row',
  'pec fly': 'pec-fly',
  'rear delt fly': 'rear-delt-fly',
  'hammer curl': 'hammer-curl',
  'squat': 'squat',
  'romanian deadlift': 'romanian-deadlift',
  'leg press': 'leg-press',
  'leg curl': 'leg-curl',
  'calf raise': 'calf-raise',
  'lunges': 'lunges',
  'leg extension': 'leg-extension',
  'plank': 'plank',
  'crunches': 'crunches',
  'leg raise': 'leg-raise',
  'deadlift': 'deadlift',
  'db bench press': 'db-bench-press',
  'push ups': 'push-ups',
  'decline push ups': 'decline-push-ups',
  'wide push ups': 'wide-push-ups',
  'inverted row': 'inverted-row',
  'superman row': 'superman-row',
  'superman pulls': 'superman-pulls',
  'superman raises': 'superman-raises',
  'pike push ups': 'pike-push-ups',
  'lateral raise bottles': 'lateral-raise-bottles',
  'bicep curl bottles': 'bicep-curl-bottles',
  'hammer curl bottles': 'hammer-curl-bottles',
  'diamond push ups': 'diamond-push-ups',
  'bulgarian split squat': 'bulgarian-split-squat',
  'single leg deadlift': 'single-leg-deadlift',
  'jump squat': 'jump-squat',
  'glute bridge': 'glute-bridge',
  'sissy squat': 'sissy-squat',
  'walking lunges': 'walking-lunges',
  'single leg calf raise': 'single-leg-calf-raise',
};

export const EXERCISE_VIDEO_SLUGS = Object.values(SLUG_BY_ENGLISH);

// "סקוואט בולגרי (Bulgarian Split Squat)" → "bulgarian split squat";
// "Lateral Raise - Bottles" → "lateral raise bottles".
export function englishKey(name) {
  if (!name) return '';
  const m = String(name).match(/\(([^)]+)\)/);
  const en = m ? m[1] : String(name);
  return en.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function getExerciseVideoSlug(name) {
  return SLUG_BY_ENGLISH[englishKey(name)] || null;
}

// URL of the demo clip for an exercise, or null when there is none (cardio,
// steps, HIIT…). `base` is Vite's BASE_URL, passed in to keep this module pure.
export function getExerciseVideo(name, base = '/') {
  const slug = getExerciseVideoSlug(name);
  if (!slug) return null;
  return `${base.endsWith('/') ? base : base + '/'}exercise-videos/${slug}.mp4`;
}
