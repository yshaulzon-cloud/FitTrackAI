import { useState } from 'react';
import { useLang } from '../context/LanguageContext';
import WorkoutSession, { readActiveSession } from './WorkoutSession';

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

export default function WorkoutPlan({ plan, profile, api, onComplete, workoutHistory, showXP }) {
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
  const [doneSets, setDoneSets] = useState({});
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

  // Count done sets in the current day
  const currentDay = days[safeDayIdx];
  const baseExercises0 = currentDay ? (homeMode ? toHomeExercises(currentDay.exercises) : currentDay.exercises) : [];
  const adjExercises0 = getExercisesForDuration(baseExercises0, dayDurations[currentDay?.day] || 60);
  const totalSets = adjExercises0.reduce((s, ex) => s + (ex.sets || 0), 0);
  const doneSetsCount = Object.values(doneSets).filter(Boolean).length;
  const wkPct = totalSets > 0 ? Math.min(100, Math.round((doneSetsCount / totalSets) * 100)) : 0;

  function toggleSet(exIdx, setIdx) {
    const key = `${safeDayIdx}-${exIdx}-${setIdx}`;
    setDoneSets(prev => ({ ...prev, [key]: !prev[key] }));
  }
  function isSetDone(exIdx, setIdx) { return !!doneSets[`${safeDayIdx}-${exIdx}-${setIdx}`]; }

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
      {/* Resume banner — an unfinished session survives app restarts */}
      {resumeAvailable && (
        <button
          type="button"
          onClick={resumeSession}
          style={{
            width: '100%', marginBottom: 14, cursor: 'pointer',
            border: '1px solid rgba(255,176,32,0.4)',
            background: 'rgba(255,176,32,0.1)',
            borderRadius: 16, padding: '14px 16px',
            display: 'flex', alignItems: 'center', gap: 12,
            fontFamily: 'inherit', textAlign: 'start',
          }}
        >
          <span style={{ fontSize: 22 }}>⏸</span>
          <span style={{ flex: 1 }}>
            <span style={{ display: 'block', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15, color: '#ffb020' }}>
              {isHe ? 'יש לך אימון פעיל' : 'You have an active workout'}
            </span>
            <span style={{ display: 'block', fontSize: 12.5, color: 'var(--text-3)', marginTop: 2 }}>
              {isHe ? 'לחץ כדי להמשיך מאיפה שהפסקת' : 'Tap to continue where you left off'}
            </span>
          </span>
          <span style={{ fontSize: 18, color: '#ffb020' }}>▶</span>
        </button>
      )}

      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: '#a78bfa', fontWeight: 700, letterSpacing: '.5px', marginBottom: 2 }}>
          {isHe ? `אימון · ${expLabels[profile?.experience] || ''}` : `Workout · ${expLabels[profile?.experience] || ''}`}
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 26, color: 'var(--text-1)', margin: 0 }}>
          {currentDay ? getDayName(currentDay.day, lang) : (isHe ? 'תוכנית אימון' : 'Workout plan')}
        </h1>
      </div>

      {/* Gym / Home mode picker — prominent CTA so users know home
          alternatives exist. Each option is a full card with icon, label
          and tagline explaining the tradeoff. */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 12,
        marginBottom: 16,
      }}>
        <button
          type="button"
          onClick={() => setHomeMode(false)}
          style={{
            padding: '18px 16px',
            borderRadius: 'var(--r-lg)',
            border: !homeMode ? '2px solid var(--accent)' : '1px solid var(--border)',
            background: !homeMode ? 'var(--accent-glow)' : 'var(--surface)',
            cursor: 'pointer',
            textAlign: 'start',
            transition: 'all 0.15s',
            fontFamily: 'inherit',
            position: 'relative',
            boxShadow: !homeMode ? '0 0 0 4px rgba(45,212,191,0.10)' : 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span style={{ fontSize: 22 }}>🏋️</span>
            <span style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 16,
              color: !homeMode ? 'var(--accent)' : 'var(--text-1)',
            }}>{t.gymWorkout}</span>
            {!homeMode && (
              <span style={{
                marginInlineStart: 'auto',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.08em',
                padding: '3px 8px',
                borderRadius: 99,
                background: 'var(--accent)',
                color: 'var(--bg-0)',
              }}>{lang === 'he' ? 'נבחר' : 'ACTIVE'}</span>
            )}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.5 }}>
            {lang === 'he'
              ? 'משקולות, מכונות ומשקל גוף — תוכנית הליבה.'
              : 'Free weights, machines & bodyweight — the core plan.'}
          </div>
        </button>

        <button
          type="button"
          onClick={() => setHomeMode(true)}
          style={{
            padding: '18px 16px',
            borderRadius: 'var(--r-lg)',
            border: homeMode ? '2px solid var(--violet)' : '1px solid var(--border)',
            background: homeMode ? 'rgba(139, 92, 246, 0.10)' : 'var(--surface)',
            cursor: 'pointer',
            textAlign: 'start',
            transition: 'all 0.15s',
            fontFamily: 'inherit',
            position: 'relative',
            boxShadow: homeMode ? '0 0 0 4px rgba(139, 92, 246, 0.10)' : 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span style={{ fontSize: 22 }}>🏠</span>
            <span style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 16,
              color: homeMode ? 'var(--violet)' : 'var(--text-1)',
            }}>{t.homeWorkout}</span>
            {homeMode && (
              <span style={{
                marginInlineStart: 'auto',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.08em',
                padding: '3px 8px',
                borderRadius: 99,
                background: 'var(--violet)',
                color: '#ffffff',
              }}>{lang === 'he' ? 'נבחר' : 'ACTIVE'}</span>
            )}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.5 }}>
            {lang === 'he'
              ? 'אותה תוכנית, חלופות ביתיות לכל תרגיל — בלי ציוד.'
              : 'Same plan, home-friendly swap for every exercise — no gear.'}
          </div>
        </button>
      </div>

      {/* Tip: click exercise for tutorial */}
      <div className="card" style={{
        textAlign: 'center',
        padding: '12px 16px',
        background: 'rgba(0, 206, 201, 0.06)',
        borderColor: 'rgba(0, 206, 201, 0.15)',
      }}>
        <span style={{ fontSize: '15px', color: 'var(--accent)' }}>
          {t.clickForTutorial}
        </span>
      </div>

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
      {days.length > 1 && (
        <div style={{ display: 'flex', gap: 9, marginBottom: 18 }}>
          {days.map((d, i) => {
            const isActive = i === safeDayIdx;
            const tabLabel = bodyPartLabel(d) || (lang === 'he' ? 'כוח' : 'Strength');
            return (
              <button
                key={i}
                role="tab"
                aria-selected={isActive}
                onClick={() => { setSelectedDayIdx(i); setDoneSets({}); }}
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

      {/* Progress bar */}
      {totalSets > 0 && (
        <div style={{ background: 'linear-gradient(135deg,rgba(167,139,250,.14),rgba(46,230,196,.06))', border: '1px solid rgba(167,139,250,.22)', borderRadius: 20, padding: '16px 18px', marginBottom: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--text-1)' }}>
              {isHe ? 'התקדמות האימון' : 'Workout progress'}
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15, color: '#c4b5fd' }}>
              {doneSetsCount}/{totalSets} {isHe ? 'סטים' : 'sets'}
            </div>
          </div>
          <div style={{ height: 9, background: 'rgba(255,255,255,.08)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${wkPct}%`, background: 'linear-gradient(90deg,#a78bfa,#2ee6c4)', borderRadius: 99, transition: 'width .5s cubic-bezier(.4,0,.2,1)' }} />
          </div>
        </div>
      )}

      {visibleDays.map((day) => {
        const idx = day.__idx;
        const typeStyle = typeColors[day.type] || typeColors.strength;
        const isCompleting = completingDay === day.day;
        const duration = getDuration(day.day);
        const baseExercises = homeMode ? toHomeExercises(day.exercises) : day.exercises;
        const visibleExercises = getExercisesForDuration(baseExercises, duration);
        const hiddenCount = day.exercises.length - visibleExercises.length;
        const setsChanged = duration !== 60;

        return (
          <div key={idx}>
          {/* Duration selector */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 0', marginBottom: 18, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, color: 'var(--text-3)' }}>{t.availableTime}</span>
            {DURATION_OPTIONS.map(opt => (
              <button key={opt} onClick={() => setDuration(day.day, opt)} style={{ padding: '4px 12px', borderRadius: 12, border: duration === opt ? '1.5px solid rgba(167,139,250,.5)' : '1px solid rgba(255,255,255,.1)', background: duration === opt ? 'rgba(167,139,250,.15)' : 'transparent', color: duration === opt ? '#c4b5fd' : '#7c8899', fontSize: 13, fontWeight: duration === opt ? 700 : 400, cursor: 'pointer', transition: 'all .15s' }}>
                {opt}
              </button>
            ))}
            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{t.minutes}</span>
          </div>

          {/* Exercise cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {visibleExercises.map((ex, exIdx) => {
              const muscleColors = {
                'חזה': '#ff5c7c', 'גב': '#4aa8ff', 'כתפיים': '#ffb020',
                'זרועות': '#a78bfa', 'רגליים': '#2ee6c4', 'תאומים': '#4aa8ff',
                'ליבה': '#ffb020', 'אירובי': '#2ee6c4', 'כללי': '#5b6675',
              };
              const exColor = ex.muscleGroup ? (muscleColors[ex.muscleGroup] || '#2ee6c4') : '#2ee6c4';
              const isHeb = lang === 'he';
              const primary = isHeb ? ex.name : getEnglishName(ex.name);
              const secondary = isHeb && getEnglishName(ex.name) !== ex.name ? getEnglishName(ex.name) : null;
              return (
                <div key={exIdx} style={{ background: 'var(--surface)', border: '1px solid var(--border-subtle)', borderRadius: 20, padding: '16px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
                    <div style={{ width: 4, alignSelf: 'stretch', minHeight: 38, borderRadius: 99, flexShrink: 0, background: exColor }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--text-1)', cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        onClick={() => setSelectedExercise(ex)}
                      >
                        {primary}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 1 }}>
                        {secondary || (isHeb ? `${ex.reps} חזרות` : `${ex.reps} reps`)}
                        {secondary ? ` · ${ex.reps} ${isHeb ? 'חזרות' : 'reps'}` : ''}
                      </div>
                    </div>
                  </div>
                  {/* Set toggle buttons */}
                  <div style={{ display: 'flex', gap: 8 }}>
                    {Array.from({ length: ex.sets }, (_, si) => {
                      const done = isSetDone(exIdx, si);
                      return (
                        <button
                          key={si}
                          onClick={() => toggleSet(exIdx, si)}
                          style={{
                            flex: 1, cursor: 'pointer',
                            border: done ? `1.5px solid ${exColor}` : '1.5px solid rgba(255,255,255,.1)',
                            background: done ? `${exColor}22` : 'rgba(255,255,255,.03)',
                            borderRadius: 12, padding: '9px 0', textAlign: 'center',
                            fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15,
                            color: done ? exColor : '#8f9bab',
                            transition: 'all .15s',
                          }}
                        >
                          {done ? '✓' : si + 1}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {(hiddenCount > 0 || setsChanged) && (
            <div style={{ padding: '8px 0', textAlign: 'center', fontSize: 12, color: duration < 60 ? '#ffb020' : '#2ee6c4', fontStyle: 'italic', marginTop: 8 }}>
              {duration < 60
                ? `${t.shortWorkoutNote}${hiddenCount > 0 ? ` | ${hiddenCount} ${t.exercisesSkipped}` : ''}`
                : t.longWorkoutNote}
            </div>
          )}

          {/* Inline confirm when completing */}
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

      {/* Recent Workouts with delete */}
      {workouts.length > 0 && (
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

      {/* Completed / locked state — previously nothing rendered here at all,
          which made the workout tab look identical to the old version for
          anyone who had already trained today. Make the state explicit. */}
      {visibleDays.length > 0 && (alreadyTrainedToday || weeklyLimitReached) && (
        <div style={{
          marginTop: 18,
          padding: '18px 16px',
          borderRadius: 17,
          border: '1px solid rgba(46,230,196,0.28)',
          background: 'rgba(46,230,196,0.07)',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 26, marginBottom: 6 }}>✅</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, color: 'var(--text-1)' }}>
            {alreadyTrainedToday
              ? (isHe ? 'האימון של היום הושלם' : "Today's workout is done")
              : (isHe ? 'השלמת את כל האימונים של המחזור' : 'All workouts for this cycle are done')}
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--text-3)', marginTop: 4, lineHeight: 1.5 }}>
            {alreadyTrainedToday
              ? (isHe
                  ? 'מערכת האימון החי — מעקב סטים, משקלים וטיימר מנוחה — תיפתח באימון הבא שלך.'
                  : 'The live workout — set tracking, weights and rest timer — opens on your next session.')
              : (isHe
                  ? `לפי התוכנית שלך (${maxPerWeek} אימונים בשבוע). האימון הבא ייפתח בהמשך המחזור.`
                  : `Per your plan (${maxPerWeek} workouts/week). The next session unlocks later this cycle.`)}
          </div>
        </div>
      )}

      {/* Primary action: start a tracked live session. Secondary: the old
          one-tap quick log for users who don't want set tracking. */}
      {visibleDays.length > 0 && !completingDay && !alreadyTrainedToday && !weeklyLimitReached && (
        <>
          <button
            type="button"
            onClick={startSession}
            style={{ width: '100%', marginTop: 18, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#2ee6c4,#16c5a7)', color: '#04231e', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 17, padding: 16, borderRadius: 17, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 10px 28px -10px rgba(46,230,196,.7)' }}
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#04231e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="6 3 20 12 6 21 6 3"/></svg>
            {lang === 'he' ? 'התחל אימון' : 'Start workout'}
          </button>
          <button
            type="button"
            onClick={() => setCompletingDay(visibleDays[0].day)}
            style={{ width: '100%', marginTop: 10, padding: '11px 0', borderRadius: 13, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-3)', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            {lang === 'he' ? 'רישום מהיר בלי מעקב סטים' : 'Quick log without set tracking'}
          </button>
        </>
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
      `}</style>
    </>
  );
}
