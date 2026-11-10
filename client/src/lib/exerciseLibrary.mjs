// The exercise library: ONE client-side source of truth for "which exercises
// exist, what muscle / movement / equipment they use, how hard they are, and
// what the easier version is". It drives exercise swapping (alternatives) and
// the "easier version" button. The server only generates plans from its own
// names; the library matches those names through the English part, exactly
// like exerciseVideos.mjs does (the id IS the demo-video slug).
//
// Fields
//   id         kebab-case English name (= video file name when there is one)
//   name       "Hebrew (English)" – the string stored in plans and workout logs
//   muscle     Hebrew muscle group, as used across the app
//   pattern    movement pattern, used to rank similar alternatives
//   equipment  every item needed; ['none'] = bodyweight. Vocabulary from
//              server/utils/equipment.js (dumbbells, barbell, machines, bands,
//              trx, pullup_bar, kettlebell, none); bottles count as 'none'.
//   difficulty 1 easy · 2 intermediate · 3 advanced
//   easier     id of the easier version (every difficulty-3 move has one)
//   video      false for entries without a demo clip (the UI falls back)
import { getExerciseVideoSlug } from './exerciseVideos.mjs';

const x = (id, name, muscle, pattern, equipment, difficulty = 2, easier = null, video = true) =>
  ({ id, name, muscle, pattern, equipment, difficulty, easier, video });

