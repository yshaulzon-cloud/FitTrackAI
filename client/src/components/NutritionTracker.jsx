import { useState, useEffect, useMemo, useRef } from 'react';
import { useLang } from '../context/LanguageContext';
import { mealTimes, chronologicalOrder, nextMealIndex } from '../lib/mealTimes.mjs';
import MealEditor, { MealItemsList } from './MealEditor';
import { applyMealToMenu, logValuesOf, menuHasUserState } from '../lib/mealEdit.mjs';
import { menuStaleReason, sumMeals, menuVsTarget } from '../lib/menuFresh.mjs';
import { hasTargets } from '../lib/dayTarget.mjs';
import ManualMealForm from './ManualMealForm';
import { describeLogResult, remainingLine, restoreValuesOf } from '../lib/logFeedback.mjs';
import { defaultGrams, parseGrams, portionNumbers, shareOfTarget, pickPayload } from '../lib/foodPick.mjs';

// The menu's total against the target it is meant to meet (calories + protein), so
// every menu, daily or weekly, shows where it stands — and, when no menu really
// fits the target, says it is only the closest one.
function MenuTargetSummary({ meals, target, isHe, label, approximate }) {
  const cal = menuVsTarget(sumMeals(meals, 'calories'), target?.calories);
  const prot = menuVsTarget(sumMeals(meals, 'protein'), target?.protein);
  const total = Math.round(sumMeals(meals, 'calories'));
  const levelColor = { close: 'var(--success)', near: '#FFB648', far: 'var(--danger)' };
  const sign = (n) => (n > 0 ? '+' : n < 0 ? '−' : '±');
  return (
    <div style={{ marginTop: 16, background: 'var(--surface)', border: '1px solid var(--border-faint)', borderRadius: 14, padding: '13px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
        <span style={{ fontSize: 13.5, color: '#93A0B4' }}>{label}</span>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)', fontVariantNumeric: 'tabular-nums' }}>
          {total.toLocaleString()} {isHe ? 'קק״ל' : 'kcal'}
          {cal && <span style={{ color: '#7C8798', fontWeight: 400 }}> {isHe ? 'מתוך יעד' : 'of'} {cal.target.toLocaleString()}</span>}
        </span>
      </div>
      {cal && (
        <div style={{ marginTop: 4, fontSize: 12.5, color: levelColor[cal.level], textAlign: isHe ? 'left' : 'right' }}>
          {cal.gap === 0
            ? (isHe ? 'בדיוק ביעד' : 'exactly on target')
            : `${sign(cal.gap)}${Math.abs(cal.gap).toLocaleString()} ${isHe ? 'קק״ל' : 'kcal'} ${cal.over ? (isHe ? 'מעל היעד' : 'over target') : (isHe ? 'מתחת ליעד' : 'under target')}`}
        </div>
      )}
      {prot && (
        <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: 'var(--text-3)', fontVariantNumeric: 'tabular-nums' }}>
          <span>{isHe ? 'חלבון' : 'Protein'}</span>
          <span>{prot.total}g {isHe ? 'מתוך יעד' : 'of'} {prot.target}g</span>
        </div>
      )}
      {approximate && (
        <div style={{ marginTop: 8, fontSize: 12.5, color: '#FFB648', lineHeight: 1.5 }}>
          {isHe
            ? 'אין תפריט שמתאים בדיוק ליעד שלך. זה הקרוב ביותר שיש כרגע, אפשר להחליף ארוחות או לערוך אותן כדי להתקרב.'
            : 'No menu matches your target exactly. This is the closest one available — swap or edit meals to get nearer.'}
        </div>
      )}
    </div>
  );
}
function isNativeShell() {
  try {
    return typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.() === true;
  } catch { return false; }
}

// Meal times come from lib/mealTimes.mjs (by slot in the day, so the two
// snacks of a plan get different hours).
const MEAL_TYPE_EMOJI = {
  breakfast: '🌅',
  snack: '🥐',
  lunch: '🍽',
  dinner: '🌙',
};

function PlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function CheckIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function MacroRingSmall({ pct = 0 }) {
  const r = 20;
  const c = 2 * Math.PI * r;
  const dash = (Math.min(pct, 100) / 100) * c;
  return (
    <svg width="48" height="48" viewBox="0 0 48 48">
      <circle cx="24" cy="24" r={r} stroke="rgba(255,255,255,0.06)" strokeWidth="5" fill="none" />
      <circle
        cx="24" cy="24" r={r}
        stroke="#2FE3C2" strokeWidth="5" fill="none"
        strokeDasharray={`${dash} ${c}`}
        strokeLinecap="round"
        transform="rotate(-90 24 24)"
      />
    </svg>
  );
}


