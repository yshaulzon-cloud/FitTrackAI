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

export default function WorkoutPlan({ plan, profile, api, onComplete, workoutHistory, showXP, progressionData, dailyStreak = 0 }) {
  const { t, lang } = useLang();
  const isHe = lang === 'he';
  const [dayDurations, setDayDurations] = useState({});
  const [completingDay, setCompletingDay] = useState(null);
  const [message, setMessage] = useState('');
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [homeMode, setHomeMode] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [lastDeleted, setLastDeleted] = useState(null);
  const [showAllWorkouts, setShowAllWorkouts] = useState(false);
  const [selectedDayIdx, setSelectedDayIdx] = useState(0);
  const [expandedPlanEx, setExpandedPlanEx] = useState(null);
  const [perfMap, setPerfMap] = useState({});
  // Live session state: null | { exercises, dayName, location, restore? }
  const [session, setSession] = useState(null);
  const [resumeAvailable, setResumeAvailable] = useState(() => readActiveSession());
  const [expandedWorkout, setExpandedWorkout] = useState(null);

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

  const expLabels = { beginner: t.expBeginner, intermediate: t.expIntermediate, advanced: t.expAdvanced };
  const typeColors = {
    strength: { bg: 'rgba(108, 92, 231, 0.1)', border: 'rgba(108, 92, 231, 0.2)', color: 'var(--primary-light)', label: t.strength },
    hypertrophy: { bg: 'rgba(0, 206, 201, 0.1)', border: 'rgba(0, 206, 201, 0.2)', color: 'var(--accent)', label: t.hypertrophy },
    cardio: { bg: 'rgba(253, 203, 110, 0.1)', border: 'rgba(253, 203, 110, 0.2)', color: 'var(--warning)', label: t.cardio },
  };

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

  const isUndo = message === '__WORKOUT_DELETED__';
  const isError = message === t.errorSavingWorkout || message === t.errorDeletingWorkout;
  const isWarning = message === t.alreadyTrainedToday || message === t.weeklyLimitReached;

  async function handleUndoWorkout() {
    if (!lastDeleted || lastDeleted.type !== 'workout') return;
    try {
      await api('/workout/complete', {
        method: 'POST',
        body: JSON.stringify({
          dayName: lastDeleted.data.dayName,
          exercises: lastDeleted.data.exercises,
          durationMinutes: lastDeleted.data.durationMinutes,
        }),
      });
      setLastDeleted(null);
      setMessage(t.workoutSaved);
      setTimeout(() => setMessage(''), 3000);
      onComplete();
    } catch {
      setMessage(t.errorSavingWorkout);
      setTimeout(() => setMessage(''), 3000);
    }
  }
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

  // Week strip (Sun-start) — which days this week already have a logged workout.
  const weekLetters = isHe ? ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'] : ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const workoutDayStamps = new Set(workouts.map(w => {
    const d = new Date(w.date);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }));
  const todayIdx = new Date().getDay();
  const startOfWeek = new Date();
  startOfWeek.setHours(0, 0, 0, 0);
  startOfWeek.setDate(startOfWeek.getDate() - todayIdx);
  const weekDots = weekLetters.map((label, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    const done = workoutDayStamps.has(d.getTime());
    return { label, done, today: i === todayIdx && !done };
  });
  const doneThisWeek = weekDots.filter(d => d.done).length;

  const totalWorkoutsCount = workouts.length;
  const avgDurationMin = workouts.length
    ? Math.round(workouts.reduce((s, w) => s + (w.durationMinutes || 0), 0) / workouts.length)
    : 0;
  const homeMuscleLabel = currentDay ? (bodyPartLabel(currentDay) || (isHe ? 'כוח' : 'Strength')) : '';
  const nudgeText = doneThisWeek >= maxPerWeek
    ? (isHe ? '🎉 השלמת את היעד השבועי — כל הכבוד!' : "🎉 You've hit your weekly goal — nice work!")
    : doneThisWeek === maxPerWeek - 1
      ? (isHe ? 'עוד אימון אחד ותשלים שבוע מושלם — קדימה!' : 'One more workout for a perfect week — go!')
      : (isHe ? `עוד ${maxPerWeek - doneThisWeek} אימונים השבוע לפי התוכנית` : `${maxPerWeek - doneThisWeek} workouts left this week per your plan`);

  // ── Redesign (pre-workout screen) derived values ─────────────────────
  const accentVar = homeMode ? 'var(--violet)' : 'var(--accent)';
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
        restore={session.restore}
        onFinish={(result) => {
          setSession(null);
          setResumeAvailable(null);
          if (showXP && result?.xp) showXP(result.xp);
          onComplete();
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
              <span className="wp2-live-dot" style={{ width: 9, height: 9, borderRadius: 99, background: '#ffab40', display: 'inline-block' }} />
              <span style={{ fontSize: 13, fontWeight: 800, color: '#ffab40', letterSpacing: '.03em' }}>
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
            <div style={{ height: 6, borderRadius: 99, background: 'rgba(255,255,255,.08)', overflow: 'hidden' }}>
              <div style={{ width: `${resumePct}%`, height: '100%', borderRadius: 99, background: '#ffab40' }} />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              type="button"
              onClick={resumeSession}
              style={{
                width: '100%', height: 58, border: 'none', borderRadius: 18, cursor: 'pointer',
                background: 'linear-gradient(135deg,#ffc24d,#ff9f1c)', color: '#2a1a00',
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
            <div style={{ width: 72, height: 72, margin: '0 auto 14px', borderRadius: 99, background: 'var(--accent-glow, rgba(46,230,196,.12))', border: '2px solid rgba(46,230,196,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, color: 'var(--accent)', fontWeight: 900 }}>✓</div>
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
            <div style={{ flex: 1, textAlign: 'center', padding: '14px 6px', borderRadius: 14, background: 'var(--accent-glow, rgba(46,230,196,.07))', border: '1px solid rgba(46,230,196,.3)' }}>
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
                <div style={{ width: 26, height: 26, borderRadius: 99, background: 'var(--accent-glow, rgba(46,230,196,.13))', color: 'var(--accent)', fontSize: 13, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>✓</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.location === 'home' ? '🏠 ' : ''}{getDayName(w.dayName, lang) || (isHe ? 'אימון' : 'Workout')}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{new Date(w.date).toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-US')}</div>
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--text-3)', fontWeight: 600, flex: 'none' }}>{w.durationMinutes} {isHe ? 'דק׳' : 'min'}</div>
              </div>
            ))}
          </div>
          <div style={{ padding: 14, borderRadius: 14, background: 'var(--accent-glow, rgba(46,230,196,.06))', border: '1px solid rgba(46,230,196,.2)', fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6, fontWeight: 500 }}>
            <span style={{ color: 'var(--accent)', fontWeight: 800 }}>{isHe ? 'המחזור הבא ייפתח בהמשך.' : 'The next cycle unlocks soon.'}</span>{' '}
            {isHe ? 'הגוף בונה שריר במנוחה — נצל את הימים הקרובים להתאוששות, שינה ותזונה טובה.' : 'Muscle is built during rest — use the coming days for recovery, sleep and good nutrition.'}
          </div>
        </div>
      )}

      {/* ── READY state — header, title, context, gym/home toggle ───────── */}
      {screenReady && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <span style={{ fontSize: 13, color: 'var(--text-3)', fontWeight: 500 }}>{dateLabel}</span>
            {dailyStreak > 0 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 99, background: 'rgba(255,171,64,.1)', border: '1px solid rgba(255,171,64,.25)', fontSize: 12.5, fontWeight: 700, color: '#ffab40' }}>
                🔥 {isHe ? `רצף ${dailyStreak} ימים` : `${dailyStreak}-day streak`}
              </span>
            )}
          </div>

          <div style={{ fontSize: 12.5, fontWeight: 700, color: accentVar, letterSpacing: '.04em', marginBottom: 6 }}>
            {isHe ? `האימון של היום · יום ${safeDayIdx + 1} בתוכנית` : `Today's workout · day ${safeDayIdx + 1} of your plan`}
            {homeMode ? (isHe ? ' · גרסת בית' : ' · home version') : ''}
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 900, lineHeight: 1.15, color: 'var(--text-1)', marginBottom: 12 }}>
            {dayTitle}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            <span style={{ padding: '6px 12px', borderRadius: 10, background: 'var(--surface)', border: '1px solid var(--border-subtle)', fontSize: 12.5, fontWeight: 600, color: 'var(--text-2)' }}>{isHe ? '~' : '~'}{getDuration(currentDay?.day)} {isHe ? 'דק׳' : 'min'}</span>
            <span style={{ padding: '6px 12px', borderRadius: 10, background: 'var(--surface)', border: '1px solid var(--border-subtle)', fontSize: 12.5, fontWeight: 600, color: 'var(--text-2)' }}>{adjExercises0.length} {isHe ? 'תרגילים' : 'exercises'}</span>
            {muscleChip && <span style={{ padding: '6px 12px', borderRadius: 10, background: 'var(--surface)', border: '1px solid var(--border-subtle)', fontSize: 12.5, fontWeight: 600, color: 'var(--text-2)' }}>{muscleChip}</span>}
          </div>

          {lastWorkout && lastVolume > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 14, background: 'var(--accent-glow, rgba(46,230,196,.07))', border: '1px solid rgba(46,230,196,.2)', marginBottom: 16 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(46,230,196,.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', fontSize: 16, fontWeight: 800, flex: 'none' }}>↗</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>
                  {isHe ? `בפעם הקודמת: ${lastDurMin} דק׳ · נפח ${lastVolume.toLocaleString()} ק״ג` : `Last time: ${lastDurMin} min · ${lastVolume.toLocaleString()} kg volume`}
                </div>
                {topPr && (
                  <div style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>
                    {isHe ? `שיא אישי ב${topPr.name} — ${topPr.weight} ק״ג. היום מנסים ${topPr.weight + 2.5}?` : `PR in ${topPr.name} — ${topPr.weight} kg. Try ${topPr.weight + 2.5} today?`}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}


      {/* Gym / Home segmented toggle */}
      {screenReady && (
        <div style={{ display: 'flex', background: 'var(--surface)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: 4, marginBottom: 20 }}>
          <button type="button" onClick={() => setHomeMode(false)} style={{ flex: 1, textAlign: 'center', padding: '9px 0', borderRadius: 9, border: !homeMode ? '1px solid rgba(46,230,196,.4)' : '1px solid transparent', background: !homeMode ? 'rgba(46,230,196,.13)' : 'transparent', color: !homeMode ? 'var(--accent)' : 'var(--text-3)', fontFamily: 'inherit', fontSize: 13.5, fontWeight: !homeMode ? 700 : 600, cursor: 'pointer' }}>{t.gymWorkout}</button>
          <button type="button" onClick={() => setHomeMode(true)} style={{ flex: 1, textAlign: 'center', padding: '9px 0', borderRadius: 9, border: homeMode ? '1px solid rgba(139,92,246,.45)' : '1px solid transparent', background: homeMode ? 'rgba(139,92,246,.14)' : 'transparent', color: homeMode ? 'var(--violet)' : 'var(--text-3)', fontFamily: 'inherit', fontSize: 13.5, fontWeight: homeMode ? 700 : 600, cursor: 'pointer' }}>{t.homeWorkout}</button>
        </div>
      )}

      {message && !isUndo && (
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

      {/* Day selector */}
      {screenReady && days.length > 1 && (
        <div style={{ display: 'flex', gap: 9, marginBottom: 18 }}>
          {days.map((d, i) => {
            const isActive = i === safeDayIdx;
            const tabLabel = bodyPartLabel(d) || (lang === 'he' ? 'כוח' : 'Strength');
            return (
              <button
                key={i}
                role="tab"
                aria-selected={isActive}
                onClick={() => { setSelectedDayIdx(i); setExpandedPlanEx(null); }}
                style={{
                  flex: 1, cursor: 'pointer',
                  border: isActive ? '1px solid rgba(167,139,250,.4)' : '1px solid var(--border-subtle)',
                  background: isActive ? 'rgba(167,139,250,.16)' : 'var(--surface)',
                  borderRadius: 15, padding: '12px 8px', textAlign: 'center',
                  fontFamily: 'inherit', transition: 'all .15s',
                }}
              >
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15, color: isActive ? '#c4b5fd' : 'var(--text-1)' }}>
                  {lang === 'he' ? `יום ${i + 1}` : `Day ${i + 1}`}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{tabLabel}</div>
              </button>
            );
          })}
        </div>
      )}

      {screenReady && visibleDays.map((day) => {
        const idx = day.__idx;
        const isCompleting = completingDay === day.day;
        const duration = getDuration(day.day);
        const baseExercises = homeMode ? toHomeExercises(day.exercises) : day.exercises;
        const visibleExercises = getExercisesForDuration(baseExercises, duration);
        const isHeb = lang === 'he';
        const muscleColors = {
          'חזה': '#ff5c7c', 'גב': '#4aa8ff', 'כתפיים': '#ffb020',
          'זרועות': '#a78bfa', 'רגליים': '#2ee6c4', 'תאומים': '#4aa8ff',
          'ליבה': '#ffb020', 'אירובי': '#2ee6c4', 'כללי': '#5b6675',
        };
        return (
          <div key={idx}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-1)' }}>{isHeb ? 'התרגילים' : 'Exercises'}</span>
              <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{isHeb ? 'המשקל האחרון שלך ליד כל תרגיל' : 'Your last weight beside each'}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {visibleExercises.map((ex, exIdx) => {
                const exColor = ex.muscleGroup ? (muscleColors[ex.muscleGroup] || '#2ee6c4') : '#2ee6c4';
                const primary = isHeb ? ex.name : getEnglishName(ex.name);
                const lp = lastPerf(ex);
                return (
                  <button
                    key={exIdx}
                    type="button"
                    onClick={() => setSelectedExercise(ex)}
                    aria-label={isHe ? `${primary} — סרטון הדרכה` : `${primary} — tutorial`}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 12px', borderRadius: 14, background: 'var(--surface)', border: '1px solid var(--border-subtle)', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'start', width: '100%' }}
                  >
                    <span style={{ width: 4, height: 36, borderRadius: 99, background: exColor, flex: 'none' }} />
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 14, fontWeight: 700, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{primary}</span>
                      <span dir="ltr" style={{ display: 'block', fontSize: 11.5, color: 'var(--text-3)', textAlign: 'start' }}>{getEnglishName(ex.name)} · {ex.sets}×{ex.reps}</span>
                    </span>
                    {lp && (
                      <span style={{ textAlign: 'end', flex: 'none' }}>
                        <span style={{ display: 'block', fontSize: 13, fontWeight: 800, color: accentVar }}>{lp.value}</span>
                        {lp.label && <span style={{ display: 'block', fontSize: 10.5, color: 'var(--text-3)' }}>{lp.label}</span>}
                      </span>
                    )}
                    <span aria-hidden="true" style={{ color: '#ff5c7c', fontSize: 11, flex: 'none' }}>▶</span>
                  </button>
                );
              })}
            </div>

            {/* Inline confirm for the quick-log path */}
            {isCompleting && (
              <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                <button className="btn btn-accent" onClick={() => handleComplete(day)} style={{ flex: 1, padding: '12px', fontWeight: 700, fontSize: 15 }}>
                  {t.confirm}
                </button>
                <button onClick={() => setCompletingDay(null)} style={{ padding: '12px 18px', borderRadius: 'var(--r-md)', border: '1px solid rgba(255,92,124,.3)', background: 'rgba(255,92,124,.08)', color: '#ff5c7c', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
                  ✕
                </button>
              </div>
            )}
          </div>
        );
      })}

      {/* Recent-workouts history was removed from the pre-workout screen in the
          redesign (one CTA, zero scroll to start). It still lives on the
          progress/journey tab; kept here gated-off to avoid a large deletion. */}
      {false && workouts.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3>{t.recentWorkouts}</h3>
          </div>
          <div>
            {isUndo && (
              <div
                style={{
                  padding: '10px 16px',
                  marginBottom: '8px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(0,184,148,0.1)',
                  border: '1px solid rgba(0,184,148,0.3)',
                  color: 'var(--success)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  fontWeight: 600,
                  fontSize: '14px',
                }}
              >
                <span>{t.workoutDeleted}</span>
                <button
                  onClick={handleUndoWorkout}
                  style={{
                    padding: '4px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--accent)',
                    background: 'rgba(0, 206, 201, 0.15)',
                    color: 'var(--accent)',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  ↩ {t.undo}
                </button>
              </div>
            )}
            {workouts.slice(0, showAllWorkouts ? workouts.length : 3).map((w, idx) => {
              const hasLog = (w.exercises || []).some(e => (e.setLog || []).some(s => s.done));
              const isExpanded = expandedWorkout === (w._id || idx);
              return (
              <div key={idx} style={{ marginBottom: '8px' }}>
              <div
                className="meal-item"
                style={{ alignItems: 'center', cursor: hasLog ? 'pointer' : 'default' }}
                onClick={() => hasLog && setExpandedWorkout(isExpanded ? null : (w._id || idx))}
              >
                <span className="meal-desc">
                  {w.location === 'home' ? '🏠 ' : ''}{getDayName(w.dayName, lang) || t.workout}{' '}
                  <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                    {new Date(w.date).toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-US')}
                  </span>
                  {hasLog && (
                    <span style={{ color: 'var(--accent)', fontSize: 11, marginInlineStart: 6 }}>
                      {isExpanded ? '▲' : '▼'}
                    </span>
                  )}
                </span>
                <div className="meal-macros" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: 'var(--warning)' }}>{w.caloriesBurned} {t.kcal}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{w.durationMinutes} {t.minutes}</span>
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (deletingId) return;
                      setDeletingId(w._id);
                      try {
                        const res = await fetch(`${import.meta.env.DEV ? 'http://localhost:3001' : ''}/workout/${w._id}`, {
                          method: 'DELETE',
                          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
                        });
                        if (!res.ok) throw new Error('Failed');
                        setLastDeleted({ type: 'workout', data: w });
                        setMessage('__WORKOUT_DELETED__');
                        setTimeout(() => { setMessage(''); setLastDeleted(null); }, 8000);
                        onComplete();
                      } catch {
                        setMessage(t.errorDeletingWorkout);
                        setTimeout(() => setMessage(''), 3000);
                      } finally {
                        setDeletingId(null);
                      }
                    }}
                    disabled={deletingId === w._id}
                    style={{
                      padding: '3px 10px',
                      borderRadius: '6px',
                      border: '1px solid rgba(255,107,107,0.3)',
                      background: 'rgba(255,107,107,0.08)',
                      color: 'var(--danger)',
                      fontSize: '12px',
                      cursor: 'pointer',
                      opacity: deletingId === w._id ? 0.5 : 1,
                    }}
                  >
                    {t.deleteWorkout}
                  </button>
                </div>
              </div>
              {/* Expanded per-set details from a tracked session */}
              {isExpanded && hasLog && (
                <div style={{
                  margin: '2px 8px 4px',
                  padding: '10px 14px',
                  borderRadius: 12,
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid var(--border-subtle)',
                }}>
                  {(w.exercises || []).filter(e => (e.setLog || []).some(s => s.done)).map((e, ei) => {
                    const done = e.setLog.filter(s => s.done);
                    const isTime = e.mode === 'time';
                    const detail = isTime
                      ? `${Math.round(done.reduce((n, s) => n + (s.durationSec || 0), 0) / 60 * 10) / 10} ${lang === 'he' ? 'דק׳' : 'min'}`
                      : done.map(s => `${s.reps ?? '—'}${s.weight ? `×${s.weight}` : ''}`).join(' · ');
                    return (
                      <div key={ei} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 12.5, padding: '3px 0' }}>
                        <span style={{ color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {lang === 'he' ? e.name : getEnglishName(e.name)}
                        </span>
                        <span dir="ltr" style={{ color: 'var(--text-3)', flexShrink: 0, fontFamily: 'var(--font-display)', fontWeight: 600 }}>
                          {detail}
                        </span>
                      </div>
                    );
                  })}
                  {w.totalVolume > 0 && (
                    <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid var(--border-subtle)', fontSize: 12, color: 'var(--accent)', fontWeight: 700, textAlign: 'end' }}>
                      {lang === 'he' ? `נפח כולל: ${w.totalVolume.toLocaleString()} ק״ג` : `Total volume: ${w.totalVolume.toLocaleString()} kg`}
                    </div>
                  )}
                </div>
              )}
              </div>
            );})}
            {workouts.length > 3 && (
              <button
                type="button"
                onClick={() => setShowAllWorkouts(v => !v)}
                style={{
                  width: '100%',
                  marginTop: 8,
                  padding: '10px 0',
                  borderRadius: 'var(--r-md)',
                  border: '1px solid var(--border)',
                  background: 'rgba(255,255,255,0.03)',
                  color: 'var(--accent)',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {showAllWorkouts
                  ? (lang === 'he' ? 'הצג פחות' : 'Show less')
                  : (lang === 'he' ? `הצג אימונים ישנים יותר (${workouts.length - 3})` : `Show older workouts (${workouts.length - 3})`)}
              </button>
            )}
          </div>
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

      {/* Primary CTA — one action, fixed in the thumb zone above the tab bar. */}
      {screenReady && visibleDays.length > 0 && !completingDay && (
        <div style={{
          position: 'sticky',
          bottom: 'calc(env(safe-area-inset-bottom, 0px) + 68px)',
          marginTop: 18,
          paddingTop: 14,
          background: 'linear-gradient(180deg, transparent, var(--bg-0) 40%)',
          zIndex: 5,
        }}>
          <button
            type="button"
            onClick={startSession}
            className="wp2-cta"
            style={{ width: '100%', height: 60, border: 'none', cursor: 'pointer', background: homeMode ? 'linear-gradient(135deg,#c4a1ff,#9b6df2)' : 'linear-gradient(135deg,#35f0b2,#1fc98f)', color: homeMode ? '#1b0e33' : '#04231a', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 18, borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
          >
            {homeMode ? (isHe ? 'התחל אימון בית' : 'Start home workout') : (isHe ? 'התחל אימון' : 'Start workout')}
            <svg width="16" height="16" viewBox="0 0 16 16" style={{ transform: 'scaleX(-1)' }}><path d="M4 2l9 6-9 6z" fill={homeMode ? '#1b0e33' : '#04231a'} /></svg>
          </button>
          <button
            type="button"
            onClick={() => setCompletingDay(visibleDays[0].day)}
            style={{ width: '100%', marginTop: 10, padding: '11px 0', borderRadius: 13, border: 'none', background: 'transparent', color: 'var(--text-3)', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            {lang === 'he' ? 'רישום מהיר בלי מעקב סטים' : 'Quick log without set tracking'}
          </button>
        </div>
      )}

      {/* Secondary CTAs for the done / week states. */}
      {(showDone || showWeek) && (
        <div style={{ position: 'sticky', bottom: 'calc(env(safe-area-inset-bottom, 0px) + 68px)', marginTop: 18, paddingTop: 14, background: 'linear-gradient(180deg, transparent, var(--bg-0) 40%)', zIndex: 5 }}>
          <button
            type="button"
            onClick={startSession}
            style={{ width: '100%', height: 54, borderRadius: 18, cursor: 'pointer', border: '1.5px solid rgba(46,230,196,.5)', background: 'var(--accent-glow, rgba(46,230,196,.08))', color: 'var(--accent)', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16 }}
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
          0%, 100% { box-shadow: 0 8px 28px rgba(46,230,196,.35); }
          50% { box-shadow: 0 8px 40px rgba(46,230,196,.6); }
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
