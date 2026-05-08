import { useState } from 'react';
import { useLang } from '../context/LanguageContext';

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
  const [dayDurations, setDayDurations] = useState({});
  const [completingDay, setCompletingDay] = useState(null);
  const [message, setMessage] = useState('');
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [homeMode, setHomeMode] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [lastDeleted, setLastDeleted] = useState(null);

  const days = plan?.days || plan || [];
  const notes = plan?.notes || [];

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

  function getDuration(dayName) {
    return dayDurations[dayName] || 60;
  }

  function setDuration(dayName, val) {
    setDayDurations(prev => ({ ...prev, [dayName]: val }));
  }

  async function handleComplete(day) {
    const duration = getDuration(day.day);
    const baseExercises = homeMode ? toHomeExercises(day.exercises) : day.exercises;
    const visibleExercises = getExercisesForDuration(baseExercises, duration);
    try {
      const result = await api('/workout/complete', {
        method: 'POST',
        body: JSON.stringify({
          dayName: day.day,
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
      setMessage(t.errorSavingWorkout);
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

  return (
    <>
      <div className="page-header">
        <h1>{t.workoutPlan}</h1>
        <p>
          {t.upperLowerSplit} | {profile?.workoutsPerWeek} {t.workoutsWeek} | {t.level}:{' '}
          {expLabels[profile?.experience] || ''}
        </p>
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
            {!homeMode && (
              <span style={{
                marginInlineStart: 'auto',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.08em',
                padding: '3px 8px',
                borderRadius: 99,
                background: 'rgba(139, 92, 246, 0.18)',
                color: 'var(--violet)',
                border: '1px solid rgba(139, 92, 246, 0.30)',
              }}>{lang === 'he' ? '✓ זמין' : '✓ AVAILABLE'}</span>
            )}
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

      {days.map((day, idx) => {
        const typeStyle = typeColors[day.type] || typeColors.strength;
        const isCompleting = completingDay === day.day;
        const duration = getDuration(day.day);
        const baseExercises = homeMode ? toHomeExercises(day.exercises) : day.exercises;
        const visibleExercises = getExercisesForDuration(baseExercises, duration);
        const hiddenCount = day.exercises.length - visibleExercises.length;
        const setsChanged = duration !== 60;

        return (
          <div key={idx} className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="workout-day">
              <div
                className="workout-day-header"
                style={{ background: typeStyle.bg, borderColor: typeStyle.border }}
              >
                <div>
                  <h4 style={{ color: typeStyle.color }}>{getDayName(day.day, lang)}</h4>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{typeStyle.label}</span>
                </div>
                {!isCompleting ? (
                  <button
                    className="btn btn-accent btn-sm"
                    onClick={() => {
                      if (weeklyLimitReached) {
                        setMessage(t.weeklyLimitReached);
                        setTimeout(() => setMessage(''), 3000);
                      } else if (alreadyTrainedToday) {
                        setMessage(t.alreadyTrainedToday);
                        setTimeout(() => setMessage(''), 3000);
                      } else {
                        setCompletingDay(day.day);
                      }
                    }}
                  >
                    {t.finishedWorkout}
                  </button>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      className="btn btn-accent btn-sm"
                      onClick={() => handleComplete(day)}
                      style={{ padding: '6px 12px' }}
                    >
                      {t.confirm}
                    </button>
                    <button
                      className="btn btn-sm"
                      onClick={() => setCompletingDay(null)}
                      style={{
                        padding: '6px 10px',
                        background: 'rgba(255,107,107,0.1)',
                        color: 'var(--danger)',
                        border: '1px solid rgba(255,107,107,0.3)',
                      }}
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>

              {/* Duration selector */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '10px 16px',
                background: 'rgba(108, 92, 231, 0.03)',
                borderBottom: '1px solid var(--border)',
              }}>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)', marginLeft: lang === 'en' ? '0' : '8px', marginRight: lang === 'he' ? '0' : '8px' }}>
                  {t.availableTime}
                </span>
                {DURATION_OPTIONS.map(opt => (
                  <button
                    key={opt}
                    onClick={() => setDuration(day.day, opt)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '14px',
                      border: duration === opt ? '1.5px solid var(--primary-light)' : '1px solid var(--border)',
                      background: duration === opt ? 'rgba(108, 92, 231, 0.15)' : 'transparent',
                      color: duration === opt ? 'var(--primary-light)' : 'var(--text-muted)',
                      fontSize: '13px',
                      fontWeight: duration === opt ? 600 : 400,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    {opt}
                  </button>
                ))}
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t.minutes}</span>
              </div>

              <div className="exercise-list">
                {visibleExercises.map((ex, exIdx) => (
                  <div key={exIdx}>
                    <div
                      className="exercise-item"
                      onClick={() => setSelectedExercise(ex)}
                      style={{ cursor: 'pointer', transition: 'background 0.15s' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(108, 92, 231, 0.05)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = ''}
                    >
                      <span className="exercise-name">
                        {getExerciseName(ex.name, lang)}
                        {ex.altName && (
                          <span style={{ fontSize: '11px', color: 'var(--accent)', marginRight: lang === 'he' ? '6px' : '0', marginLeft: lang === 'en' ? '6px' : '0' }}>
                            ({lang === 'he' ? 'צריך מתח/מוט' : 'needs bar'})
                          </span>
                        )}
                        {ex.muscleGroup && (
                          <span
                            style={{
                              fontSize: '11px',
                              color: 'var(--text-muted)',
                              marginRight: lang === 'he' ? '8px' : '0',
                              marginLeft: lang === 'en' ? '8px' : '0',
                            }}
                          >
                            [{getMuscleGroup(ex.muscleGroup, lang)}]
                          </span>
                        )}
                      </span>
                      <span className="exercise-detail">
                        {ex.sets} {t.sets} × {ex.reps}
                      </span>
                    </div>
                    {ex.altName && (
                      <div
                        className="exercise-item"
                        onClick={() => setSelectedExercise({ ...ex, name: ex.altName, reps: ex.altReps })}
                        style={{
                          cursor: 'pointer',
                          transition: 'background 0.15s',
                          background: 'rgba(0, 206, 201, 0.04)',
                          borderTop: 'none',
                          paddingTop: '4px',
                          paddingBottom: '8px',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0, 206, 201, 0.1)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0, 206, 201, 0.04)'}
                      >
                        <span className="exercise-name" style={{ fontSize: '13px' }}>
                          <span style={{ color: 'var(--accent)', fontSize: '11px', marginLeft: lang === 'en' ? '0' : '6px', marginRight: lang === 'he' ? '0' : '6px' }}>
                            ↳ {lang === 'he' ? 'או:' : 'or:'}
                          </span>
                          {getExerciseName(ex.altName, lang)}
                          <span style={{ fontSize: '11px', color: 'var(--success)', marginRight: lang === 'he' ? '6px' : '0', marginLeft: lang === 'en' ? '6px' : '0' }}>
                            ({lang === 'he' ? 'בלי ציוד' : 'no equipment'})
                          </span>
                        </span>
                        <span className="exercise-detail" style={{ fontSize: '12px' }}>
                          {ex.sets} {t.sets} × {ex.altReps}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
                {(hiddenCount > 0 || setsChanged) && (
                  <div style={{
                    padding: '8px 16px',
                    textAlign: 'center',
                    fontSize: '12px',
                    color: duration < 60 ? 'var(--warning)' : 'var(--accent)',
                    fontStyle: 'italic',
                  }}>
                    {duration < 60
                      ? `${t.shortWorkoutNote}${hiddenCount > 0 ? ` | ${hiddenCount} ${t.exercisesSkipped}` : ''}`
                      : t.longWorkoutNote}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {notes.length > 0 && (
        <div
          className="card"
          style={{
            background: 'rgba(253, 203, 110, 0.05)',
            borderColor: 'rgba(253, 203, 110, 0.2)',
          }}
        >
          <div className="card-header">
            <h3 style={{ color: 'var(--warning)' }}>{t.importantPrinciples}</h3>
          </div>
          <ul style={{ paddingRight: lang === 'he' ? '20px' : '0', paddingLeft: lang === 'en' ? '20px' : '0', fontSize: '14px', color: 'var(--text-secondary)' }}>
            {notes.map((note, idx) => (
              <li key={idx} style={{ marginBottom: '6px' }}>
                {t[note] || note}
              </li>
            ))}
            <li>{t.minSetsPerWeek}</li>
            <li>{t.consistencyMatters}</li>
          </ul>
        </div>
      )}

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
            {workouts.slice(0, 10).map((w, idx) => (
              <div key={idx} className="meal-item" style={{ marginBottom: '8px', alignItems: 'center' }}>
                <span className="meal-desc">
                  {getDayName(w.dayName, lang) || t.workout}{' '}
                  <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                    {new Date(w.date).toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-US')}
                  </span>
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
            ))}
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