export const EXERCISES = [
  // chest
  x('bench-press', 'לחיצת חזה שטוח (Bench Press)', 'חזה', 'push-h', ['barbell'], 2),
  x('db-bench-press', 'לחיצת חזה שטוח דמבלים (DB Bench Press)', 'חזה', 'push-h', ['dumbbells'], 1),
  x('incline-db-press', 'לחיצת חזה משופע דמבלים (Incline DB Press)', 'חזה', 'push-h', ['dumbbells'], 2),
  x('pec-fly', 'פרפר מכונה (Pec Fly)', 'חזה', 'fly', ['machines'], 1),
  x('push-ups', 'שכיבות סמיכה (Push Ups)', 'חזה', 'push-h', ['none'], 2, 'incline-push-ups'),
  x('decline-push-ups', 'שכיבות סמיכה רגליים מוגבהות (Decline Push Ups)', 'חזה', 'push-h', ['none'], 3, 'push-ups'),
  x('wide-push-ups', 'שכיבות סמיכה רחבות (Wide Push Ups)', 'חזה', 'push-h', ['none'], 2, 'incline-push-ups'),
  x('incline-push-ups', 'שכיבות סמיכה בשיפוע (Incline Push Ups)', 'חזה', 'push-h', ['none'], 1, 'knee-push-ups', false),
  x('knee-push-ups', 'שכיבות סמיכה על הברכיים (Knee Push Ups)', 'חזה', 'push-h', ['none'], 1, null, false),
  // back
  x('barbell-row', 'חתירה במוט (Barbell Row)', 'גב', 'pull-h', ['barbell'], 2),
  x('cable-row', 'חתירה בכבל (Cable Row)', 'גב', 'pull-h', ['machines'], 1),
  x('pull-ups', 'מתח (Pull Ups)', 'גב', 'pull-v', ['pullup_bar'], 3, 'assisted-pull-ups'),
  x('assisted-pull-ups', 'מתח בסיוע גומייה (Assisted Pull Ups)', 'גב', 'pull-v', ['pullup_bar', 'bands'], 2, 'lat-pulldown', false),
  x('lat-pulldown', 'משיכת פולי עליון (Lat Pulldown)', 'גב', 'pull-v', ['machines'], 1, null, false),
  x('inverted-row', 'חתירה הפוכה (Inverted Row)', 'גב', 'pull-h', ['none'], 2, 'superman-row'),
  x('superman-row', 'סופרמן חתירה (Superman Row)', 'גב', 'pull-h', ['none'], 1),
  x('superman-pulls', 'סופרמן (Superman Pulls)', 'גב', 'pull-v', ['none'], 1),
  // shoulders
  x('overhead-press', 'לחיצת כתפיים (Overhead Press)', 'כתפיים', 'push-v', ['barbell'], 2),
  x('pike-push-ups', 'שכיבות סמיכה פייק (Pike Push Ups)', 'כתפיים', 'push-v', ['none'], 3, 'push-ups'),
  x('lateral-raise', 'הרמה צדדית (Lateral Raise)', 'כתפיים', 'lateral', ['dumbbells'], 1),
  x('lateral-raise-bottles', 'הרמה צדדית עם בקבוקים (Lateral Raise - Bottles)', 'כתפיים', 'lateral', ['none'], 1),
  x('rear-delt-fly', 'הרמה אחורית (Rear Delt Fly)', 'כתפיים', 'rear-delt', ['dumbbells'], 1),
  x('superman-raises', 'סופרמן (Superman Raises)', 'כתפיים', 'rear-delt', ['none'], 1),
  // arms
  x('bicep-curl', 'כפיפת מרפק (Bicep Curl)', 'זרועות', 'curl', ['dumbbells'], 1),
  x('bicep-curl-bottles', 'כפיפת מרפק עם בקבוקים (Bicep Curl - Bottles)', 'זרועות', 'curl', ['none'], 1),
  x('hammer-curl', 'כפיפה בפטיש (Hammer Curl)', 'זרועות', 'curl', ['dumbbells'], 1),
  x('hammer-curl-bottles', 'כפיפה עם בקבוקים (Hammer Curl - Bottles)', 'זרועות', 'curl', ['none'], 1),
  x('tricep-pushdown', 'פשיטת מרפק בכבל (Tricep Pushdown)', 'זרועות', 'triceps', ['machines'], 1),
  x('diamond-push-ups', 'שכיבות סמיכה יהלום (Diamond Push Ups)', 'זרועות', 'triceps', ['none'], 3, 'push-ups'),
  // legs
  x('squat', 'סקוואט (Squat)', 'רגליים', 'squat', ['barbell'], 2),
  x('bulgarian-split-squat', 'סקוואט בולגרי (Bulgarian Split Squat)', 'רגליים', 'lunge', ['none'], 3, 'supported-split-squat'),
  x('supported-split-squat', 'סקוואט פיצול עם תמיכה (Supported Split Squat)', 'רגליים', 'lunge', ['none'], 1, null, false),
  x('jump-squat', 'סקוואט קפיצה (Jump Squat)', 'רגליים', 'squat', ['none'], 3, 'squat'),
  x('leg-press', 'לחיצת רגליים (Leg Press)', 'רגליים', 'squat', ['machines'], 1),
  x('lunges', "לאנג'ים (Lunges)", 'רגליים', 'lunge', ['none'], 2),
  x('walking-lunges', "לאנג'ים (Walking Lunges)", 'רגליים', 'lunge', ['none'], 2, 'lunges'),
  x('romanian-deadlift', 'דדליפט רומני (Romanian Deadlift)', 'רגליים', 'hinge', ['barbell'], 2),
  x('deadlift', 'דדליפט (Deadlift)', 'רגליים', 'hinge', ['barbell'], 2),
  x('single-leg-deadlift', 'דדליפט על רגל אחת (Single Leg Deadlift)', 'רגליים', 'hinge', ['none'], 3, 'staggered-deadlift'),
  x('staggered-deadlift', 'דדליפט בעמידה מדורגת (Staggered Stance Deadlift)', 'רגליים', 'hinge', ['none'], 1, null, false),
  x('leg-curl', 'מכפוף רגל (Leg Curl)', 'רגליים', 'leg-curl', ['machines'], 1),
  x('glute-bridge', 'גשר ירכיים (Glute Bridge)', 'רגליים', 'leg-curl', ['none'], 1),
  x('leg-extension', 'יישור רגל (Leg Extension)', 'רגליים', 'leg-ext', ['machines'], 1),
  x('sissy-squat', 'סיסי סקוואט (Sissy Squat)', 'רגליים', 'leg-ext', ['none'], 3, 'squat'),
  // calves
  x('calf-raise', 'הרמות עקב (Calf Raise)', 'תאומים', 'calf', ['machines'], 1),
  x('single-leg-calf-raise', 'הרמות עקב על מדרגה (Single Leg Calf Raise)', 'תאומים', 'calf', ['none'], 3, 'calf-raise'),
  // core
  x('plank', 'פלאנק (Plank)', 'ליבה', 'core-hold', ['none'], 2, 'knee-plank'),
  x('knee-plank', 'פלאנק על הברכיים (Knee Plank)', 'ליבה', 'core-hold', ['none'], 1, null, false),
  x('crunches', 'כפיפות בטן (Crunches)', 'ליבה', 'core-flex', ['none'], 1),
  x('leg-raise', 'הרמת רגליים (Leg Raise)', 'ליבה', 'core-flex', ['none'], 2),
];

