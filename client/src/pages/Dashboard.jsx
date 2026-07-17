import { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';

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
import SettingsSearch from '../components/SettingsSearch';
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
  const location = useLocation();
  // Lets the end of the onboarding flow land directly on a specific tab
  // (e.g. the workout tab) instead of always opening on the overview.
  const [activeTab, setActiveTab] = useState(() => location.state?.tab || 'overview');
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
      syncTimezone(profile?.profile?.timezone);
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

  // If the device's timezone no longer matches what the server has stored
  // (user travelled / changed region), quietly push the new one so streak
  // day-boundaries follow them. Fires at most once per mount, only on a real
  // mismatch, and never blocks the UI.
  const tzSyncedRef = useRef(false);
  function syncTimezone(storedTz) {
    if (tzSyncedRef.current) return;
    let deviceTz;
    try { deviceTz = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return; }
    if (!deviceTz || deviceTz === storedTz) return;
    tzSyncedRef.current = true;
    api('/user/profile', { method: 'PUT', body: JSON.stringify({ timezone: deviceTz }) }).catch(() => {});
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

      <main className={`main-content${activeTab === 'settings' ? ' main-content--settings' : ''}`}>
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
            dailyStreak={dailyStreak}
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
            progressionData={progressionData}
            dailyStreak={dailyStreak}
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
              <div style={{ fontSize: 13, color: '#4D9FFF', fontWeight: 700, letterSpacing: '.5px', marginBottom: 2 }}>
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
            <img src="/streak-logo.png" alt="" style={{ width: 28, height: 28, objectFit: 'contain', display: 'block' }} />
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
  const c = active ? '#2FE3C2' : '#7C8798';
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
          <stop offset="0%" stopColor="#2FE3C2" />
          <stop offset="100%" stopColor="#5FEDD3" />
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
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 5 }}>
        <span style={{ color: '#93A0B4' }}>{label}</span>
        <span style={{ color: '#B9C4D2', fontWeight: 500 }}>{Math.round(current)}/{target}g</span>
      </div>
      <div style={{ height: 5, borderRadius: 3, background: 'rgba(255,255,255,.06)' }}>
        <div style={{ width: `${pct}%`, height: 5, borderRadius: 3, background: color, transition: 'width .6s ease' }} />
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

