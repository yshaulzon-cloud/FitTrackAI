import { useState, useEffect, useMemo, useRef } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3001' : '');
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
import StreakToast from '../components/StreakToast';
import SleepTracker from '../components/SleepTracker';
import {
  applyWorkoutReminder,
  applyMealReminder,
  applyStreakReminder,
  applyWeeklyReport,
  getNotificationPermissionStatus,
} from '../lib/notifications';

// The daily activity streak lives on the server (`currentStreak`) and only
// advances when the user actually *does* something — logs a meal, completes
// a workout, or logs sleep — on a new calendar day (see updateStreak in
// server/utils/progression.js). Merely opening the app no longer counts.
//
// These helpers only cache the last server value in localStorage so the
// topbar flame can render instantly on load without waiting for the network
// round-trip; the server remains the source of truth.
const STREAK_CACHE_KEY = 'areto_streak_cache';

function readCachedStreak() {
  try {
    const c = JSON.parse(localStorage.getItem(STREAK_CACHE_KEY) || 'null');
    if (!c || typeof c.count !== 'number') return 0;
    // Show the cached streak only if it was recorded today or yesterday —
    // any older and the streak has almost certainly lapsed, so don't flash a
    // stale number before the server reconciles it.
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const cachedDay = new Date(c.date); cachedDay.setHours(0, 0, 0, 0);
    const diffDays = Math.round((today - cachedDay) / 86400000);
    return diffDays <= 1 ? c.count : 0;
  } catch {
    return 0;
  }
}

function writeCachedStreak(count) {
  try {
    localStorage.setItem(STREAK_CACHE_KEY, JSON.stringify({ count, date: new Date().toISOString() }));
  } catch { /* storage unavailable */ }
}

