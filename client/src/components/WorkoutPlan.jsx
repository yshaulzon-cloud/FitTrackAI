import { useState, useEffect } from 'react';
import { useLang } from '../context/LanguageContext';
import WorkoutSession, { readActiveSession, clearActiveSession } from './WorkoutSession';

// Muscle group translations
const muscleGroupMap = {
  'חזה': 'Chest', 'גב': 'Back', 'כתפיים': 'Shoulders', 'זרועות': 'Arms',
  'רגליים': 'Legs', 'תאומים': 'Calves', 'ליבה': 'Core', 'אירובי': 'Cardio', 'כללי': 'General',
};

// Home exercise alternatives - maps gym exercise to home version(s)
// alt = second option for exercises that need a bar/equipment
const homeExerciseMap = {
  'לחיצת חזה שטוח (Bench Press)': { name: 'שכיבות סמיכה (Push Ups)', reps: '10-20' },
  'לחיצת חזה משופע דמבלים (Incline DB Press)': { name: 'שכיבות סמיכה רגליים מוגבהות (Decline Push Ups)', reps: '10-15' },
  'לחיצת חזה שטוח דמבלים (DB Bench Press)': { name: 'שכיבות סמיכה (Push Ups)', reps: '10-20' },
  'פרפר מכונה (Pec Fly)': { name: 'שכיבות סמיכה רחבות (Wide Push Ups)', reps: '12-15' },
  'חתירה במוט (Barbell Row)': {
    name: 'חתירה הפוכה (Inverted Row)', reps: '8-12',
    alt: { name: 'סופרמן חתירה (Superman Row)', reps: '12-15' },
  },
  'חתירה בכבל (Cable Row)': {
    name: 'חתירה הפוכה (Inverted Row)', reps: '10-15',
    alt: { name: 'סופרמן חתירה (Superman Row)', reps: '12-15' },
  },
  'מתח (Pull Ups)': {
    name: 'מתח (Pull Ups)', reps: '6-12',
    alt: { name: 'סופרמן (Superman Pulls)', reps: '12-15' },
  },
  'לחיצת כתפיים (Overhead Press)': { name: 'שכיבות סמיכה פייק (Pike Push Ups)', reps: '8-12' },
  'הרמה צדדית (Lateral Raise)': { name: 'הרמה צדדית עם בקבוקים (Lateral Raise - Bottles)', reps: '12-15' },
  'הרמה אחורית (Rear Delt Fly)': { name: 'סופרמן (Superman Raises)', reps: '12-15' },
  'כפיפת מרפק (Bicep Curl)': { name: 'כפיפת מרפק עם בקבוקים (Bicep Curl - Bottles)', reps: '12-15' },
  'כפיפה בפטיש (Hammer Curl)': { name: 'כפיפה עם בקבוקים (Hammer Curl - Bottles)', reps: '12-15' },
  'פשיטת מרפק בכבל (Tricep Pushdown)': { name: 'שכיבות סמיכה יהלום (Diamond Push Ups)', reps: '8-15' },
  'סקוואט (Squat)': { name: 'סקוואט בולגרי (Bulgarian Split Squat)', reps: '10-12' },
  'דדליפט רומני (Romanian Deadlift)': { name: 'דדליפט על רגל אחת (Single Leg Deadlift)', reps: '10-12' },
  'דדליפט (Deadlift)': { name: 'דדליפט על רגל אחת (Single Leg Deadlift)', reps: '8-10' },
  'לחיצת רגליים (Leg Press)': { name: 'סקוואט קפיצה (Jump Squat)', reps: '12-15' },
  'מכפוף רגל (Leg Curl)': { name: 'גשר ירכיים (Glute Bridge)', reps: '12-15' },
  'יישור רגל (Leg Extension)': { name: 'סיסי סקוואט (Sissy Squat)', reps: '10-15' },
  "לאנג'ים (Lunges)": { name: "לאנג'ים (Walking Lunges)", reps: '12-15' },
  'הרמות עקב (Calf Raise)': { name: 'הרמות עקב על מדרגה (Single Leg Calf Raise)', reps: '15-20' },
  'הליכה מהירה / אופניים (Zone 2)': { name: 'הליכה מהירה / ריצה קלה (Zone 2 Walk / Jog)' },
  'אימון Full Body קל או אירובי בינוני': { name: 'אימון HIIT ביתי (Home HIIT Workout)' },
  'פלאנק (Plank)': { name: 'פלאנק (Plank)' },
  'כפיפות בטן (Crunches)': { name: 'כפיפות בטן (Crunches)' },
  'הרמת רגליים (Leg Raise)': { name: 'הרמת רגליים (Leg Raise)' },
};

// Extract English name from "Hebrew (English)" format
function getEnglishName(name) {
  const match = name.match(/\(([^)]+)\)/);
  return match ? match[1] : name;
}

// Get display name based on language
function getExerciseName(name, lang) {
  if (lang === 'he') return name;
  return getEnglishName(name);
}

function getMuscleGroup(group, lang) {
  if (lang === 'he') return group;
  return muscleGroupMap[group] || group;
}