function OverviewTab({ profile, nutrition, todayNutrition, workoutHistory, userName, api, showXP, setActiveTab, progressionData, dailyStreak }) {
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
  // Ring geometry matches the prototype: 124px box, r=55, 11px stroke.
  const R = 55, C = 2 * Math.PI * R;
  const ringOffset = (C * (1 - caloriePct)).toFixed(1);

  // Week strip
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dow = today.getDay();
  const weekStart = new Date(today); weekStart.setDate(today.getDate() - dow);
  const workoutDates = new Set((workoutHistory?.workouts || []).map(w => {
    const dt = new Date(w.date); dt.setHours(0, 0, 0, 0); return dt.getTime();
  }));
  const hasWorkoutToday = workoutDates.has(today.getTime());
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
  } else if (!hasWorkoutToday) {
    nextTitle = isHe ? `אימון של היום מחכה לך` : `Today's workout is waiting`;
    nextSub = isHe ? `${profile?.workoutsPerWeek || 4} אימונים השבוע. אל תפספס.` : `${profile?.workoutsPerWeek || 4} workouts this week. Don't miss it.`;
    nextAction = () => setActiveTab('workout');
  } else {
    nextTitle = isHe ? 'כל הכבוד! עמדת ביעדים להיום' : 'Great work! All goals done for today';
    nextSub = isHe ? 'אכלת טוב ואימנת — נח ותתאושש.' : 'You ate well and trained — rest and recover.';
    nextAction = () => {};
  }

  const streak = dailyStreak || 0;

  return (
    <>
      {/* Weekly body-data prompt — slim inline row (prototype) */}
      {showBodyPrompt && (
        <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface)', border: '1px solid rgba(255,255,255,.05)', borderRadius: 14, padding: '11px 14px' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8F8AF7" strokeWidth="1.8" strokeLinecap="round" style={{ flexShrink: 0 }}>
            <rect x="3" y="9" width="18" height="6" rx="1.5" /><path d="M7 9v3M11 9v3M15 9v3" />
          </svg>
          <span style={{ flex: 1, fontSize: 13, color: '#93A0B4' }}>
            {isHe ? 'זה הזמן לעדכן נתוני גוף שבועיים' : 'Time for your weekly body check-in'}
          </span>
          <button type="button" onClick={() => { dismissBodyPrompt(); setShowBodyPrompt(false); setActiveTab('settings'); }}
            style={{ background: 'none', border: 'none', fontSize: 13, fontWeight: 600, color: '#2FE3C2', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
            {isHe ? 'עדכן' : 'Update'}
          </button>
          <button type="button" onClick={() => { dismissBodyPrompt(); setShowBodyPrompt(false); }} aria-label={isHe ? 'סגור' : 'Dismiss'}
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5E6B7E" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
      )}

      {/* Greeting — level pill sits inline next to the name (prototype) */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>
            {userName ? `${getGreeting(lang)}, ${userName}` : (isHe ? 'ברוך שובך' : 'Welcome back')}
          </h1>
          <span style={{ fontSize: 11.5, fontWeight: 600, color: '#8F8AF7', background: 'rgba(143,138,247,.1)', borderRadius: 999, padding: '3px 10px', flexShrink: 0 }}>
            {isHe ? `רמה ${progressionData?.level ?? 1}` : `LVL ${progressionData?.level ?? 1}`}
          </span>
        </div>
        <div style={{ fontSize: 13.5, color: '#7C8798', marginTop: 4 }}>{formatDate(lang)}</div>
      </div>

      {/* Calorie ring card */}
      <div style={{ background: 'var(--surface)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 22, padding: '22px 20px', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          {/* Calorie ring — shows consumed of target (prototype) */}
          <div style={{ position: 'relative', width: 124, height: 124, flexShrink: 0 }}>
            <svg width="124" height="124" viewBox="0 0 128 128" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="64" cy="64" r="55" fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="11" />
              <circle cx="64" cy="64" r="55" fill="none" stroke="#2FE3C2" strokeWidth="11" strokeLinecap="round"
                strokeDasharray={C.toFixed(1)} strokeDashoffset={ringOffset}
                style={{ transition: 'stroke-dashoffset .6s ease' }} />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-1)', lineHeight: 1 }}>
                {Math.round(calorieProgress).toLocaleString()}
              </div>
              <div style={{ fontSize: 11, color: '#7C8798', marginTop: 4 }}>
                {isHe ? `מתוך ${calorieTarget.toLocaleString()} קק״ל` : `of ${calorieTarget.toLocaleString()} kcal`}
              </div>
            </div>
          </div>
          {/* Macro bars */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <HeroMacroBar label={isHe ? 'חלבון' : 'Protein'} current={proteinProgress} target={proteinTarget} color="#F5698C" />
            <HeroMacroBar label={isHe ? 'פחמימות' : 'Carbs'} current={carbsProgress} target={carbsTarget} color="#4D9FFF" />
            <HeroMacroBar label={isHe ? 'שומן' : 'Fat'} current={fatProgress} target={fatTarget} color="#FFB648" />
          </div>
        </div>
        {/* CTA row */}
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button onClick={() => setActiveTab('nutrition')} style={{ flex: 1.6, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'linear-gradient(135deg,#36E8C6,#1EC0A2)', color: '#04241B', fontWeight: 700, border: 'none', borderRadius: 14, padding: 14, fontSize: 15.5, fontFamily: 'inherit', cursor: 'pointer' }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#04241B" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
            {isHe ? 'הוסף ארוחה' : 'Add meal'}
          </button>
          <button onClick={() => setActiveTab('workout')} style={{ flex: 1, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)', color: 'var(--text-1)', borderRadius: 14, padding: 14, fontSize: 15, fontFamily: 'inherit', cursor: 'pointer' }}>
            {isHe ? 'אימון' : 'Train'}
          </button>
        </div>
      </div>

      {/* Next Step card — icon beside the copy, single tinted block (prototype) */}
      <div style={{ marginBottom: 14, background: 'rgba(143,138,247,.07)', border: '1px solid rgba(143,138,247,.16)', borderRadius: 18, padding: '16px 18px', display: 'flex', gap: 13, alignItems: 'flex-start', cursor: 'pointer' }}
        onClick={nextAction} role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && nextAction()}>
        <div style={{ width: 34, height: 34, borderRadius: 11, background: 'rgba(143,138,247,.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#8F8AF7" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2 4.5 13.5H11L9.5 22 18 10.5H12z"/></svg>
        </div>
        <div>
          <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--text-1)' }}>{nextTitle}</div>
          <div style={{ fontSize: 13, color: '#93A0B4', marginTop: 3, lineHeight: 1.6 }}>{nextSub}</div>
        </div>
      </div>

      {/* Week strip */}
      <div style={{ marginBottom: 14, background: 'var(--surface)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 18, padding: '16px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-1)' }}>
            {isHe ? 'השבוע שלך' : 'Your week'}
          </span>
          {streak > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <img src="/streak-logo.png" alt="" style={{ width: 18, height: 18, objectFit: 'contain' }} />
              <span style={{ fontSize: 12.5, color: 'var(--streak-text)', fontWeight: 500 }}>
                {isHe ? `רצף של ${streak} ימים` : `${streak}-day streak`}
              </span>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 7 }}>
          {week.map((day, i) => {
            const done = day.status === 'full';
            const isToday = day.status === 'today';
            return (
              <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{
                  height: 38, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: done ? 'rgba(47,227,194,.14)' : isToday ? 'rgba(47,227,194,.05)' : 'rgba(255,255,255,.03)',
                  border: done ? '1px solid rgba(47,227,194,.3)' : isToday ? '1.5px dashed rgba(47,227,194,.5)' : '1px solid rgba(255,255,255,.06)',
                }}>
                  {done && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2FE3C2" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7" /></svg>
                  )}
                </div>
                <div style={{ fontSize: 11, color: isToday ? '#2FE3C2' : '#7C8798', marginTop: 5, fontWeight: isToday ? 600 : 400 }}>{day.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sleep — compact row that opens the sleep sheet (prototype) */}
      <SleepTracker api={api} showXP={showXP} />
    </>
  );
}

// ── Settings v2 icons ──────────────────────────────────────────────────────
function StIc({ type, color = '#fff', size = 18 }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };
  if (type === 'user')    return <svg {...p}><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6"/></svg>;
  if (type === 'target')  return <svg {...p}><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.4" fill={color} stroke="none"/></svg>;
  if (type === 'bell')    return <svg {...p}><path d="M6 9a6 6 0 0 1 12 0v4l2 4H4l2-4z"/><path d="M9.5 20a2.5 2.5 0 0 0 5 0"/></svg>;
  if (type === 'display') return <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none"><path d="M15 3a9 9 0 1 0 6 15 7 7 0 0 1-6-15z"/></svg>;
  if (type === 'sliders') return <svg {...p}><line x1="5" y1="7" x2="19" y2="7"/><circle cx="9" cy="7" r="2" fill={color}/><line x1="5" y1="12" x2="19" y2="12"/><circle cx="15" cy="12" r="2" fill={color}/><line x1="5" y1="17" x2="19" y2="17"/><circle cx="11" cy="17" r="2" fill={color}/></svg>;
  if (type === 'lock')    return <svg {...p}><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>;
  if (type === 'shield')  return <svg {...p}><path d="M12 3l7 3v6c0 5-3 8-7 9-4-1-7-4-7-9V6z"/></svg>;
  if (type === 'chat')    return <svg {...p}><path d="M4 5h16v11H8l-4 3z"/></svg>;
  return null;
}

function SettingsTab({ profile, nutrition, api, onUpdate, logout, userName }) {
  const { t, lang, setLanguage } = useLang();
  const { theme, setTheme } = useTheme();
  const { openPrivacy, openTerms } = useLegal();
  const { user } = useAuth();
  const isHe = lang === 'he';

  // ── Navigation ───────────────────────────────────────────
  const [screen, setScreen] = useState('home');
  const [sheet,  setSheet]  = useState(null);
  const [toast,  setToast]  = useState('');
  const [search, setSearch] = useState('');
  const toastTimerRef = useRef(null);

  const flashToast = (msg) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(msg);
    toastTimerRef.current = setTimeout(() => setToast(''), 2500);
  };
  useEffect(() => () => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current); }, []);

  // ── Body data ────────────────────────────────────────────
  const [weight, setWeight] = useState(profile?.weight || '');
  const [height, setHeight] = useState(profile?.height || '');
  const [goal,   setGoal]   = useState(profile?.goal   || 'maintain');
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
  const [dangerLoading, setDangerLoading] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  // Accessibility prefs (localStorage)
  const [textSize, setTextSizeState] = useState(() => localStorage.getItem('a11y:textSize') || 'normal');
  const [reduceMotion, setReduceMotionState] = useState(() => localStorage.getItem('a11y:reduceMotion') === '1');
  const [highContrast, setHighContrastState] = useState(() => localStorage.getItem('a11y:highContrast') === '1');
  const setTextSize = (v) => { localStorage.setItem('a11y:textSize', v); setTextSizeState(v); };
  const setReduceMotion = (v) => { localStorage.setItem('a11y:reduceMotion', v ? '1' : '0'); setReduceMotionState(v); };
  const setHighContrast = (v) => { localStorage.setItem('a11y:highContrast', v ? '1' : '0'); setHighContrastState(v); };

  const [tfa, setTfaState] = useState(() => localStorage.getItem('sec:tfa') === '1');
  const setTfa = (v) => { localStorage.setItem('sec:tfa', v ? '1' : '0'); setTfaState(v); };

  // Password reset (reuses /auth/forgot-password + /auth/reset-password)
  const [pwStep, setPwStep] = useState('idle'); // idle | code-sent | done
  const [pwCode, setPwCode] = useState('');
  const [pwNew,  setPwNew]  = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState('');

  async function handleSendPasswordCode() {
    if (!user?.email) { setPwError(isHe ? 'לא נמצאה כתובת אימייל' : 'No email on file'); return; }
    setPwLoading(true); setPwError('');
    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message); }
      flashToast(isHe ? 'קוד נשלח לאימייל שלך' : 'Code sent to your email');
      setPwStep('code-sent');
    } catch (err) {
      setPwError(err.message || (isHe ? 'שגיאה בשליחת הקוד' : 'Failed to send code'));
    } finally { setPwLoading(false); }
  }

  async function handleConfirmPasswordReset() {
    if (pwCode.length < 6) { setPwError(isHe ? 'הקוד חייב 6 ספרות' : 'Code must be 6 digits'); return; }
    if (pwNew.length < 8 || !/\d/.test(pwNew)) {
      setPwError(isHe ? 'הסיסמה חייבת להכיל לפחות 8 תווים וספרה אחת' : 'Password must be at least 8 characters and include a digit');
      return;
    }
    setPwLoading(true); setPwError('');
    try {
      await api('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email: user.email, code: pwCode.trim(), newPassword: pwNew }),
      });
      setPwStep('done');
      flashToast(isHe ? 'הסיסמה שונתה בהצלחה' : 'Password changed successfully');
      setPwCode(''); setPwNew('');
      setTimeout(() => setPwStep('idle'), 4000);
    } catch (err) {
      setPwError(err.message || (isHe ? 'שגיאה באיפוס הסיסמה' : 'Reset failed'));
    } finally { setPwLoading(false); }
  }

  function cancelPasswordReset() {
    setPwStep('idle'); setPwCode(''); setPwNew(''); setPwError('');
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

  async function handleSaveBody() {
    setLoading(true);
    try {
      const pw = parseFloat(weight); const ph = parseFloat(height);
      await api('/user/profile', {
        method: 'PUT',
        body: JSON.stringify({
          weight: isNaN(pw) ? profile?.weight : pw,
          height: isNaN(ph) ? profile?.height : ph,
          goal, gender,
          workoutsPerWeek: parseInt(workoutsPerWeek),
        }),
      });
      onUpdate();
      flashToast(isHe ? 'נשמר ✓' : 'Saved ✓');
    } catch (err) {
      flashToast(err.message || (isHe ? 'שגיאה בשמירה' : 'Save failed'));
    } finally { setLoading(false); }
  }

  async function handleSaveAccount() {
    const payload = {};
    if (name.trim() && name.trim() !== (userName || '')) payload.name = name.trim();
    if (age && parseInt(age) !== profile?.age) payload.age = parseInt(age);
    if (!Object.keys(payload).length) { flashToast(isHe ? 'לא בוצעו שינויים' : 'No changes'); return; }
    setLoading(true);
    try {
      await api('/user/profile', { method: 'PUT', body: JSON.stringify(payload) });
      onUpdate();
      flashToast(isHe ? 'פרטי החשבון עודכנו ✓' : 'Account updated ✓');
    } catch (err) {
      flashToast(err.message || (isHe ? 'שגיאה בשמירה' : 'Save failed'));
    } finally { setLoading(false); }
  }

  async function handleResetData() {
    setDangerLoading(true);
    try {
      await api('/user/reset-data', { method: 'POST' });
      setSheet(null);
      flashToast(isHe ? 'הנתונים אופסו. טוען מחדש…' : 'Data reset. Reloading…');
      setTimeout(() => window.location.reload(), 1200);
    } catch (err) {
      flashToast(err.message || (isHe ? 'שגיאה באיפוס' : 'Reset failed'));
      setSheet(null);
    } finally { setDangerLoading(false); }
  }

  async function handleDeleteAccount() {
    setDangerLoading(true);
    try {
      await api('/user/account', { method: 'DELETE', body: JSON.stringify({ confirm: 'DELETE' }) });
      logout && logout();
    } catch (err) {
      flashToast(err.message || (isHe ? 'שגיאה במחיקה' : 'Delete failed'));
      setSheet(null);
      setDangerLoading(false);
    }
  }

  const screenTitles = {
    home:     isHe ? 'הגדרות'          : 'Settings',
    body:     isHe ? 'נתוני גוף'       : 'Body Data',
    goal:     isHe ? 'מטרת אימון'      : 'Training Goal',
    notif:    isHe ? 'התראות'           : 'Notifications',
    display:  isHe ? 'תצוגה'           : 'Display',
    access:   isHe ? 'נגישות'          : 'Accessibility',
    account:  isHe ? 'חשבון'           : 'Account',
    security: isHe ? 'אבטחה'           : 'Security',
    privacy:  isHe ? 'פרטיות ונתונים'  : 'Privacy & Data',
  };

  const allItems = [
    { screen: 'body',     label: isHe ? 'משקל וגובה'   : 'Weight & Height' },
    { screen: 'body',     label: isHe ? 'מגדר'          : 'Gender' },
    { screen: 'goal',     label: isHe ? 'ירידה במשקל'   : 'Cut' },
    { screen: 'goal',     label: isHe ? 'עלייה במסה'    : 'Bulk' },
    { screen: 'notif',    label: isHe ? 'תזכורת אימון'  : 'Workout reminder' },
    { screen: 'notif',    label: isHe ? 'תזכורת ארוחה'  : 'Meal reminder' },
    { screen: 'display',  label: isHe ? 'שפה'           : 'Language' },
    { screen: 'display',  label: isHe ? 'ערכת צבעים'    : 'Theme' },
    { screen: 'access',   label: isHe ? 'גודל טקסט'     : 'Text size' },
    { screen: 'account',  label: isHe ? 'שם פרטי'       : 'Name' },
    { screen: 'security', label: isHe ? 'סיסמה'         : 'Password' },
    { screen: 'privacy',  label: isHe ? 'מחיקת חשבון'   : 'Delete account' },
  ];

  const sections = [
    { id: 'body',     icon: 'user',    label: isHe ? 'נתוני גוף'      : 'Body Data',      sub: isHe ? 'משקל, גובה, מגדר'       : 'Weight, height, gender' },
    { id: 'goal',     icon: 'target',  label: isHe ? 'מטרת אימון'     : 'Training Goal',  sub: isHe ? 'חיתוך, בנייה, שמירה'     : 'Cut, bulk, maintain' },
    { id: 'notif',    icon: 'bell',    label: isHe ? 'התראות'          : 'Notifications',  sub: isHe ? 'תזכורות יומיות'          : 'Daily reminders' },
    { id: 'display',  icon: 'display', label: isHe ? 'תצוגה'          : 'Display',        sub: isHe ? 'שפה וערכת צבעים'         : 'Language and theme' },
    { id: 'access',   icon: 'sliders', label: isHe ? 'נגישות'          : 'Accessibility',  sub: isHe ? 'גודל טקסט, ניגודיות'    : 'Text size, contrast' },
    { id: 'account',  icon: 'user',    label: isHe ? 'חשבון'           : 'Account',        sub: isHe ? 'שם וגיל'                 : 'Name and age' },
    { id: 'security', icon: 'lock',    label: isHe ? 'אבטחה'           : 'Security',       sub: isHe ? 'סיסמה ואימות'            : 'Password and auth' },
    { id: 'privacy',  icon: 'shield',  label: isHe ? 'פרטיות ונתונים'  : 'Privacy & Data', sub: isHe ? 'ייצוא, איפוס, מחיקה'    : 'Export, reset, delete' },
  ];

  // Results render inside <SettingsSearch/>; here we only need to know whether
  // to hide the section nav list (2-char threshold matches the component).
  const searchActive = search.trim().length >= 2;

  // Searchable corpus: the leaf settings (title only) plus each section's
  // name + description (as body), so searching a category name like "מטרה"
  // or "notifications" surfaces the right screen even with no exact leaf.
  const searchItems = [
    ...allItems,
    ...sections.map(s => ({ screen: s.id, label: s.label, body: s.sub })),
  ];

  const displayName = userName || (isHe ? 'משתמש' : 'User');
  const initials = displayName.split(' ').map(w => w[0]).filter(Boolean).join('').slice(0, 2).toUpperCase();

  const inputStyle = {
    width: '100%', padding: '12px 14px',
    background: 'var(--bg-input)', border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--r-md)', color: 'var(--text-1)', fontSize: 15,
    outline: 'none', boxSizing: 'border-box',
  };

  const chipStyle = (active) => ({
    padding: '10px 14px', borderRadius: 'var(--r-md)',
    border: `1.5px solid ${active ? 'var(--accent)' : 'var(--border-subtle)'}`,
    background: active ? 'var(--accent-glow)' : 'var(--bg-input)',
    cursor: 'pointer', textAlign: 'center',
    color: active ? 'var(--accent)' : 'var(--text-2)',
    fontWeight: active ? 600 : 500, fontSize: 13, transition: 'all 0.15s',
  });

  function NavItem({ sectionId, icon, label, sub }) {
    return (
      <button type="button" className="st2-nav-item" onClick={() => setScreen(sectionId)}>
        <span className="st2-nav-icon"><StIc type={icon} color="var(--accent)" size={20} /></span>
        <span className="st2-nav-text">
          <span className="st2-nav-label">{label}</span>
          <span className="st2-nav-sub">{sub}</span>
        </span>
        <span className="st2-nav-chevron" aria-hidden="true">{isHe ? '‹' : '›'}</span>
      </button>
    );
  }

  function ToggleRow({ label, sub, value, onChange }) {
    return (
      <div className="st2-toggle-row">
        <div>
          <div className="st2-toggle-label">{label}</div>
          {sub && <div className="st2-toggle-sub">{sub}</div>}
        </div>
        <button
          type="button"
          className={`st2-toggle${value ? ' st2-toggle--on' : ''}`}
          onClick={() => onChange(!value)}
          aria-pressed={value}
        >
          <span className="st2-toggle-knob" />
        </button>
      </div>
    );
  }

  return (
    <div className="st2-root" dir={isHe ? 'rtl' : 'ltr'}>

      {/* ── Top bar ─────────────────────────────────────────── */}
      <div className="st2-topbar">
        {screen !== 'home' ? (
          <button className="st2-back" onClick={() => setScreen('home')} aria-label={isHe ? 'חזרה' : 'Back'}>
            <span aria-hidden="true">{isHe ? '→' : '←'}</span>
          </button>
        ) : <span />}
        <h2 className="st2-topbar-title">{screenTitles[screen] ?? screenTitles.home}</h2>
        <span />
      </div>

      {/* ── Home ─────────────────────────────────────────────── */}
      {screen === 'home' && (
        <div className="st2-screen">
          <div className="st2-profile-card">
            <div className="st2-avatar">{initials}</div>
            <div>
              <div className="st2-profile-name">{displayName}</div>
              <div className="st2-profile-email">{user?.email || ''}</div>
            </div>
          </div>

          <SettingsSearch
            items={searchItems}
            sections={sections}
            query={search}
            setQuery={setSearch}
            onNavigate={(screen) => setScreen(screen)}
            isHe={isHe}
          />

          {!searchActive && (
            <div className="st2-nav-list">
              {sections.map(s => (
                <NavItem key={s.id} sectionId={s.id} icon={s.icon} label={s.label} sub={s.sub} />
              ))}
            </div>
          )}

          <div className="st2-version">Areto v1.0.8</div>
        </div>
      )}

      {/* ── Body data ─────────────────────────────────────────── */}
      {screen === 'body' && (
        <div className="st2-screen">
          <p className="st2-section-desc">
            {isHe ? 'משקל וגובה משפיעים ישירות על יעד הקלוריות שלך.' : 'Weight and height directly drive your calorie target.'}
          </p>
          <div className="st2-field-row">
            <div className="st2-field">
              <label className="st2-label">{t.weightLabel}</label>
              <input type="number" value={weight} onChange={e => setWeight(e.target.value)} min="30" max="300" step="0.1" style={inputStyle} />
            </div>
            <div className="st2-field">
              <label className="st2-label">{t.heightLabel}</label>
              <input type="number" value={height} onChange={e => setHeight(e.target.value)} min="100" max="250" step="0.1" style={inputStyle} />
            </div>
          </div>

          <label className="st2-label">{t.genderLabel}</label>
          <div className="st2-chip-row">
            {[{ value: 'male', label: t.male }, { value: 'female', label: t.female }].map(g => (
              <div key={g.value} onClick={() => setGender(g.value)} style={chipStyle(gender === g.value)}>{g.label}</div>
            ))}
          </div>

          <label className="st2-label" style={{ marginTop: 16 }}>{t.workoutsPerWeek}</label>
          <div className="st2-chip-row">
            {[1,2,3,4,5,6,7].map(n => (
              <div key={n} onClick={() => setWorkoutsPerWeek(n)} style={{ ...chipStyle(workoutsPerWeek == n), flex: 1, padding: '10px 4px' }}>{n}</div>
            ))}
          </div>

          {liveCalories != null && (
            <div className="st2-live-preview">
              <span>⚡</span>
              <span>
                {isHe
                  ? <>יעד קלוריות: <strong>{liveCalories.toLocaleString()}</strong></>
                  : <>Calorie target: <strong>{liveCalories.toLocaleString()}</strong></>}
                {calorieDelta !== 0 && (
                  <span className={`st2-delta${calorieDelta > 0 ? ' st2-delta--up' : ' st2-delta--down'}`}>
                    {calorieDelta > 0 ? '+' : ''}{calorieDelta}
                  </span>
                )}
              </span>
            </div>
          )}

          <button className="btn btn-primary st2-save-btn" disabled={loading} onClick={handleSaveBody}>
            {loading ? t.saving : t.saveChanges}
          </button>
        </div>
      )}

      {/* ── Goal ─────────────────────────────────────────────── */}
      {screen === 'goal' && (
        <div className="st2-screen">
          <p className="st2-section-desc">
            {isHe ? 'קובע את חלוקת המאקרו ואת הגירעון / עודף הקלוריות.' : 'Sets macro split and calorie deficit/surplus.'}
          </p>
          <div className="st2-goal-grid">
            {[
              { value: 'cut',      icon: '🔥',  label: t.goalCut,      desc: t.goalCutDesc },
              { value: 'bulk',     icon: '💪',  label: t.goalBulk,     desc: t.goalBulkDesc },
              { value: 'maintain', icon: '⚖️', label: t.goalMaintain, desc: t.goalMaintainDesc },
            ].map(g => (
              <button key={g.value} type="button" className={`goal-option${goal === g.value ? ' selected' : ''}`} onClick={() => setGoal(g.value)}>
                <div className="goal-icon">{g.icon}</div>
                <div className="goal-label">{g.label}</div>
                <div className="goal-desc">{g.desc}</div>
              </button>
            ))}
          </div>
          {liveCalories != null && (
            <div className="st2-live-preview">
              <span>💡</span>
              <span>
                {isHe ? <>יעד יומי: <strong>{liveCalories.toLocaleString()} קל'</strong></> : <>Daily target: <strong>{liveCalories.toLocaleString()} kcal</strong></>}
              </span>
            </div>
          )}
          <button className="btn btn-primary st2-save-btn" disabled={loading} onClick={handleSaveBody}>
            {loading ? t.saving : t.saveChanges}
          </button>
        </div>
      )}

      {/* ── Notifications ─────────────────────────────────────── */}
      {screen === 'notif' && (
        <div className="st2-screen">
          {notifPermDenied && (
            <div className="st2-warn-banner">
              {isHe
                ? 'ההתראות חסומות במכשיר. פתח הגדרות הטלפון ← אפליקציות ← Areto ← התראות.'
                : 'Notifications are blocked. Open Phone Settings → Apps → Areto → Notifications.'}
            </div>
          )}
          <ToggleRow label={isHe ? 'תזכורת אימון' : 'Workout reminder'} sub={isHe ? 'התראה יומית' : 'Daily nudge'} value={notifWorkout} onChange={setNotifWorkout} />
          <ToggleRow label={isHe ? 'תזכורת ארוחה' : 'Meal reminder'} sub={isHe ? 'לפני כל ארוחה' : 'Before each meal'} value={notifMeal} onChange={setNotifMeal} />
          <ToggleRow label={isHe ? 'התראת רצף' : 'Streak alert'} sub={isHe ? 'לא לאבד את הרצף' : 'Keep your streak'} value={notifStreak} onChange={setNotifStreak} />
          <ToggleRow label={isHe ? 'סיכום שבועי' : 'Weekly recap'} sub={isHe ? 'כל יום ראשון' : 'Every Sunday'} value={notifWeekly} onChange={setNotifWeekly} />
        </div>
      )}

      {/* ── Display ──────────────────────────────────────────── */}
      {screen === 'display' && (
        <div className="st2-screen">
          <label className="st2-label">{t.language}</label>
          <div className="st2-chip-row">
            {[{ value: 'he', label: t.hebrew }, { value: 'en', label: t.english }].map(l => (
              <div key={l.value} onClick={() => setLanguage(l.value)} style={chipStyle(lang === l.value)}>{l.label}</div>
            ))}
          </div>
          <label className="st2-label" style={{ marginTop: 20 }}>{isHe ? 'ערכת צבעים' : 'Theme'}</label>
          <div className="st2-chip-row">
            <div onClick={() => setTheme('dark')} style={chipStyle(theme === 'dark')}>{isHe ? 'כהה' : 'Dark'}</div>
            <div onClick={() => setTheme('light')} style={chipStyle(theme === 'light')}>{isHe ? 'בהיר' : 'Light'}</div>
          </div>
        </div>
      )}

      {/* ── Accessibility ─────────────────────────────────────── */}
      {screen === 'access' && (
        <div className="st2-screen">
          <label className="st2-label">{isHe ? 'גודל טקסט' : 'Text size'}</label>
          <div className="st2-chip-row">
            {[
              { value: 'small',  label: isHe ? 'קטן'  : 'Small' },
              { value: 'normal', label: isHe ? 'רגיל' : 'Normal' },
              { value: 'large',  label: isHe ? 'גדול' : 'Large' },
            ].map(s => (
              <div key={s.value} onClick={() => setTextSize(s.value)} style={chipStyle(textSize === s.value)}>{s.label}</div>
            ))}
          </div>
          <div style={{ marginTop: 20 }}>
            <ToggleRow label={isHe ? 'הפחת תנועה' : 'Reduce motion'} sub={isHe ? 'פחות אנימציות' : 'Fewer animations'} value={reduceMotion} onChange={setReduceMotion} />
            <ToggleRow label={isHe ? 'ניגודיות גבוהה' : 'High contrast'} sub={isHe ? 'מתאר כהה יותר' : 'Stronger outlines'} value={highContrast} onChange={setHighContrast} />
          </div>
        </div>
      )}

      {/* ── Account ───────────────────────────────────────────── */}
      {screen === 'account' && (
        <div className="st2-screen">
          <div className="st2-field">
            <label className="st2-label">{isHe ? 'שם פרטי' : 'Name'}</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} maxLength={50} placeholder={isHe ? 'שם פרטי' : 'First name'} style={inputStyle} />
          </div>
          <div className="st2-field" style={{ marginTop: 14 }}>
            <label className="st2-label">{isHe ? 'גיל' : 'Age'}</label>
            <input type="number" value={age} onChange={e => setAge(e.target.value)} min="13" max="120" style={inputStyle} />
          </div>
          <button className="btn btn-primary st2-save-btn" disabled={loading} onClick={handleSaveAccount}>
            {loading ? t.saving : t.saveChanges}
          </button>
        </div>
      )}

      {/* ── Security ──────────────────────────────────────────── */}
      {screen === 'security' && (
        <div className="st2-screen">
          <ToggleRow
            label={isHe ? 'אימות דו-שלבי' : 'Two-factor auth'}
            sub={isHe ? 'הגנה נוספת בכניסה' : 'Extra protection on sign-in'}
            value={tfa} onChange={setTfa}
          />
          {!user?.googleId && (
            <div className="st2-section-block">
              <div className="st2-block-title">{isHe ? 'איפוס סיסמה' : 'Reset password'}</div>
              <div className="st2-block-sub">
                {pwStep === 'idle'
                  ? (isHe ? `נשלח קוד לכתובת ${user?.email || '—'}.` : `We'll send a code to ${user?.email || '—'}.`)
                  : pwStep === 'code-sent'
                  ? (isHe ? 'הזן את הקוד ובחר סיסמה חדשה.' : 'Enter the code and choose a new password.')
                  : (isHe ? 'הסיסמה עודכנה.' : 'Password updated.')}
              </div>
              {pwStep === 'idle' && (
                <button className="st2-action-btn" disabled={pwLoading} onClick={handleSendPasswordCode}>
                  {pwLoading ? (isHe ? 'שולח…' : 'Sending…') : (isHe ? 'שלח קוד' : 'Send code')}
                </button>
              )}
              {pwStep === 'code-sent' && (
                <div className="st2-pw-form">
                  <label className="st2-label">{isHe ? 'קוד אימות (6 ספרות)' : 'Verification code (6 digits)'}</label>
                  <input
                    type="text" inputMode="numeric"
                    value={pwCode} onChange={e => setPwCode(e.target.value.replace(/\D/g,'').slice(0,6))}
                    placeholder="000000"
                    style={{ ...inputStyle, direction: 'ltr', textAlign: 'center', fontSize: 22, letterSpacing: 8, fontWeight: 700, marginBottom: 10 }}
                    autoComplete="one-time-code"
                  />
                  <label className="st2-label">{isHe ? 'סיסמה חדשה' : 'New password'}</label>
                  <input
                    type="password" value={pwNew} onChange={e => setPwNew(e.target.value)}
                    placeholder={isHe ? 'לפחות 8 תווים + ספרה' : 'At least 8 chars + digit'}
                    style={{ ...inputStyle, direction: 'ltr', marginBottom: 10 }}
                    autoComplete="new-password"
                  />
                  {pwError && <div className="error-message" style={{ marginBottom: 10 }}>{pwError}</div>}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="st2-action-btn" disabled={pwLoading || pwCode.length < 6 || pwNew.length < 8} onClick={handleConfirmPasswordReset}>
                      {pwLoading ? (isHe ? 'מאפס…' : 'Resetting…') : (isHe ? 'אפס סיסמה' : 'Reset password')}
                    </button>
                    <button className="st2-cancel-btn" onClick={cancelPasswordReset}>{isHe ? 'ביטול' : 'Cancel'}</button>
                  </div>
                  <button className="st2-resend-btn" onClick={handleSendPasswordCode} disabled={pwLoading}>
                    {isHe ? 'שלח קוד מחדש' : 'Resend code'}
                  </button>
                </div>
              )}
              {pwStep === 'done' && (
                <div style={{ color: 'var(--success, #22c55e)', fontSize: 16, marginTop: 10, fontWeight: 600 }}>
                  ✓ {isHe ? 'הסיסמה שונתה' : 'Password changed'}
                </div>
              )}
              {pwStep === 'idle' && pwError && <div className="error-message" style={{ marginTop: 10 }}>{pwError}</div>}
            </div>
          )}
        </div>
      )}

      {/* ── Privacy & Data ────────────────────────────────────── */}
      {screen === 'privacy' && (
        <div className="st2-screen">
          <p className="st2-section-desc">
            {isHe
              ? 'הנתונים שלך נשמרים מוצפנים ומשמשים רק לחישוב יעדים אישיים. אנחנו לא מוכרים מידע.'
              : 'Your data is encrypted and used only to compute personal targets. We never sell data.'}
          </p>
          <div className="st2-links">
            <button className="st2-link-btn" onClick={openPrivacy}>{isHe ? '› מדיניות פרטיות' : '› Privacy Policy'}</button>
            <button className="st2-link-btn" onClick={openTerms}>{isHe ? '› תנאי שימוש' : '› Terms of Service'}</button>
          </div>

          <div className="st2-danger-section">
            <div className="st2-danger-title">{isHe ? 'פעולות מסוכנות' : 'Danger Zone'}</div>

            <div className="st2-danger-row">
              <div>
                <div className="st2-danger-label">{t.logout}</div>
                <div className="st2-danger-sub">{isHe ? 'תצטרך להיכנס שוב.' : 'You\'ll need to log in again.'}</div>
              </div>
              <button className="st2-danger-btn" onClick={() => { setConfirmText(''); setSheet('logout'); }}>⏻ {t.logout}</button>
            </div>

            <div className="st2-danger-row">
              <div>
                <div className="st2-danger-label">{isHe ? 'ייצוא נתונים' : 'Export data'}</div>
                <div className="st2-danger-sub">{isHe ? 'הורדת הנתונים כ-JSON.' : 'Download your data as JSON.'}</div>
              </div>
              <button className="st2-danger-btn" onClick={() => flashToast(isHe ? "פיצ'ר בפיתוח" : 'Coming soon')}>
                {isHe ? 'ייצוא' : 'Export'}
              </button>
            </div>

            <div className="st2-danger-row">
              <div>
                <div className="st2-danger-label">{isHe ? 'איפוס נתונים' : 'Reset all data'}</div>
                <div className="st2-danger-sub">{isHe ? 'מחיקת אימונים, ארוחות ומדידות. החשבון נשמר.' : 'Wipe workouts, meals, and measurements.'}</div>
              </div>
              <button className="st2-danger-btn st2-danger-btn--red" onClick={() => { setConfirmText(''); setSheet('reset'); }}>
                {isHe ? 'אפס' : 'Reset'}
              </button>
            </div>

            <div className="st2-danger-row">
              <div>
                <div className="st2-danger-label">{isHe ? 'מחיקת חשבון' : 'Delete account'}</div>
                <div className="st2-danger-sub">{isHe ? 'הסרה מוחלטת. לא ניתן לבטל.' : 'Permanent removal. Cannot be undone.'}</div>
              </div>
              <button className="st2-danger-btn st2-danger-btn--red" onClick={() => { setConfirmText(''); setSheet('delete'); }}>
                {isHe ? 'מחק' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bottom sheets ─────────────────────────────────────── */}
      {sheet && (
        <>
          <div className="st2-overlay" onClick={() => setSheet(null)} />
          <div className="st2-sheet">
            {sheet === 'logout' && (
              <>
                <div className="st2-sheet-title">{isHe ? 'יציאה מהחשבון?' : 'Log out?'}</div>
                <div className="st2-sheet-sub">{isHe ? 'תצטרך להיכנס שוב כדי לראות את הנתונים שלך.' : "You'll need to log in again to see your data."}</div>
                <button className="st2-sheet-confirm-btn" onClick={() => logout && logout()}>{t.logout}</button>
                <button className="st2-sheet-cancel-btn" onClick={() => setSheet(null)}>{isHe ? 'ביטול' : 'Cancel'}</button>
              </>
            )}
            {sheet === 'reset' && (
              <>
                <div className="st2-sheet-title">{isHe ? 'איפוס נתונים?' : 'Reset all data?'}</div>
                <div className="st2-sheet-sub">{isHe ? <span>הקלד <strong>RESET</strong> לאישור.</span> : <span>Type <strong>RESET</strong> to confirm.</span>}</div>
                <input
                  type="text" value={confirmText} onChange={e => setConfirmText(e.target.value)}
                  placeholder="RESET" style={{ ...inputStyle, direction: 'ltr', marginBottom: 12 }} autoFocus
                />
                <button
                  className="st2-sheet-confirm-btn st2-sheet-confirm-btn--red"
                  disabled={dangerLoading || confirmText !== 'RESET'}
                  onClick={handleResetData}
                >
                  {dangerLoading ? (isHe ? 'מאפס…' : 'Resetting…') : (isHe ? 'אישור' : 'Confirm')}
                </button>
                <button className="st2-sheet-cancel-btn" onClick={() => setSheet(null)}>{isHe ? 'ביטול' : 'Cancel'}</button>
              </>
            )}
            {sheet === 'delete' && (
              <>
                <div className="st2-sheet-title">{isHe ? 'מחיקת חשבון?' : 'Delete account?'}</div>
                <div className="st2-sheet-sub">{isHe ? <span>פעולה זו מוחקת הכל לצמיתות. הקלד <strong>DELETE</strong> לאישור.</span> : <span>This permanently deletes everything. Type <strong>DELETE</strong> to confirm.</span>}</div>
                <input
                  type="text" value={confirmText} onChange={e => setConfirmText(e.target.value)}
                  placeholder="DELETE" style={{ ...inputStyle, direction: 'ltr', marginBottom: 12 }} autoFocus
                />
                <button
                  className="st2-sheet-confirm-btn st2-sheet-confirm-btn--red"
                  disabled={dangerLoading || confirmText !== 'DELETE'}
                  onClick={handleDeleteAccount}
                >
                  {dangerLoading ? (isHe ? 'מוחק…' : 'Deleting…') : (isHe ? 'מחק לצמיתות' : 'Delete forever')}
                </button>
                <button className="st2-sheet-cancel-btn" onClick={() => setSheet(null)}>{isHe ? 'ביטול' : 'Cancel'}</button>
              </>
            )}
          </div>
        </>
      )}

      {/* ── Toast ─────────────────────────────────────────────── */}
      {toast && <div className="st2-toast">{toast}</div>}
    </div>
  );
}
