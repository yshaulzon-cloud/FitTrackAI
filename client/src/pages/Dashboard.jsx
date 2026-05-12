import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useLegal } from '../context/LegalContext';
import WorkoutPlan from '../components/WorkoutPlan';
import NutritionTracker from '../components/NutritionTracker';
import Progress from '../components/Progress';
import BMICard from '../components/BMICard';
import AdminPanel from '../components/AdminPanel';
import ProgressionPanel from '../components/ProgressionPanel';
import XPToast from '../components/XPToast';
import SleepTracker from '../components/SleepTracker';
import {
  applyWorkoutReminder,
  applyMealReminder,
  applyStreakReminder,
  applyWeeklyReport,
} from '../lib/notifications';

export default function Dashboard() {
  const { user, logout, api } = useAuth();
  const { t, lang } = useLang();
  const [activeTab, setActiveTab] = useState('overview');
  const [profileData, setProfileData] = useState(null);
  const [todayNutrition, setTodayNutrition] = useState(null);
  const [workoutHistory, setWorkoutHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [xpToast, setXpToast] = useState(null);

  const isAdmin = profileData?.isAdmin || false;
  const tabs = [
    { id: 'overview', label: t.tabOverview, icon: '📊' },
    { id: 'workout', label: t.tabWorkout, icon: '🏋️' },
    { id: 'nutrition', label: t.tabNutrition, icon: '🍽️' },
    { id: 'goals', label: t.tabGoals, icon: '🎯' },
    { id: 'xp', label: t.tabProgression, icon: '⚔️' },
    { id: 'progress', label: t.tabProgress, icon: '📈' },
    { id: 'settings', label: t.tabSettings, icon: '⚙️' },
    ...(isAdmin ? [{ id: 'admin', label: t.tabAdmin, icon: '🛡️' }] : []),
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

  function showXP(xpEvents) {
    if (!xpEvents) return;
    const events = Array.isArray(xpEvents) ? xpEvents : [xpEvents];
    const meaningful = events.filter(e => e && e.xpGained);
    if (meaningful.length > 0) {
      setXpToast(meaningful);
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
      {xpToast && <XPToast xpEvents={xpToast} onDone={() => setXpToast(null)} />}
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
          <div className="profile-chip" onClick={() => setActiveTab('settings')}>
            <div className="profile-chip__avatar">
              {(profileData?.name || '?').charAt(0).toUpperCase()}
            </div>
            <div className="profile-chip__info">
              <div className="profile-chip__name">{profileData?.name || (lang === 'he' ? 'משתמש' : 'User')}</div>
              <div className="profile-chip__sub">
                {goalLabel || (lang === 'he' ? 'הגדרות' : 'Settings')}
              </div>
            </div>
            <span style={{ color: 'var(--text-4)', fontSize: 14 }}>›</span>
          </div>
        </div>
      </aside>

      <main className="main-content">
        {activeTab === 'overview' && (
          <OverviewTab userName={profileData?.name}
            profile={profileData?.profile}
            nutrition={nutrition}
            todayNutrition={todayNutrition}
            workoutHistory={workoutHistory}
            goalLabel={goalLabel}
            updatedAt={profileData?.updatedAt}
            api={api}
            showXP={showXP}
            setActiveTab={setActiveTab}
          />
        )}

        {activeTab === 'workout' && (
          <WorkoutPlan
            plan={profileData?.workoutPlan}
            profile={profileData?.profile}
            api={api}
            onComplete={loadData}
            workoutHistory={workoutHistory}
            showXP={showXP}
          />
        )}

        {activeTab === 'nutrition' && (
          <NutritionTracker
            targets={nutrition}
            todayData={todayNutrition}
            api={api}
            onUpdate={loadData}
            showXP={showXP}
          />
        )}

        {activeTab === 'goals' && (
          <BMICard
            bmiAnalysis={profileData?.bmiAnalysis}
            profile={profileData?.profile}
            calorieTarget={nutrition?.calorieTarget}
            api={api}
            onUpdate={loadData}
          />
        )}

        {activeTab === 'xp' && (
          <ProgressionPanel api={api} />
        )}

        {activeTab === 'progress' && (
          <Progress
            nutrition={nutrition}
            todayNutrition={todayNutrition}
            workoutHistory={workoutHistory}
            profile={profileData?.profile}
            api={api}
          />
        )}

        {activeTab === 'admin' && isAdmin && (
          <AdminPanel api={api} />
        )}

        {activeTab === 'settings' && (
          <SettingsTab
            profile={profileData?.profile}
            userName={profileData?.name}
            nutrition={nutrition}
            api={api}
            onUpdate={loadData}
            logout={logout}
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

function MacroRing({ caloriePct }) {
  const r = 56;
  const c = 2 * Math.PI * r;
  const dash = (Math.min(caloriePct, 100) / 100) * c;
  return (
    <svg width="140" height="140" viewBox="0 0 140 140">
      <circle cx="70" cy="70" r={r} stroke="rgba(255,255,255,0.05)" strokeWidth="14" fill="none" />
      <circle
        cx="70" cy="70" r={r}
        stroke="url(#ringGrad)" strokeWidth="14" fill="none"
        strokeDasharray={`${dash} ${c}`}
        strokeDashoffset={c / 4}
        strokeLinecap="round"
        transform="rotate(-90 70 70)"
      />
      <defs>
        <linearGradient id="ringGrad" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#2dd4bf" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <text x="70" y="64" textAnchor="middle" fontFamily="Heebo" fontSize="26" fontWeight="800" fill="#f4f6fb">
        {Math.round(caloriePct)}%
      </text>
      <text x="70" y="86" textAnchor="middle" fontFamily="Assistant" fontSize="11" fill="#7e879d">
        מהיעד היומי
      </text>
    </svg>
  );
}

function MacroBar({ label, current, target, unit, color }) {
  const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
        <span style={{ color: 'var(--text-2)', fontWeight: 500 }}>{label}</span>
        <span style={{ color: 'var(--text-3)', fontVariantNumeric: 'tabular-nums' }}>
          {Math.round(current)}/{target}{unit}
        </span>
      </div>
      <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 99, transition: 'width 0.4s ease' }} />
      </div>
    </div>
  );
}

function QuickAction({ icon, label, sub, color, onClick }) {
  return (
    <button className="quick-action" onClick={onClick} type="button">
      <div className="quick-action__icon" style={{ background: `${color}1f`, color }}>
        {icon}
      </div>
      <div className="quick-action__body">
        <div className="quick-action__label">{label}</div>
        <div className="quick-action__sub">{sub}</div>
      </div>
      <span className="quick-action__arrow">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </span>
    </button>
  );
}

function getGreeting(lang) {
  const h = new Date().getHours();
  if (lang === 'he') {
    if (h < 5)  return 'לילה טוב';
    if (h < 12) return 'בוקר טוב';
    if (h < 17) return 'צהריים טובים';
    if (h < 21) return 'ערב טוב';
    return 'לילה טוב';
  } else {
    if (h < 5)  return 'Good night';
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    if (h < 21) return 'Good evening';
    return 'Good night';
  }
}

function formatDate(lang) {
  const d = new Date();
  if (lang === 'he') {
    const days = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
    const months = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
    return `${days[d.getDay()]}, ${d.getDate()} ב${months[d.getMonth()]}`;
  }
  return d.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' });
}

function OverviewTab({ profile, nutrition, todayNutrition, workoutHistory, userName, api, showXP, setActiveTab }) {
  const { t, lang } = useLang();
  const isHe = lang === 'he';

  const calorieProgress = todayNutrition?.totalCalories || 0;
  const calorieTarget = nutrition?.calorieTarget || 2000;
  const proteinProgress = todayNutrition?.totalProtein || 0;
  const proteinTarget = nutrition?.macros?.protein || 150;
  const carbsProgress = todayNutrition?.totalCarbs || 0;
  const carbsTarget = nutrition?.macros?.carbs || 250;
  const fatProgress = todayNutrition?.totalFat || 0;
  const fatTarget = nutrition?.macros?.fat || 65;
  const fiberProgress = todayNutrition?.totalFiber || 0;
  const fiberTarget = nutrition?.macros?.fiberTarget || 30;
  const streak = workoutHistory?.streak || 0;

  const caloriePct = calorieTarget > 0 ? (calorieProgress / calorieTarget) * 100 : 0;
  const proteinPct = proteinTarget > 0 ? (proteinProgress / proteinTarget) * 100 : 0;

  // Build the week view: 7 days, mark which had workouts
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dow = today.getDay(); // 0 = Sunday
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - dow);

  const workoutDates = new Set(
    (workoutHistory?.workouts || []).map(w => {
      const dt = new Date(w.date);
      dt.setHours(0, 0, 0, 0);
      return dt.getTime();
    })
  );

  const dayLabels = isHe ? ['א','ב','ג','ד','ה','ו','ש'] : ['S','M','T','W','T','F','S'];
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    const ts = d.getTime();
    let status;
    if (ts > today.getTime()) status = 'future';
    else if (ts === today.getTime()) status = 'today';
    else status = workoutDates.has(ts) ? 'full' : 'miss';
    return { label: dayLabels[i], status };
  });

  // Decide the "next step" content
  const proteinRemaining = Math.max(0, proteinTarget - proteinProgress);
  const calorieRemaining = Math.max(0, calorieTarget - calorieProgress);
  const hasLoggedToday = (todayNutrition?.meals || []).length > 0;

  let nextEyebrow, nextTitle, nextSub, nextCta, nextAction;
  if (!hasLoggedToday) {
    nextEyebrow = isHe ? 'הצעד הבא' : 'Next step';
    nextTitle = isHe
      ? `התחל את היום — ${calorieTarget.toLocaleString()} קלוריות ביעד`
      : `Start your day — ${calorieTarget.toLocaleString()} kcal target`;
    nextSub = isHe
      ? `${proteinTarget}g חלבון · ${carbsTarget}g פחמ' · ${fatTarget}g שומן. הוסף את הארוחה הראשונה.`
      : `${proteinTarget}g protein · ${carbsTarget}g carbs · ${fatTarget}g fat. Log your first meal.`;
    nextCta = isHe ? 'הוסף ארוחה' : 'Add meal';
    nextAction = () => setActiveTab && setActiveTab('nutrition');
  } else if (proteinRemaining > 30) {
    nextEyebrow = isHe ? 'הצעד הבא' : 'Next step';
    nextTitle = isHe
      ? `נותרו ${Math.round(proteinRemaining)}g חלבון להיעד`
      : `${Math.round(proteinRemaining)}g protein left to hit your goal`;
    nextSub = isHe
      ? 'שייק חלבון, יוגורט יווני או חזה עוף יסגרו את הפער.'
      : 'A protein shake, Greek yogurt, or chicken breast will close the gap.';
    nextCta = isHe ? 'הוסף ארוחה' : 'Add meal';
    nextAction = () => setActiveTab && setActiveTab('nutrition');
  } else {
    nextEyebrow = isHe ? 'הצעד הבא' : 'Next step';
    nextTitle = isHe
      ? `אימון של היום מחכה לך`
      : `Today's workout is waiting`;
    nextSub = isHe
      ? `${profile?.workoutsPerWeek || 4} אימונים השבוע. אל תפספס.`
      : `${profile?.workoutsPerWeek || 4} workouts this week. Don't miss it.`;
    nextCta = isHe ? 'התחל אימון' : 'Start workout';
    nextAction = () => setActiveTab && setActiveTab('workout');
  }

  // Insight card (data-driven)
  let insightBody;
  if (proteinProgress > 0 && proteinPct < 80) {
    insightBody = isHe ? (
      <>היום צרכת <strong>{Math.round(proteinProgress)}g חלבון</strong>. עוד שייק חלבון אחרי האימון יקרב אותך ל-{proteinTarget}g היעד.</>
    ) : (
      <>You've had <strong>{Math.round(proteinProgress)}g protein</strong> today. A post-workout shake gets you to your {proteinTarget}g target.</>
    );
  } else if (streak >= 3) {
    insightBody = isHe ? (
      <>אתה ב<strong>{streak} ימים ברצף</strong>. כל יום נוסף שומר על המומנטום שבנית.</>
    ) : (
      <>You're on a <strong>{streak}-day streak</strong>. Each day keeps the momentum going.</>
    );
  } else {
    insightBody = isHe ? (
      <>הקפד על <strong>~{nutrition?.macros?.proteinPerMeal || 38}g חלבון לארוחה</strong> ב-{nutrition?.macros?.mealsPerDay || 4} ארוחות — זה ממקסם בניית שריר.</>
    ) : (
      <>Aim for <strong>~{nutrition?.macros?.proteinPerMeal || 38}g protein per meal</strong> across {nutrition?.macros?.mealsPerDay || 4} meals — maximizes muscle building.</>
    );
  }

  const fullDays = week.filter(d => d.status === 'full').length;

  return (
    <>
      {/* Greeting bar */}
      <div className="greeting-bar">
        <div>
          <h1 className="greeting-bar__title">
            {getGreeting(lang)}{userName ? `, ${userName}` : ''}
          </h1>
          <div className="greeting-bar__meta">
            <span>{formatDate(lang)}</span>
            {streak > 0 && (
              <span className="streak-pill">
                🔥 {isHe ? `יום ${streak} ברצף` : `Day ${streak} streak`}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Hero "Next step" card */}
      <div className="next-step">
        <div>
          <div className="next-step__eyebrow">{nextEyebrow}</div>
          <div className="next-step__title">{nextTitle}</div>
          <div className="next-step__sub">{nextSub}</div>
        </div>
        <button className="next-step__cta" onClick={nextAction}>
          {nextCta}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </button>
      </div>

      {/* Macro card + Streak calendar */}
      <div className="dashboard-grid-2">
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <h3>{isHe ? 'תזונה היום' : 'Nutrition today'}</h3>
            <span style={{ fontSize: 12, color: 'var(--text-3)', fontVariantNumeric: 'tabular-nums' }}>
              {Math.round(calorieProgress).toLocaleString()} / {calorieTarget.toLocaleString()} {t.kcal}
            </span>
          </div>
          <div className="macro-card-flex">
            <MacroRing caloriePct={caloriePct} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <MacroBar label={t.protein} current={proteinProgress} target={proteinTarget} unit="g" color="var(--c-protein)" />
              <MacroBar label={t.carbs}   current={carbsProgress}   target={carbsTarget}   unit="g" color="var(--c-carbs)" />
              <MacroBar label={t.fat}     current={fatProgress}     target={fatTarget}     unit="g" color="var(--c-fat)" />
              <MacroBar label={t.fiber}   current={fiberProgress}   target={fiberTarget}   unit="g" color="var(--c-fiber)" />
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <h3>{isHe ? 'השבוע שלך' : 'Your week'}</h3>
            {streak > 0 && (
              <span style={{ fontSize: 12, color: 'var(--warning)', fontWeight: 600 }}>
                🔥 {isHe ? `${streak} ימים ברצף` : `${streak}-day streak`}
              </span>
            )}
          </div>
          <div className="streak-week">
            {week.map((day, i) => (
              <div key={i} className="streak-day">
                <div className="streak-day__label">{day.label}</div>
                <div className={`streak-day__cell streak-day__cell--${day.status}`}>
                  {day.status === 'full' ? '✓' : day.status === 'today' ? '•' : ''}
                </div>
              </div>
            ))}
          </div>
          <div className="streak-footer">
            {fullDays >= 7 ? (
              isHe ? <>שבוע מושלם! <strong>+250 XP</strong> לדרך.</> : <>Perfect week! <strong>+250 XP</strong> earned.</>
            ) : (
              isHe ? (
                <>עוד <strong>{Math.max(0, (profile?.workoutsPerWeek || 4) - fullDays)} אימונים</strong> כדי להגיע ליעד השבועי.</>
              ) : (
                <>Need <strong>{Math.max(0, (profile?.workoutsPerWeek || 4) - fullDays)} more workouts</strong> to hit this week's goal.</>
              )
            )}
          </div>
        </div>
      </div>

      {/* Insight card */}
      <div className="insight-card">
        <div className="insight-card__icon">💡</div>
        <div style={{ flex: 1 }}>
          <div className="insight-card__eyebrow">
            {isHe ? 'תובנת היום' : 'Today\'s insight'}
          </div>
          <div className="insight-card__body">{insightBody}</div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="quick-actions">
        <QuickAction
          icon="🍽"
          label={isHe ? 'הוסף ארוחה' : 'Log meal'}
          sub={isHe ? 'בחר מהתפריט שלך' : 'From your menu'}
          color="#2dd4bf"
          onClick={() => setActiveTab && setActiveTab('nutrition')}
        />
        <QuickAction
          icon="🏋"
          label={isHe ? 'התחל אימון' : 'Start workout'}
          sub={`${profile?.workoutsPerWeek || 4} ${isHe ? 'אימונים השבוע' : 'workouts/week'}`}
          color="#f59e0b"
          onClick={() => setActiveTab && setActiveTab('workout')}
        />
        <QuickAction
          icon="📈"
          label={isHe ? 'התקדמות' : 'Progress'}
          sub={isHe ? 'גרפים ושינויים' : 'Charts & changes'}
          color="#8b5cf6"
          onClick={() => setActiveTab && setActiveTab('progress')}
        />
      </div>

      {/* Sleep tracker — keep below for now (existing component) */}
      <div style={{ marginTop: 16 }}>
        <SleepTracker api={api} showXP={showXP} />
      </div>
    </>
  );
}

function SettingsTab({ profile, nutrition, api, onUpdate, logout, userName }) {
  const { t, lang, setLanguage } = useLang();
  const { theme, setTheme } = useTheme();
  const { openPrivacy, openTerms } = useLegal();
  const { user } = useAuth();
  const isHe = lang === 'he';

  const [section, setSection] = useState('body');
  const [weight, setWeight] = useState(profile?.weight || '');
  const [height, setHeight] = useState(profile?.height || '');
  const [goal, setGoal] = useState(profile?.goal || '');
  const [gender, setGender] = useState(profile?.gender || 'male');
  const [workoutsPerWeek, setWorkoutsPerWeek] = useState(profile?.workoutsPerWeek || 3);

  // Account editable fields
  const [name, setName] = useState(userName || '');
  const [age, setAge]   = useState(profile?.age || '');

  // Notification toggles — persisted to localStorage
  const loadNotifPref = (key, defaultVal) => {
    const v = localStorage.getItem(`notif:${key}`);
    return v === null ? defaultVal : v === '1';
  };
  const [notifWorkout, setNotifWorkoutState] = useState(() => loadNotifPref('workout', true));
  const [notifMeal,    setNotifMealState]    = useState(() => loadNotifPref('meal',    true));
  const [notifStreak,  setNotifStreakState]  = useState(() => loadNotifPref('streak',  true));
  const [notifWeekly,  setNotifWeeklyState]  = useState(() => loadNotifPref('weekly',  false));
  const persist = (key, setter, applyFn) => (val) => {
    localStorage.setItem(`notif:${key}`, val ? '1' : '0');
    setter(val);
    if (applyFn) applyFn(val, lang === 'he').catch(() => {});
  };
  const setNotifWorkout = persist('workout', setNotifWorkoutState, applyWorkoutReminder);
  const setNotifMeal    = persist('meal',    setNotifMealState,    applyMealReminder);
  const setNotifStreak  = persist('streak',  setNotifStreakState,  applyStreakReminder);
  const setNotifWeekly  = persist('weekly',  setNotifWeeklyState,  applyWeeklyReport);

  // On native startup, ensure scheduled notifications match the saved prefs.
  // Runs once on mount; on web, the helpers are no-ops.
  useEffect(() => {
    const isHe = lang === 'he';
    applyWorkoutReminder(notifWorkout, isHe).catch(() => {});
    applyMealReminder(notifMeal, isHe).catch(() => {});
    applyStreakReminder(notifStreak, isHe).catch(() => {});
    applyWeeklyReport(notifWeekly, isHe).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const [confirmingReset,  setConfirmingReset]  = useState(false);
  const [resetText, setResetText] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteText, setDeleteText] = useState('');
  const [dangerLoading, setDangerLoading] = useState(false);
  const [dangerMessage, setDangerMessage] = useState('');

  // ─── Password reset flow (in-app) ────────────────────────
  // Reuses the existing /auth/forgot-password + /auth/reset-password
  // endpoints. The user is signed in, so we already know their email.
  const [pwStep, setPwStep] = useState('idle'); // idle | code-sent | done
  const [pwCode, setPwCode] = useState('');
  const [pwNew,  setPwNew]  = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMessage, setPwMessage] = useState('');
  const [pwError,   setPwError]   = useState('');

  async function handleSendPasswordCode() {
    if (!user?.email) {
      setPwError(isHe ? 'לא נמצאה כתובת אימייל' : 'No email on file');
      return;
    }
    setPwLoading(true);
    setPwError('');
    setPwMessage('');
    try {
      // forgot-password is a public endpoint; api() adds an Authorization
      // header but the server ignores it for unauthenticated routes.
      const res = await api('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: user.email }),
      });
      setPwMessage(t.codeSent || (isHe ? 'קוד נשלח לאימייל שלך' : 'Code sent to your email'));
      setPwStep('code-sent');
    } catch (err) {
      setPwError(err.message || (isHe ? 'שגיאה בשליחת הקוד' : 'Failed to send code'));
    } finally {
      setPwLoading(false);
    }
  }

  async function handleConfirmPasswordReset() {
    if (pwCode.length < 6) {
      setPwError(isHe ? 'הקוד חייב 6 ספרות' : 'Code must be 6 digits');
      return;
    }
    if (pwNew.length < 6) {
      setPwError(t.passwordMin || (isHe ? 'הסיסמה חייבת 6 תווים לפחות' : 'Password must be at least 6 characters'));
      return;
    }
    setPwLoading(true);
    setPwError('');
    try {
      await api('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          email: user.email,
          code: pwCode.trim(),
          newPassword: pwNew,
        }),
      });
      setPwStep('done');
      setPwMessage(t.passwordResetSuccess || (isHe ? 'הסיסמה שונתה בהצלחה' : 'Password changed successfully'));
      setPwCode('');
      setPwNew('');
      // Auto-collapse after a moment
      setTimeout(() => { setPwStep('idle'); setPwMessage(''); }, 4000);
    } catch (err) {
      setPwError(err.message || (isHe ? 'שגיאה באיפוס הסיסמה' : 'Reset failed'));
    } finally {
      setPwLoading(false);
    }
  }

  function cancelPasswordReset() {
    setPwStep('idle');
    setPwCode('');
    setPwNew('');
    setPwError('');
    setPwMessage('');
  }

  // ─── Live preview: how do current changes affect calorie target? ──
  // Mifflin-St Jeor (rough), then activity factor + goal adjustment.
  // Replicates the server-side formula closely enough for a preview.
  const liveCalories = useMemo(() => {
    const w = parseFloat(weight) || 0;
    const h = parseFloat(height) || 0;
    const a = profile?.age || 30;
    if (!w || !h) return null;

    const bmr = gender === 'female'
      ? 10 * w + 6.25 * h - 5 * a - 161
      : 10 * w + 6.25 * h - 5 * a + 5;

    const activityFactor = 1.2 + 0.1 * (parseInt(workoutsPerWeek) || 0);
    const tdee = bmr * activityFactor;

    let target = tdee;
    if (goal === 'cut') target = tdee - 500;
    else if (goal === 'bulk') target = tdee + 350;

    return Math.round(target / 10) * 10;
  }, [weight, height, gender, workoutsPerWeek, goal, profile?.age]);

  const currentCalories = nutrition?.calorieTarget;
  const calorieDelta = (liveCalories != null && currentCalories) ? liveCalories - currentCalories : 0;
  const hasUnsavedChanges = (
    parseFloat(weight) !== profile?.weight ||
    parseFloat(height) !== profile?.height ||
    goal !== profile?.goal ||
    gender !== profile?.gender ||
    parseInt(workoutsPerWeek) !== profile?.workoutsPerWeek
  );

  async function handleSave(e) {
    if (e) e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      await api('/user/profile', {
        method: 'PUT',
        body: JSON.stringify({
          weight: parseFloat(weight),
          height: parseFloat(height),
          goal,
          gender,
          workoutsPerWeek: parseInt(workoutsPerWeek),
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

  async function handleSaveAccount() {
    setLoading(true);
    setMessage('');
    try {
      const payload = {};
      if (name && name.trim() !== userName) payload.name = name.trim();
      if (age && parseInt(age) !== profile?.age) payload.age = parseInt(age);
      if (Object.keys(payload).length === 0) return;

      await api('/user/profile', { method: 'PUT', body: JSON.stringify(payload) });
      setMessage(t.profileUpdated);
      setTimeout(() => setMessage(''), 3000);
      onUpdate();
    } catch (err) {
      setMessage(err.message || t.errorUpdating);
    } finally {
      setLoading(false);
    }
  }

  async function handleResetData() {
    setDangerLoading(true);
    setDangerMessage('');
    try {
      await api('/user/reset-data', { method: 'POST' });
      setDangerMessage(isHe ? 'הנתונים אופסו. טוען מחדש…' : 'Data reset. Reloading…');
      setConfirmingReset(false);
      setResetText('');
      setTimeout(() => window.location.reload(), 1200);
    } catch (err) {
      setDangerMessage(err.message || (isHe ? 'שגיאה באיפוס' : 'Reset failed'));
    } finally {
      setDangerLoading(false);
    }
  }

  async function handleDeleteAccount() {
    setDangerLoading(true);
    setDangerMessage('');
    try {
      await api('/user/account', {
        method: 'DELETE',
        body: JSON.stringify({ confirm: 'DELETE' }),
      });
      // Account is gone — clear session and bounce to login
      logout && logout();
    } catch (err) {
      setDangerMessage(err.message || (isHe ? 'שגיאה במחיקה' : 'Delete failed'));
      setDangerLoading(false);
    }
  }

  const isError = message === t.errorUpdating;
  const accountDirty = (name && name.trim() !== (userName || '')) || (age && parseInt(age) !== profile?.age);

  // ─── Section nav config ──────────────────────────────────
  const sections = [
    { id: 'body',    icon: '🧍', label: isHe ? 'נתוני גוף' : 'Body data' },
    { id: 'goal',    icon: '🎯', label: isHe ? 'מטרה'      : 'Goal' },
    { id: 'notif',   icon: '🔔', label: isHe ? 'התראות'   : 'Notifications' },
    { id: 'display', icon: '🎨', label: isHe ? 'תצוגה'    : 'Display' },
    { id: 'account', icon: '👤', label: isHe ? 'חשבון'    : 'Account' },
    { id: 'privacy', icon: '🔒', label: isHe ? 'פרטיות'   : 'Privacy' },
  ];

  // Reusable inline styles for choice cards in this redesign
  const optionStyle = (active) => ({
    padding: '12px',
    borderRadius: 'var(--r-md)',
    border: `1.5px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
    background: active ? 'var(--accent-glow)' : 'var(--bg-input)',
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'all 0.15s',
    color: active ? 'var(--accent)' : 'var(--text-2)',
    fontWeight: active ? 600 : 500,
    fontSize: 13,
  });

  const inputStyle = {
    width: '100%',
    padding: '12px 14px',
    background: 'var(--bg-input)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--r-md)',
    color: 'var(--text-1)',
    fontSize: 15,
    outline: 'none',
    transition: 'border-color 0.15s',
  };

  // ─── Toggle row helper for notifications ───────────────
  function ToggleRow({ label, sub, value, onChange }) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 0',
        borderBottom: '1px solid var(--border-subtle)',
      }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-1)' }}>{label}</div>
          {sub && <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{sub}</div>}
        </div>
        <button
          type="button"
          onClick={() => onChange(!value)}
          style={{
            width: 44, height: 24,
            borderRadius: 99,
            background: value ? 'var(--accent)' : 'var(--border-strong)',
            border: 'none',
            position: 'relative',
            cursor: 'pointer',
            transition: 'background 0.2s',
            flexShrink: 0,
          }}
          aria-pressed={value}
        >
          <span style={{
            position: 'absolute',
            top: 2,
            insetInlineStart: value ? 22 : 2,
            width: 20, height: 20,
            borderRadius: '50%',
            background: value ? 'var(--bg-0)' : 'var(--text-3)',
            transition: 'inset-inline-start 0.2s',
          }} />
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <h1>{t.settings}</h1>
        <p>{t.settingsSubtitle}</p>
      </div>

      <div className="settings-layout">
        {/* ── Internal side-nav ────────────────────────────── */}
        <aside className="settings-nav">
          {sections.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`settings-nav__item${section === s.id ? ' settings-nav__item--active' : ''}`}
              onClick={() => setSection(s.id)}
            >
              <span className="settings-nav__icon">{s.icon}</span>
              <span>{s.label}</span>
            </button>
          ))}
        </aside>

        {/* ── Section content ──────────────────────────────── */}
        <div>
          {/* ─── Body data ─────────────────────────────────── */}
          {section === 'body' && (
            <div className="settings-category-card">
              <div className="settings-category-card__header">
                <h3 className="settings-category-card__title">
                  {isHe ? 'נתוני גוף' : 'Body data'}
                </h3>
                <div className="settings-category-card__sub">
                  {isHe ? 'משקל וגובה משפיעים ישירות על יעד הקלוריות שלך.' : 'Weight and height directly drive your calorie target.'}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label className="field-label">{t.weightLabel}</label>
                  <input
                    type="number"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    min="30" max="300" step="0.1"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label className="field-label">{t.heightLabel}</label>
                  <input
                    type="number"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    min="100" max="250" step="0.1"
                    style={inputStyle}
                  />
                </div>
              </div>

              <label className="field-label">{t.genderLabel}</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                {[
                  { value: 'male',   icon: '👨', label: t.male },
                  { value: 'female', icon: '👩', label: t.female },
                ].map(g => (
                  <div key={g.value} onClick={() => setGender(g.value)} style={optionStyle(gender === g.value)}>
                    <div style={{ fontSize: 18, marginBottom: 2 }}>{g.icon}</div>
                    <div>{g.label}</div>
                  </div>
                ))}
              </div>

              <label className="field-label">{t.workoutsPerWeek}</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6, marginBottom: 4 }}>
                {[1, 2, 3, 4, 5, 6].map(n => (
                  <div key={n} onClick={() => setWorkoutsPerWeek(n)} style={{
                    ...optionStyle(workoutsPerWeek == n),
                    padding: 10,
                    fontSize: 15,
                    fontWeight: workoutsPerWeek == n ? 700 : 500,
                  }}>
                    {n}
                  </div>
                ))}
              </div>

              {/* Live preview */}
              {liveCalories != null && (
                <div className="live-preview">
                  <div className="live-preview__icon">⚡</div>
                  <div className="live-preview__body">
                    {isHe ? <>יעד הקלוריות שלך: <strong>{liveCalories.toLocaleString()} קלוריות</strong></>
                          : <>Calorie target: <strong>{liveCalories.toLocaleString()} kcal</strong></>}
                    {hasUnsavedChanges && calorieDelta !== 0 && (
                      <span className={`live-preview__delta live-preview__delta--${calorieDelta > 0 ? 'up' : 'down'}`}>
                        {calorieDelta > 0 ? '+' : ''}{calorieDelta}
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={loading || !hasUnsavedChanges}
                  onClick={handleSave}
                  style={{ flex: 1 }}
                >
                  {loading ? t.saving : t.saveChanges}
                </button>
              </div>
              {message && (
                <div className={isError ? 'error-message' : 'success-message'} style={{ marginTop: 12, marginBottom: 0 }}>
                  {message}
                </div>
              )}
            </div>
          )}

          {/* ─── Goal ──────────────────────────────────────── */}
          {section === 'goal' && (
            <div className="settings-category-card">
              <div className="settings-category-card__header">
                <h3 className="settings-category-card__title">{isHe ? 'מטרה' : 'Goal'}</h3>
                <div className="settings-category-card__sub">
                  {isHe ? 'משנה את חלוקת המאקרו ואת הגירעון/עודף הקלוריות.' : 'Drives macro split and calorie deficit/surplus.'}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14 }}>
                {[
                  { value: 'cut',      icon: '🔥',  label: t.goalCut,      desc: t.goalCutDesc },
                  { value: 'bulk',     icon: '💪',  label: t.goalBulk,     desc: t.goalBulkDesc },
                  { value: 'maintain', icon: '⚖️', label: t.goalMaintain, desc: t.goalMaintainDesc },
                ].map(g => {
                  const sel = goal === g.value;
                  return (
                    <button
                      key={g.value}
                      type="button"
                      className={`goal-option${sel ? ' selected' : ''}`}
                      onClick={() => setGoal(g.value)}
                    >
                      <div className="goal-icon">{g.icon}</div>
                      <div className="goal-label">{g.label}</div>
                      <div className="goal-desc">{g.desc}</div>
                    </button>
                  );
                })}
              </div>

              {liveCalories != null && (
                <div className="live-preview">
                  <div className="live-preview__icon">💡</div>
                  <div className="live-preview__body">
                    {isHe ? <>יעד יומי במטרה זו: <strong>{liveCalories.toLocaleString()} קלוריות</strong></>
                          : <>Daily target with this goal: <strong>{liveCalories.toLocaleString()} kcal</strong></>}
                    {hasUnsavedChanges && calorieDelta !== 0 && (
                      <span className={`live-preview__delta live-preview__delta--${calorieDelta > 0 ? 'up' : 'down'}`}>
                        {calorieDelta > 0 ? '+' : ''}{calorieDelta}
                      </span>
                    )}
                  </div>
                </div>
              )}

              <button
                type="button"
                className="btn btn-primary"
                disabled={loading || !hasUnsavedChanges}
                onClick={handleSave}
                style={{ marginTop: 16, width: '100%' }}
              >
                {loading ? t.saving : t.saveChanges}
              </button>
              {message && (
                <div className={isError ? 'error-message' : 'success-message'} style={{ marginTop: 12, marginBottom: 0 }}>
                  {message}
                </div>
              )}
            </div>
          )}

          {/* ─── Notifications ─────────────────────────────── */}
          {section === 'notif' && (
            <div className="settings-category-card">
              <div className="settings-category-card__header">
                <h3 className="settings-category-card__title">{isHe ? 'התראות' : 'Notifications'}</h3>
                <div className="settings-category-card__sub">
                  {isHe ? 'איזה תזכורות תקבל. ההגדרות נשמרות מקומית.' : 'Which reminders to receive. Saved locally.'}
                </div>
              </div>
              <ToggleRow
                label={isHe ? 'תזכורת אימון' : 'Workout reminder'}
                sub={isHe ? 'התראה יומית בשעה שתבחר' : 'Daily nudge at your chosen time'}
                value={notifWorkout}
                onChange={setNotifWorkout}
              />
              <ToggleRow
                label={isHe ? 'תזכורת ארוחה' : 'Meal reminder'}
                sub={isHe ? 'התראה לפני כל ארוחה מתוכננת' : 'Ping before each planned meal'}
                value={notifMeal}
                onChange={setNotifMeal}
              />
              <ToggleRow
                label={isHe ? 'התראת רצף' : 'Streak alert'}
                sub={isHe ? 'הזכר לי לא לאבד את הרצף' : 'Don\'t let me lose my streak'}
                value={notifStreak}
                onChange={setNotifStreak}
              />
              <ToggleRow
                label={isHe ? 'סיכום שבועי' : 'Weekly recap'}
                sub={isHe ? 'מייל כל יום ראשון' : 'Email every Sunday'}
                value={notifWeekly}
                onChange={setNotifWeekly}
              />
            </div>
          )}

          {/* ─── Display ───────────────────────────────────── */}
          {section === 'display' && (
            <div className="settings-category-card">
              <div className="settings-category-card__header">
                <h3 className="settings-category-card__title">{isHe ? 'תצוגה' : 'Display'}</h3>
                <div className="settings-category-card__sub">
                  {isHe ? 'שפה ומראה.' : 'Language and appearance.'}
                </div>
              </div>

              <label className="field-label">{t.language}</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                {[
                  { value: 'he', label: t.hebrew },
                  { value: 'en', label: t.english },
                ].map(l => (
                  <div key={l.value} onClick={() => setLanguage(l.value)} style={optionStyle(lang === l.value)}>
                    {l.label}
                  </div>
                ))}
              </div>

              <label className="field-label">{isHe ? 'ערכת צבעים' : 'Theme'}</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div onClick={() => setTheme('dark')} style={optionStyle(theme === 'dark')}>
                  🌙 {isHe ? 'כהה' : 'Dark'}
                </div>
                <div onClick={() => setTheme('light')} style={optionStyle(theme === 'light')}>
                  ☀️ {isHe ? 'בהיר' : 'Light'}
                </div>
              </div>
            </div>
          )}

          {/* ─── Account ───────────────────────────────────── */}
          {section === 'account' && (
            <div className="settings-category-card">
              <div className="settings-category-card__header">
                <h3 className="settings-category-card__title">{isHe ? 'חשבון' : 'Account'}</h3>
                <div className="settings-category-card__sub">
                  {isHe ? 'פרטי החשבון שלך — עריכה ושמירה.' : 'Your account details — edit and save.'}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label className="field-label">{isHe ? 'שם פרטי' : 'Name'}</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={50}
                    style={inputStyle}
                    placeholder={isHe ? 'שם פרטי' : 'First name'}
                  />
                </div>
                <div>
                  <label className="field-label">{isHe ? 'גיל' : 'Age'}</label>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    min="13" max="120"
                    style={inputStyle}
                  />
                </div>
              </div>
              <button
                type="button"
                className="btn btn-primary"
                disabled={loading || !accountDirty}
                onClick={handleSaveAccount}
                style={{ width: '100%' }}
              >
                {loading ? t.saving : t.saveChanges}
              </button>
              {message && (
                <div className={isError ? 'error-message' : 'success-message'} style={{ marginTop: 12, marginBottom: 0 }}>
                  {message}
                </div>
              )}
            </div>
          )}

          {/* ─── Privacy + danger zone (logout / reset / delete) ─── */}
          {section === 'privacy' && (
            <>
            <div className="settings-category-card">
              <div className="settings-category-card__header">
                <h3 className="settings-category-card__title">{isHe ? 'פרטיות' : 'Privacy'}</h3>
                <div className="settings-category-card__sub">
                  {isHe ? 'איך הנתונים שלך משמשים.' : 'How your data is used.'}
                </div>
              </div>
              <div style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 14 }}>
                {isHe
                  ? 'הנתונים שלך נשמרים מוצפנים ומשמשים רק לחישוב יעדים אישיים ולשיפור החוויה. אנחנו לא מוכרים את המידע שלך.'
                  : 'Your data is encrypted and used only to compute personal targets and improve your experience. We don\'t sell your data.'}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <a className="link-muted" style={{ cursor: 'pointer' }} onClick={openPrivacy}>
                  {isHe ? '› מדיניות פרטיות' : '› Privacy Policy'}
                </a>
                <a className="link-muted" style={{ cursor: 'pointer' }} onClick={openTerms}>
                  {isHe ? '› תנאי שימוש' : '› Terms of Service'}
                </a>
              </div>
            </div>

            <div className="danger-zone">
            <div className="danger-zone__row">
              <div>
                <div className="danger-zone__label">{t.logout}</div>
                <div className="danger-zone__sub">
                  {isHe ? 'תצטרך להיכנס שוב כדי לראות את הנתונים שלך.' : 'You\'ll need to log in again to see your data.'}
                </div>
              </div>
              {confirmingLogout ? (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="danger-zone__btn" onClick={() => logout && logout()}>
                    {isHe ? 'אישור' : 'Confirm'}
                  </button>
                  <button
                    style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-2)', fontSize: 13, fontWeight: 600, padding: '8px 16px', borderRadius: 'var(--r-md)', cursor: 'pointer' }}
                    onClick={() => setConfirmingLogout(false)}
                  >
                    {isHe ? 'ביטול' : 'Cancel'}
                  </button>
                </div>
              ) : (
                <button className="danger-zone__btn" onClick={() => setConfirmingLogout(true)}>
                  ⏻ {t.logout}
                </button>
              )}
            </div>

            {/* ─── Password reset (email-code flow) ─────────────── */}
            <div className="danger-zone__row" style={{ display: 'block' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
                <div>
                  <div className="danger-zone__label">{t.resetPassword || (isHe ? 'איפוס סיסמה' : 'Reset password')}</div>
                  <div className="danger-zone__sub">
                    {pwStep === 'idle'
                      ? (isHe
                          ? `נשלח קוד בן 6 ספרות לכתובת ${user?.email || '—'}.`
                          : `We'll send a 6-digit code to ${user?.email || '—'}.`)
                      : pwStep === 'code-sent'
                      ? (isHe ? 'הזן את הקוד שקיבלת ובחר סיסמה חדשה.' : 'Enter the code you received and choose a new password.')
                      : (isHe ? 'הסיסמה עודכנה.' : 'Password updated.')}
                  </div>
                </div>
                {pwStep === 'idle' && (
                  <button
                    className="danger-zone__btn"
                    onClick={handleSendPasswordCode}
                    disabled={pwLoading}
                    style={{ opacity: pwLoading ? 0.5 : 1 }}
                  >
                    {pwLoading ? (t.sendingCode || (isHe ? 'שולח…' : 'Sending…')) : (t.sendCode || (isHe ? 'שלח קוד' : 'Send code'))}
                  </button>
                )}
                {pwStep === 'done' && (
                  <span style={{ color: 'var(--success)', fontSize: 18, fontWeight: 700 }}>✓</span>
                )}
              </div>

              {pwStep === 'code-sent' && (
                <div style={{ marginTop: 12, padding: 12, background: 'rgba(239, 68, 68, 0.06)', border: '1px solid rgba(239, 68, 68, 0.20)', borderRadius: 'var(--r-md)' }}>
                  {pwMessage && !pwError && (
                    <div className="success-message" style={{ marginBottom: 10 }}>{pwMessage}</div>
                  )}
                  <label className="field-label">{t.enterCode || (isHe ? 'קוד אימות (6 ספרות)' : 'Verification code (6 digits)')}</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={pwCode}
                    onChange={(e) => setPwCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder={t.codePlaceholder || '000000'}
                    style={{ ...inputStyle, marginBottom: 10, direction: 'ltr', textAlign: 'center', fontSize: 20, letterSpacing: '6px', fontWeight: 700 }}
                    autoComplete="one-time-code"
                  />
                  <label className="field-label">{t.newPassword || (isHe ? 'סיסמה חדשה' : 'New password')}</label>
                  <input
                    type="password"
                    value={pwNew}
                    onChange={(e) => setPwNew(e.target.value)}
                    placeholder={t.passwordPlaceholder || (isHe ? 'לפחות 6 תווים' : 'At least 6 characters')}
                    style={{ ...inputStyle, marginBottom: 10, direction: 'ltr' }}
                    autoComplete="new-password"
                  />
                  {pwError && (
                    <div className="error-message" style={{ marginBottom: 10 }}>{pwError}</div>
                  )}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      className="danger-zone__btn"
                      onClick={handleConfirmPasswordReset}
                      disabled={pwLoading || pwCode.length < 6 || pwNew.length < 6}
                      style={{ opacity: (pwLoading || pwCode.length < 6 || pwNew.length < 6) ? 0.5 : 1 }}
                    >
                      {pwLoading ? (t.resetting || (isHe ? 'מאפס…' : 'Resetting…')) : (t.resetBtn || (isHe ? 'אפס סיסמה' : 'Reset password'))}
                    </button>
                    <button
                      style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-2)', fontSize: 13, fontWeight: 600, padding: '8px 16px', borderRadius: 'var(--r-md)', cursor: 'pointer' }}
                      onClick={cancelPasswordReset}
                    >
                      {isHe ? 'ביטול' : 'Cancel'}
                    </button>
                    <button
                      style={{ background: 'transparent', border: 'none', color: 'var(--text-3)', fontSize: 12, fontWeight: 500, padding: '8px 4px', cursor: 'pointer', textDecoration: 'underline', marginInlineStart: 'auto' }}
                      onClick={handleSendPasswordCode}
                      disabled={pwLoading}
                    >
                      {isHe ? 'שלח קוד מחדש' : 'Resend code'}
                    </button>
                  </div>
                </div>
              )}

              {pwStep === 'idle' && pwError && (
                <div className="error-message" style={{ marginTop: 10 }}>{pwError}</div>
              )}
              {pwStep === 'done' && pwMessage && (
                <div className="success-message" style={{ marginTop: 10 }}>{pwMessage}</div>
              )}
            </div>

            <div className="danger-zone__row" style={{ display: 'block' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
                <div>
                  <div className="danger-zone__label">{isHe ? 'איפוס נתונים' : 'Reset all data'}</div>
                  <div className="danger-zone__sub">
                    {isHe ? 'מחיקה מלאה של אימונים, ארוחות, שינה, ומדידות. החשבון נשמר.' : 'Wipe workouts, meals, sleep, and measurements. Account stays.'}
                  </div>
                </div>
                {!confirmingReset && (
                  <button className="danger-zone__btn" onClick={() => { setConfirmingReset(true); setDangerMessage(''); }}>
                    {isHe ? 'אפס נתונים' : 'Reset data'}
                  </button>
                )}
              </div>
              {confirmingReset && (
                <div style={{ marginTop: 12, padding: 12, background: 'rgba(239, 68, 68, 0.06)', border: '1px solid rgba(239, 68, 68, 0.20)', borderRadius: 'var(--r-md)' }}>
                  <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 10 }}>
                    {isHe ? <>הקלד <strong style={{ color: 'var(--danger)' }}>RESET</strong> כדי לאשר.</>
                          : <>Type <strong style={{ color: 'var(--danger)' }}>RESET</strong> to confirm.</>}
                  </div>
                  <input
                    type="text"
                    value={resetText}
                    onChange={(e) => setResetText(e.target.value)}
                    placeholder="RESET"
                    style={{ ...inputStyle, marginBottom: 10, direction: 'ltr' }}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      className="danger-zone__btn"
                      onClick={handleResetData}
                      disabled={dangerLoading || resetText !== 'RESET'}
                      style={{ opacity: (dangerLoading || resetText !== 'RESET') ? 0.5 : 1 }}
                    >
                      {dangerLoading ? (isHe ? 'מאפס…' : 'Resetting…') : (isHe ? 'אישור איפוס' : 'Confirm reset')}
                    </button>
                    <button
                      style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-2)', fontSize: 13, fontWeight: 600, padding: '8px 16px', borderRadius: 'var(--r-md)', cursor: 'pointer' }}
                      onClick={() => { setConfirmingReset(false); setResetText(''); }}
                    >
                      {isHe ? 'ביטול' : 'Cancel'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="danger-zone__row" style={{ display: 'block' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
                <div>
                  <div className="danger-zone__label">{isHe ? 'מחיקת חשבון' : 'Delete account'}</div>
                  <div className="danger-zone__sub">
                    {isHe ? 'הסרה מוחלטת של החשבון והנתונים. לא ניתן לבטל.' : 'Permanently remove your account and data. Cannot be undone.'}
                  </div>
                </div>
                {!confirmingDelete && (
                  <button className="danger-zone__btn" onClick={() => { setConfirmingDelete(true); setDangerMessage(''); }}>
                    {isHe ? 'מחק חשבון' : 'Delete account'}
                  </button>
                )}
              </div>
              {confirmingDelete && (
                <div style={{ marginTop: 12, padding: 12, background: 'rgba(239, 68, 68, 0.06)', border: '1px solid rgba(239, 68, 68, 0.20)', borderRadius: 'var(--r-md)' }}>
                  <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 10 }}>
                    {isHe ? <>פעולה זו תמחק את החשבון לצמיתות. הקלד <strong style={{ color: 'var(--danger)' }}>DELETE</strong> כדי לאשר.</>
                          : <>This permanently deletes your account. Type <strong style={{ color: 'var(--danger)' }}>DELETE</strong> to confirm.</>}
                  </div>
                  <input
                    type="text"
                    value={deleteText}
                    onChange={(e) => setDeleteText(e.target.value)}
                    placeholder="DELETE"
                    style={{ ...inputStyle, marginBottom: 10, direction: 'ltr' }}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      className="danger-zone__btn"
                      onClick={handleDeleteAccount}
                      disabled={dangerLoading || deleteText !== 'DELETE'}
                      style={{ opacity: (dangerLoading || deleteText !== 'DELETE') ? 0.5 : 1 }}
                    >
                      {dangerLoading ? (isHe ? 'מוחק…' : 'Deleting…') : (isHe ? 'אישור מחיקה' : 'Confirm delete')}
                    </button>
                    <button
                      style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-2)', fontSize: 13, fontWeight: 600, padding: '8px 16px', borderRadius: 'var(--r-md)', cursor: 'pointer' }}
                      onClick={() => { setConfirmingDelete(false); setDeleteText(''); }}
                    >
                      {isHe ? 'ביטול' : 'Cancel'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {dangerMessage && (
              <div className={dangerMessage.includes('שגיאה') || dangerMessage.includes('failed') ? 'error-message' : 'success-message'} style={{ marginTop: 12, marginBottom: 0 }}>
                {dangerMessage}
              </div>
            )}
            </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