export default function Dashboard() {
  const { user, logout, api } = useAuth();
  const { t, lang } = useLang();
  const isHe = lang === 'he';
  const { setLanguage } = useLang();
  const [activeTab, setActiveTab] = useState('overview');
  const [profileData, setProfileData] = useState(null);
  const [todayNutrition, setTodayNutrition] = useState(null);
  const [workoutHistory, setWorkoutHistory] = useState(null);
  const [progressionData, setProgressionData] = useState(null);
  const [dailyStreak, setDailyStreak] = useState(() => readCachedStreak());
  const [loading, setLoading] = useState(true);
  const [xpToast, setXpToast] = useState(null);
  const [streakToast, setStreakToast] = useState(null);
  // Tracks the last streak value we've seen so we can detect the exact
  // moment it advances (and celebrate) without firing on the initial load.
  const prevStreakRef = useRef(null);

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

  const mobileTabs = [
    { id: 'overview',  label: isHe ? 'היום'   : 'Today'   },
    { id: 'workout',   label: isHe ? 'אימון'  : 'Train'   },
    { id: 'nutrition', label: isHe ? 'תזונה' : 'Eat'     },
    { id: 'progress',  label: isHe ? 'מסע'   : 'Journey' },
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
      const [profile, nutrition, workouts, progression] = await Promise.all([
        api('/user/profile'),
        api('/nutrition/today'),
        api('/workout/history'),
        api('/progression/status').catch(() => null),
      ]);
      setProfileData(profile);
      setTodayNutrition(nutrition);
      setWorkoutHistory(workouts);
      setProgressionData(progression);
      reconcileStreak(progression?.currentStreak);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  }

  // Sync the topbar flame with the server streak. When the streak grows
  // (i.e. the user just did the first activity of a new day and kept the
  // run alive), surface a short celebratory toast. The very first sync
  // after opening the app only seeds the baseline — it never celebrates.
  function reconcileStreak(serverStreak) {
    if (typeof serverStreak !== 'number') return;
    const prev = prevStreakRef.current;
    setDailyStreak(serverStreak);
    writeCachedStreak(serverStreak);
    if (prev !== null && serverStreak > prev) {
      setStreakToast(serverStreak);
    }
    prevStreakRef.current = serverStreak;
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
      {streakToast && <StreakToast streak={streakToast} onDone={() => setStreakToast(null)} />}
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
            progressionData={progressionData}
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

        <div style={{ display: activeTab === 'nutrition' ? 'block' : 'none' }}>
          <NutritionTracker
            targets={nutrition}
            todayData={todayNutrition}
            api={api}
            onUpdate={loadData}
            showXP={showXP}
          />
        </div>

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
          <>
            {/* Areto 2.0 header */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 13, color: '#4aa8ff', fontWeight: 700, letterSpacing: '.5px', marginBottom: 2 }}>
                {isHe ? 'המסע שלך' : 'Your journey'}
              </div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 26, color: 'var(--text-1)', margin: 0 }}>
                {isHe ? 'התקדמות' : 'Progress'}
              </h1>
            </div>
            {/* XP / level panel first — most motivating */}
            <ProgressionPanel api={api} />
            {/* Weight trajectory + BMI */}
            <BMICard
              bmiAnalysis={profileData?.bmiAnalysis}
              profile={profileData?.profile}
              calorieTarget={nutrition?.calorieTarget}
              api={api}
              onUpdate={loadData}
            />
            <Progress
              nutrition={nutrition}
              todayNutrition={todayNutrition}
              workoutHistory={workoutHistory}
              profile={profileData?.profile}
              api={api}
            />
          </>
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

      {/* Mobile top bar: flame pill (right in RTL) · brand · avatar (left in RTL) */}
      <header className="mobile-topbar" aria-label={isHe ? 'שורת עליון' : 'Top bar'}>
        {/* Flame streak pill — first child = rightmost in RTL */}
        {dailyStreak > 0 ? (
          <div className="mobile-topbar__streak" aria-label={isHe ? `${dailyStreak} ימים ברצף` : `${dailyStreak}-day streak`}>
            🔥
            <span className="mobile-topbar__streak-count">{dailyStreak}</span>
          </div>
        ) : (
          <span className="mobile-topbar__streak mobile-topbar__streak--empty" aria-hidden="true" />
        )}
        {/* Brand — center */}
        <div className="mobile-topbar__brand">
          <span className="mobile-topbar__brand-text">Areto</span>
        </div>
        {/* Avatar → Settings — last child = leftmost in RTL */}
        <button
          type="button"
          className="mobile-topbar__profile"
          onClick={() => setActiveTab('settings')}
          aria-label={isHe ? 'הגדרות וחשבון' : 'Settings & account'}
        >
          <span className="mobile-topbar__avatar">
            {(profileData?.name || '?').charAt(0).toUpperCase()}
          </span>
        </button>
      </header>

      <nav className="mobile-nav" aria-label={isHe ? 'ניווט ראשי' : 'Primary navigation'}>
        {mobileTabs.map((tab) => {
          const isActive = tab.id === 'progress'
            ? ['progress', 'goals', 'xp'].includes(activeTab)
            : activeTab === tab.id;
          return (
            <button
              key={tab.id}
              className={isActive ? 'active' : ''}
              onClick={() => setActiveTab(tab.id)}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className="nav-icon" aria-hidden="true">
                <NavTabIcon id={tab.id} active={isActive} />
              </span>
              <span className="nav-label">{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

// ── Bottom-nav SVG icons ──────────────────────────────────────────────
function NavTabIcon({ id, active }) {
  const c = active ? '#2ee6c4' : '#5b6675';
  const s = { fill: 'none', stroke: c, strokeWidth: 2.1, strokeLinecap: 'round', strokeLinejoin: 'round' };
  if (id === 'overview') return (
    <svg width="24" height="24" viewBox="0 0 24 24" {...s}>
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <path d="M9 22V12h6v10"/>
    </svg>
  );
  if (id === 'workout') return (
    // Dumbbell: sleeve-plate-bar-plate-sleeve, sized ~18% larger than the
    // other nav icons (28px vs 24px) so it reads clearly at a glance while
    // sharing the same viewBox/stroke style as its siblings.
    <svg width="28" height="28" viewBox="0 0 24 24" {...s}>
      <line x1="2" y1="9" x2="2" y2="15"/>
      <line x1="22" y1="9" x2="22" y2="15"/>
      <rect x="4" y="7" width="4" height="10" rx="1.5"/>
      <rect x="16" y="7" width="4" height="10" rx="1.5"/>
      <line x1="8" y1="12" x2="16" y2="12"/>
    </svg>
  );
  if (id === 'nutrition') return (
    <svg width="24" height="24" viewBox="0 0 24 24" {...s}>
      <path d="M3 2v7c0 1.1.9 2 2 2a2 2 0 0 0 2-2V2"/>
      <path d="M5 2v20"/>
      <path d="M17 2v20"/>
      <path d="M17 8c1.66 0 3-1.79 3-4s-1.34-4-3-4"/>
    </svg>
  );
  if (id === 'progress') return (
    <svg width="24" height="24" viewBox="0 0 24 24" {...s}>
      <path d="M3 3v16a2 2 0 0 0 2 2h16"/>
      <path d="m19 9-5 5-4-4-3 3"/>
    </svg>
  );
  return null;
}

// CSS/SVG flame — emoji-style with round base, side tongues, bright core.
// Streak tier controls size and glow intensity.

function MacroRing({ caloriePct, calorieTarget, calorieProgress, isHe }) {
  const r = 56;
  const c = 2 * Math.PI * r;
  const dash = (Math.min(caloriePct, 100) / 100) * c;
  // Audit P03 + P06: on an empty day, "0%" as the hero is psychologically
  // destructive. We now show *remaining calories* (positive framing) and
  // drop the purple-end of the gradient — staying inside the mint family
  // unifies the dashboard's color story (P06).
  const remaining = Math.max(0, (calorieTarget || 0) - (calorieProgress || 0));
  const showEmpty = !calorieProgress || calorieProgress < 1;
  return (
    <svg width="140" height="140" viewBox="0 0 140 140">
      <circle cx="70" cy="70" r={r} stroke="var(--border-subtle)" strokeWidth="14" fill="none" />
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
          <stop offset="100%" stopColor="#5eead4" />
        </linearGradient>
      </defs>
      {showEmpty ? (
        <>
          <text x="70" y="68" textAnchor="middle" fontFamily="Heebo" fontSize="22" fontWeight="800" fill="var(--text-1)">
            {(calorieTarget || 0).toLocaleString()}
          </text>
          <text x="70" y="88" textAnchor="middle" fontFamily="Heebo" fontSize="10" fill="var(--text-3)" letterSpacing="0.04em">
            {isHe ? 'יעד היום · התחל' : "today's target · go"}
          </text>
        </>
      ) : (
        <>
          <text x="70" y="64" textAnchor="middle" fontFamily="Heebo" fontSize="22" fontWeight="800" fill="var(--text-1)">
            {Math.round(remaining).toLocaleString()}
          </text>
          <text x="70" y="86" textAnchor="middle" fontFamily="Heebo" fontSize="10" fill="var(--text-3)">
            {isHe ? 'קלוריות נותרו' : 'kcal left'}
          </text>
        </>
      )}
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
      <div style={{ height: 6, background: 'var(--border-subtle)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 99, transition: 'width 0.4s ease' }} />
      </div>
    </div>
  );
}

function HeroMacroBar({ label, current, target, color }) {
  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
        <span style={{ fontSize: 13, color: '#aeb9c7' }}>{label}</span>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 12, color: 'var(--text-3)' }}>
          {Math.round(current)}<span style={{ opacity: 0.6 }}>/{target}g</span>
        </span>
      </div>
      <div style={{ height: 7, background: 'var(--border-subtle)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99, transition: 'width .8s cubic-bezier(.4,0,.2,1)' }} />
      </div>
    </div>
  );
}

function QuickActionNew({ emoji, iconBg, title, sub, onClick }) {
  const { lang } = useLang();
  const isHe = lang === 'he';
  return (
    <button
      onClick={onClick}
      type="button"
      style={{ width: '100%', border: '1px solid var(--border-subtle)', cursor: 'pointer', background: 'var(--surface)', borderRadius: 18, padding: '15px 16px', display: 'flex', alignItems: 'center', gap: 14, textAlign: 'inherit', transition: 'border-color 0.15s' }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(46,230,196,.3)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-subtle)'}
    >
      <div style={{ width: 44, height: 44, borderRadius: 13, flexShrink: 0, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{emoji}</div>
      <div style={{ flex: 1, textAlign: 'start' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--text-1)' }}>{title}</div>
        {sub && <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 1 }}>{sub}</div>}
      </div>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5b6675" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isHe ? 'scaleX(-1)' : 'none', flexShrink: 0 }}>
        <path d="m9 18 6-6-6-6"/>
      </svg>
    </button>
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

const BODY_UPDATE_KEY = 'bodyUpdateLastSeen';
function shouldShowBodyPrompt() {
  const last = localStorage.getItem(BODY_UPDATE_KEY);
  if (!last) {
    localStorage.setItem(BODY_UPDATE_KEY, String(Date.now()));
    return false;
  }
  return (Date.now() - parseInt(last)) >= 7 * 24 * 60 * 60 * 1000;
}
function dismissBodyPrompt() {
  localStorage.setItem(BODY_UPDATE_KEY, String(Date.now()));
}

function OverviewTab({ profile, nutrition, todayNutrition, workoutHistory, userName, api, showXP, setActiveTab, progressionData }) {
  const { t, lang } = useLang();
  const isHe = lang === 'he';
  const [showBodyPrompt, setShowBodyPrompt] = useState(() => shouldShowBodyPrompt());

  const calorieProgress = todayNutrition?.totalCalories || 0;
  const calorieTarget = nutrition?.calorieTarget || 2000;
  const proteinProgress = todayNutrition?.totalProtein || 0;
  const proteinTarget = nutrition?.macros?.protein || 150;
  const carbsProgress = todayNutrition?.totalCarbs || 0;
  const carbsTarget = nutrition?.macros?.carbs || 250;
  const fatProgress = todayNutrition?.totalFat || 0;
  const fatTarget = nutrition?.macros?.fat || 65;

  const calorieRemaining = Math.max(0, calorieTarget - calorieProgress);
  const caloriePct = calorieTarget > 0 ? Math.min(1, calorieProgress / calorieTarget) : 0;
  const R = 76, C = 2 * Math.PI * R;
  const ringOffset = (C * (1 - caloriePct)).toFixed(1);

  // Week strip
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dow = today.getDay();
  const weekStart = new Date(today); weekStart.setDate(today.getDate() - dow);
  const workoutDates = new Set((workoutHistory?.workouts || []).map(w => {
    const dt = new Date(w.date); dt.setHours(0, 0, 0, 0); return dt.getTime();
  }));
  const dayLabels = isHe ? ['א','ב','ג','ד','ה','ו','ש'] : ['S','M','T','W','T','F','S'];
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart); d.setDate(weekStart.getDate() + i);
    const ts = d.getTime();
    if (ts > today.getTime()) return { label: dayLabels[i], status: 'future' };
    if (ts === today.getTime()) return { label: dayLabels[i], status: 'today' };
    return { label: dayLabels[i], status: workoutDates.has(ts) ? 'full' : 'miss' };
  });

  // Next step
  const hasLoggedToday = (todayNutrition?.meals || []).length > 0;
  const proteinRemaining = Math.max(0, proteinTarget - proteinProgress);
  let nextTitle, nextSub, nextAction;
  if (!hasLoggedToday) {
    nextTitle = isHe ? `התחל את היום — ${calorieTarget.toLocaleString()} קלוריות ביעד` : `Start your day — ${calorieTarget.toLocaleString()} kcal target`;
    nextSub = isHe ? 'רשום את הארוחה הראשונה כדי להתחיל לעקוב.' : 'Log your first meal to start tracking.';
    nextAction = () => setActiveTab('nutrition');
  } else if (proteinRemaining > 30) {
    nextTitle = isHe ? `נותרו ${Math.round(proteinRemaining)}g חלבון להיעד` : `${Math.round(proteinRemaining)}g protein left`;
    nextSub = isHe ? 'שייק חלבון, יוגורט יווני או חזה עוף יסגרו את הפער.' : 'A shake, Greek yogurt, or chicken will close the gap.';
    nextAction = () => setActiveTab('nutrition');
  } else {
    nextTitle = isHe ? `אימון של היום מחכה לך` : `Today's workout is waiting`;
    nextSub = isHe ? `${profile?.workoutsPerWeek || 4} אימונים השבוע. אל תפספס.` : `${profile?.workoutsPerWeek || 4} workouts this week. Don't miss it.`;
    nextAction = () => setActiveTab('workout');
  }

  const streak = workoutHistory?.streak || 0;

  return (
    <>
      {/* Weekly body-data update prompt */}
      {showBodyPrompt && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 16px', marginBottom: 16, background: 'rgba(46,230,196,0.08)', border: '1px solid rgba(46,230,196,0.25)', borderRadius: 'var(--r-md)' }}>
          <div style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.4 }}>
            📏 {isHe ? 'זה הזמן לעדכן את נתוני הגוף השבועיים שלך.' : 'Time for your weekly body check-in.'}
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button type="button" onClick={() => { dismissBodyPrompt(); setShowBodyPrompt(false); setActiveTab('settings'); }} style={{ padding: '7px 14px', borderRadius: 'var(--r-md)', border: 'none', background: 'var(--accent)', color: 'var(--bg-0)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              {isHe ? 'עדכן עכשיו' : 'Update now'}
            </button>
            <button type="button" onClick={() => { dismissBodyPrompt(); setShowBodyPrompt(false); }} aria-label={isHe ? 'סגור' : 'Dismiss'} style={{ padding: '7px 10px', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-3)', fontSize: 13, cursor: 'pointer' }}>✕</button>
          </div>
        </div>
      )}

      {/* Greeting + level pill */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 26, color: 'var(--text-1)', lineHeight: 1.15 }}>
            {userName ? `${getGreeting(lang)}, ${userName}` : (isHe ? 'ברוך שובך' : 'Welcome back')}
          </div>
          <div style={{ fontSize: 14, color: 'var(--text-3)', marginTop: 4 }}>{formatDate(lang)}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(167,139,250,.14)', border: '1px solid rgba(167,139,250,.3)', borderRadius: 999, padding: '5px 11px', flexShrink: 0 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 12, color: '#c4b5fd' }}>
            {isHe ? `רמה ${progressionData?.level ?? 1}` : `LVL ${progressionData?.level ?? 1}`}
          </span>
        </div>
      </div>

      {/* Hero ring card */}
      <div style={{ background: 'var(--surface-elev)', border: '1px solid var(--border-subtle)', borderRadius: 26, padding: '24px 22px', position: 'relative', overflow: 'hidden', boxShadow: '0 20px 40px -24px rgba(0,0,0,.7)', marginBottom: 16 }}>
        <div style={{ position: 'absolute', top: -60, insetInlineEnd: -40, width: 200, height: 200, background: 'radial-gradient(circle,rgba(46,230,196,.14),transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 22, position: 'relative' }}>
          {/* Calorie ring */}
          <div style={{ position: 'relative', width: 158, height: 158, flexShrink: 0 }}>
            <svg width="158" height="158" viewBox="0 0 180 180" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="90" cy="90" r="76" fill="none" stroke="var(--border-subtle)" strokeWidth="15" />
              <circle cx="90" cy="90" r="76" fill="none" stroke="url(#heroRingGrad)" strokeWidth="15" strokeLinecap="round"
                strokeDasharray={C.toFixed(1)} strokeDashoffset={ringOffset}
                style={{ transition: 'stroke-dashoffset .8s cubic-bezier(.4,0,.2,1)' }} />
              <defs>
                <linearGradient id="heroRingGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#2ee6c4" /><stop offset="1" stopColor="#5cf0d6" />
                </linearGradient>
              </defs>
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 34, color: 'var(--text-1)', lineHeight: 1 }}>
                {Math.round(calorieRemaining).toLocaleString()}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                {isHe ? 'קלוריות שנותרו' : 'kcal left'}
              </div>
            </div>
          </div>
          {/* Macro bars */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 13 }}>
            <HeroMacroBar label={isHe ? 'חלבון' : 'Protein'} current={proteinProgress} target={proteinTarget} color="#ff5c7c" />
            <HeroMacroBar label={isHe ? 'פחמימות' : 'Carbs'} current={carbsProgress} target={carbsTarget} color="#4aa8ff" />
            <HeroMacroBar label={isHe ? 'שומן' : 'Fat'} current={fatProgress} target={fatTarget} color="#ffb020" />
          </div>
        </div>
        {/* CTA row */}
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button onClick={() => setActiveTab('nutrition')} style={{ flex: 1, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#2ee6c4,#16c5a7)', color: '#04231e', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, padding: 13, borderRadius: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, boxShadow: '0 8px 22px -8px rgba(46,230,196,.7)' }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#04231e" strokeWidth="2.6" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
            {isHe ? 'הוסף ארוחה' : 'Add meal'}
          </button>
          <button onClick={() => setActiveTab('workout')} style={{ border: '1px solid var(--border)', cursor: 'pointer', background: 'var(--surface-elev)', color: 'var(--text-1)', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, padding: '13px 18px', borderRadius: 15 }}>
            {isHe ? 'אימון' : 'Train'}
          </button>
        </div>
      </div>

      {/* Next Step card */}
      <div style={{ marginBottom: 16, background: 'linear-gradient(120deg,rgba(167,139,250,.13),rgba(46,230,196,.07))', border: '1px solid rgba(167,139,250,.22)', borderRadius: 22, padding: 18, cursor: 'pointer' }} onClick={nextAction} role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && nextAction()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 11, background: 'rgba(167,139,250,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c4b5fd" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2 3 14h7l-1 8 10-12h-7z"/></svg>
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: '#c4b5fd', letterSpacing: .3 }}>
            {isHe ? 'הצעד הבא שלך' : 'Your next step'}
          </div>
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, color: 'var(--text-1)', lineHeight: 1.3, marginBottom: 4 }}>{nextTitle}</div>
        <div style={{ fontSize: 14, color: 'var(--text-3)', lineHeight: 1.5 }}>{nextSub}</div>
      </div>

      {/* Week strip */}
      <div style={{ marginBottom: 16, background: 'var(--surface)', border: '1px solid var(--border-subtle)', borderRadius: 22, padding: '18px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--text-1)' }}>
            {isHe ? 'השבוע שלך' : 'Your week'}
          </div>
          {streak > 0 && (
            <div style={{ fontSize: 13, color: '#ffb43a', fontWeight: 600 }}>
              🔥 {isHe ? `רצף של ${streak} ימים` : `${streak}-day streak`}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
          {week.map((day, i) => {
            let bg, border, icon;
            if (day.status === 'full') {
              bg = 'linear-gradient(135deg,rgba(255,150,40,.22),rgba(255,90,30,.12))';
              border = '1px solid rgba(255,150,40,.3)'; icon = '🔥';
            } else if (day.status === 'today') {
              bg = 'rgba(46,230,196,.14)'; border = '1.5px dashed #2ee6c4'; icon = '●';
            } else if (day.status === 'miss') {
              bg = 'rgba(255,92,124,.07)'; border = '1px solid rgba(255,92,124,.18)'; icon = '';
            } else {
              bg = 'var(--surface-elev)'; border = '1px solid var(--border-subtle)'; icon = '';
            }
            return (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 }}>
                <div style={{ fontSize: 12, color: '#6b7686', fontWeight: 600 }}>{day.label}</div>
                <div style={{ width: '100%', aspectRatio: '1', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: bg, border }}>
                  <span style={{ fontSize: day.status === 'today' ? 11 : 14 }}>{icon}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick actions list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <QuickActionNew
          emoji="🍽️"
          iconBg="rgba(46,230,196,.14)"
          title={isHe ? 'רשום ארוחה' : 'Log meal'}
          sub={calorieProgress > 0
            ? (isHe ? `${Math.round(calorieRemaining)} קלוריות נותרו להיום` : `${Math.round(calorieRemaining)} kcal left today`)
            : (isHe ? 'התחל לעקוב אחרי היום' : 'Start tracking today')}
          onClick={() => setActiveTab('nutrition')}
        />
        <QuickActionNew
          emoji="🏋️"
          iconBg="rgba(167,139,250,.16)"
          title={isHe ? 'התחל אימון' : 'Start workout'}
          sub={isHe ? `${profile?.workoutsPerWeek || 4} אימונים בשבוע` : `${profile?.workoutsPerWeek || 4}x per week`}
          onClick={() => setActiveTab('workout')}
        />
        <QuickActionNew
          emoji="📈"
          iconBg="rgba(74,168,255,.14)"
          title={isHe ? 'ההתקדמות שלי' : 'My progress'}
          sub={isHe ? 'משקל, כוח ורצף' : 'Weight, strength & streak'}
          onClick={() => setActiveTab('progress')}
        />
      </div>

      {/* Sleep tracker */}
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
  // Mobile push-navigation: when user taps a section item, we go into "detail
  // view" (only the section content is shown, with a back button). On
  // desktop both list and content are visible side-by-side (CSS).
  const [showingDetail, setShowingDetail] = useState(false);
  const openSection = (id) => { setSection(id); setShowingDetail(true); };
  const closeDetail = () => setShowingDetail(false);
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
  // Shown under the Notifications section when the OS permission is denied,
  // so the user knows *why* toggles aren't producing real notifications
  // instead of the toggle silently doing nothing.
  const [notifPermDenied, setNotifPermDenied] = useState(false);

  const persist = (key, setter, applyFn) => async (val) => {
    localStorage.setItem(`notif:${key}`, val ? '1' : '0');
    setter(val);
    if (!applyFn) return;
    const ok = await applyFn(val, lang === 'he').catch(() => false);
    if (val && ok === false) {
      // Permission denied — revert the toggle and surface a clear message
      // instead of leaving it "on" while nothing actually fires.
      setter(false);
      localStorage.setItem(`notif:${key}`, '0');
      setNotifPermDenied(true);
    } else if (ok !== false) {
      setNotifPermDenied(false);
    }
  };
  const setNotifWorkout = persist('workout', setNotifWorkoutState, applyWorkoutReminder);
  const setNotifMeal    = persist('meal',    setNotifMealState,    applyMealReminder);
  const setNotifStreak  = persist('streak',  setNotifStreakState,  applyStreakReminder);
  const setNotifWeekly  = persist('weekly',  setNotifWeeklyState,  applyWeeklyReport);

  // On native startup, ensure scheduled notifications match the saved prefs.
  // Runs once on mount; on web, the helpers are no-ops.
  useEffect(() => {
    const isHe = lang === 'he';
    (async () => {
      const status = await getNotificationPermissionStatus();
      if (status === 'denied') {
        setNotifPermDenied(true);
        return;
      }
      const results = await Promise.all([
        applyWorkoutReminder(notifWorkout, isHe).catch(() => null),
        applyMealReminder(notifMeal, isHe).catch(() => null),
        applyStreakReminder(notifStreak, isHe).catch(() => null),
        applyWeeklyReport(notifWeekly, isHe).catch(() => null),
      ]);
      if (results.some((r) => r === false)) setNotifPermDenied(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const autoSaveBodyRef = useRef(null);
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
      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message);
      }
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

    const n = parseInt(workoutsPerWeek) || 0;
    const activityFactor = n <= 1 ? 1.2 : n <= 2 ? 1.375 : n <= 4 ? 1.55 : n <= 5 ? 1.725 : 1.9;
    const tdee = bmr * activityFactor;

    let target = tdee;
    if (goal === 'cut') target = tdee - 500;
    else if (goal === 'bulk') target = tdee + 350;

    return Math.round(target / 10) * 10;
  }, [weight, height, gender, workoutsPerWeek, goal, profile?.age]);

  const currentCalories = nutrition?.calorieTarget;
  const calorieDelta = (liveCalories != null && currentCalories) ? liveCalories - currentCalories : 0;
  const parsedWeight = parseFloat(weight);
  const parsedHeight = parseFloat(height);
  const hasUnsavedChanges = (
    (!isNaN(parsedWeight) && parsedWeight !== profile?.weight) ||
    (!isNaN(parsedHeight) && parsedHeight !== profile?.height) ||
    goal !== profile?.goal ||
    gender !== profile?.gender ||
    parseInt(workoutsPerWeek) !== profile?.workoutsPerWeek
  );

  // Autosave state — shown as a tiny indicator at the top of the section.
  //   'idle' (no recent change), 'pending' (typing), 'saving' (mid-flight),
  //   'saved' (briefly after success), 'error'.
  const [autoSaveStatus, setAutoSaveStatus] = useState('idle');

  // Debounced auto-save for body + goal fields. Fires 800ms after the
  // last change so the user can finish typing before we hit the server.
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    setAutoSaveStatus('pending');
    autoSaveBodyRef.current = setTimeout(async () => {
      try {
        setAutoSaveStatus('saving');
        await api('/user/profile', {
          method: 'PUT',
          body: JSON.stringify({
            weight: isNaN(parsedWeight) ? profile?.weight : parsedWeight,
            height: isNaN(parsedHeight) ? profile?.height : parsedHeight,
            goal,
            gender,
            workoutsPerWeek: parseInt(workoutsPerWeek),
          }),
        });
        setAutoSaveStatus('saved');
        onUpdate();
        setTimeout(() => setAutoSaveStatus('idle'), 1800);
      } catch {
        setAutoSaveStatus('error');
        setTimeout(() => setAutoSaveStatus('idle'), 3000);
      }
    }, 800);
    return () => clearTimeout(autoSaveBodyRef.current);
  }, [weight, height, goal, gender, workoutsPerWeek, hasUnsavedChanges]); // eslint-disable-line

  // Same pattern for the Account section (name + age).
  useEffect(() => {
    const dirty = (name && name.trim() !== (userName || '')) ||
                  (age && parseInt(age) !== profile?.age);
    if (!dirty) return;
    setAutoSaveStatus('pending');
    const timer = setTimeout(async () => {
      try {
        setAutoSaveStatus('saving');
        const payload = {};
        if (name && name.trim() !== (userName || '')) payload.name = name.trim();
        if (age && parseInt(age) !== profile?.age) payload.age = parseInt(age);
        if (Object.keys(payload).length === 0) {
          setAutoSaveStatus('idle');
          return;
        }
        await api('/user/profile', { method: 'PUT', body: JSON.stringify(payload) });
        setAutoSaveStatus('saved');
        onUpdate();
        setTimeout(() => setAutoSaveStatus('idle'), 1800);
      } catch {
        setAutoSaveStatus('error');
        setTimeout(() => setAutoSaveStatus('idle'), 3000);
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [name, age]); // eslint-disable-line

  async function handleSave(e) {
    if (e) e.preventDefault();
    if (autoSaveBodyRef.current) clearTimeout(autoSaveBodyRef.current);
    setLoading(true);
    setMessage('');
    try {
      await api('/user/profile', {
        method: 'PUT',
        body: JSON.stringify({
          weight: isNaN(parsedWeight) ? profile?.weight : parsedWeight,
          height: isNaN(parsedHeight) ? profile?.height : parsedHeight,
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
    { id: 'body',    icon: '',   label: isHe ? 'נתוני גוף' : 'Body data' },
    { id: 'goal',    icon: '',   label: isHe ? 'מטרה'      : 'Goal' },
    { id: 'notif',   icon: '',   label: isHe ? 'התראות'   : 'Notifications' },
    { id: 'display', icon: '',   label: isHe ? 'תצוגה'    : 'Display' },
    { id: 'account', icon: '',   label: isHe ? 'חשבון'    : 'Account' },
    { id: 'privacy', icon: '',   label: isHe ? 'פרטיות'   : 'Privacy' },
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
      </div>

      <div className={`settings-layout${showingDetail ? ' settings-layout--in-detail' : ''}`}>
        {/* ── Internal side-nav ────────────────────────────── */}
        <aside className="settings-nav" aria-label={isHe ? 'קטגוריות הגדרות' : 'Settings categories'}>
          {sections.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`settings-nav__item${section === s.id ? ' settings-nav__item--active' : ''}`}
              onClick={() => openSection(s.id)}
            >
              <span>{s.label}</span>
              <span className="settings-nav__chevron" aria-hidden="true">{isHe ? '‹' : '›'}</span>
            </button>
          ))}
        </aside>

        {/* ── Section content ──────────────────────────────── */}
        <div className="settings-content">
          <div className="settings-toolbar">
            <button
              type="button"
              className="settings-back"
              onClick={closeDetail}
              aria-label={isHe ? 'חזרה לרשימת ההגדרות' : 'Back to settings list'}
            >
              <span aria-hidden="true">{isHe ? '←' : '→'}</span>
              <span>{isHe ? 'חזרה' : 'Back'}</span>
            </button>
            {/* Autosave indicator — visible only when something interesting is happening */}
            {autoSaveStatus !== 'idle' && (
              <span className={`autosave-status autosave-status--${autoSaveStatus}`}>
                {autoSaveStatus === 'pending' && (isHe ? '… משינויים בהמתנה' : '… changes pending')}
                {autoSaveStatus === 'saving' && (isHe ? 'שומר…' : 'Saving…')}
                {autoSaveStatus === 'saved' && (isHe ? '✓ נשמר' : '✓ Saved')}
                {autoSaveStatus === 'error' && (isHe ? '✗ שגיאה בשמירה' : '✗ Save failed')}
              </span>
            )}
          </div>
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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, marginBottom: 4 }}>
                {[1, 2, 3, 4, 5, 6, 7].map(n => (
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
                  disabled={loading}
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
                disabled={loading}
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
              {notifPermDenied && (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: 'var(--r-md)',
                  padding: '12px 14px',
                  marginBottom: 14,
                  fontSize: 13,
                  lineHeight: 1.5,
                  color: 'var(--text-2)',
                }}>
                  {isHe
                    ? 'ההתראות חסומות במכשיר. כדי לקבל תזכורות, פתח הגדרות הטלפון ← אפליקציות ← Areto ← התראות, ואפשר אותן.'
                    : 'Notifications are blocked on this device. To get reminders, open Phone Settings → Apps → Areto → Notifications, and allow them.'}
                </div>
              )}
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
                  {isHe ? 'כהה' : 'Dark'}
                </div>
                <div onClick={() => setTheme('light')} style={optionStyle(theme === 'light')}>
                  {isHe ? 'בהיר' : 'Light'}
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
                disabled={loading}
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
