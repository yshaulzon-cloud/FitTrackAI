// One-line bilingual technique cue per exercise, keyed by the exact
// "Hebrew (English)" name used in server/utils/calculations.js. Unmatched
// names (e.g. home-mode substitutes) fall back to a generic cue.
export const EXERCISE_CUES = {
  'לחיצת חזה שטוח (Bench Press)': {
    he: 'שכמות צמודות למושב, מרפקים בזווית 45° מהגוף, הורידו את המוט עד המגע בחזה.',
    en: 'Keep shoulder blades pinned, elbows ~45° from the torso, lower the bar to your chest.',
  },
  'חתירה במוט (Barbell Row)': {
    he: 'גב ישר, כופפו מהירכיים, משכו את המוט לכיוון הבטן התחתונה.',
    en: 'Keep your back flat, hinge at the hips, and row the bar toward your lower abdomen.',
  },
  'לחיצת כתפיים (Overhead Press)': {
    he: 'ליבה מהודקת, דחפו את המשקל בקו ישר מעל הראש בלי לקשת את הגב.',
    en: 'Brace your core and press straight overhead without arching your lower back.',
  },
  'מתח (Pull Ups)': {
    he: 'התחילו מתלייה מלאה, משכו את החזה כלפי המוט, הימנעו מנדנוד.',
    en: 'Start from a dead hang, pull your chest toward the bar, avoid swinging.',
  },
  'כפיפת מרפק (Bicep Curl)': {
    he: 'מרפקים צמודים לגוף, הרימו רק את האמה, בלי לנדנד את הכתפיים.',
    en: 'Keep elbows pinned to your sides and curl only the forearm — no shoulder swing.',
  },
  'פשיטת מרפק בכבל (Tricep Pushdown)': {
    he: 'מרפקים קבועים לצד הגוף, פשטו את הזרוע במלואה ועצרו רגע למטה.',
    en: 'Keep elbows locked at your sides, extend fully, and pause briefly at the bottom.',
  },
  'לחיצת חזה משופע דמבלים (Incline DB Press)': {
    he: 'מושב בזווית 30-45°, הורידו את הדמבלים עד לגובה החזה העליון.',
    en: 'Set the bench to 30–45°, lower the dumbbells to upper-chest level.',
  },
  'הרמה צדדית (Lateral Raise)': {
    he: 'מרפקים מעט כפופים, הרימו עד גובה הכתפיים, בלי להשתמש בתנופה.',
    en: 'Keep a slight elbow bend and raise to shoulder height — avoid using momentum.',
  },
  'חתירה בכבל (Cable Row)': {
    he: 'גב זקוף, משכו את הידית לבטן, סחטו את השכמות בסוף התנועה.',
    en: 'Sit tall, pull the handle to your abdomen, and squeeze your shoulder blades at the end.',
  },
  'פרפר מכונה (Pec Fly)': {
    he: 'מרפקים בכיפוף קל קבוע, הביאו את הידיות זו לזו בקשת רחבה.',
    en: 'Keep a soft, fixed elbow bend and bring the handles together in a wide arc.',
  },
  'הרמה אחורית (Rear Delt Fly)': {
    he: 'כופפו מעט קדימה, הרימו את הדמבלים הצידה תוך סחיטת השכמות.',
    en: 'Hinge forward slightly and raise the dumbbells out to the sides, squeezing your shoulder blades.',
  },
  'כפיפה בפטיש (Hammer Curl)': {
    he: 'אחיזה ניטרלית (כפות ידיים זו מול זו), מרפקים צמודים לגוף.',
    en: 'Keep a neutral grip (palms facing in) with elbows pinned to your sides.',
  },
  'סקוואט (Squat)': {
    he: 'ברכיים בכיוון האצבעות, ירידה עד שהירכיים מתחת לגובה הברך, גב ניטרלי.',
    en: 'Track your knees over your toes, squat until hips drop below knee level, keep a neutral spine.',
  },
  'דדליפט רומני (Romanian Deadlift)': {
    he: 'ברכיים כמעט נעולות, כופפו מהירכיים אחורה, המוט צמוד לרגליים.',
    en: 'Keep knees nearly locked, hinge back at the hips, and keep the bar close to your legs.',
  },
  'לחיצת רגליים (Leg Press)': {
    he: 'רגליים ברוחב כתפיים, הורידו עד זווית 90° בברך, בלי לנעול את הברכיים בקצה.',
    en: 'Feet shoulder-width, lower to a 90° knee bend, and avoid locking your knees at the top.',
  },
  'מכפוף רגל (Leg Curl)': {
    he: 'אגן צמוד למכונה, כופפו את הברך במלואה תוך שליטה, בלי לקפוץ.',
    en: 'Keep hips pinned to the pad, curl through the full range with control — no jerking.',
  },
  'הרמות עקב (Calf Raise)': {
    he: 'עמידה על קצות האצבעות במלוא הטווח, עצרו רגע למעלה ולמטה.',
    en: 'Rise onto your toes through the full range and pause briefly at the top and bottom.',
  },
  "לאנג'ים (Lunges)": {
    he: 'צעד ארוך, ברך אחורית כמעט נוגעת ברצפה, פלג גוף עליון זקוף.',
    en: 'Take a long step, lower the back knee close to the floor, keep your torso upright.',
  },
  'יישור רגל (Leg Extension)': {
    he: 'גב צמוד למשענת, פשטו את הברך במלואה ועצרו רגע למעלה.',
    en: 'Keep your back against the pad, extend fully, and pause briefly at the top.',
  },
  'פלאנק (Plank)': {
    he: 'גוף בקו ישר מהראש לעקבים, ליבה וישבן מהודקים, נשימה סדירה.',
    en: 'Keep a straight line from head to heels, brace your core and glutes, breathe steadily.',
  },
  'כפיפות בטן (Crunches)': {
    he: 'סנטר מורחק מהחזה, הרימו את החלק העליון של הגב תוך התכווצות הבטן.',
    en: 'Keep your chin off your chest and curl your upper back using your abs, not your neck.',
  },
  'הרמת רגליים (Leg Raise)': {
    he: 'גב תחתון צמוד לרצפה, הרימו את הרגליים בשליטה בלי לנדנד.',
    en: 'Keep your lower back pressed to the floor and raise your legs with control — no swinging.',
  },
  'דדליפט (Deadlift)': {
    he: 'המוט צמוד לשוקיים, גב ניטרלי, הרימו על ידי דחיפת הרצפה עם הרגליים.',
    en: 'Keep the bar close to your shins, spine neutral, and drive up by pushing the floor away.',
  },
  'לחיצת חזה שטוח דמבלים (DB Bench Press)': {
    he: 'דמבלים בקו ישר מעל בית החזה, ירידה עד שהמרפקים מתחת לגובה הכתפיים.',
    en: 'Keep the dumbbells stacked over your chest and lower until elbows dip below shoulder height.',
  },
  'הליכה מהירה / אופניים': {
    he: 'קצב שמאפשר לדבר בנוחות, כתפיים רפויות, נשימה עמוקה וסדירה.',
    en: 'Keep a pace where you can still hold a conversation, relaxed shoulders, steady deep breathing.',
  },
  'אימון Full Body קל או אירובי בינוני': {
    he: 'שמרו על קצב יציב לאורך כל האימון, הקשיבו לגוף והתאימו עצימות.',
    en: 'Maintain a steady pace throughout, listen to your body and adjust intensity as needed.',
  },
  '10,000 צעדים': {
    he: 'פזרו את הצעדים לאורך היום, יציבה זקופה וצעד טבעי.',
    en: 'Spread the steps across the day, keep an upright posture and a natural stride.',
  },
};

const GENERIC_CUE = {
  he: 'שליטה מלאה בטווח התנועה, נשימה סדירה, בלי לנעול מפרקים.',
  en: 'Control the full range of motion, breathe steadily, avoid locking joints.',
};

export function getExerciseCue(name, isHe) {
  const cue = EXERCISE_CUES[name] || GENERIC_CUE;
  return isHe ? cue.he : cue.en;
}