// Translate day names for English
function getDayName(day, lang) {
  if (lang === 'he') return day;
  return day
    .replace(/יום א'/g, 'Day 1').replace(/יום ב'/g, 'Day 2').replace(/יום ג'/g, 'Day 3')
    .replace(/יום ד'/g, 'Day 4').replace(/יום ה'/g, 'Day 5').replace(/יום ו'/g, 'Day 6')
    .replace('פלג גוף עליון', 'Upper Body').replace('פלג גוף תחתון', 'Lower Body')
    .replace('כוח', 'Strength').replace('היפרטרופיה', 'Hypertrophy')
    .replace('אירובי קל', 'Light Cardio').replace('ליבה', 'Core')
    .replace('Full Body קל / אירובי', 'Light Full Body / Cardio')
    .replace('Full Body + ליבה', 'Full Body + Core')
    .replace('אירובי קל + ליבה', 'Light Cardio + Core');
}

// Adjust exercises and sets based on available time
// 60 min = baseline (all exercises, normal sets)
function getExercisesForDuration(exercises, minutes) {
  let adjusted = exercises.map(ex => ({ ...ex }));

  if (minutes <= 30) {
    // Short: only top compound exercises, -1 set each
    adjusted = adjusted.slice(0, Math.max(3, Math.ceil(exercises.length * 0.5)));
    adjusted = adjusted.map(ex => ({ ...ex, sets: Math.max(2, ex.sets - 1) }));
  } else if (minutes <= 45) {
    // Medium-short: most exercises, -1 set each
    adjusted = adjusted.slice(0, Math.max(4, Math.ceil(exercises.length * 0.75)));
    adjusted = adjusted.map(ex => ({ ...ex, sets: Math.max(2, ex.sets - 1) }));
  } else if (minutes <= 60) {
    // Normal: all exercises as planned
  } else if (minutes <= 75) {
    // Longer: all exercises, +1 set each
    adjusted = adjusted.map(ex => ({ ...ex, sets: ex.sets + 1 }));
  } else {
    // Long (90): all exercises, +2 sets each
    adjusted = adjusted.map(ex => ({ ...ex, sets: ex.sets + 2 }));
  }

  return adjusted;
}

const DURATION_OPTIONS = [30, 45, 60, 75, 90];

// Same palette the live session uses, so a muscle keeps one colour across screens.
const MUSCLE_DOT = {
  'חזה': '#F5698C', 'גב': '#4D9FFF', 'כתפיים': '#FFB648', 'זרועות': '#8F8AF7',
  'רגליים': '#2FE3C2', 'תאומים': '#4D9FFF', 'ליבה': '#FFB648', 'אירובי': '#2FE3C2', 'כללי': '#7C8798',
};

// Convert gym exercises to home alternatives
function toHomeExercises(exercises) {
  return exercises.map(ex => {
    const home = homeExerciseMap[ex.name];
    if (!home) return ex;
    const result = { ...ex, name: home.name, reps: home.reps || ex.reps };
    if (home.alt) {
      result.altName = home.alt.name;
      result.altReps = home.alt.reps;
    }
    return result;
  });
}

export default function WorkoutPlan({ plan, profile, api, onComplete, workoutHistory, showXP, progressionData, dailyStreak = 0, userName, onGoHome }) {
  const { t, lang } = useLang();
  const isHe = lang === 'he';
  const [dayDurations, setDayDurations] = useState({});
  const [completingDay, setCompletingDay] = useState(null);
  const [message, setMessage] = useState('');
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [homeMode, setHomeMode] = useState(false);
  const [selectedDayIdx, setSelectedDayIdx] = useState(0);
  const [showExercises, setShowExercises] = useState(false);
  const [perfMap, setPerfMap] = useState({});
  // Live session state: null | { exercises, dayName, location, restore? }
  const [session, setSession] = useState(null);
  const [resumeAvailable, setResumeAvailable] = useState(() => readActiveSession());

  const days = plan?.days || plan || [];
  // One-day view: render only the active day card. Audit recommendation.
  const safeDayIdx = Math.min(selectedDayIdx, Math.max(0, days.length - 1));
  const visibleDays = days.length > 0 ? [{ ...days[safeDayIdx], __idx: safeDayIdx }] : [];

  // Check if already trained today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayWorkout = (workoutHistory?.workouts || []).find(
    w => new Date(w.date) >= today
  );
  const alreadyTrainedToday = !!todayWorkout;

  // Check cycle-based limit (7 days from first workout of current series)
  const maxPerWeek = profile?.workoutsPerWeek || 4;
  const allWorkouts = (workoutHistory?.workouts || []).slice().sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );
  let weeklyLimitReached = false;
  if (allWorkouts.length > 0) {
    let cycleStart = new Date(allWorkouts[0].date);
    let cycleCount = 0;

    for (const w of allWorkouts) {
      const wDate = new Date(w.date);
      const daysSinceCycleStart = (wDate - cycleStart) / (1000 * 60 * 60 * 24);

      if (daysSinceCycleStart >= 7) {
        cycleStart = wDate;
        cycleCount = 1;
      } else {
        cycleCount++;
      }
    }

    const now = new Date();
    const daysSinceCycleStart = (now - cycleStart) / (1000 * 60 * 60 * 24);
    weeklyLimitReached = cycleCount >= maxPerWeek && daysSinceCycleStart < 7;
  }

  // Day-tab labels: surface "Upper body" / "Lower body" instead of the
  // generic "Hypertrophy" / "Strength" so the chip describes what the
  // day actually trains. Inferred from the exercises' muscle groups.
  const UPPER_GROUPS = new Set(['חזה', 'גב', 'כתפיים', 'זרועות']);
  const LOWER_GROUPS = new Set(['רגליים', 'תאומים']);
  function bodyPartLabel(day) {
    if (day?.type === 'cardio') return null;
    const groups = (day?.exercises || []).map((e) => e.muscleGroup).filter(Boolean);
    if (groups.length === 0) return null;
    let upper = 0, lower = 0;
    for (const g of groups) {
      if (UPPER_GROUPS.has(g)) upper++;
      else if (LOWER_GROUPS.has(g)) lower++;
    }
    if (upper === 0 && lower === 0) return null;
    if (lower > upper) return lang === 'he' ? 'תחתון' : 'Lower';
    if (upper > lower) return lang === 'he' ? 'עליון' : 'Upper';
    return lang === 'he' ? 'גוף מלא' : 'Full';
  }

  function getDuration(dayName) {
    return dayDurations[dayName] || 60;
  }

  function setDuration(dayName, val) {
    setDayDurations(prev => ({ ...prev, [dayName]: val }));
  }

  // Start a tracked live session from the currently visible day plan.
  function startSession() {
    const day = days[safeDayIdx];
    if (!day) return;
    const duration = getDuration(day.day);
    const baseExercises = homeMode ? toHomeExercises(day.exercises) : day.exercises;
    const visibleExercises = getExercisesForDuration(baseExercises, duration);
    setSession({
      exercises: visibleExercises,
      dayName: day.day,
      location: homeMode ? 'home' : 'gym',
    });
  }

  function resumeSession() {
    const saved = readActiveSession();
    if (!saved) { setResumeAvailable(null); return; }
    setSession({
      exercises: [],
      dayName: saved.dayName,
      location: saved.location || 'gym',
      restore: saved,
    });
  }

  // Quick log — the legacy one-tap path for users who don't want set
  // tracking. Records the planned exercises as-is.
  async function handleComplete(day) {
    const duration = getDuration(day.day);
    const baseExercises = homeMode ? toHomeExercises(day.exercises) : day.exercises;
    const visibleExercises = getExercisesForDuration(baseExercises, duration);
    try {
      const result = await api('/workout/complete', {
        method: 'POST',
        body: JSON.stringify({
          dayName: day.day,
          location: homeMode ? 'home' : 'gym',
          exercises: visibleExercises,
          durationMinutes: duration,
        }),
      });
      if (showXP && result?.xp) showXP(result.xp);
      setMessage(`"${getDayName(day.day, lang)}" ${t.workoutSaved}`);
      setTimeout(() => setMessage(''), 3000);
      setCompletingDay(null);
      onComplete();
    } catch (err) {
      const msg = err?.message || '';
      if (msg === 'alreadyTrainedToday') setMessage(t.alreadyTrainedToday);
      else if (msg === 'weeklyLimitReached') setMessage(t.weeklyLimitReached);
      else setMessage(t.errorSavingWorkout);
      setCompletingDay(null);
    }
  }

  function getYouTubeLinks(exerciseName) {
    const en = getEnglishName(exerciseName);
    // Split on " / " to get multiple exercise names
    const parts = en.split(' / ').map(p => p.trim()).filter(Boolean);
    return parts.map(name => ({
      name,
      url: `https://www.youtube.com/results?search_query=${encodeURIComponent(name + ' exercise tutorial form')}`,
    }));
  }

  const isError = message === t.errorSavingWorkout;
  const isWarning = message === t.alreadyTrainedToday || message === t.weeklyLimitReached;
  const workouts = workoutHistory?.workouts || [];

  const currentDay = days[safeDayIdx];
  const baseExercises0 = currentDay ? (homeMode ? toHomeExercises(currentDay.exercises) : currentDay.exercises) : [];
  const adjExercises0 = getExercisesForDuration(baseExercises0, dayDurations[currentDay?.day] || 60);

  // Fetch last-performance data for the current day's exercises so the
  // (read-only) accordion preview can show real suggested weights.
  useEffect(() => {
    const names = adjExercises0.map(ex => ex.name);
    if (names.length === 0) { setPerfMap({}); return; }
    let cancelled = false;
    (async () => {
      try {
        const res = await api('/workout/performance', {
          method: 'POST',
          body: JSON.stringify({ names }),
        });
        if (!cancelled) setPerfMap(res.performances || {});
      } catch { /* non-critical */ }
    })();
    return () => { cancelled = true; };
  }, [safeDayIdx, homeMode, dayDurations[currentDay?.day]]); // eslint-disable-line

  // Workouts logged since this week's Sunday — feeds the "done" state's
  // next-workout card ("2 left this week").
  const todayIdx = new Date().getDay();
  const startOfWeek = new Date();
  startOfWeek.setHours(0, 0, 0, 0);
  startOfWeek.setDate(startOfWeek.getDate() - todayIdx);
  const doneThisWeek = workouts.filter(w => new Date(w.date) >= startOfWeek).length;

  // ── Redesign (pre-workout screen) derived values ─────────────────────
  const accentVar = homeMode ? 'var(--violet)' : 'var(--accent)';
  // Raw channels of the same accent, for rgba() tints that can't use var().
  const accentRgb = homeMode ? '143,138,247' : '47,227,194';
  const nowD = new Date();
  const heDows = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'שבת'];
  const dateLabel = isHe
    ? `יום ${heDows[nowD.getDay()]} · ${nowD.getDate()}.${nowD.getMonth() + 1}`
    : nowD.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const dayTitle = currentDay ? getDayName(currentDay.day, lang) : (isHe ? 'תוכנית אימון' : 'Workout plan');
  const muscleChip =[...new Set((currentDay?.exercises || []).map((e) => getMuscleGroup(e.muscleGroup, lang)).filter(Boolean))].slice(0, 3).join(' · ');
  const lastWorkout = workouts[0] || null; // history is sorted newest-first
  const lastVolume = lastWorkout?.totalVolume || 0;
  const lastDurMin = lastWorkout?.durationMinutes || 0;
  // Heaviest logged lift among today's exercises → the PR nudge line.
  let topPr = null;
  for (const ex of adjExercises0) {
    const p = perfMap[ex.name];
    if (p?.bestWeight > 0 && (!topPr || p.bestWeight > topPr.weight)) {
      topPr = { name: isHe ? ex.name : getEnglishName(ex.name), weight: p.bestWeight };
    }
  }
  // Per-exercise "last time" chip shown at the end of each row.
  function lastPerf(ex) {
    const p = perfMap[ex.name];
    if (!p) return null;
    if (p.bestWeight > 0) return { value: `${p.bestWeight} ${isHe ? 'ק"ג' : 'kg'}`, label: isHe ? 'פעם קודמת' : 'last time' };
    const s = p.sets?.[0];
    if (s?.reps) return { value: `${s.reps}`, label: isHe ? 'חזרות' : 'reps' };
    if (s?.durationSec) return { value: `${Math.round(s.durationSec)}${isHe ? ' שנ׳' : 's'}`, label: isHe ? 'זמן' : 'time' };
    return { value: isHe ? 'משקל גוף' : 'BW', label: '' };
  }
  // Current cycle progress → the weekly-goal ring.
  let cycleDone = 0;
  if (allWorkouts.length > 0) {
    let cs = new Date(allWorkouts[0].date), c = 0;
    for (const w of allWorkouts) {
      const dd = (new Date(w.date) - cs) / 864e5;
      if (dd >= 7) { cs = new Date(w.date); c = 1; } else c++;
    }
    cycleDone = c;
  }
  // Which plan days are already ticked off in the current 7-day cycle —
  // drives the done/today/upcoming state of the weekly-plan rows.
  const doneDayNames = new Set(
    (workoutHistory?.workouts || [])
      .filter((w) => (Date.now() - new Date(w.date)) < 7 * 864e5)
      .map((w) => w.dayName)
      .filter(Boolean)
  );

  // Resume-session progress + elapsed minutes (active state).
  const resumeExs = resumeAvailable?.exercises || [];
  let resumeDone = 0, resumeTotal = 0;
  for (const e of resumeExs) for (const s of (e.setLog || [])) { resumeTotal++; if (s.done) resumeDone++; }
  const resumePct = resumeTotal ? Math.round((resumeDone / resumeTotal) * 100) : 0;
  const resumeElapsedMin = resumeAvailable ? Math.max(0, Math.round((Date.now() - resumeAvailable.startedAt) / 60000)) : 0;
  const nextDay = days.length > 0 ? days[(safeDayIdx + 1) % days.length] : null;

  // Which of the four pre-workout states to render.
  const showActive = !!resumeAvailable;
  const showDone = !resumeAvailable && alreadyTrainedToday;
  const showWeek = !resumeAvailable && !alreadyTrainedToday && weeklyLimitReached;
  const screenReady = !showActive && !showDone && !showWeek;

  // Full-screen live session overlay takes over everything else.
  if (session) {
    return (
      <WorkoutSession
        planExercises={session.exercises}
        dayName={session.dayName}
        location={session.location}
        api={api}
        userName={userName}
        restore={session.restore}
        onFinish={(result, opts) => {
          setSession(null);
          setResumeAvailable(null);
          if (showXP && result?.xp) showXP(result.xp);
          onComplete();
          if (opts?.goHome) onGoHome && onGoHome();
        }}
        onDiscard={() => {
          setSession(null);
          setResumeAvailable(null);
        }}
      />
    );
  }

  return (
    <>
      {/* ── ACTIVE state — an unfinished session survives app restarts ── */}
      {showActive && (
        <div>
          <div style={{
            padding: '20px 18px', borderRadius: 20, marginBottom: 18,
            background: 'linear-gradient(150deg, rgba(255,171,64,.14), rgba(255,171,64,.04))',
            border: '1.5px solid rgba(255,171,64,.45)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span className="wp2-live-dot" style={{ width: 9, height: 9, borderRadius: 99, background: '#FF9A4D', display: 'inline-block' }} />
              <span style={{ fontSize: 13, fontWeight: 800, color: '#FF9A4D', letterSpacing: '.03em' }}>
                {isHe ? 'אימון פעיל · מושהה' : 'Active workout · paused'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
              <span dir="ltr" style={{ fontSize: 38, fontWeight: 900, color: 'var(--text-1)', fontFamily: 'var(--font-display)' }}>{resumeElapsedMin}</span>
              <span style={{ fontSize: 14, color: 'var(--text-3)', fontWeight: 600 }}>
                {isHe ? `דקות · מתוך ~${getDuration(currentDay?.day)} דק׳` : `min · of ~${getDuration(currentDay?.day)} min`}
              </span>
            </div>
            <div style={{ fontSize: 14, color: 'var(--text-2)', fontWeight: 600, marginBottom: 12 }}>
              {getDayName(resumeAvailable.dayName, lang)}{resumeTotal ? ` · ${resumeDone}/${resumeTotal} ${isHe ? 'סטים' : 'sets'}` : ''}
            </div>
            <div style={{ height: 6, borderRadius: 99, background: 'var(--border-subtle)', overflow: 'hidden' }}>
              <div style={{ width: `${resumePct}%`, height: '100%', borderRadius: 99, background: '#FF9A4D' }} />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              type="button"
              onClick={resumeSession}
              style={{
                width: '100%', height: 58, border: 'none', borderRadius: 18, cursor: 'pointer',
                background: 'linear-gradient(135deg,#FFB648,#FF9A4D)', color: '#2a1a00',
                fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 18,
              }}
            >
              {isHe ? 'המשך אימון מאיפה שהפסקת' : 'Continue where you left off'}
            </button>
            <button
              type="button"
              onClick={() => { clearActiveSession(); setResumeAvailable(null); }}
              style={{
                width: '100%', height: 44, borderRadius: 14, cursor: 'pointer',
                border: '1px solid var(--border)', background: 'transparent',
                color: 'var(--text-3)', fontFamily: 'inherit', fontWeight: 700, fontSize: 14,
              }}
            >
              {isHe ? 'בטל את האימון הפעיל' : 'Discard active workout'}
            </button>
          </div>
        </div>
      )}

      {/* ── DONE state — already trained today ─────────────────────────── */}
      {showDone && (
        <div>
          <div style={{ textAlign: 'center', padding: '20px 0 18px' }}>
            <div style={{ width: 72, height: 72, margin: '0 auto 14px', borderRadius: 99, background: 'var(--accent-glow, rgba(47,227,194,.12))', border: '2px solid rgba(47,227,194,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, color: 'var(--accent)', fontWeight: 900 }}>✓</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900, color: 'var(--text-1)', marginBottom: 4 }}>
              {isHe ? 'האימון של היום הושלם' : "Today's workout is done"}
            </div>
            <div style={{ fontSize: 14, color: 'var(--text-3)', fontWeight: 500 }}>
              {getDayName(todayWorkout?.dayName || dayTitle, lang)} — {isHe ? 'כל הכבוד!' : 'nice work!'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <div style={{ flex: 1, textAlign: 'center', padding: '14px 6px', borderRadius: 14, background: 'var(--surface)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--text-1)', fontFamily: 'var(--font-display)' }}>{todayWorkout?.durationMinutes || 0}</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-3)', fontWeight: 600 }}>{isHe ? 'דקות' : 'minutes'}</div>
            </div>
            <div style={{ flex: 1, textAlign: 'center', padding: '14px 6px', borderRadius: 14, background: 'var(--surface)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--text-1)', fontFamily: 'var(--font-display)' }}>{(todayWorkout?.totalVolume || 0).toLocaleString()}</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-3)', fontWeight: 600 }}>{isHe ? 'ק״ג נפח' : 'kg volume'}</div>
            </div>
            <div style={{ flex: 1, textAlign: 'center', padding: '14px 6px', borderRadius: 14, background: 'var(--accent-glow, rgba(47,227,194,.07))', border: '1px solid rgba(47,227,194,.3)' }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--accent)', fontFamily: 'var(--font-display)' }}>🔥 {dailyStreak}</div>
              <div style={{ fontSize: 11.5, color: 'var(--accent)', fontWeight: 600 }}>{isHe ? 'רצף' : 'streak'}</div>
            </div>
          </div>
          {nextDay && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, background: 'var(--surface)', border: '1px solid var(--border-subtle)', marginBottom: 4 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11.5, color: 'var(--text-3)', fontWeight: 700, marginBottom: 2 }}>{isHe ? 'האימון הבא' : 'Next workout'}</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-1)' }}>{getDayName(nextDay.day, lang)}</div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600 }}>
                {maxPerWeek - doneThisWeek > 0 ? (isHe ? `עוד ${maxPerWeek - doneThisWeek} השבוע` : `${maxPerWeek - doneThisWeek} left this week`) : (isHe ? 'שבוע מלא' : 'week complete')}
              </div>
            </div>
          )}
          <div style={{ fontSize: 12.5, color: 'var(--text-3)', lineHeight: 1.5, marginTop: 12, textAlign: 'center' }}>
            {isHe ? 'מערכת האימון החי — מעקב סטים, משקלים וטיימר מנוחה — תיפתח באימון הבא שלך.' : 'The live workout — set tracking, weights and rest timer — opens on your next session.'}
          </div>
        </div>
      )}

      {/* ── WEEK state — every workout in the cycle is done ─────────────── */}
      {showWeek && (
        <div>
          <div style={{ textAlign: 'center', padding: '16px 0 14px' }}>
            <svg width="120" height="120" viewBox="0 0 120 120" style={{ display: 'block', margin: '0 auto 12px' }}>
              <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(127,127,127,.18)" strokeWidth="9" />
              <circle cx="60" cy="60" r="52" fill="none" stroke="var(--accent)" strokeWidth="9" strokeLinecap="round"
                strokeDasharray={`${Math.min(1, maxPerWeek ? cycleDone / maxPerWeek : 0) * 326.7} 326.7`} transform="rotate(-90 60 60)" />
              <text x="60" y="57" textAnchor="middle" fill="var(--text-1)" fontSize="26" fontWeight="900" fontFamily="var(--font-display)">{cycleDone}/{maxPerWeek}</text>
              <text x="60" y="76" textAnchor="middle" fill="var(--text-3)" fontSize="11" fontWeight="600">{isHe ? 'אימונים' : 'workouts'}</text>
            </svg>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900, color: 'var(--text-1)', marginBottom: 4 }}>
              {isHe ? 'היעד השבועי הושלם!' : 'Weekly goal complete!'}
            </div>
            <div style={{ fontSize: 14, color: 'var(--text-3)', fontWeight: 500 }}>
              {isHe ? `כל ${maxPerWeek} האימונים של המחזור — בוצעו` : `All ${maxPerWeek} workouts of the cycle — done`}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {workouts.slice(0, maxPerWeek).map((w, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 14, background: 'var(--surface)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ width: 26, height: 26, borderRadius: 99, background: 'var(--accent-glow, rgba(47,227,194,.13))', color: 'var(--accent)', fontSize: 13, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>✓</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.location === 'home' ? '🏠 ' : ''}{getDayName(w.dayName, lang) || (isHe ? 'אימון' : 'Workout')}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{new Date(w.date).toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-US')}</div>
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--text-3)', fontWeight: 600, flex: 'none' }}>{w.durationMinutes} {isHe ? 'דק׳' : 'min'}</div>
              </div>
            ))}
          </div>
          <div style={{ padding: 14, borderRadius: 14, background: 'var(--accent-glow, rgba(47,227,194,.06))', border: '1px solid rgba(47,227,194,.2)', fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6, fontWeight: 500 }}>
            <span style={{ color: 'var(--accent)', fontWeight: 800 }}>{isHe ? 'המחזור הבא ייפתח בהמשך.' : 'The next cycle unlocks soon.'}</span>{' '}
            {isHe ? 'הגוף בונה שריר במנוחה — נצל את הימים הקרובים להתאוששות, שינה ותזונה טובה.' : 'Muscle is built during rest — use the coming days for recovery, sleep and good nutrition.'}
          </div>
        </div>
      )}

      {/* ── READY state — prototype: title + mode toggle, next-workout card,
             then the weekly plan list. No exercise list on this tab. ─────── */}
      {screenReady && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: 'var(--text-1)' }}>{isHe ? 'אימון' : 'Workout'}</h1>
            <div style={{ display: 'flex', background: 'var(--surface)', border: '1px solid var(--border-subtle)', borderRadius: 999, padding: 3 }}>
              <button type="button" onClick={() => setHomeMode(false)}
                style={{ fontSize: 12.5, fontWeight: 600, borderRadius: 999, padding: '6px 14px', cursor: 'pointer', border: 'none', fontFamily: 'inherit',
                  color: !homeMode ? '#04241B' : '#93A0B4', background: !homeMode ? '#2FE3C2' : 'transparent' }}>
                {t.gymWorkout}
              </button>
              <button type="button" onClick={() => setHomeMode(true)}
                style={{ fontSize: 12.5, fontWeight: 600, borderRadius: 999, padding: '6px 14px', cursor: 'pointer', border: 'none', fontFamily: 'inherit',
                  color: homeMode ? '#1b0e33' : '#93A0B4', background: homeMode ? 'var(--violet)' : 'transparent' }}>
                {t.homeWorkout}
              </button>
            </div>
          </div>

          {/* Next workout card — accent-tinted surface, so the title stays
              readable in light mode (the old hardcoded dark gradient left it
              dark-on-dark). */}
          <div style={{ marginTop: 18, background: `linear-gradient(160deg, color-mix(in srgb, ${accentVar} 8%, var(--surface)), var(--surface))`, border: `1px solid rgba(${accentRgb},.18)`, borderRadius: 22, padding: '22px 20px' }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: accentVar, letterSpacing: '.3px' }}>
              {isHe ? 'האימון הבא שלך' : 'Your next workout'}
            </div>
            <div style={{ fontSize: 21, fontWeight: 700, marginTop: 8, color: 'var(--text-1)' }}>{dayTitle}</div>
            <div style={{ display: 'flex', gap: 14, marginTop: 10, fontSize: 13, color: '#93A0B4', flexWrap: 'wrap' }}>
              <span>{adjExercises0.length} {isHe ? 'תרגילים' : 'exercises'}</span>
              <span>·</span>
              <span>~{getDuration(currentDay?.day)} {isHe ? 'דק׳' : 'min'}</span>
              {muscleChip && (<><span>·</span><span>{muscleChip}</span></>)}
            </div>

            {/* Duration picker — drives getExercisesForDuration, so it changes
                the exercise/set count, not just a label. */}
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 12, color: '#7C8798', marginBottom: 8 }}>{isHe ? 'כמה זמן יש לך?' : 'How long do you have?'}</div>
              <div style={{ display: 'flex', gap: 7 }}>
                {DURATION_OPTIONS.map((mins) => {
                  const on = getDuration(currentDay?.day) === mins;
                  return (
                    <button key={mins} type="button"
                      onClick={() => setDayDurations((prev) => ({ ...prev, [currentDay?.day]: mins }))}
                      style={{
                        flex: 1, padding: '9px 0', borderRadius: 11, cursor: 'pointer', fontFamily: 'inherit',
                        fontSize: 13, fontWeight: on ? 700 : 500,
                        border: on ? `1.5px solid ${accentVar}` : '1px solid var(--border-subtle)',
                        background: on ? `rgba(${accentRgb},.1)` : 'var(--bg-input)',
                        color: on ? accentVar : '#93A0B4',
                      }}>
                      {mins}
                    </button>
                  );
                })}
              </div>
            </div>

            <button type="button" onClick={startSession}
              style={{ width: '100%', background: homeMode ? 'linear-gradient(135deg,#c4a1ff,#9b6df2)' : 'linear-gradient(135deg,#36E8C6,#1EC0A2)', color: homeMode ? '#1b0e33' : '#04241B', fontWeight: 700, border: 'none', borderRadius: 14, padding: 15, fontSize: 16, fontFamily: 'inherit', cursor: 'pointer', marginTop: 18 }}>
              {isHe ? 'התחל אימון' : 'Start workout'}
            </button>

            <button type="button" onClick={() => setShowExercises((v) => !v)}
              style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', color: '#7C8798', fontSize: 13, marginTop: 12 }}>
              {showExercises ? (isHe ? 'הסתר את התרגילים' : 'Hide exercises') : (isHe ? `הצג את ${adjExercises0.length} התרגילים` : `Show all ${adjExercises0.length} exercises`)}
            </button>

            {showExercises && (
              <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {adjExercises0.map((ex, i) => {
                  const perf = perfMap[ex.name];
                  const last = perf?.sets?.[0];
                  return (
                    <button key={i} type="button" onClick={() => setSelectedExercise(ex)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'start', cursor: 'pointer', fontFamily: 'inherit',
                        background: 'var(--bg-input)', border: '1px solid var(--border-faint)', borderRadius: 13, padding: '12px 14px',
                      }}>
                      <span style={{ width: 8, height: 8, borderRadius: 99, flex: 'none', background: MUSCLE_DOT[ex.muscleGroup] || accentVar }} />
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {getExerciseName(ex.name, lang)}
                        </span>
                        <span style={{ display: 'block', fontSize: 12, color: '#7C8798', marginTop: 2 }}>
                          {ex.sets}×{ex.reps}
                          {last?.weight ? ` · ${isHe ? 'פעם קודמת' : 'last'} ${last.weight}${isHe ? ' ק״ג' : 'kg'}` : ''}
                        </span>
                      </span>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#5E6B7E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d={isHe ? 'M14 6l-6 6 6 6' : 'M10 6l6 6-6 6'} />
                      </svg>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Weekly plan */}
          <div style={{ padding: '24px 0 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-1)' }}>{isHe ? 'התוכנית השבועית' : 'This week'}</span>
            <span style={{ fontSize: 12.5, color: '#7C8798' }}>
              {isHe ? `הושלם ${cycleDone} מתוך ${maxPerWeek}` : `${cycleDone} of ${maxPerWeek} done`}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {days.map((d, i) => {
              const name = getDayName(d.day, lang);
              const done = doneDayNames.has(d.day);
              const isToday = !done && i === safeDayIdx;
              const exCount = (homeMode ? toHomeExercises(d.exercises) : d.exercises)?.length || 0;
              return (
                <button key={i} type="button" onClick={() => setSelectedDayIdx(i)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 13, textAlign: 'start', width: '100%', cursor: 'pointer', fontFamily: 'inherit',
                    background: isToday ? `rgba(${accentRgb},.05)` : 'var(--surface)',
                    border: isToday ? `1.5px solid rgba(${accentRgb},.4)` : '1px solid var(--border-faint)',
                    borderRadius: 16, padding: '14px 16px', opacity: (!done && !isToday) ? 0.7 : 1,
                  }}>
                  <span style={{
                    width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    background: done || isToday ? `rgba(${accentRgb},.12)` : 'var(--fill-faint)',
                    fontSize: 13, fontWeight: 700, color: done || isToday ? accentVar : '#7C8798',
                  }}>
                    {done
                      ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={accentVar} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7" /></svg>
                      : (isHe ? `${i + 1}` : `${i + 1}`)}
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 14.5, fontWeight: isToday ? 600 : 500, color: 'var(--text-1)' }}>{name}</span>
                    <span style={{ display: 'block', fontSize: 12, marginTop: 2, color: isToday ? accentVar : '#7C8798' }}>
                      {done ? (isHe ? 'הושלם' : 'Done') : isToday ? (isHe ? 'היום' : 'Today') : `${exCount} ${isHe ? 'תרגילים' : 'exercises'} · ~${getDuration(d.day)} ${isHe ? 'דק׳' : 'min'}`}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}

      {message && (
        <div
          className="card"
          style={{
            background: isError ? 'rgba(255,107,107,0.1)' : isWarning ? 'rgba(253,203,110,0.1)' : 'rgba(0,184,148,0.1)',
            borderColor: isError ? 'rgba(255,107,107,0.3)' : isWarning ? 'rgba(253,203,110,0.3)' : 'rgba(0,184,148,0.3)',
            color: isError ? 'var(--danger)' : isWarning ? 'var(--warning)' : 'var(--success)',
            textAlign: 'center',
            fontWeight: 600,
          }}
        >
          <span>{message}</span>
        </div>
      )}



      {/* Exercise Detail Modal */}
      {selectedExercise && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            animation: 'fadeIn 0.2s ease',
          }}
          onClick={() => setSelectedExercise(null)}
        >
          <div
            style={{
              background: 'var(--bg-card, #1e1e2e)',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '400px',
              width: '90%',
              animation: 'slideUp 0.3s ease',
              border: '1px solid var(--border)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: '48px', marginBottom: '8px' }}>🏋️</div>
              <h3 style={{ color: 'var(--text-primary)', marginBottom: '4px', fontSize: '18px' }}>
                {getExerciseName(selectedExercise.name, lang)}
              </h3>
              {selectedExercise.muscleGroup && (
                <span style={{
                  fontSize: '13px',
                  color: 'var(--accent)',
                  background: 'rgba(0, 206, 201, 0.1)',
                  padding: '3px 12px',
                  borderRadius: '12px',
                }}>
                  {getMuscleGroup(selectedExercise.muscleGroup, lang)}
                </span>
              )}
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '24px',
              marginBottom: '20px',
              padding: '16px',
              background: 'rgba(108, 92, 231, 0.05)',
              borderRadius: '12px',
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--primary-light)' }}>
                  {selectedExercise.sets}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t.sets}</div>
              </div>
              <div style={{ width: '1px', background: 'var(--border)' }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--accent)' }}>
                  {selectedExercise.reps}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {lang === 'he' ? 'חזרות' : 'reps'}
                </div>
              </div>
            </div>

            {getYouTubeLinks(selectedExercise.name).map((link, i) => (
              <button
                key={i}
                className="btn btn-accent"
                onClick={() => window.open(link.url, '_blank')}
                style={{ width: '100%', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                ▶ {link.name}
              </button>
            ))}

            <button
              className="btn"
              onClick={() => setSelectedExercise(null)}
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.05)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border)',
              }}
            >
              {t.close}
            </button>
          </div>
        </div>
      )}


      {/* Secondary CTAs for the done / week states. */}
      {(showDone || showWeek) && (
        <div style={{ position: 'sticky', bottom: 'calc(env(safe-area-inset-bottom, 0px) + 68px)', marginTop: 18, paddingTop: 14, background: 'linear-gradient(180deg, transparent, var(--bg-0) 40%)', zIndex: 5 }}>
          <button
            type="button"
            onClick={startSession}
            style={{ width: '100%', height: 54, borderRadius: 18, cursor: 'pointer', border: '1.5px solid rgba(47,227,194,.5)', background: 'var(--accent-glow, rgba(47,227,194,.08))', color: 'var(--accent)', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16 }}
          >
            {showWeek
              ? (isHe ? 'בכל זאת רוצה להתאמן? אימון חופשי' : 'Still want to train? Free workout')
              : (isHe ? 'רוצה עוד? התחל אימון נוסף' : 'Want more? Start another workout')}
          </button>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes wp2CtaPulse {
          0%, 100% { box-shadow: 0 8px 28px rgba(47,227,194,.35); }
          50% { box-shadow: 0 8px 40px rgba(47,227,194,.6); }
        }
        @keyframes wp2LiveDot {
          0%, 100% { opacity: 1; }
          50% { opacity: .25; }
        }
        .wp2-cta { animation: wp2CtaPulse 2.6s ease-in-out infinite; }
        .wp2-cta:active { transform: scale(.97); }
        .wp2-live-dot { animation: wp2LiveDot 1.4s ease-in-out infinite; }
      `}</style>
    </>
  );
}
