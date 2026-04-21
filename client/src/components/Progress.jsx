import { useState } from 'react';
import { useLang } from '../context/LanguageContext';

function getDayName(day, lang) {
  if (lang === 'he' || !day) return day;
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

export default function Progress({ nutrition, todayNutrition, workoutHistory, profile, api, onUpdate }) {
  const { t, lang } = useLang();
  const [deletingId, setDeletingId] = useState(null);
  const [deleteMsg, setDeleteMsg] = useState('');
  const streak = workoutHistory?.streak || 0;
  const workouts = workoutHistory?.workouts || [];
  const totalWorkouts = workouts.length;

  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const thisWeekWorkouts = workouts.filter((w) => new Date(w.date) >= weekAgo);
  const thisWeekCaloriesBurned = thisWeekWorkouts.reduce(
    (sum, w) => sum + (w.caloriesBurned || 0),
    0
  );

  const calorieTarget = nutrition?.calorieTarget || 2000;
  const proteinTarget = nutrition?.macros?.protein || 150;
  const fiberTarget = nutrition?.macros?.fiberTarget || 30;
  const goalLabel = {
    bulk: t.goalBulk,
    cut: t.goalCut,
    maintain: t.goalMaintain,
  }[profile?.goal] || '';

  return (
    <>
      <div className="page-header">
        <h1>{t.progress}</h1>
        <p>{t.trackProgress} {goalLabel}</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card streak">
          <div className="stat-icon">🔥</div>
          <div className="stat-value">{streak}</div>
          <div className="stat-label">{t.streakDays}</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🏋️</div>
          <div className="stat-value">{totalWorkouts}</div>
          <div className="stat-label">{t.totalWorkouts}</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📅</div>
          <div className="stat-value">{thisWeekWorkouts.length}</div>
          <div className="stat-label">{t.workoutsThisWeek}</div>
        </div>

        <div className="stat-card calories">
          <div className="stat-icon">⚡</div>
          <div className="stat-value">{thisWeekCaloriesBurned}</div>
          <div className="stat-label">{t.caloriesBurnedWeek}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>{t.calorieProgressToday}</h3>
        </div>
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ fontSize: '48px', fontWeight: '700', color: 'var(--warning)', marginBottom: '8px' }}>
            {todayNutrition?.totalCalories || 0}
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
            {t.outOf} {calorieTarget} {t.dailyCalories}
          </div>
          <div className="progress-bar" style={{ maxWidth: '400px', margin: '16px auto 0' }}>
            <div
              className="progress-fill calories"
              style={{
                width: `${Math.min(100, ((todayNutrition?.totalCalories || 0) / calorieTarget) * 100)}%`,
              }}
            />
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '8px' }}>
            {Math.max(0, calorieTarget - (todayNutrition?.totalCalories || 0))} {t.caloriesWord} {t.remaining}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>{t.proteinProgressToday}</h3>
          {nutrition?.macros?.proteinPerKg && (
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {nutrition.macros.proteinPerKg} {t.gramsPerKg}
            </span>
          )}
        </div>
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ fontSize: '48px', fontWeight: '700', color: 'var(--accent)', marginBottom: '8px' }}>
            {todayNutrition?.totalProtein || 0} {t.grams}
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
            {t.outOf} {proteinTarget} {t.grams} {t.dailyProtein}
          </div>
          <div className="progress-bar" style={{ maxWidth: '400px', margin: '16px auto 0' }}>
            <div
              className="progress-fill protein"
              style={{
                width: `${Math.min(100, ((todayNutrition?.totalProtein || 0) / proteinTarget) * 100)}%`,
              }}
            />
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '8px' }}>
            {Math.max(0, proteinTarget - (todayNutrition?.totalProtein || 0))} {t.gramsRemaining}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>{t.dietaryFiber}</h3>
        </div>
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ fontSize: '36px', fontWeight: '700', color: 'var(--success)', marginBottom: '8px' }}>
            {todayNutrition?.totalFiber || 0} {t.grams}
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
            {t.outOf} {fiberTarget} {t.dailyFiberTarget}
          </div>
          <div className="progress-bar" style={{ maxWidth: '400px', margin: '16px auto 0' }}>
            <div
              className="progress-fill protein"
              style={{
                width: `${Math.min(100, ((todayNutrition?.totalFiber || 0) / fiberTarget) * 100)}%`,
              }}
            />
          </div>
        </div>
      </div>

      {nutrition?.weeklyWeightTarget && (
        <div
          className="card"
          style={{
            background: nutrition.weeklyWeightTarget.direction === 'gain'
              ? 'rgba(108, 92, 231, 0.05)'
              : nutrition.weeklyWeightTarget.direction === 'stable'
              ? 'rgba(0, 206, 209, 0.05)'
              : 'rgba(253, 203, 110, 0.05)',
            borderColor: nutrition.weeklyWeightTarget.direction === 'gain'
              ? 'rgba(108, 92, 231, 0.2)'
              : nutrition.weeklyWeightTarget.direction === 'stable'
              ? 'rgba(0, 206, 209, 0.2)'
              : 'rgba(253, 203, 110, 0.2)',
          }}
        >
          <div className="card-header">
            <h3>{nutrition.weeklyWeightTarget.direction === 'gain' ? t.weightGainTarget
              : nutrition.weeklyWeightTarget.direction === 'stable' ? t.weightMaintain
              : t.weeklyLossTarget}</h3>
          </div>
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            {nutrition.weeklyWeightTarget.direction === 'gain' ? (
              <>
                <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--accent)' }}>
                  {nutrition.weeklyWeightTarget.monthlyMin} - {nutrition.weeklyWeightTarget.monthlyMax} {t.perMonth}
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '8px' }}>
                  ({nutrition.weeklyWeightTarget.min} - {nutrition.weeklyWeightTarget.max} {t.perWeek})
                  <br />{t.tooFastGain}
                </div>
              </>
            ) : nutrition.weeklyWeightTarget.direction === 'stable' ? (
              <>
                <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--success, #00cec9)' }}>
                  {t.stableWeight}
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '8px' }}>
                  ±{nutrition.weeklyWeightTarget.max} {t.normalRange}
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--warning)' }}>
                  {nutrition.weeklyWeightTarget.min} - {nutrition.weeklyWeightTarget.max} {t.perWeek}
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '8px' }}>
                  {t.weeklyLossRate}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {workouts.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3>{t.recentWorkouts}</h3>
          </div>
          {deleteMsg && (
            <div style={{
              padding: '8px 12px',
              marginBottom: '8px',
              borderRadius: '8px',
              background: deleteMsg === t.workoutDeleted ? 'rgba(0,184,148,0.1)' : 'rgba(255,107,107,0.1)',
              color: deleteMsg === t.workoutDeleted ? 'var(--success)' : 'var(--danger)',
              fontSize: '13px',
              textAlign: 'center',
            }}>
              {deleteMsg}
            </div>
          )}
          <div>
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
                    onClick={async () => {
                      setDeletingId(w._id);
                      try {
                        await api(`/workout/${w._id}`, { method: 'DELETE' });
                        setDeleteMsg(t.workoutDeleted);
                        setTimeout(() => setDeleteMsg(''), 3000);
                        onUpdate();
                      } catch {
                        setDeleteMsg(t.errorDeletingWorkout);
                        setTimeout(() => setDeleteMsg(''), 3000);
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
    </>
  );
}
