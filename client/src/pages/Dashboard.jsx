import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';
import WorkoutPlan from '../components/WorkoutPlan';
import NutritionTracker from '../components/NutritionTracker';
import Progress from '../components/Progress';

export default function Dashboard() {
  const { user, logout, api } = useAuth();
  const { t } = useLang();
  const [activeTab, setActiveTab] = useState('overview');
  const [profileData, setProfileData] = useState(null);
  const [todayNutrition, setTodayNutrition] = useState(null);
  const [workoutHistory, setWorkoutHistory] = useState(null);
  const [loading, setLoading] = useState(true);

  const tabs = [
    { id: 'overview', label: t.tabOverview, icon: '📊' },
    { id: 'workout', label: t.tabWorkout, icon: '🏋️' },
    { id: 'nutrition', label: t.tabNutrition, icon: '🍽️' },
    { id: 'progress', label: t.tabProgress, icon: '📈' },
    { id: 'settings', label: t.tabSettings, icon: '⚙️' },
  ];

  const goalLabels = {
    bulk: t.goalBulk,
    cut: t.goalCut,
    maintain: t.goalMaintain,
  };

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [profile, nutrition, workouts] = await Promise.all([
        api('/user/profile'),
        api('/nutrition/today'),
        api('/workout/history'),
      ]);
      setProfileData(profile);
      setTodayNutrition(nutrition);
      setWorkoutHistory(workouts);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
      </div>
    );
  }

  const nutrition = profileData?.nutrition;
  const goalLabel = goalLabels[profileData?.profile?.goal] || '';

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h2>{t.appName}</h2>
        </div>
        <nav className="sidebar-nav">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={activeTab === tab.id ? 'active' : ''}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="nav-icon">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button className="btn btn-danger btn-sm" onClick={logout} style={{ width: '100%' }}>
            {t.logout}
          </button>
        </div>
      </aside>

      <main className="main-content">
        {activeTab === 'overview' && (
          <OverviewTab
            profile={profileData?.profile}
            nutrition={nutrition}
            todayNutrition={todayNutrition}
            workoutHistory={workoutHistory}
            goalLabel={goalLabel}
          />
        )}

        {activeTab === 'workout' && (
          <WorkoutPlan
            plan={profileData?.workoutPlan}
            profile={profileData?.profile}
            api={api}
            onComplete={loadData}
          />
        )}

        {activeTab === 'nutrition' && (
          <NutritionTracker
            targets={nutrition}
            todayData={todayNutrition}
            api={api}
            onUpdate={loadData}
          />
        )}

        {activeTab === 'progress' && (
          <Progress
            nutrition={nutrition}
            todayNutrition={todayNutrition}
            workoutHistory={workoutHistory}
            profile={profileData?.profile}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsTab
            profile={profileData?.profile}
            api={api}
            onUpdate={loadData}
          />
        )}
      </main>

      <nav className="mobile-nav">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={activeTab === tab.id ? 'active' : ''}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="nav-icon">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
}