function MealRow({ time, emoji, name, desc, cal, p, c, f, status, onLog, onDelete, onSwap, swapping, isHe, t }) {
  // Audit P10: macros used to render on every meal card — 5 cards × 3
  // numbers = 15 macro chips in a single scroll. We now expand macros by
  // default only on the *current* meal ("now"); past/planned rows show
  // the kcal + a tiny disclosure that reveals macros on tap.
  const [expanded, setExpanded] = useState(status === 'now');
  return (
    <div className={`meal-row meal-row--${status}`}>
      <div className="meal-row__time-block">
        <div className="meal-row__icon" role="img" aria-label={name}>
          {status === 'done' ? <CheckIcon size={18} /> : emoji}
        </div>
        <div>
          <div className="meal-row__time">{time}</div>
          <div className="meal-row__status">
            {status === 'done' ? (isHe ? 'הושלם' : 'Done')
              : status === 'now' ? (isHe ? 'הבא' : 'Up next')
              : (isHe ? 'מתוכנן' : 'Planned')}
          </div>
        </div>
      </div>
      <div>
        <div className="meal-row__name">{name}</div>
        {desc && <div className="meal-row__desc">{desc}</div>}
        {expanded ? (
          <div className="meal-row__macros">
            {p > 0 && <span className="m-p">{Math.round(p)}g {isHe ? 'חלבון' : 'protein'}</span>}
            {c > 0 && <span className="m-c">{Math.round(c)}g {isHe ? 'פחמ\'' : 'carbs'}</span>}
            {f > 0 && <span className="m-f">{Math.round(f)}g {isHe ? 'שומן' : 'fat'}</span>}
          </div>
        ) : (p > 0 || c > 0 || f > 0) && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setExpanded(true); }}
            style={{
              marginTop: 4,
              padding: '8px 0',
              minHeight: 44,
              background: 'none',
              border: 'none',
              color: 'var(--text-3)',
              fontSize: 11,
              cursor: 'pointer',
              fontFamily: 'inherit',
              textAlign: isHe ? 'right' : 'left',
            }}
          >
            {isHe ? 'הצג ערכי תזונה ↓' : 'Show macros ↓'}
          </button>
        )}
      </div>
      <div className="meal-row__right">
        <div>
          <span className="meal-row__cal">{Math.round(cal)}</span>
          <span className="meal-row__cal-unit">{t.kcal}</span>
        </div>
        {status === 'done' && onDelete && (
          <button className="meal-row__cta" onClick={onDelete} type="button">
            {isHe ? 'מחק' : 'Delete'}
          </button>
        )}
        {status !== 'done' && onLog && (
          <button
            className="meal-row__cta meal-row__cta--primary"
            onClick={onLog}
            type="button"
          >
            {isHe ? 'סמן שאכלתי' : 'Mark eaten'}
          </button>
        )}
        {status !== 'done' && onSwap && (
          <button
            className="meal-row__swap"
            onClick={onSwap}
            disabled={swapping}
            type="button"
            title={isHe ? 'החלף ארוחה' : 'Swap meal'}
            aria-label={isHe ? 'החלף ארוחה' : 'Swap meal'}
          >
            {swapping ? '…' : (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: '-2px', marginInlineEnd: 4 }}>
                  <path d="M7 8h11l-3-3M17 16H6l3 3" />
                </svg>
                {isHe ? 'החלף' : 'Swap'}
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// Condensed single-line row for already-eaten meals (audit: the previous
// MealRow layout — icon block + name + desc + cal column — read as too
// heavy for a list of things you've already logged. Tap the row to reveal
// macros + delete instead of always showing them.
function LoggedMealRow({ meal, isHe, t, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const name = isHe ? meal.description : (meal.englishName || meal.description);
  // AI-estimated / rough-default source tags — small stroke icons instead of
  // emoji, matching the app's nav-icon style.
  const tag = meal.source === 'ai'
    ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-4)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" title={isHe ? 'הערכת AI' : 'AI estimate'}><rect x="5" y="8" width="14" height="10" rx="2" /><path d="M9 8V6a3 3 0 0 1 6 0v2M9 13h.01M15 13h.01" /></svg>
    : meal.source === 'default'
    // Old records only: before the engine stopped guessing, an unknown food was saved as a rough placeholder.
    ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FFB648" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" title={isHe ? 'הערכה כללית' : 'Rough estimate'}><path d="M12 9v4M12 16.5v.5" /><circle cx="12" cy="12" r="9" /></svg>
    : meal.source === 'manual'
    ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-4)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" title={isHe ? 'הוזן ידנית' : 'Entered by hand'}><path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4z" /></svg>
    : null;
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 16,
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'stretch',
    }}>
      <div style={{ width: 4, background: '#2FE3C2', flexShrink: 0, borderRadius: '99px 0 0 99px' }} />
      <div style={{ flex: 1, minWidth: 0 }}>
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 14px',
          background: 'none',
          border: 'none',
          color: 'var(--text-1)',
          fontFamily: 'inherit',
          textAlign: isHe ? 'right' : 'left',
          cursor: 'pointer',
        }}
      >
        <span style={{ color: 'var(--success)', flexShrink: 0, display: 'flex' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7" /></svg>
        </span>
        <span style={{ flex: 1, fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {name} {tag}
        </span>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
          {Math.round(meal.calories)} {t.kcal}
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-4)', transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }}>
          ▾
        </span>
      </button>
      {expanded && (
        <div style={{
          padding: '0 14px 12px',
          borderTop: '1px solid var(--border-subtle)',
        }}>
          {/* The header row truncates the name to one line — show it in full
              here, since that's the whole point of expanding. */}
          <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5, paddingTop: 10 }}>
            {name}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 10, paddingTop: 8, fontSize: 12, color: 'var(--text-3)' }}>
            <span className="m-p">{Math.round(meal.protein)}g {isHe ? 'חלבון' : 'protein'}</span>
            <span className="m-c">{Math.round(meal.carbs)}g {isHe ? 'פחמ\'' : 'carbs'}</span>
            <span className="m-f">{Math.round(meal.fat)}g {isHe ? 'שומן' : 'fat'}</span>
          </div>
          {onDelete && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              style={{
                marginTop: 10,
                padding: '4px 12px',
                borderRadius: 8,
                border: '1px solid rgba(255,92,124,.25)',
                background: 'rgba(255,92,124,.10)',
                color: '#F5698C',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              {isHe ? 'מחק' : 'Delete'}
            </button>
          )}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

export default function NutritionTracker({ targets, todayData, api, onUpdate, showXP, dayType }) {
  const { t, lang } = useLang();
  const isHe = lang === 'he';

  const [foodInput, setFoodInput] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const isNative = isNativeShell();
  const [message, setMessage] = useState('');
  // A message that is a failure ("we couldn't find that food") is drawn as one.
  const [errorMessage, setErrorMessage] = useState('');
  function flashError(text, ms = 5000) {
    clearTimeout(toastTimer.current);
    setWarnMessage('');
    setErrorMessage(text);
    setMessage(text);
    toastTimer.current = setTimeout(() => { setMessage(''); setErrorMessage(''); }, ms);
  }
  // The food the user typed that the database does not know: { text, manual } — `manual`
  // is true once they opened the hand-typed form. Nothing is logged for it until they
  // either pick a result from the list or save their own numbers.
  const [notFound, setNotFound] = useState(null);
  const [manualBusy, setManualBusy] = useState(false);
  const [manualError, setManualError] = useState('');
  // A food chosen from the search list, waiting for the user to set the amount:
  // { food, gramsText }. Nothing is logged until they confirm.
  const [pick, setPick] = useState(null);
  // The toast after a log is drawn amber when the engine had to assume something.
  const [warnMessage, setWarnMessage] = useState('');
  // "N kcal left today" shown next to the delete toast.
  const [deleteNote, setDeleteNote] = useState('');
  // One toast timer at a time, so an older message cannot clear a newer one early.
  const toastTimer = useRef(null);
  // The standard confirmation after a meal is saved, whichever path saved it: what was
  // added, where the day stands against today's target, and anything that was assumed.
  function showLogged(result, ms) {
    const { text, hasNotes } = describeLogResult(result, isHe);
    clearTimeout(toastTimer.current);
    setErrorMessage('');
    setWarnMessage(hasNotes ? text : '');
    setMessage(text);
    toastTimer.current = setTimeout(() => { setMessage(''); setWarnMessage(''); }, ms || (hasNotes ? 9000 : 4500));
  }
  const [deletingId, setDeletingId] = useState(null);
  const [lastDeletedMeal, setLastDeletedMeal] = useState(null);
  // Menu state persists to localStorage so navigating away and back (or
  // restarting the app) doesn't wipe a loaded daily/weekly menu.
  const MENU_STORAGE_KEY = 'nutrition:menuState';
  const [menuOpen, setMenuOpen] = useState(false);
  const [menu, setMenu] = useState(null);
  const [menuCalTarget, setMenuCalTarget] = useState(null);
  const [menuDate, setMenuDate] = useState(null); // local day the daily menu was built on
  const [weeklyDate, setWeeklyDate] = useState(null); // …and the weekly one (day i = that day + i)
  const [menuMode, setMenuMode] = useState('daily'); // 'daily' | 'weekly'
  const [weeklyMenu, setWeeklyMenu] = useState(null); // array of 7 day-menus
  const [weeklyDayIdx, setWeeklyDayIdx] = useState(0);
  const [menuLoading, setMenuLoading] = useState(false);
  const [swappingIdx, setSwappingIdx] = useState(null);
  const [loggingIdx, setLoggingIdx] = useState(null);
  const [expandedMenuIdx, setExpandedMenuIdx] = useState(null);
  const [editingIdx, setEditingIdx] = useState(null); // menu row being edited at food level
  const [weeklyOpenKey, setWeeklyOpenKey] = useState(null); // "day-meal" whose foods are shown
  const [history, setHistory] = useState([]);
  const [hydrated, setHydrated] = useState(false);
  // Which daily-menu rows the user has ticked "eaten" today. Kept per
  // calendar day so a new day starts fresh. This is what makes the
  // "סמן שאכלתי" button flip to "done" and stay that way.
  const todayKey = new Date().toDateString();
  const [menuLogged, setMenuLogged] = useState({ date: todayKey, idxs: [] });
  const loggedMenuSet = new Set(menuLogged.date === todayKey ? menuLogged.idxs : []);

  // Restore any previously loaded menu once on mount.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(MENU_STORAGE_KEY) || 'null');
      if (saved) {
        setMenuOpen(!!saved.menuOpen);
        setMenu(saved.menu || null);
        setMenuCalTarget(saved.menuCalTarget || null);
        setMenuDate(saved.menuDate || null);
        setWeeklyDate(saved.weeklyDate || null);
        setMenuMode(saved.menuMode || 'daily');
        setWeeklyMenu(saved.weeklyMenu || null);
        setWeeklyDayIdx(saved.weeklyDayIdx || 0);
        // Only restore ticked-eaten rows if they belong to today.
        if (saved.menuLogged && saved.menuLogged.date === todayKey) {
          setMenuLogged(saved.menuLogged);
        }
      }
    } catch { /* ignore corrupt storage */ }
    setHydrated(true);
  }, []);

  // Persist on every change (after initial hydration, so we don't
  // immediately overwrite saved state with the pre-hydration defaults).
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(MENU_STORAGE_KEY, JSON.stringify({
        menuOpen, menu, menuCalTarget, menuDate, weeklyDate, menuMode, weeklyMenu, weeklyDayIdx, menuLogged,
      }));
      // Tell the reminder scheduler: a ticked meal must stop today's reminder
      // for it (and an un-tick brings it back). See useReminderSync.js.
      window.dispatchEvent(new Event('areto:menu-logged'));
    } catch { /* storage full / unavailable */ }
  }, [hydrated, menuOpen, menu, menuCalTarget, menuDate, weeklyDate, menuMode, weeklyMenu, weeklyDayIdx, menuLogged]);

  // Pull last 30 days of nutrition logs once. Today's meals come live
  // from the `todayData` prop so they react to immediate add/delete.
  useEffect(() => {
    if (!api) return;
    api('/nutrition/history').then(setHistory).catch(() => {});
  }, []); // eslint-disable-line

  // Today's targets are the server's numbers or nothing: no invented 2000 / 150 /
  // 250 / 65 / 30. 0 means "not loaded" — the screen says so and shows no percentage.
  const targetKnown = hasTargets(targets);
  const calorieTarget = targetKnown ? targets.calorieTarget : 0;
  const proteinTarget = targetKnown ? (targets.macros?.protein || 0) : 0;
  const carbsTarget = targetKnown ? (targets.macros?.carbs || 0) : 0;
  const fatTarget = targetKnown ? (targets.macros?.fat || 0) : 0;
  const fiberTarget = targetKnown ? (targets.macros?.fiberTarget || 0) : 0;

  const calorieProgress = todayData?.totalCalories || 0;
  const proteinProgress = todayData?.totalProtein || 0;
  const carbsProgress = todayData?.totalCarbs || 0;
  const fatProgress = todayData?.totalFat || 0;
  const fiberProgress = todayData?.totalFiber || 0;
  const caloriePct = calorieTarget > 0 ? (calorieProgress / calorieTarget) * 100 : 0;

  const dayLabelHe = ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'][new Date().getDay()];
  const dayLabelEn = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  async function fetchMenu(excludeId = null) {
    setMenuLoading(true);
    try {
      const url = excludeId ? `/nutrition/daily-menu?excludeId=${excludeId}` : '/nutrition/daily-menu';
      const res = await api(url);
      setMenu(res.menu);
      setMenuCalTarget(res.calorieTarget);
      setMenuDate(todayKey);
      setMenuMode('daily');
      setWeeklyMenu(null);
      setMenuOpen(true);
      // Fresh menu → nothing eaten from it yet.
      setMenuLogged({ date: new Date().toDateString(), idxs: [] });
    } catch (err) {
      console.error('Menu fetch error:', err);
    } finally {
      setMenuLoading(false);
    }
  }

  // Targets changed (weight or goal edited in Settings): show what moved and
  // rebuild the menu, unless today's menu already has the user's own state in it.
  const [targetChange, setTargetChange] = useState(() => {
    try { return JSON.parse(localStorage.getItem('nutrition:targetChange') || 'null'); } catch { return null; }
  });
  const [menuKept, setMenuKept] = useState(false);
  // Applies a pending change once (remembered by its timestamp), whether the
  // event arrived while this tab was open or the change was saved while it was
  // unmounted (Settings) and we only see it on the next mount.
  const applyTargetChange = () => {
    let tc = null; let appliedAt = null;
    try {
      tc = JSON.parse(localStorage.getItem('nutrition:targetChange') || 'null');
      appliedAt = localStorage.getItem('nutrition:targetChangeApplied');
    } catch { /* ignore */ }
    setTargetChange(tc);
    if (!tc || String(tc.at) === appliedAt) return;
    try { localStorage.setItem('nutrition:targetChangeApplied', String(tc.at)); } catch { /* ignore */ }
    const weeklyMeals = Array.isArray(weeklyMenu) ? weeklyMenu.flatMap((d) => d.meals || []) : [];
    const pseudo = menuMode === 'weekly' ? { meals: weeklyMeals } : menu;
    if (!pseudo) return; // no menu open: the next one is built with the new target
    if (menuHasUserState(pseudo, menuLogged, todayKey)) { setMenuKept(true); return; }
    setMenuKept(false);
    if (menuMode === 'weekly') fetchWeeklyMenu(); else fetchMenu();
  };
  useEffect(() => {
    if (hydrated) applyTargetChange();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);
  useEffect(() => {
    window.addEventListener('areto:targets-changed', applyTargetChange);
    return () => window.removeEventListener('areto:targets-changed', applyTargetChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menu, weeklyMenu, menuLogged, menuMode, todayKey]);
  // A menu is built for one day and one target. A saved menu from another day —
  // or sized for a target that no longer applies today (a workout turned a rest
  // day into a training day, a new weight) — is dropped, or rebuilt when it is
  // the one on screen. The user's own menu (ticked or edited) is kept: its
  // footer shows how far it is from the new target.
  const staleRefetch = useRef('');
  useEffect(() => {
    if (!hydrated) return;
    const liveTarget = targets?.calorieTarget; // not the 2000 display fallback: unknown stays unknown
    // The weekly menu is "the day it was built on + i": a new day invalidates all of it.
    if (weeklyMenu && weeklyDate !== todayKey) {
      setWeeklyMenu(null);
      if (menuOpen && menuMode === 'weekly') fetchWeeklyMenu();
      return;
    }
    if (menu) {
      const builtFor = menu.target?.calories ?? menuCalTarget;
      const reason = menuStaleReason({ savedDate: menuDate, today: todayKey, menuTarget: builtFor, currentTarget: liveTarget });
      if (!reason) return;
      if (reason === 'target' && menuHasUserState(menu, menuLogged, todayKey)) return;
      const key = `${todayKey}|${reason}|${builtFor}|${liveTarget}`;
      if (staleRefetch.current === key) return; // one rebuild per situation, never a loop
      staleRefetch.current = key;
      if (menuOpen && menuMode === 'daily') fetchMenu(); else setMenu(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, menu, menuDate, menuCalTarget, weeklyMenu, weeklyDate, menuOpen, menuMode, targets?.calorieTarget, todayKey]);
  const dismissTargetChange = () => {
    try { localStorage.removeItem('nutrition:targetChange'); } catch { /* ignore */ }
    setTargetChange(null); setMenuKept(false);
  };

  async function fetchWeeklyMenu() {
    setMenuLoading(true);
    try {
      const res = await api('/nutrition/weekly-menu');
      setWeeklyMenu(res.days);
      setWeeklyDayIdx(0);
      setMenuCalTarget(res.calorieTarget);
      setWeeklyDate(todayKey);
      setMenuMode('weekly');
      setMenu(null);
      setMenuOpen(true);
    } catch (err) {
      console.error('Weekly menu fetch error:', err);
    } finally {
      setMenuLoading(false);
    }
  }

  // ─── Generate styled PDF / printable HTML for the menu ───────
  function generateMenuHTML() {
    const typeHe = { breakfast: 'ארוחת בוקר', snack: 'חטיף', lunch: 'ארוחת צהריים', dinner: 'ארוחת ערב' };
    const typeEn = { breakfast: 'Breakfast', snack: 'Snack', lunch: 'Lunch', dinner: 'Dinner' };
    const typeLabel = (type) => isHe ? (typeHe[type] || type) : (typeEn[type] || type);
    const dateStr = new Date().toLocaleDateString(isHe ? 'he-IL' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    function renderDayHTML(dayMenu, title) {
      const meals = dayMenu.meals.map(m => `
        <div class="meal-card">
          <div class="meal-type">${typeLabel(m.type)}</div>
          <div class="meal-name">${isHe ? m.he : (m.en || m.he)}</div>
          <div class="meal-macros">
            <span class="m-cal">${m.calories} ${isHe ? 'קק"ל' : 'kcal'}</span>
            <span class="m-p">${isHe ? 'חלבון' : 'protein'} ${m.protein}g</span>
            <span class="m-c">${isHe ? 'פחמ\'' : 'carbs'} ${m.carbs}g</span>
            <span class="m-f">${isHe ? 'שומן' : 'fat'} ${m.fat}g</span>
          </div>
        </div>`).join('');
      return `<div class="day-title">${title}</div>${meals}
        <div class="day-total">
          <span>${isHe ? 'סה"כ' : 'Total'}: ${dayMenu.totalCalories} ${isHe ? 'קק"ל' : 'kcal'}</span>
          <span>${isHe ? 'חלבון' : 'Protein'}: ${dayMenu.totalProtein}g</span>
        </div>`;
    }

    let content = '';
    let pageTitle = '';
    if (menuMode === 'weekly' && weeklyMenu) {
      pageTitle = isHe ? 'התפריט השבועי שלי' : 'My Weekly Menu';
      const dayNames = isHe
        ? ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת']
        : ['Day 1','Day 2','Day 3','Day 4','Day 5','Day 6','Day 7'];
      content = weeklyMenu.map((d, i) => renderDayHTML(d, isHe ? `יום ${dayNames[i]}` : dayNames[i])).join('');
    } else if (menu) {
      pageTitle = isHe ? 'התפריט היומי שלי' : 'My Daily Menu';
      content = renderDayHTML(menu, isHe ? 'ארוחות היום' : 'Today\'s meals');
    }
    if (!content) return null;

    return `<!DOCTYPE html>
<html dir="${isHe ? 'rtl' : 'ltr'}" lang="${isHe ? 'he' : 'en'}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${pageTitle} — Areto</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',Arial,sans-serif;background:#080C13;color:#e2e8f0;padding:24px;max-width:700px;margin:0 auto;direction:${isHe ? 'rtl' : 'ltr'}}
.header{text-align:center;margin-bottom:28px;padding:22px;background:linear-gradient(135deg,rgba(47,227,194,.12),rgba(143,138,247,.08));border-radius:20px;border:1px solid rgba(47,227,194,.2)}
.logo{font-size:30px;font-weight:900;background:linear-gradient(135deg,#2FE3C2,#8F8AF7);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.subtitle{font-size:13px;color:#94a3b8;margin-top:4px}
.day-title{font-size:18px;font-weight:800;color:#2FE3C2;margin:24px 0 12px;display:flex;align-items:center;gap:10px}
.day-title::before{content:"";display:block;width:4px;height:22px;background:linear-gradient(#2FE3C2,#8F8AF7);border-radius:99px;flex-shrink:0}
.meal-card{background:var(--fill-faint);border:1px solid var(--border-subtle);border-radius:14px;padding:14px 18px;margin-bottom:9px}
.meal-type{font-size:11px;font-weight:700;color:#2FE3C2;letter-spacing:.6px;text-transform:uppercase;margin-bottom:5px}
.meal-name{font-size:15px;font-weight:600;color:#f1f5f9;margin-bottom:9px;line-height:1.4}
.meal-macros{display:flex;gap:12px;font-size:12px;font-weight:600;flex-wrap:wrap}
.m-cal{color:#FFB648}.m-p{color:#F5698C}.m-c{color:#4D9FFF}.m-f{color:#c084fc}
.day-total{background:rgba(47,227,194,.1);border:1px solid rgba(47,227,194,.35);border-radius:12px;padding:11px 15px;margin-top:4px;margin-bottom:6px;display:flex;gap:20px;font-size:14px;font-weight:700;color:#2FE3C2}
.print-btn{position:fixed;bottom:20px;${isHe ? 'left' : 'right'}:20px;background:linear-gradient(135deg,#2FE3C2,#1EC0A2);color:#04241B;border:none;border-radius:50px;padding:13px 26px;font-size:14px;font-weight:800;cursor:pointer;box-shadow:0 8px 24px rgba(47,227,194,.45);font-family:inherit}
.back-btn{position:fixed;bottom:20px;${isHe ? 'right' : 'left'}:20px;background:rgba(255,255,255,.08);color:#e2e8f0;border:1px solid rgba(255,255,255,.16);border-radius:50px;padding:13px 22px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit}
.back-hint{text-align:center;font-size:12px;color:#64748b;margin-top:18px;padding-bottom:70px}
/* Print / PDF overrides — placed LAST so they win over the screen rules above
   (equal specificity → later source order wins). */
@media print{body{background:#fff;color:#111;padding:0}.no-print{display:none!important}.header{background:#f0fdfa;border-color:#99f6e4}.logo{-webkit-text-fill-color:#0d1224;background:none;color:#0d1224}.subtitle{color:#64748b}.day-title{color:#1EC0A2}.meal-card{background:#f8f9fa;border-color:#dee2e6}.meal-type{color:#1EC0A2}.meal-name{color:#1a1a2e}.m-cal{color:#b45309}.m-p{color:#dc2626}.m-c{color:#2563eb}.m-f{color:#9333ea}.day-total{background:#e8f8f5;border-color:#2FE3C2;color:#0d6e60}}
</style>
</head>
<body>
<div class="header">
  <div class="logo">Areto</div>
  <div class="subtitle">${pageTitle} · ${dateStr}</div>
</div>
${content}
<div class="back-hint no-print">${isHe ? 'אפשר גם לסגור את הכרטיסייה הזו כדי לחזור' : 'You can also just close this tab to go back'}</div>
<button class="back-btn no-print" onclick="window.close()">${isHe ? '← חזרה לאפליקציה' : '← Back to app'}</button>
<button class="print-btn no-print" onclick="window.print()">${isHe ? '📥 שמור כ-PDF' : '📥 Save as PDF'}</button>
</body>
</html>`;
  }


  async function handleDownloadMenu() {
    try {
      // window.open + window.print() is a browser-only trick: inside the
      // Capacitor WebView, window.open has no real target to open into, and
      // the app was left stuck when the user tried to navigate back from it.
      // On native, hand the same HTML to Android's own print pipeline (see
      // PrintPdfPlugin.java) — it renders the page in a real WebView and
      // opens the system print dialog; tapping "Save as PDF" there produces
      // a real PDF file. A fully silent, zero-tap save was attempted but
      // reverted — hand-capturing the WebView's pixels produced blank or
      // corrupted output on this device's WebView build.
      const html = generateMenuHTML();
      if (!html) return;
      if (isNative) {
        const { registerPlugin } = await import('@capacitor/core');
        const PrintPdf = registerPlugin('PrintPdf');
        const filename = isHe ? 'התפריט שלי' : 'my-menu';
        await PrintPdf.printHtml({ html, jobName: filename });
        return;
      }
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(html);
        win.document.close();
      }
    } catch (err) {
      console.error('Download menu error:', err);
      setMessage(isHe ? 'שגיאה בהורדת הקובץ' : 'Failed to download file');
      setTimeout(() => setMessage(''), 4000);
    }
  }

  async function swapMealAtIndex(idx) {
    const current = menu?.meals?.[idx];
    if (!current) return;
    setSwappingIdx(idx);
    try {
      const params = new URLSearchParams({
        type: current.type,
        calories: String(current.calories),
        excludeText: current.he,
      });
      // Tell the server where the day stands, so the replacement keeps it near the target.
      const dayTarget = menu.target?.calories ?? menuCalTarget ?? targets?.calorieTarget;
      const dayTotal = sumMeals(menu.meals, 'calories');
      if (dayTarget > 0 && dayTotal > 0) {
        params.set('dayTotal', String(Math.round(dayTotal)));
        params.set('target', String(Math.round(dayTarget)));
      }
      const res = await api(`/nutrition/swap-meal?${params.toString()}`);
      const newMeal = res.meal;
      setMenu(prev => {
        if (!prev) return prev;
        const newMeals = prev.meals.map((m, i) => (i === idx ? newMeal : m));
        const sum = (key) => newMeals.reduce((acc, m) => acc + (m[key] || 0), 0);
        return {
          ...prev,
          meals: newMeals,
          totalCalories: sum('calories'),
          totalProtein: sum('protein'),
          totalCarbs: sum('carbs'),
          totalFat: sum('fat'),
        };
      });
    } catch (err) {
      console.error('Swap meal error:', err);
      setMessage(err.message || t.menuError);
      setTimeout(() => setMessage(''), 4000);
    } finally {
      setSwappingIdx(null);
    }
  }

  async function swapWeeklyMealAt(dayIdx, mealIdx) {
    const day = weeklyMenu?.[dayIdx];
    const current = day?.meals?.[mealIdx];
    if (!current) return;
    const key = `${dayIdx}-${mealIdx}`;
    setSwappingIdx(key);
    try {
      const params = new URLSearchParams({
        type: current.type,
        calories: String(current.calories),
        excludeText: current.he,
      });
      const dayTarget = day.dayTarget?.calories;
      const dayTotal = sumMeals(day.meals, 'calories');
      if (dayTarget > 0 && dayTotal > 0) {
        params.set('dayTotal', String(Math.round(dayTotal)));
        params.set('target', String(Math.round(dayTarget)));
      }
      const res = await api(`/nutrition/swap-meal?${params.toString()}`);
      const newMeal = res.meal;
      setWeeklyMenu(prev => {
        if (!prev) return prev;
        return prev.map((d, di) => {
          if (di !== dayIdx) return d;
          const newMeals = d.meals.map((m, mi) => (mi === mealIdx ? newMeal : m));
          const sum = (k) => newMeals.reduce((acc, m) => acc + (m[k] || 0), 0);
          return { ...d, meals: newMeals, totalCalories: sum('calories'), totalProtein: sum('protein'), totalCarbs: sum('carbs'), totalFat: sum('fat') };
        });
      });
    } catch (err) {
      console.error('Weekly swap error:', err);
      setMessage(err.message || t.menuError);
      setTimeout(() => setMessage(''), 4000);
    } finally {
      setSwappingIdx(null);
    }
  }

  async function logMenuMeal(idx) {
    const meal = menu?.meals?.[idx];
    if (!meal) return;
    setLoggingIdx(idx);
    try {
      const description = isHe ? meal.he : (meal.en || meal.he);
      const result = await api('/nutrition/log', {
        method: 'POST',
        body: JSON.stringify({ description, nutrition: logValuesOf(meal) }),
      });
      if (showXP && result?.xp) showXP(result.xp);
      // Mark this menu row as eaten so its button flips to "done".
      setMenuLogged(prev => {
        const base = prev.date === todayKey ? prev.idxs : [];
        return { date: todayKey, idxs: base.includes(idx) ? base : [...base, idx] };
      });
      showLogged(result);
      onUpdate();
    } catch (err) {
      flashError(err.message || t.errorSaving);
    } finally {
      setLoggingIdx(null);
    }
  }

  // The inverse of logMenuMeal: find the today's-log entry that matches this
  // menu row's description and delete it, so "mark eaten" is fully reversible
  // from the menu itself (mirrors the description-match un-mark that already
  // happens when deleting from the log — see handleDeleteMeal).
  async function unmarkMenuMeal(idx) {
    const meal = menu?.meals?.[idx];
    if (!meal) return;
    const wantedHe = (meal.he || '').trim().toLowerCase();
    const wantedEn = (meal.en || '').trim().toLowerCase();
    const match = (todayData?.meals || []).find((m) => {
      const d = (m.description || '').trim().toLowerCase();
      return d === wantedHe || d === wantedEn;
    });
    if (!match) {
      // No matching log entry to undo (e.g. it was already deleted elsewhere) —
      // still clear the local checkmark so the UI isn't stuck showing "done".
      setMenuLogged((prev) => ({ ...prev, idxs: (prev.idxs || []).filter((i) => i !== idx) }));
      return;
    }
    setLoggingIdx(idx);
    try {
      await api(`/nutrition/meal/${match._id}`, { method: 'DELETE' });
      setMenuLogged((prev) => ({ ...prev, idxs: (prev.idxs || []).filter((i) => i !== idx) }));
      onUpdate();
    } catch (err) {
      setMessage(err.message || t.errorDeleting);
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setLoggingIdx(null);
    }
  }

  async function handleAddFood(e) {
    e.preventDefault();
    if (!foodInput.trim()) return;
    setLoading(true);
    setMessage('');
    setNotFound(null);
    try {
      const result = await api('/nutrition/log', {
        method: 'POST',
        body: JSON.stringify({ description: foodInput.trim() }),
      });
      setFoodInput('');
      setPick(null);
      if (showXP && result?.xp) showXP(result.xp);
      showLogged(result);
      onUpdate();
    } catch (err) {
      if (err.code === 'FOOD_NOT_FOUND') {
        // Not in the database: nothing was logged. Keep the text so the user can fix it,
        // pick from the list, or type the numbers (see ManualMealForm).
        setNotFound({ text: foodInput.trim(), manual: false });
      } else {
        flashError(err.message || t.errorSaving);
      }
    } finally {
      setLoading(false);
    }
  }

  // Save a meal whose numbers the user typed (the "not found" flow). The server checks
  // the ranges again and stores it with source 'manual'.
  async function handleManualSave({ description, nutrition }) {
    setManualBusy(true);
    setManualError('');
    try {
      const result = await api('/nutrition/log', {
        method: 'POST',
        body: JSON.stringify({ description, nutrition }),
      });
      setNotFound(null);
      setFoodInput('');
      if (showXP && result?.xp) showXP(result.xp);
      showLogged(result);
      onUpdate();
    } catch (err) {
      setManualError(err.message || t.errorSaving);
    } finally {
      setManualBusy(false);
    }
  }

  // A "recent" chip logs that meal again WITH ITS OWN STORED VALUES. It used to send
  // only the text, so the server re-read it: a hand-typed meal was not found, and (the
  // emoji strip below used to cut the first digit off "200 גרם …", turning it into
  // "00 גרם …") the quantity could be lost.
  async function handleQuickChip(meal) {
    setLoading(true);
    setMessage('');
    try {
      const result = await api('/nutrition/log', {
        method: 'POST',
        body: JSON.stringify({ description: meal.description, nutrition: restoreValuesOf(meal) }),
      });
      if (showXP && result?.xp) showXP(result.xp);
      showLogged(result);
      onUpdate();
    } catch (err) {
      flashError(err.message || t.errorSaving);
    } finally {
      setLoading(false);
    }
  }

  // Search-as-you-type against FOOD_DB. Debounced; a stale response can't
  // overwrite a newer one because we drop it if the query moved on.
  useEffect(() => {
    const q = foodInput.trim();
    if (menuOpen || q.length < 2) { setSearchResults([]); return; }
    let cancelled = false;
    const id = setTimeout(async () => {
      try {
        const res = await api(`/nutrition/search?q=${encodeURIComponent(q)}`);
        if (!cancelled) setSearchResults(res.results || []);
      } catch { if (!cancelled) setSearchResults([]); }
    }, 250);
    return () => { cancelled = true; clearTimeout(id); };
  }, [foodInput, menuOpen]); // eslint-disable-line

  // Tapping a result opens the amount picker (one serving, or 100 g, to start): the user
  // sees what that portion is worth and how much of today's target it takes, and only
  // then adds it. What is saved is exactly the numbers shown.
  function addSearchResult(food) {
    setSearchResults([]);
    setNotFound(null);
    setMessage('');
    setPick({ food, gramsText: String(defaultGrams(food)) });
  }

  async function confirmPick() {
    const grams = pick && parseGrams(pick.gramsText);
    if (!grams) return;
    setLoading(true);
    setMessage('');
    try {
      const result = await api('/nutrition/log', {
        method: 'POST',
        body: JSON.stringify(pickPayload(pick.food, grams, isHe)),
      });
      setPick(null);
      setFoodInput('');
      if (showXP && result?.xp) showXP(result.xp);
      showLogged(result);
      onUpdate();
    } catch (err) {
      flashError(err.message || t.errorSaving);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteMeal(mealId) {
    const meal = todayData?.meals?.find(m => m._id === mealId);
    setDeletingId(mealId);
    try {
      const res = await api(`/nutrition/meal/${mealId}`, { method: 'DELETE' });
      if (meal) {
        setLastDeletedMeal(meal);
        setDeleteNote(remainingLine(res, isHe) || '');
        clearTimeout(toastTimer.current);
        setWarnMessage('');
        setMessage('__MEAL_DELETED__');
        toastTimer.current = setTimeout(() => { setMessage(''); setLastDeletedMeal(null); setDeleteNote(''); }, 8000);
        // Un-mark the matching menu row so the button flips back to "סמן שאכלתי"
        const mealDesc = (meal.description || '').trim().toLowerCase();
        const matchedIdx = (menu?.meals || []).findIndex(m => {
          return (m.he || '').trim().toLowerCase() === mealDesc ||
                 (m.en || '').trim().toLowerCase() === mealDesc;
        });
        if (matchedIdx >= 0) {
          setMenuLogged(prev => ({ ...prev, idxs: prev.idxs.filter(i => i !== matchedIdx) }));
        }
      } else {
        setMessage(t.mealDeleted);
        setTimeout(() => setMessage(''), 3000);
      }
      onUpdate();
    } catch (err) {
      setMessage(t.errorDeleting);
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setDeletingId(null);
    }
  }

  // Undo of a delete puts the meal back EXACTLY as it was (its stored values), instead of
  // re-reading the description — which could give different numbers or, for a meal the
  // user typed by hand, not find it at all.
  async function handleUndoMeal() {
    if (!lastDeletedMeal) return;
    try {
      const result = await api('/nutrition/log', {
        method: 'POST',
        body: JSON.stringify({ description: lastDeletedMeal.description, nutrition: restoreValuesOf(lastDeletedMeal) }),
      });
      setLastDeletedMeal(null);
      setDeleteNote('');
      showLogged(result);
      onUpdate();
    } catch (err) {
      flashError(err.message || t.errorSaving);
    }
  }

  // Build the timeline: logged meals (done) + planned menu meals (now/upcoming)
  const loggedMeals = todayData?.meals || [];
  const menuMeals = menu?.meals || [];
  const weeklyDayMeals = weeklyMenu?.[weeklyDayIdx]?.meals || [];

  // "now" = the first menu row the user hasn't yet ticked as eaten.
  // Rows in loggedMenuSet are 'done'; the earliest remaining one is 'now';
  // the rest are 'upcoming'. Driven by explicit taps (loggedMenuSet) rather
  // than a raw logged-meal count, so marking a meal actually sticks.
  // -1 when every meal is eaten (the menu view then shows the "done" state
  // instead of repeating meal 0 as "up next").
  const nowIdx = menuMeals.length > 0 ? nextMealIndex(menuMeals, loggedMenuSet) : -1;
  const menuTimes = mealTimes(menuMeals);
  const weeklyTimes = mealTimes(weeklyDayMeals);
  function menuMealStatus(idx) {
    if (loggedMenuSet.has(idx)) return 'done';
    return idx === nowIdx ? 'now' : 'upcoming';
  }

  const isMealUndo = message === '__MEAL_DELETED__';
  const isError = (!!errorMessage && message === errorMessage) || message === t.errorSaving || message === t.errorDeleting;
  const isWarn = !isError && !!warnMessage && message === warnMessage;

  // Quick-add chips: derived from the user's own recent meals.
  // We merge today's live log with the last-30-day history, dedupe by
  // description (case-insensitive, normalized), keep the most recent
  // occurrence, and take the top 6. If the user has never logged a meal,
  // the chips section is hidden entirely.
  const quickChips = useMemo(() => {
    const seen = new Set();
    const out = [];
    const all = [
      ...(todayData?.meals || []),
      ...history.flatMap(h => h.meals || []),
    ];
    // Sort newest first by `time` (or createdAt) when available
    all.sort((a, b) => {
      const ta = new Date(a.time || a.createdAt || 0).getTime();
      const tb = new Date(b.time || b.createdAt || 0).getTime();
      return tb - ta;
    });
    for (const m of all) {
      const desc = (m.description || '').trim();
      if (!desc) continue;
      // An old made-up placeholder meal (source 'default') is not offered again as a chip.
      if (m.source === 'default') continue;
      const key = desc.toLowerCase().replace(/\s+/g, ' ');
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(m); // the whole meal: a chip logs it again with its own stored values
      if (out.length >= 6) break;
    }
    return out;
  }, [todayData?.meals, history]);

  const pctOf = (cur, tgt) => (tgt > 0 ? Math.min(100, Math.round((cur / tgt) * 100)) : 0);

  return (
    <>
      {/* Header + log/menu toggle (prototype) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: 'var(--text-1)' }}>{isHe ? 'תזונה' : 'Nutrition'}</h1>
        <div style={{ display: 'flex', background: 'var(--surface)', border: '1px solid var(--border-subtle)', borderRadius: 999, padding: 3 }}>
          <button type="button" onClick={() => setMenuOpen(false)}
            style={{ fontSize: 12.5, fontWeight: 600, borderRadius: 999, padding: '6px 14px', cursor: 'pointer', border: 'none', fontFamily: 'inherit',
              color: !menuOpen ? '#04241B' : '#93A0B4', background: !menuOpen ? '#2FE3C2' : 'transparent' }}>
            {isHe ? 'היומן שלי' : 'My log'}
          </button>
          <button type="button" onClick={() => { if (!menu) fetchMenu(); else setMenuOpen(true); }}
            style={{ fontSize: 12.5, fontWeight: 600, borderRadius: 999, padding: '6px 14px', cursor: 'pointer', border: 'none', fontFamily: 'inherit',
              color: menuOpen ? '#04241B' : '#93A0B4', background: menuOpen ? '#2FE3C2' : 'transparent' }}>
            {isHe ? 'תפריט מומלץ' : 'Menu'}
          </button>
        </div>
      </div>

      {dayType && (
        <div style={{ marginTop: 14, display: 'flex', alignItems: 'flex-start', gap: 10, background: dayType.type === 'training' ? 'rgba(47,227,194,.08)' : 'rgba(143,138,247,.08)', border: `1px solid ${dayType.type === 'training' ? 'rgba(47,227,194,.22)' : 'rgba(143,138,247,.22)'}`, borderRadius: 14, padding: '10px 14px' }}>
          <div style={{ fontSize: 13.5, color: 'var(--text-1)', lineHeight: 1.6 }}>
            <strong>{dayType.type === 'training' ? (isHe ? 'יום אימון' : 'Training day') : (isHe ? 'יום מנוחה' : 'Rest day')}</strong>
            <span style={{ color: 'var(--text-3)' }}>
              {' · '}
              {dayType.deltaPct === 0
                ? (isHe ? 'יעד היום כרגיל' : 'today\'s target as usual')
                : (isHe
                    ? `יעד היום מותאם ${dayType.deltaPct > 0 ? '+' : '−'}${Math.abs(dayType.deltaPct)}% (הממוצע השבועי לא משתנה)`
                    : `today's target ${dayType.deltaPct > 0 ? '+' : '−'}${Math.abs(dayType.deltaPct)}% (weekly average unchanged)`)}
            </span>
            {dayType.type === 'rest' && (
              <div style={{ color: 'var(--text-2)', fontSize: 12.5 }}>
                {isHe ? 'מנוחה היא חלק מהאימון: השרירים בונים את עצמם בהתאוששות. גם ביום מנוחה, תיעוד ארוחה או שינה שומר על הרצף.' : 'Rest is part of training: muscle is built while you recover. Logging a meal or sleep still keeps your streak.'}
              </div>
            )}
          </div>
        </div>
      )}

      {targetChange && (
        <div role="status" style={{ marginTop: 14, background: 'rgba(143,138,247,.08)', border: '1px solid rgba(143,138,247,.22)', borderRadius: 14, padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <div style={{ flex: 1, fontSize: 13.5, color: 'var(--text-1)', lineHeight: 1.6 }}>
            <strong>{isHe ? 'היעד היומי עודכן' : 'Your daily target was updated'}</strong>
            <div style={{ color: 'var(--text-2)' }}>
              {Math.round(targetChange.from.calorieTarget).toLocaleString()} → {Math.round(targetChange.to.calorieTarget).toLocaleString()} {isHe ? 'קק״ל' : 'kcal'}
              {' · '}{isHe ? 'חלבון' : 'protein'} {Math.round(targetChange.from.protein)} → {Math.round(targetChange.to.protein)}g
            </div>
            <div style={{ color: 'var(--text-3)', fontSize: 12.5 }}>
              {menuKept
                ? (isHe ? 'התפריט של היום נשמר, כי כבר אכלת ממנו או ערכת אותו. התפריט החדש יתאים ליעד מהפעם הבאה.' : 'Today’s menu was kept because you already ate from it or edited it. New menus use the new target.')
                : (isHe ? 'התפריט הותאם ליעד החדש.' : 'The menu was rebuilt for the new target.')}
            </div>
          </div>
          <button type="button" onClick={dismissTargetChange} aria-label={isHe ? 'סגור' : 'Dismiss'} style={{ minWidth: 40, minHeight: 40, background: 'none', border: 'none', color: 'var(--text-3)', fontSize: 20, cursor: 'pointer' }}>×</button>
        </div>
      )}

      {/* Menu controls: daily/weekly switch + PDF export. Both call functions
          the rebuild left in place but stopped rendering. */}
      {menuOpen && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
          <div style={{ display: 'flex', background: 'var(--surface)', border: '1px solid var(--border-subtle)', borderRadius: 999, padding: 3 }}>
            <button type="button" onClick={() => { setMenuMode('daily'); if (!menu) fetchMenu(); }}
              style={{ fontSize: 12.5, fontWeight: 600, borderRadius: 999, padding: '6px 14px', cursor: 'pointer', border: 'none', fontFamily: 'inherit',
                color: menuMode === 'daily' ? '#04241B' : '#93A0B4', background: menuMode === 'daily' ? '#2FE3C2' : 'transparent' }}>
              {isHe ? 'יומי' : 'Daily'}
            </button>
            <button type="button" onClick={() => { setMenuMode('weekly'); if (!weeklyMenu) fetchWeeklyMenu(); }}
              style={{ fontSize: 12.5, fontWeight: 600, borderRadius: 999, padding: '6px 14px', cursor: 'pointer', border: 'none', fontFamily: 'inherit',
                color: menuMode === 'weekly' ? '#04241B' : '#93A0B4', background: menuMode === 'weekly' ? '#2FE3C2' : 'transparent' }}>
              {isHe ? 'שבועי' : 'Weekly'}
            </button>
          </div>
          <button type="button" onClick={handleDownloadMenu} disabled={menuMode === 'weekly' ? !weeklyMenu : !menu}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', color: '#93A0B4', fontSize: 12.5 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
            </svg>
            {isHe ? 'הורד PDF' : 'Download PDF'}
          </button>
        </div>
      )}

      {/* Weekly menu — day pills + the selected day's meal cards + total */}
      {menuOpen && menuMode === 'weekly' && (
        weeklyMenu ? (
          <>
            <div style={{ display: 'flex', gap: 8, marginTop: 16, overflowX: 'auto', paddingBottom: 4 }}>
              {weeklyMenu.map((_, i) => {
                const on = i === weeklyDayIdx;
                return (
                  <button key={i} type="button" onClick={() => setWeeklyDayIdx(i)}
                    style={{ flex: 'none', fontSize: 13, fontWeight: on ? 600 : 400, borderRadius: 999, padding: '8px 15px', cursor: 'pointer', fontFamily: 'inherit',
                      border: on ? 'none' : '1px solid var(--border-subtle)',
                      color: on ? '#04241B' : '#93A0B4', background: on ? '#2FE3C2' : 'var(--surface)' }}>
                    {isHe ? `יום ${i + 1}` : `Day ${i + 1}`}
                  </button>
                );
              })}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 18 }}>
              {weeklyDayMeals.map((meal, mi) => (
                <div key={mi} style={{ background: 'var(--surface)', border: '1px solid var(--border-faint)', borderRadius: 16, padding: '15px 17px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--text-1)' }}>
                      {isHe ? ({ breakfast: 'ארוחת בוקר', snack: 'חטיף', lunch: 'צהריים', dinner: 'ערב' }[meal.type] || meal.type)
                            : ({ breakfast: 'Breakfast', snack: 'Snack', lunch: 'Lunch', dinner: 'Dinner' }[meal.type] || meal.type)}
                    </span>
                    <span style={{ fontSize: 12.5, color: '#7C8798', fontVariantNumeric: 'tabular-nums' }}>{weeklyTimes[mi] || '—'}</span>
                  </div>
                  <div style={{ fontSize: 13.5, color: '#93A0B4', marginTop: 5, lineHeight: 1.6 }}>{isHe ? meal.he : (meal.en || meal.he)}</div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <span style={{ fontSize: 11, color: '#F5698C', background: 'rgba(245,105,140,.08)', borderRadius: 999, padding: '3px 9px' }}>{meal.protein}g {isHe ? 'חלבון' : 'protein'}</span>
                    <span style={{ fontSize: 11, color: '#7C8798', background: 'var(--fill-faint)', borderRadius: 999, padding: '3px 9px' }}>{meal.calories} {isHe ? 'קק״ל' : 'kcal'}</span>
                    <span style={{ fontSize: 11, color: '#4D9FFF', background: 'rgba(77,159,255,.08)', borderRadius: 999, padding: '3px 9px' }}>{meal.carbs}g {isHe ? 'פחמ׳' : 'carbs'}</span>
                    <span style={{ fontSize: 11, color: '#7C8798', background: 'var(--fill-faint)', borderRadius: 999, padding: '3px 9px' }}>{meal.fat}g {isHe ? 'שומן' : 'fat'}</span>
                    {Array.isArray(meal.items) && meal.items.length > 0 && (
                      <button type="button" onClick={() => setWeeklyOpenKey(weeklyOpenKey === `${weeklyDayIdx}-${mi}` ? null : `${weeklyDayIdx}-${mi}`)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', color: 'var(--text-3)', fontSize: 11.5, minHeight: 28, padding: '0 4px' }}>
                        {isHe ? 'פירוט' : 'Foods'}
                      </button>
                    )}
                    <button type="button" onClick={() => swapWeeklyMealAt(weeklyDayIdx, mi)} disabled={swappingIdx === `${weeklyDayIdx}-${mi}`}
                      style={{ marginInlineStart: 'auto', display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', color: '#7C8798', fontSize: 12 }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M7 8h11l-3-3M17 16H6l3 3" /></svg>
                      {isHe ? 'החלף' : 'Swap'}
                    </button>
                  </div>
                  {weeklyOpenKey === `${weeklyDayIdx}-${mi}` && <MealItemsList meal={meal} isHe={isHe} />}
                </div>
              ))}
            </div>
            {weeklyMenu[weeklyDayIdx] && (
              <MenuTargetSummary
                meals={weeklyMenu[weeklyDayIdx].meals}
                target={weeklyMenu[weeklyDayIdx].dayTarget}
                approximate={weeklyMenu[weeklyDayIdx].approximate}
                isHe={isHe}
                label={(isHe ? `סה״כ יום ${weeklyDayIdx + 1}` : `Day ${weeklyDayIdx + 1} total`)
                  + (weeklyMenu[weeklyDayIdx].dayTarget?.dayType
                    ? ` · ${weeklyMenu[weeklyDayIdx].dayTarget.dayType.type === 'training' ? (isHe ? 'יום אימון' : 'training') : (isHe ? 'יום מנוחה' : 'rest')}`
                    : '')}
              />
            )}
          </>
        ) : (
          <div style={{ textAlign: 'center', color: '#7C8798', fontSize: 14, padding: 40 }}>
            {menuLoading ? (isHe ? 'טוען…' : 'Loading…') : (isHe ? 'טוען תפריט שבועי…' : 'Loading weekly menu…')}
          </div>
        )
      )}

      {/* Calorie summary card — one block instead of three stat tiles */}
      {!menuOpen && (
        <div style={{ marginTop: 16, background: 'var(--surface)', border: '1px solid var(--border-faint)', borderRadius: 20, padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div>
              <span style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-1)' }}>{Math.round(calorieProgress).toLocaleString()}</span>
              {targetKnown
                ? <span style={{ fontSize: 13.5, color: '#7C8798' }}> / {calorieTarget.toLocaleString()} {isHe ? 'קק״ל' : 'kcal'}</span>
                : (
                  <span style={{ fontSize: 13, color: '#FFB648' }}>
                    {' '}{isHe ? 'קק״ל · יעד לא נטען' : 'kcal · target not loaded'}{' '}
                    <button type="button" onClick={() => onUpdate && onUpdate()}
                      style={{ background: 'none', border: 'none', color: 'var(--accent)', fontFamily: 'inherit', fontSize: 13, textDecoration: 'underline', cursor: 'pointer', padding: 0 }}>
                      {isHe ? 'נסה שוב' : 'Retry'}
                    </button>
                  </span>
                )}
            </div>
            <span style={{ fontSize: 12.5, color: '#7C8798' }}>
              {(todayData?.meals || []).length} {isHe ? 'ארוחות' : 'meals'}
            </span>
          </div>
          <div style={{ height: 7, borderRadius: 4, background: 'var(--border-faint)', marginTop: 12 }}>
            <div style={{ width: `${pctOf(calorieProgress, calorieTarget)}%`, height: 7, borderRadius: 4, background: 'linear-gradient(90deg,#1EC0A2,#36E8C6)' }} />
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 14 }}>
            {[
              { label: isHe ? 'חלבון' : 'Protein', cur: proteinProgress, tgt: proteinTarget, color: '#F5698C' },
              { label: isHe ? 'פחמ׳' : 'Carbs', cur: carbsProgress, tgt: carbsTarget, color: '#4D9FFF' },
              { label: isHe ? 'שומן' : 'Fat', cur: fatProgress, tgt: fatTarget, color: '#FFB648' },
            ].map((m) => (
              <div key={m.label} style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, marginBottom: 4 }}>
                  <span style={{ color: '#93A0B4' }}>{m.label}</span>
                  <span style={{ color: m.color, fontWeight: 600 }}>{Math.round(m.cur)}g</span>
                </div>
                <div style={{ height: 4, borderRadius: 2, background: 'var(--border-faint)' }}>
                  <div style={{ width: `${pctOf(m.cur, m.tgt)}%`, height: 4, borderRadius: 2, background: m.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search + quick chips + toasts belong to the log view only. */}
      <div className="quick-add" style={{ display: menuOpen ? 'none' : undefined }}>
        <form onSubmit={handleAddFood}>
          <div className="quick-add__row">
            <div className="quick-add__search">
              <input
                type="text"
                placeholder={isHe ? 'חפש מזון...' : 'Search food...'}
                value={foodInput}
                onChange={(e) => { setFoodInput(e.target.value); setPick(null); setNotFound((nf) => (nf && !nf.manual ? null : nf)); }}
                disabled={loading}
                maxLength={500}
              />
            </div>
            <button
              type="submit"
              className="btn btn-accent"
              disabled={loading || !foodInput.trim()}
              style={{ whiteSpace: 'nowrap' }}
            >
              <PlusIcon />
              {loading ? t.saving : (isHe ? 'הוסף' : 'Add')}
            </button>
          </div>
        </form>

        {/* The typed food is not in the database. Nothing was logged and no numbers
            were guessed: the user rewords it, picks from the list below, or types
            the values themselves. */}
        {notFound && (
          <div role="alert" style={{ marginTop: 12, padding: '12px 14px', borderRadius: 'var(--r-md)', background: 'rgba(255,182,72,.10)', border: '1px solid rgba(255,182,72,.30)' }}>
            <div style={{ fontSize: 14, color: 'var(--text-1)', lineHeight: 1.6, overflowWrap: 'anywhere' }}>
              {isHe ? `לא מצאנו את ״${notFound.text}״ במאגר.` : `We couldn't find “${notFound.text}”.`}
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--text-3)', lineHeight: 1.6, marginTop: 4 }}>
              {isHe
                ? 'נסו לנסח אחרת (למשל ״150 גרם אורז״), לבחור מהרשימה שמופיעה בזמן ההקלדה, או להזין את הערכים ידנית.'
                : 'Try rewording it (for example “150 g rice”), pick from the list that appears as you type, or enter the values yourself.'}
            </div>
            {!notFound.manual && (
              <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
                <button type="button" className="btn btn-accent" style={{ minHeight: 44 }}
                  onClick={() => { setManualError(''); setNotFound({ ...notFound, manual: true }); }}>
                  {isHe ? 'הזן ערכים ידנית' : 'Enter values yourself'}
                </button>
                <button type="button" onClick={() => setNotFound(null)}
                  style={{ minHeight: 44, padding: '0 14px', borderRadius: 12, border: '1px solid var(--border)', background: 'none', color: 'var(--text-2)', fontFamily: 'inherit', fontSize: 14, cursor: 'pointer' }}>
                  {isHe ? 'סגור' : 'Dismiss'}
                </button>
              </div>
            )}
            {notFound.manual && (
              <ManualMealForm
                isHe={isHe}
                initialName={notFound.text}
                busy={manualBusy}
                serverError={manualError}
                onSubmit={handleManualSave}
                onCancel={() => { setNotFound(null); setManualError(''); }}
              />
            )}
          </div>
        )}

        {/* Live matches from the food database, shown while typing. */}
        {pick && (() => {
          const grams = parseGrams(pick.gramsText);
          const n = grams ? portionNumbers(pick.food, grams) : null;
          const calShare = n ? shareOfTarget(n.calories, calorieTarget) : null;
          const protShare = n ? shareOfTarget(n.protein, proteinTarget) : null;
          const setGrams = (g) => setPick((p) => ({ ...p, gramsText: String(Math.max(1, Math.min(2000, Math.round(g)))) }));
          const base = grams || defaultGrams(pick.food);
          const serving = pick.food.serving > 0 ? Math.round(pick.food.serving) : null;
          const stepBtn = { minWidth: 44, minHeight: 44, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--fill-faint)', color: 'var(--text-1)', fontSize: 20, cursor: 'pointer', fontFamily: 'inherit' };
          const chipBtn = (active) => ({ minHeight: 36, padding: '0 12px', borderRadius: 999, border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`, background: active ? 'var(--accent-glow)' : 'none', color: active ? 'var(--accent)' : 'var(--text-2)', fontFamily: 'inherit', fontSize: 13, cursor: 'pointer' });
          return (
            <div className="food-pick" style={{ marginTop: 12, padding: 14, borderRadius: 16, background: 'var(--surface)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-1)' }}>
                {isHe ? (pick.food.nameHe || pick.food.name) : (pick.food.nameEn || pick.food.name)}
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--text-4)', marginTop: 2 }}>
                {isHe ? 'ל-100 גרם' : 'Per 100 g'}: {pick.food.cal} {isHe ? 'קק״ל' : 'kcal'} · {pick.food.p}g {isHe ? 'חלבון' : 'protein'}
              </div>
              <label htmlFor="pick-grams" style={{ display: 'block', fontSize: 12, color: 'var(--text-3)', margin: '12px 0 4px' }}>
                {isHe ? 'כמות (גרם)' : 'Amount (grams)'}
              </label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button type="button" style={stepBtn} aria-label={isHe ? 'הפחת 10 גרם' : 'Less by 10 g'} onClick={() => setGrams(base - 10)} disabled={loading}>−</button>
                <input id="pick-grams" type="text" inputMode="numeric" dir="ltr" autoComplete="off" value={pick.gramsText} disabled={loading}
                  onChange={(e) => setPick((p) => ({ ...p, gramsText: e.target.value }))}
                  aria-invalid={!grams}
                  style={{ flex: 1, minWidth: 0, minHeight: 44, boxSizing: 'border-box', textAlign: 'center', padding: '8px 12px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-1)', fontFamily: 'inherit', fontSize: 16 }} />
                <button type="button" style={stepBtn} aria-label={isHe ? 'הוסף 10 גרם' : 'More by 10 g'} onClick={() => setGrams(base + 10)} disabled={loading}>+</button>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                {serving && serving !== 100 && (
                  <button type="button" style={chipBtn(grams === serving)} onClick={() => setGrams(serving)} disabled={loading}>
                    {isHe ? `מנה · ${serving} ג׳` : `1 serving · ${serving} g`}
                  </button>
                )}
                <button type="button" style={chipBtn(grams === 100)} onClick={() => setGrams(100)} disabled={loading}>{isHe ? '100 ג׳' : '100 g'}</button>
              </div>
              <div style={{ marginTop: 12, fontSize: 14, color: 'var(--text-1)', fontVariantNumeric: 'tabular-nums', lineHeight: 1.6 }}>
                {n ? (
                  <>
                    <strong>{n.calories} {isHe ? 'קק״ל' : 'kcal'}</strong> · {n.protein}g {isHe ? 'חלבון' : 'protein'} · {n.carbs}g {isHe ? 'פחמ׳' : 'carbs'} · {n.fat}g {isHe ? 'שומן' : 'fat'}
                    {calShare !== null && (
                      <div style={{ fontSize: 12.5, color: 'var(--text-3)' }}>
                        {isHe ? `${calShare}% מיעד הקלוריות להיום` : `${calShare}% of today's calorie target`}
                        {protShare !== null && (isHe ? ` · ${protShare}% מיעד החלבון` : ` · ${protShare}% of the protein target`)}
                      </div>
                    )}
                  </>
                ) : (
                  <span style={{ color: 'var(--danger)', fontSize: 13 }}>{isHe ? 'יש להזין כמות בגרמים (1–2000).' : 'Enter an amount in grams (1–2000).'}</span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                <button type="button" className="btn btn-accent" style={{ flex: 2, minHeight: 44 }} onClick={confirmPick} disabled={loading || !n}>
                  {loading ? t.saving : (isHe ? 'הוסף ליום' : 'Add to today')}
                </button>
                <button type="button" onClick={() => setPick(null)} disabled={loading}
                  style={{ flex: 1, minHeight: 44, borderRadius: 12, border: '1px solid var(--border)', background: 'none', color: 'var(--text-2)', fontFamily: 'inherit', fontSize: 14, cursor: 'pointer' }}>
                  {isHe ? 'ביטול' : 'Cancel'}
                </button>
              </div>
            </div>
          );
        })()}

        {!pick && searchResults.length > 0 && (
          <div className="food-results">
            <div className="food-results__count">
              {searchResults.length} {isHe ? 'תוצאות' : 'results'}
            </div>
            {searchResults.map((r, i) => (
              <button key={i} type="button" className="food-result" onClick={() => addSearchResult(r)} disabled={loading}>
                <span className="food-result__text">
                  <span className="food-result__name">{r.name}</span>
                  <span className="food-result__macros">
                    {isHe ? '100 גרם' : '100g'} · {r.cal} {isHe ? 'קק״ל' : 'kcal'} · {r.p}g {isHe ? 'חלבון' : 'protein'} · {r.c}g {isHe ? 'פחמ׳' : 'carbs'} · {r.f}g {isHe ? 'שומן' : 'fat'}{r.fb != null ? ` · ${r.fb}g ${isHe ? 'סיבים' : 'fibre'}` : ''}
                  </span>
                </span>
                <span className="food-result__add" aria-hidden="true"><PlusIcon /></span>
              </button>
            ))}
          </div>
        )}

        {quickChips.length > 0 && (
          <div className="quick-add__chips">
            <span className="quick-add__chips-label">
              {isHe ? 'אחרונות:' : 'Recent:'}
            </span>
            {quickChips.map(c => (
              <button
                key={c.description}
                className="chip"
                onClick={() => handleQuickChip(c)}
                type="button"
                disabled={loading}
              >
                {c.description}
              </button>
            ))}
          </div>
        )}

        {message && (
          <div
            style={{
              padding: '10px 16px',
              borderRadius: 'var(--r-md)',
              background: isError ? 'rgba(239,68,68,0.10)' : isWarn ? 'rgba(255,182,72,0.12)' : 'rgba(34,197,94,0.10)',
              color: isError ? 'var(--danger)' : isWarn ? 'var(--text-1)' : 'var(--success)',
              border: isWarn ? '1px solid rgba(255,182,72,0.35)' : undefined,
              fontSize: 14,
              marginTop: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            {/* \n in a message = a new line (added · where the day stands · notes) */}
            <span role={isError ? 'alert' : 'status'} style={{ whiteSpace: 'pre-line', lineHeight: 1.6, overflowWrap: 'anywhere' }}>
              {isMealUndo ? `${t.mealDeleted}${deleteNote ? `\n${deleteNote}` : ''}` : message}
            </span>
            {isMealUndo && (
              <button
                onClick={handleUndoMeal}
                style={{
                  padding: '4px 14px',
                  borderRadius: 8,
                  border: '1px solid var(--accent)',
                  background: 'rgba(45, 212, 191, 0.12)',
                  color: 'var(--accent)',
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                ↩ {t.undo}
              </button>
            )}
          </div>
        )}
      </div>


      {/* Menu view — prototype: a highlighted "next meal" card, then the
          rest of the day as compact rows, then the day's total. */}
      {menuOpen && menuMode === 'daily' && menuMeals.length > 0 && (() => {
        const typeLabel = (type) => isHe
          ? ({ breakfast: 'ארוחת בוקר', snack: 'חטיף', lunch: 'ארוחת צהריים', dinner: 'ארוחת ערב' }[type] || type)
          : ({ breakfast: 'Breakfast', snack: 'Snack', lunch: 'Lunch', dinner: 'Dinner' }[type] || type);
        const nextIdx = nowIdx;
        const next = nextIdx >= 0 ? menuMeals[nextIdx] : null;
        // X of Y counts every meal in the menu (the rest-of-day list below
        // leaves out the "up next" card, so the header is not a list length).
        const eaten = menuMeals.filter((_, i) => loggedMenuSet.has(i)).length;
        const pctDone = (cur, tgt) => (tgt > 0 ? Math.min(100, Math.round((cur / tgt) * 100)) : 0);
        return (
          <>
            {next ? (
            <div style={{ marginTop: 16, background: 'rgba(47,227,194,.05)', border: '1.5px solid rgba(47,227,194,.35)', borderRadius: 20, padding: '18px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: '#04241B', background: '#2FE3C2', borderRadius: 999, padding: '4px 11px' }}>
                  {isHe ? 'הארוחה הבאה' : 'Up next'}
                </span>
                <span style={{ fontSize: 13, color: '#7C8798', fontVariantNumeric: 'tabular-nums' }}>{menuTimes[nextIdx] || '—'}</span>
              </div>
              <div style={{ fontSize: 17, fontWeight: 700, marginTop: 12, color: 'var(--text-1)' }}>{typeLabel(next.type)}</div>
              <div style={{ fontSize: 13.5, color: '#93A0B4', marginTop: 4, lineHeight: 1.6 }}>{isHe ? next.he : (next.en || next.he)}</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11.5, color: '#F5698C', background: 'rgba(245,105,140,.08)', borderRadius: 999, padding: '4px 10px' }}>{next.protein}g {isHe ? 'חלבון' : 'protein'}</span>
                <span style={{ fontSize: 11.5, color: '#4D9FFF', background: 'rgba(77,159,255,.08)', borderRadius: 999, padding: '4px 10px' }}>{next.carbs}g {isHe ? 'פחמ׳' : 'carbs'}</span>
                <span style={{ fontSize: 11.5, color: '#FFB648', background: 'rgba(255,182,72,.08)', borderRadius: 999, padding: '4px 10px' }}>{next.fat}g {isHe ? 'שומן' : 'fat'}</span>
                <span style={{ fontSize: 11.5, color: 'var(--text-3)', background: 'var(--fill-faint)', borderRadius: 999, padding: '4px 10px' }}>{next.calories} {isHe ? 'קק״ל' : 'kcal'}</span>
              </div>
              {editingIdx === nextIdx ? (
                <MealEditor
                  meal={next} api={api} isHe={isHe}
                  onSave={(m) => { setMenu((prev) => applyMealToMenu(prev, nextIdx, m)); setEditingIdx(null); }}
                  onCancel={() => setEditingIdx(null)}
                />
              ) : (<>
              <MealItemsList meal={next} isHe={isHe} />
              <button type="button" onClick={() => setEditingIdx(nextIdx)}
                style={{ marginTop: 10, minHeight: 40, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', color: 'var(--accent-text, var(--accent))', fontSize: 13, fontWeight: 600, padding: 0 }}>
                {isHe ? 'ערוך ארוחה' : 'Edit meal'}{next.edited ? (isHe ? ' · נערכה' : ' · edited') : ''}
              </button>
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button type="button" onClick={() => logMenuMeal(nextIdx)} disabled={loggingIdx === nextIdx}
                  style={{ flex: 2, background: 'linear-gradient(135deg,#36E8C6,#1EC0A2)', color: '#04241B', fontWeight: 700, border: 'none', borderRadius: 13, padding: 12, fontSize: 14.5, fontFamily: 'inherit', cursor: 'pointer' }}>
                  {loggingIdx === nextIdx ? t.saving : (isHe ? 'סמן שאכלתי' : 'Mark eaten')}
                </button>
                <button type="button" onClick={() => swapMealAtIndex(nextIdx)} disabled={swappingIdx === nextIdx}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: 'var(--fill-faint)', border: '1px solid var(--border)', color: '#B9C4D2', borderRadius: 13, padding: 12, fontSize: 14, fontFamily: 'inherit', cursor: 'pointer' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#B9C4D2" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M7 8h11l-3-3M17 16H6l3 3" /></svg>
                  {swappingIdx === nextIdx ? '…' : (isHe ? 'החלף' : 'Swap')}
                </button>
              </div>
              </>)}
            </div>
            ) : (
            <div style={{ marginTop: 16, background: 'rgba(47,227,194,.05)', border: '1.5px solid rgba(47,227,194,.35)', borderRadius: 20, padding: '18px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(47,227,194,.15)', border: '2px solid #2FE3C2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2FE3C2" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7" /></svg>
                </span>
                <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-1)' }}>
                  {isHe ? 'סיימת את התפריט להיום' : "You've finished today's menu"}
                </div>
              </div>
              {[
                { label: isHe ? 'קלוריות' : 'Calories', cur: calorieProgress, tgt: calorieTarget, unit: isHe ? 'קק״ל' : 'kcal', color: '#FFB648' },
                { label: isHe ? 'חלבון' : 'Protein', cur: proteinProgress, tgt: proteinTarget, unit: isHe ? 'ג׳' : 'g', color: '#F5698C' },
              ].map((r) => (
                <div key={r.label} style={{ marginTop: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-3)' }}>
                    <span>{r.label}</span>
                    <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--text-1)', fontWeight: 600 }}>
                      {Math.round(r.cur).toLocaleString()} / {r.tgt > 0 ? Math.round(r.tgt).toLocaleString() : '—'} {r.unit}
                    </span>
                  </div>
                  <div style={{ height: 6, borderRadius: 999, background: 'var(--fill-faint)', marginTop: 6, overflow: 'hidden' }}>
                    <div style={{ width: `${pctDone(r.cur, r.tgt)}%`, height: '100%', background: r.color, borderRadius: 999 }} />
                  </div>
                </div>
              ))}
            </div>
            )}

            <div style={{ padding: '20px 0 8px', fontSize: 13.5, color: '#7C8798' }}>
              {isHe ? `שאר היום · ${eaten} מתוך ${menuMeals.length} נאכלו` : `Rest of day · ${eaten} of ${menuMeals.length} eaten`}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {chronologicalOrder(menuMeals).filter((i) => i !== nextIdx).map((idx) => {
                const meal = menuMeals[idx];
                const done = loggedMenuSet.has(idx);
                const isExpanded = expandedMenuIdx === idx;
                const fullName = isHe ? meal.he : (meal.en || meal.he);
                const busy = loggingIdx === idx || swappingIdx === idx;
                return (
                  <div key={`m-${idx}`} style={{ background: 'var(--surface)', border: '1px solid var(--border-faint)', borderRadius: 14, overflow: 'hidden' }}>
                    <button
                      type="button"
                      onClick={() => setExpandedMenuIdx((prev) => (prev === idx ? null : idx))}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'none', border: 'none', padding: '12px 15px', opacity: done ? 0.75 : 1, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'start', width: '100%' }}
                    >
                      {/* A dedicated, labelled mark-eaten control (not just a bare
                          circle) — tapping it directly toggles the meal without
                          needing to expand the row first. */}
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => { e.stopPropagation(); if (!busy) (done ? unmarkMenuMeal(idx) : logMenuMeal(idx)); }}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); e.preventDefault(); if (!busy) (done ? unmarkMenuMeal(idx) : logMenuMeal(idx)); } }}
                        title={done ? (isHe ? 'בטל סימון' : 'Unmark') : (isHe ? 'סמן שאכלתי' : 'Mark eaten')}
                        aria-label={done ? (isHe ? 'בטל סימון' : 'Unmark') : (isHe ? 'סמן שאכלתי' : 'Mark eaten')}
                        style={{
                          width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: busy ? 'wait' : 'pointer',
                          background: done ? 'rgba(47,227,194,.15)' : 'var(--fill-faint)',
                          border: done ? '2px solid #2FE3C2' : '2px dashed rgba(255,255,255,.28)',
                        }}
                      >
                        {done && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2FE3C2" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7" /></svg>}
                      </span>
                      <span style={{ fontSize: 12.5, color: '#7C8798', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{menuTimes[idx] || '—'}</span>
                      <span style={{ flex: 1, fontSize: 14, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {typeLabel(meal.type)} · {fullName}
                      </span>
                      <span style={{ fontSize: 12.5, color: '#7C8798', flexShrink: 0 }}>{meal.calories}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-4)', transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }}>▾</span>
                    </button>
                    {isExpanded && (
                      <div style={{ padding: '0 15px 14px', borderTop: '1px solid var(--border-faint)' }}>
                        <div style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.6, padding: '12px 0 4px' }}>
                          {typeLabel(meal.type)} · {fullName}
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
                          <span style={{ fontSize: 11.5, color: '#FFB648', background: 'rgba(255,182,72,.1)', borderRadius: 999, padding: '4px 10px' }}>{meal.calories} {isHe ? 'קק״ל' : 'kcal'}</span>
                          <span style={{ fontSize: 11.5, color: '#F5698C', background: 'rgba(245,105,140,.08)', borderRadius: 999, padding: '4px 10px' }}>{meal.protein}g {isHe ? 'חלבון' : 'protein'}</span>
                          <span style={{ fontSize: 11.5, color: '#4D9FFF', background: 'rgba(77,159,255,.08)', borderRadius: 999, padding: '4px 10px' }}>{meal.carbs}g {isHe ? 'פחמ׳' : 'carbs'}</span>
                          <span style={{ fontSize: 11.5, color: 'var(--text-3)', background: 'var(--fill-faint)', borderRadius: 999, padding: '4px 10px' }}>{meal.fat}g {isHe ? 'שומן' : 'fat'}</span>
                        </div>
                        {editingIdx === idx ? (
                          <MealEditor
                            meal={meal} api={api} isHe={isHe}
                            onSave={(m) => { setMenu((prev) => applyMealToMenu(prev, idx, m)); setEditingIdx(null); }}
                            onCancel={() => setEditingIdx(null)}
                          />
                        ) : (<>
                          <MealItemsList meal={meal} isHe={isHe} />
                          {!done && (
                            <button type="button" onClick={() => setEditingIdx(idx)}
                              style={{ marginTop: 8, minHeight: 40, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', color: 'var(--accent-text, var(--accent))', fontSize: 13, fontWeight: 600, padding: 0 }}>
                              {isHe ? 'ערוך ארוחה' : 'Edit meal'}{meal.edited ? (isHe ? ' · נערכה' : ' · edited') : ''}
                            </button>
                          )}
                        </>)}
                        <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                          {done ? (
                            <button type="button" onClick={() => unmarkMenuMeal(idx)} disabled={busy}
                              style={{ flex: 1, background: 'var(--fill-faint)', border: '1px solid var(--border)', color: '#B9C4D2', borderRadius: 12, padding: 10, fontSize: 13.5, fontFamily: 'inherit', cursor: 'pointer' }}>
                              {loggingIdx === idx ? '…' : (isHe ? 'בטל סימון' : 'Unmark')}
                            </button>
                          ) : (
                            <>
                              <button type="button" onClick={() => logMenuMeal(idx)} disabled={busy}
                                style={{ flex: 2, background: 'linear-gradient(135deg,#36E8C6,#1EC0A2)', color: '#04241B', fontWeight: 700, border: 'none', borderRadius: 12, padding: 10, fontSize: 13.5, fontFamily: 'inherit', cursor: 'pointer' }}>
                                {loggingIdx === idx ? t.saving : (isHe ? 'סמן שאכלתי' : 'Mark eaten')}
                              </button>
                              <button type="button" onClick={() => swapMealAtIndex(idx)} disabled={busy}
                                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: 'var(--fill-faint)', border: '1px solid var(--border)', color: '#B9C4D2', borderRadius: 12, padding: 10, fontSize: 13.5, fontFamily: 'inherit', cursor: 'pointer' }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#B9C4D2" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M7 8h11l-3-3M17 16H6l3 3" /></svg>
                                {swappingIdx === idx ? '…' : (isHe ? 'החלף' : 'Swap')}
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <MenuTargetSummary
              meals={menu?.meals}
              target={menu?.target || (menuCalTarget ? { calories: menuCalTarget, protein: targets?.macros?.protein } : null)}
              approximate={menu?.approximate}
              isHe={isHe}
              label={isHe ? 'סה״כ היום בתפריט' : 'Menu total today'}
            />
          </>
        );
      })()}

      {/* Empty state — nothing logged yet and no menu loaded */}
      {loggedMeals.length === 0 && !menuOpen && (
        <div className="card" style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'center' }}>
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12a8 8 0 0 1 16 0z" /><path d="M4 12h16M8 12V8M12 12V6M16 12V8" /></svg>
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, marginBottom: 4 }}>
            {isHe ? 'עדיין לא רשמת ארוחות' : 'No meals logged yet'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 16 }}>
            {isHe
              ? 'הוסף ארוחה למעלה או טען תפריט יומי מומלץ.'
              : 'Add a meal above or load your recommended daily menu.'}
          </div>
          <button
            type="button"
            className="btn btn-accent"
            onClick={() => fetchMenu()}
            disabled={menuLoading}
            style={{ display: 'inline-flex' }}
          >
            {menuLoading ? t.menuLoading : (isHe ? 'טען תפריט מומלץ' : 'Load recommended menu')}
          </button>
        </div>
      )}

      {/* Already eaten today — condensed single-line rows, at the bottom
          (audit: this used to render above the recommended menu, which
          buried the menu the user actually wants to act on). */}
      {!menuOpen && loggedMeals.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, margin: '0 0 12px' }}>
            {isHe ? 'מה אכלת היום' : 'What you ate today'}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            {loggedMeals.map((meal, i) => (
              <LoggedMealRow
                key={meal._id || `logged-${i}`}
                meal={meal}
                isHe={isHe}
                t={t}
                onDelete={deletingId === meal._id ? null : () => handleDeleteMeal(meal._id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Daily summary — only useful once something has been logged.
          On an empty day, 4 zero-progress bars are noise (audit). */}
      {!menuOpen && calorieProgress > 0 && (
      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-header">
          <h3>{t.dailySummary}</h3>
        </div>
        {[
          { label: t.protein, current: proteinProgress, target: proteinTarget, unit: 'g', color: 'var(--c-protein)' },
          { label: t.carbs,   current: carbsProgress,   target: carbsTarget,   unit: 'g', color: 'var(--c-carbs)' },
          { label: t.fat,     current: fatProgress,     target: fatTarget,     unit: 'g', color: 'var(--c-fat)' },
          { label: t.fiber,   current: fiberProgress,   target: fiberTarget,   unit: 'g', color: 'var(--c-fiber)' },
        ].map((item) => {
          const pct = item.target > 0 ? Math.min((item.current / item.target) * 100, 100) : 0;
          return (
            <div className="progress-container" key={item.label}>
              <div className="progress-label">
                <span>{item.label}</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {item.target > 0
                    ? `${Math.round(item.current)} / ${item.target}${item.unit} (${Math.round(pct)}%)`
                    : `${Math.round(item.current)}${item.unit}`}
                </span>
              </div>
              <div className="progress-bar">
                <div style={{ width: `${pct}%`, height: '100%', background: item.color, borderRadius: 99, transition: 'width 0.4s ease' }} />
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* Footer hint card */}
      {!menuOpen && targets?.macros?.proteinPerMeal && (
        <div className="gradient-hint" style={{ marginTop: 16 }}>
          <span style={{ display: 'flex' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4l1.7 4.6 4.8 1.7-4.8 1.7L12 16.6l-1.7-4.6-4.8-1.7 4.8-1.7z" /></svg>
          </span>
          <div style={{ flex: 1 }}>
            <strong>{isHe ? 'מבוסס על המטרה שלך' : 'Based on your goal'}</strong>
            {' — '}
            {isHe
              ? `חלוקת חלבון של ~${targets.macros.proteinPerMeal}g לארוחה, ב-${targets.macros.mealsPerDay || 4} ארוחות בהפרשי ${targets.macros.mealInterval || '~3'} שעות, מקסימה את גירוי בניית השריר.`
              : `Splitting ~${targets.macros.proteinPerMeal}g protein per meal across ${targets.macros.mealsPerDay || 4} meals (every ${targets.macros.mealInterval || '~3'}h) maximizes muscle protein synthesis.`}
          </div>
        </div>
      )}
    </>
  );
}
