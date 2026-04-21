import { useState } from 'react';
import { useLang } from '../context/LanguageContext';

// Muscle group translations
const muscleGroupMap = {
  'חזה': 'Chest', 'גב': 'Back', 'כתפיים': 'Shoulders', 'זרועות': 'Arms',
  'רגליים': 'Legs', 'תאומים': 'Calves', 'ליבה': 'Core', 'אירובי': 'Cardio', 'כללי': 'General',
};

// Home exercise alternatives - maps gym exercise Hebrew name to home version
const homeExerciseMap = {
  'לחיצת חזה שטוח (Bench Press)': { name: 'שכיבות סמיכה (Push Ups)', reps: '10-20' },
  'לחיצת חזה משופע דמבלים (Incline DB Press)': { name: 'שכיבות סמיכה רגליים מוגבהות (Decline Push Ups)', reps: '10-15' },
  'לחיצת חזה שטוח דמבלים (DB Bench Press)': { name: 'שכיבות סמיכה (Push Ups)', reps: '10-20' },
  'פרפר מכונה (Pec Fly)': { name: 'שכיבות סמיכה רחבות (Wide Push Ups)', reps: '12-15' },
  'חתירה במוט (Barbell Row)': { name: 'חתירה הפוכה (Inverted Row)', reps: '8-12' },
  'חתירה בכבל (Cable Row)': { name: 'חתירה הפוכה (Inverted Row)', reps: '10-15' },
  'מתח (Pull Ups)': { name: 'מתח / חתירה הפוכה (Pull Ups / Inverted Row)', reps: '6-12' },
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
    return { ...ex, name: home.name, reps: home.reps || ex.reps };
  });
}

export default function WorkoutPlan({ plan, profile, api, onComplete, workoutHistory }) {
  const { t, lang } = useLang();
  const [dayDurations, setDayDurations] = useState({});
  const [completingDay, setCompletingDay] = useState(null);
  const [message, setMessage] = useState('');
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [homeMode, setHomeMode] = useState(false);

  const days = plan?.days || plan || [];
  const notes = plan?.notes || [];

  // Check if already trained today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayWorkout = (workoutHistory?.workouts || []).find(
    w => new Date(w.date) >= today
  );
  const alreadyTrainedToday = !!todayWorkout;

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
      await api('/workout/complete', {
        method: 'POST',
        body: JSON.stringify({
          dayName: day.day,
          exercises: visibleExercises,
          durationMinutes: duration,
        }),
      });
      setMessage(`"${getDayName(day.day, lang)}" ${t.workoutSaved}`);
      setTimeout(() => setMessage(''), 3000);
      setCompletingDay(null);
      onComplete();
    } catch (err) {
      setMessage(t.errorSavingWorkout);
      setCompletingDay(null);
    }
  }

  function openYouTube(exerciseName) {
    const en = getEnglishName(exerciseName);
    const query = encodeURIComponent(en + ' exercise tutorial form');
    window.open(`https://www.youtube.com/results?search_query=${query}`, '_blank');
  }

  const isError = message === t.errorSavingWorkout;

  return (
    <>
      <div className="page-header">
        <h1>{t.workoutPlan}</h1>
        <p>
          {t.upperLowerSplit} | {profile?.workoutsPerWeek} {t.workoutsWeek} | {t.level}:{' '}
          {expLabels[profile?.experience] || ''}
        </p>
      </div>

      {/* Gym / Home toggle */}
      <div className="card" style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0' }}>
          <button
            onClick={() => setHomeMode(false)}
            style={{
              padding: '8px 20px',
              borderRadius: lang === 'he' ? '0 10px 10px 0' : '10px 0 0 10px',
              border: '1.5px solid var(--primary-light)',
              borderLeft: lang === 'he' ? '1.5px solid var(--primary-light)' : undefined,
              borderRight: lang === 'he' ? undefined : '1.5px solid var(--primary-light)',
              background: !homeMode ? 'rgba(108, 92, 231, 0.2)' : 'transparent',
              color: !homeMode ? 'var(--primary-light)' : 'var(--text-muted)',
              fontWeight: !homeMode ? 700 : 400,
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {t.gymWorkout}
          </button>
          <button
            onClick={() => setHomeMode(true)}
            style={{
              padding: '8px 20px',
              borderRadius: lang === 'he' ? '10px 0 0 10px' : '0 10px 10px 0',
              border: '1.5px solid var(--primary-light)',
              background: homeMode ? 'rgba(108, 92, 231, 0.2)' : 'transparent',
              color: homeMode ? 'var(--primary-light)' : 'var(--text-muted)',
              fontWeight: homeMode ? 700 : 400,
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {t.homeWorkout}
          </button>
        </div>
      </div>

      {alreadyTrainedToday && !message && (
        <div className="card" style={{
          background: 'rgba(108, 92, 231, 0.08)',
          borderColor: 'rgba(108, 92, 231, 0.2)',
          textAlign: 'center',
          fontSize: '14px',
          color: 'var(--primary-light)',
        }}>
          {t.alreadyTrainedToday}
        </div>
      )}

      {message && (
        <div
          className="card"
          style={{
            background: isError ? 'rgba(255,107,107,0.1)' : 'rgba(0,184,148,0.1)',
            borderColor: isError ? 'rgba(255,107,107,0.3)' : 'rgba(0,184,148,0.3)',
            color: isError ? 'var(--danger)' : 'var(--success)',
            textAlign: 'center',
            fontWeight: 600,
          }}
        >
          {message}
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
                    onClick={() => !alreadyTrainedToday && setCompletingDay(day.day)}
                    disabled={alreadyTrainedToday}
                    title={alreadyTrainedToday ? t.alreadyTrainedToday : ''}
                    style={alreadyTrainedToday ? { opacity: 0.4, cursor: 'not-allowed' } : {}}
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
                  <div
                    key={exIdx}
                    className="exercise-item"
                    onClick={() => setSelectedExercise(ex)}
                    style={{ cursor: 'pointer', transition: 'background 0.15s' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(108, 92, 231, 0.05)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = ''}
                  >
                    <span className="exercise-name">
                      {getExerciseName(ex.name, lang)}
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

            <button
              className="btn btn-accent"
              onClick={() => openYouTube(selectedExercise.name)}
              style={{ width: '100%', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              ▶ {t.watchTutorial}
            </button>

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