function OverviewTab({ profile, nutrition, todayNutrition, workoutHistory, goalLabel }) {
  const { t, lang } = useLang();
  const [openTip, setOpenTip] = useState(null);
  const calorieProgress = todayNutrition?.totalCalories || 0;
  const calorieTarget = nutrition?.calorieTarget || 2000;
  const proteinProgress = todayNutrition?.totalProtein || 0;
  const proteinTarget = nutrition?.macros?.protein || 150;
  const streak = workoutHistory?.streak || 0;
  const fiberProgress = todayNutrition?.totalFiber || 0;
  const fiberTarget = nutrition?.macros?.fiberTarget || 30;

  // Calculate today's calories burned from workouts
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayBurned = (workoutHistory?.workouts || [])
    .filter(w => new Date(w.date) >= today)
    .reduce((sum, w) => sum + (w.caloriesBurned || 0), 0);

  return (
    <>
      <div className="page-header">
        <h1>{t.hello}</h1>
        <p>
          {t.goal}: {goalLabel} | {t.weight}: {profile?.weight} {t.kg} | {profile?.workoutsPerWeek} {t.workoutsWeek}
        </p>
      </div>

      <div className="stats-grid">
        <div className="stat-card calories">
          <div className="stat-icon">🔥</div>
          <div className="stat-value">
            {calorieProgress}/{calorieTarget}
          </div>
          <div className="stat-label">{t.caloriesToday}</div>
        </div>

        <div className="stat-card protein">
          <div className="stat-icon">🥩</div>
          <div className="stat-value">
            {proteinProgress}/{proteinTarget} {t.grams}
          </div>
          <div className="stat-label">{t.proteinToday}</div>
        </div>

        <div className="stat-card streak">
          <div className="stat-icon">🔥</div>
          <div className="stat-value">{streak}</div>
          <div className="stat-label">{t.workoutStreak}</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">⚡</div>
          <div className="stat-value">{todayBurned}</div>
          <div className="stat-label">{t.burnedToday}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>{t.dailyProgress}</h3>
        </div>

        {[
          { label: t.calories, current: calorieProgress, target: calorieTarget, unit: t.caloriesWord, cls: 'calories' },
          { label: t.protein, current: proteinProgress, target: proteinTarget, unit: t.grams, cls: 'protein' },
          { label: t.carbs, current: todayNutrition?.totalCarbs || 0, target: nutrition?.macros?.carbs || 0, unit: t.grams, cls: 'carbs' },
          { label: t.fat, current: todayNutrition?.totalFat || 0, target: nutrition?.macros?.fat || 0, unit: t.grams, cls: 'fat' },
          { label: t.fiber, current: fiberProgress, target: fiberTarget, unit: t.grams, cls: 'protein' },
        ].map((item) => (
          <div className="progress-container" key={item.label}>
            <div className="progress-label">
              <span>{item.label}</span>
              <span>
                {item.current} / {item.target} {item.unit}
              </span>
            </div>
            <div className="progress-bar">
              <div
                className={`progress-fill ${item.cls}`}
                style={{ width: `${Math.min(100, (item.current / (item.target || 1)) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header">
          <h3>{t.yourNutritionTargets}</h3>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[
            { label: t.calories, value: nutrition?.calorieTarget || 0, unit: t.caloriesWord, color: 'var(--warning)', tip: t.tipCalories },
            { label: t.protein, value: nutrition?.macros?.protein || 0, unit: t.grams, color: 'var(--accent)', tip: t.tipProtein },
            { label: t.carbs, value: nutrition?.macros?.carbs || 0, unit: t.grams, color: 'var(--primary-light)', tip: t.tipCarbs },
            { label: t.fat, value: nutrition?.macros?.fat || 0, unit: t.grams, color: 'var(--danger)', tip: t.tipFat },
            { label: t.fiber, value: nutrition?.macros?.fiberTarget || 30, unit: t.grams, color: 'var(--success)', tip: t.tipFiber },
          ].map((item) => (
            <div key={item.label} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px 14px',
              background: 'rgba(255,255,255,0.03)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
            }}>
              <span style={{ fontSize: '14px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', position: 'relative' }}>
                {item.label}
                <span
                  onClick={(e) => { e.stopPropagation(); setOpenTip(openTip === item.label ? null : item.label); }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    background: openTip === item.label ? 'rgba(108, 92, 231, 0.2)' : 'rgba(255,255,255,0.08)',
                    border: openTip === item.label ? '1px solid var(--primary-light)' : '1px solid var(--border)',
                    fontSize: '10px',
                    color: openTip === item.label ? 'var(--primary-light)' : 'var(--text-muted)',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >?</span>
                {openTip === item.label && (
                  <span style={{
                    position: 'absolute',
                    top: '100%',
                    [lang === 'he' ? 'right' : 'left']: 0,
                    marginTop: '6px',
                    padding: '8px 12px',
                    background: 'var(--bg-card, #1e1e2e)',
                    border: '1px solid var(--primary-light)',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: 'var(--text-secondary)',
                    whiteSpace: 'nowrap',
                    zIndex: 10,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                  }}>
                    {item.tip}
                  </span>
                )}
              </span>
              <span style={{ fontSize: '16px', fontWeight: 700, color: item.color }}>
                {item.value} {item.unit}
              </span>
            </div>
          ))}
        </div>

        {nutrition?.macros?.proteinPerMeal && (
          <div style={{
            marginTop: '14px',
            padding: '10px 14px',
            background: 'rgba(0, 206, 201, 0.08)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid rgba(0, 206, 201, 0.2)',
            fontSize: '13px',
            color: 'var(--text-secondary)',
          }}>
            {t.proteinTip} ~{nutrition.macros.proteinPerMeal} {t.grams} {t.proteinPerMealText}
          </div>
        )}
      </div>
    </>
  );
}

function SettingsTab({ profile, api, onUpdate }) {
  const { t, lang, setLanguage } = useLang();
  const [weight, setWeight] = useState(profile?.weight || '');
  const [height, setHeight] = useState(profile?.height || '');
  const [goal, setGoal] = useState(profile?.goal || '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function handleSave(e) {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      await api('/user/profile', {
        method: 'PUT',
        body: JSON.stringify({
          weight: parseFloat(weight),
          height: parseFloat(height),
          goal,
        }),
      });
      setMessage(t.profileUpdated);
      setTimeout(() => setMessage(''), 3000);
      onUpdate();
    } catch (err) {
      setMessage(t.errorUpdating);
    } finally {
      setLoading(false);
    }
  }

  const isError = message === t.errorUpdating;

  return (
    <>
      <div className="page-header">
        <h1>{t.settings}</h1>
        <p>{t.settingsSubtitle}</p>
      </div>

      {/* Language toggle */}
      <div className="card">
        <div className="card-header">
          <h3>{t.language}</h3>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            { value: 'he', label: t.hebrew },
            { value: 'en', label: t.english },
          ].map((l) => (
            <div
              key={l.value}
              onClick={() => setLanguage(l.value)}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: 'var(--radius-sm)',
                border: `2px solid ${lang === l.value ? 'var(--accent)' : 'var(--border)'}`,
                background: lang === l.value ? 'rgba(0, 206, 201, 0.08)' : 'var(--bg-input)',
                cursor: 'pointer',
                textAlign: 'center',
                fontSize: '14px',
                fontWeight: lang === l.value ? 600 : 400,
                color: lang === l.value ? 'var(--accent)' : 'var(--text-secondary)',
                transition: 'all 0.2s',
              }}
            >
              {l.label}
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>{t.updateProfile}</h3>
        </div>

        <form onSubmit={handleSave}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                {t.weightLabel}
              </label>
              <input
                type="number"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                min="30"
                max="300"
                step="0.1"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  fontSize: '16px',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                {t.heightLabel}
              </label>
              <input
                type="number"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                min="100"
                max="250"
                step="0.1"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  fontSize: '16px',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                {t.goalLabel}
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {[
                  { value: 'bulk', icon: '💪', label: t.goalBulk },
                  { value: 'cut', icon: '🔥', label: t.goalCut },
                  { value: 'maintain', icon: '⚖️', label: t.goalMaintain },
                ].map((g) => (
                  <div
                    key={g.value}
                    onClick={() => setGoal(g.value)}
                    style={{
                      padding: '12px',
                      borderRadius: 'var(--radius-sm)',
                      border: `2px solid ${goal === g.value ? 'var(--accent)' : 'var(--border)'}`,
                      background: goal === g.value ? 'rgba(0, 206, 201, 0.08)' : 'var(--bg-input)',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ fontSize: '20px', marginBottom: '4px' }}>{g.icon}</div>
                    <div style={{ fontSize: '13px', color: goal === g.value ? 'var(--accent)' : 'var(--text-secondary)' }}>
                      {g.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-accent"
              disabled={loading}
              style={{ marginTop: '8px' }}
            >
              {loading ? t.saving : t.saveChanges}
            </button>
          </div>
        </form>

        {message && (
          <div
            style={{
              marginTop: '12px',
              padding: '10px 16px',
              borderRadius: 'var(--radius-sm)',
              background: isError
                ? 'rgba(255,107,107,0.1)'
                : 'rgba(0,184,148,0.1)',
              color: isError ? 'var(--danger)' : 'var(--success)',
              fontSize: '14px',
              textAlign: 'center',
            }}
          >
            {message}
          </div>
        )}
      </div>

      <div
        className="card"
        style={{
          background: 'rgba(0, 206, 201, 0.05)',
          borderColor: 'rgba(0, 206, 201, 0.2)',
        }}
      >
        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          {t.settingsNote}
        </div>
      </div>
    </>
  );
}