const BY_ID = new Map(EXERCISES.map((e) => [e.id, e]));

export const getExerciseById = (id) => BY_ID.get(id) || null;

// Look up by the name stored in plans / logs ("Hebrew (English)").
export function findExercise(name) {
  const slug = getExerciseVideoSlug(name);
  if (slug && BY_ID.has(slug)) return BY_ID.get(slug);
  // entries without a demo clip still need to be found by name
  return EXERCISES.find((e) => e.name === name) || null;
}

// Does the user own the kit this exercise needs? An unknown / empty kit list
// means "don't filter" (the profile may predate the equipment question).
export function equipmentOk(exercise, userEquipment) {
  if (!Array.isArray(userEquipment) || userEquipment.length === 0) return true;
  const own = new Set(userEquipment);
  return exercise.equipment.every((e) => e === 'none' || own.has(e));
}

export function easierVariant(name) {
  const ex = findExercise(name);
  return ex?.easier ? getExerciseById(ex.easier) : null;
}

// Up to `limit` alternatives for `current`, best first.
//   must: same muscle group, not already in the session, kit available, and not
//         the exercise itself.
//   rank: easier version of a hard exercise first; then same movement pattern,
//         then similar difficulty, then having a demo clip.
// `inSession` is the list of names already in today's workout.
export function getAlternatives(currentName, { userEquipment, inSession = [], limit = 6 } = {}) {
  const current = findExercise(currentName);
  if (!current) return [];
  const taken = new Set(inSession.map((n) => findExercise(n)?.id).filter(Boolean));
  taken.add(current.id);
  const easier = current.easier;
  const scored = EXERCISES
    .filter((e) => e.muscle === current.muscle && !taken.has(e.id) && equipmentOk(e, userEquipment))
    .map((e) => {
      let score = 0;
      if (e.id === easier) score += 100;
      if (e.pattern === current.pattern) score += 10;
      score -= Math.abs(e.difficulty - current.difficulty) * 2;
      if (e.video) score += 1;
      return { e, score };
    })
    .sort((a, b) => b.score - a.score || a.e.id.localeCompare(b.e.id));
  return scored.slice(0, limit).map(({ e }) => ({ ...e, isEasier: e.id === easier }));
}

// Profiles written before the equipment question hold the coarse values; this
// mirrors server/utils/equipment.js normalizeEquipment so the client filters
// alternatives the same way.
const LEGACY_EQUIPMENT = { gym: ['barbell', 'machines', 'dumbbells'], home: ['dumbbells', 'bands'], none: ['none'] };
const KNOWN_EQUIPMENT = ['dumbbells', 'barbell', 'machines', 'bands', 'trx', 'pullup_bar', 'kettlebell', 'none'];
export function normalizeUserEquipment(list) {
  if (!Array.isArray(list)) return [];
  const out = new Set();
  for (const raw of list) {
    if (LEGACY_EQUIPMENT[raw]) LEGACY_EQUIPMENT[raw].forEach((q) => out.add(q));
    else if (KNOWN_EQUIPMENT.includes(raw)) out.add(raw);
  }
  if (out.size > 1) out.delete('none');
  return [...out];
}

export const EQUIPMENT_LABELS = {
  dumbbells: { he: 'דמבלים', en: 'Dumbbells' }, barbell: { he: 'מוט', en: 'Barbell' }, machines: { he: 'מכונה', en: 'Machine' },
  bands: { he: 'גומיות', en: 'Bands' }, trx: { he: 'TRX', en: 'TRX' }, pullup_bar: { he: 'מתח', en: 'Pull-up bar' },
  kettlebell: { he: 'קטלבל', en: 'Kettlebell' }, none: { he: 'בלי ציוד', en: 'No equipment' },
};
export const DIFFICULTY_LABELS = { 1: { he: 'קל', en: 'Easy' }, 2: { he: 'בינוני', en: 'Medium' }, 3: { he: 'מתקדם', en: 'Advanced' } };
