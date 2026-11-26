// The "you've reached your workout goal" sheet: what it says, and the user's
// "don't suggest changing my goal again". Pure and unit-tested; the sheet
// itself is components/GoalReachedSheet.jsx.

export const MAX_GOAL = 7; // Settings offers 1–7 workouts a week

// ── "don't suggest it again" — this device only, one key per user ────
const OFF_KEY = 'areto:goalSuggestion:off:';

// Storage that cannot be read or written just means the suggestion is shown.
// Without a user id nothing is read or written: a shared key would hand one
// user's choice to the next one on this device.
export function isSuggestionOff(userId, storage) {
  if (!userId) return false;
  try { return (storage || globalThis.localStorage).getItem(OFF_KEY + userId) === '1'; } catch { return false; }
}

export function setSuggestionOff(userId, storage) {
  if (!userId) return;
  try { (storage || globalThis.localStorage).setItem(OFF_KEY + userId, '1'); } catch { /* ignore */ }
}

// ── the sheet's content ──────────────────────────────────────────────
// known: the app's own count agrees the cycle is full. It can be false only when
// a save was refused and the history on screen is still older than the server's,
// and then no numbers are shown rather than wrong ones.
function countLine({ done, goal, known, isHe }) {
  if (!known) return isHe ? 'כבר השלמת את יעד האימונים שלך.' : "You've already completed your workout goal.";
  if (done > goal) { // the goal was lowered during the cycle
    if (isHe) return `השלמת ${done} אימונים, והיעד שלך הוא ${goal === 1 ? 'אימון אחד' : goal}.`;
    return `You've completed ${done} workouts, and your goal is ${goal === 1 ? '1 workout' : goal}.`;
  }
  if (goal === 1) return isHe ? 'השלמת אימון אחד מתוך אחד.' : "You've completed 1 of 1 workout.";
  return isHe ? `השלמת ${done} מתוך ${goal} אימונים.` : `You've completed ${done} of ${goal} workouts.`;
}

// Lines that are null are not shown. With the suggestion switched off nothing
// mentions changing the goal: title, count (+ "not saved") and Close only.
export function goalSheetContent({ done, goal, known = true, loggedToday = false, saveFailed = false, suggestionOff = false, isHe }) {
  const atMax = goal >= MAX_GOAL;
  const offer = !suggestionOff && !atMax;
  return {
    title: isHe ? 'כבר הגעת ליעד האימונים שלך' : "You've reached your workout goal",
    notSaved: saveFailed ? (isHe ? 'האימון לא נשמר.' : "This workout wasn't saved.") : null,
    count: countLine({ done, goal, known, isHe }),
    suggestion: offer
      ? (isHe ? 'רוצה להתאמן יותר? אפשר לשנות את יעד האימונים בשבוע בהגדרות.' : 'Want to train more? You can change your weekly workout goal in Settings.')
      : null,
    // One workout per calendar day: a higher goal does not open a second one today.
    tomorrow: offer && loggedToday
      ? (isHe ? 'היום כבר נרשם אימון, לכן גם אחרי שינוי היעד אפשר יהיה לרשום את הבא רק ממחר.' : "You've already logged a workout today, so even with a higher goal you can only log the next one from tomorrow.")
      : null,
    maximum: !suggestionOff && atMax
      ? (isHe ? `${MAX_GOAL} אימונים בשבוע הם המקסימום.` : `${MAX_GOAL} workouts a week is the maximum.`)
      : null,
    offerSettings: offer,
    settingsLabel: isHe ? 'לשינוי היעד בהגדרות' : 'Change goal in Settings',
    dontSuggestLabel: isHe ? 'לא להציע לי יותר לשנות את היעד' : "Don't suggest changing my goal again",
    closeLabel: isHe ? 'סגירה' : 'Close',
  };
}
