import { useState, useEffect, useMemo } from 'react';
import { useLang } from '../context/LanguageContext';
function isNativeShell() {
  try {
    return typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.() === true;
  } catch { return false; }
}

const MEAL_TYPE_TIMES = {
  breakfast: '07:30',
  snack: '10:30',
  lunch: '13:00',
  dinner: '19:30',
};
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
            {swapping ? '…' : (isHe ? '🔄 החלף' : '🔄 Swap')}
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
  const tag = meal.source === 'ai' ? '🤖' : meal.source === 'default' ? '⚠️' : '';
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
        <span style={{ color: 'var(--success)', flexShrink: 0 }}>✓</span>
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
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          padding: '0 14px 12px',
          borderTop: '1px solid var(--border-subtle)',
          flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', gap: 10, paddingTop: 10, fontSize: 12, color: 'var(--text-3)' }}>
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
      )}
      </div>
    </div>
  );
}

export default function NutritionTracker({ targets, todayData, api, onUpdate, showXP }) {
  const { t, lang } = useLang();
  const isHe = lang === 'he';

  const [foodInput, setFoodInput] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const isNative = isNativeShell();
  const [message, setMessage] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [lastDeletedMeal, setLastDeletedMeal] = useState(null);
  // Menu state persists to localStorage so navigating away and back (or
  // restarting the app) doesn't wipe a loaded daily/weekly menu.
  const MENU_STORAGE_KEY = 'nutrition:menuState';
  const [menuOpen, setMenuOpen] = useState(false);
  const [menu, setMenu] = useState(null);
  const [menuCalTarget, setMenuCalTarget] = useState(null);
  const [menuMode, setMenuMode] = useState('daily'); // 'daily' | 'weekly'
  const [weeklyMenu, setWeeklyMenu] = useState(null); // array of 7 day-menus
  const [weeklyDayIdx, setWeeklyDayIdx] = useState(0);
  const [menuLoading, setMenuLoading] = useState(false);
  const [swappingIdx, setSwappingIdx] = useState(null);
  const [loggingIdx, setLoggingIdx] = useState(null);
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
        menuOpen, menu, menuCalTarget, menuMode, weeklyMenu, weeklyDayIdx, menuLogged,
      }));
    } catch { /* storage full / unavailable */ }
  }, [hydrated, menuOpen, menu, menuCalTarget, menuMode, weeklyMenu, weeklyDayIdx, menuLogged]);

  // Pull last 30 days of nutrition logs once. Today's meals come live
  // from the `todayData` prop so they react to immediate add/delete.
  useEffect(() => {
    if (!api) return;
    api('/nutrition/history').then(setHistory).catch(() => {});
  }, []); // eslint-disable-line

  const calorieTarget = targets?.calorieTarget || 2000;
  const proteinTarget = targets?.macros?.protein || 150;
  const carbsTarget = targets?.macros?.carbs || 250;
  const fatTarget = targets?.macros?.fat || 65;
  const fiberTarget = targets?.macros?.fiberTarget || 30;

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

  async function fetchWeeklyMenu() {
    setMenuLoading(true);
    try {
      const res = await api('/nutrition/weekly-menu');
      setWeeklyMenu(res.days);
      setWeeklyDayIdx(0);
      setMenuCalTarget(res.calorieTarget);
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
<button class="print-btn no-print" onclick="window.print()">${isHe ? '📥 שמור כ-PDF' : '📥 Save as PDF'}</button>
</body>
</html>`;
  }

  async function handleDownloadMenu() {
    try {
      const html = generateMenuHTML();
      if (!html) return;
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
        body: JSON.stringify({ description }),
      });
      if (showXP && result?.xp) showXP(result.xp);
      // Mark this menu row as eaten so its button flips to "done".
      setMenuLogged(prev => {
        const base = prev.date === todayKey ? prev.idxs : [];
        return { date: todayKey, idxs: base.includes(idx) ? base : [...base, idx] };
      });
      setMessage(`${t.added} ${result.meal.description} (${result.meal.calories} ${t.caloriesWord}, ${result.meal.protein} ${t.proteinGrams})`);
      setTimeout(() => setMessage(''), 3000);
      onUpdate();
    } catch (err) {
      setMessage(err.message || t.errorSaving);
      setTimeout(() => setMessage(''), 5000);
    } finally {
      setLoggingIdx(null);
    }
  }

  async function handleAddFood(e) {
    e.preventDefault();
    if (!foodInput.trim()) return;
    setLoading(true);
    setMessage('');
    try {
      const result = await api('/nutrition/log', {
        method: 'POST',
        body: JSON.stringify({ description: foodInput.trim() }),
      });
      setFoodInput('');
      if (showXP && result?.xp) showXP(result.xp);
      const aiTag = result.meal.source === 'ai' ? ` 🤖 ${t.aiEstimate}`
        : result.meal.source === 'default' ? ` ⚠️ ${isHe ? 'הערכה כללית (לא במאגר)' : 'rough estimate (not in database)'}`
        : '';
      setMessage(
        `${t.added} ${result.meal.description} (${result.meal.calories} ${t.caloriesWord}, ${result.meal.protein} ${t.proteinGrams})${aiTag}`
      );
      setTimeout(() => setMessage(''), 4000);
      onUpdate();
    } catch (err) {
      setMessage(err.message || t.errorSaving);
      setTimeout(() => setMessage(''), 5000);
    } finally {
      setLoading(false);
    }
  }

  async function handleQuickChip(chipText) {
    // Strip emoji if any
    const text = chipText.replace(/^\p{Emoji}\s*/u, '').trim();
    setLoading(true);
    setMessage('');
    try {
      const result = await api('/nutrition/log', {
        method: 'POST',
        body: JSON.stringify({ description: text }),
      });
      if (showXP && result?.xp) showXP(result.xp);
      setMessage(`${t.added} ${result.meal.description} (${result.meal.calories} ${t.caloriesWord}, ${result.meal.protein} ${t.proteinGrams})`);
      setTimeout(() => setMessage(''), 3000);
      onUpdate();
    } catch (err) {
      setMessage(err.message || t.errorSaving);
      setTimeout(() => setMessage(''), 5000);
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

  // Tapping a result logs it by its exact DB name, so estimateNutrition hits
  // the entry directly — same path as the free-text Add, no AI fallback needed.
  async function addSearchResult(name) {
    setSearchResults([]);
    setFoodInput('');
    setLoading(true);
    setMessage('');
    try {
      const result = await api('/nutrition/log', {
        method: 'POST',
        body: JSON.stringify({ description: name }),
      });
      if (showXP && result?.xp) showXP(result.xp);
      setMessage(`${t.added} ${result.meal.description} · ${result.meal.calories} ${t.caloriesWord}`);
      setTimeout(() => setMessage(''), 3000);
      onUpdate();
    } catch (err) {
      setMessage(err.message || t.errorSaving);
      setTimeout(() => setMessage(''), 5000);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteMeal(mealId) {
    const meal = todayData?.meals?.find(m => m._id === mealId);
    setDeletingId(mealId);
    try {
      await api(`/nutrition/meal/${mealId}`, { method: 'DELETE' });
      if (meal) {
        setLastDeletedMeal(meal);
        setMessage('__MEAL_DELETED__');
        setTimeout(() => { setMessage(''); setLastDeletedMeal(null); }, 8000);
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

  async function handleUndoMeal() {
    if (!lastDeletedMeal) return;
    try {
      await api('/nutrition/log', {
        method: 'POST',
        body: JSON.stringify({ description: lastDeletedMeal.description }),
      });
      setLastDeletedMeal(null);
      setMessage(t.added + ' ' + lastDeletedMeal.description);
      setTimeout(() => setMessage(''), 3000);
      onUpdate();
    } catch {
      setMessage(t.errorSaving);
      setTimeout(() => setMessage(''), 3000);
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
  let nowIdx = -1;
  if (menuMeals.length > 0) {
    for (let i = 0; i < menuMeals.length; i++) {
      if (!loggedMenuSet.has(i)) { nowIdx = i; break; }
    }
  }
  function menuMealStatus(idx) {
    if (loggedMenuSet.has(idx)) return 'done';
    return idx === nowIdx ? 'now' : 'upcoming';
  }

  const isMealUndo = message === '__MEAL_DELETED__';
  const isError = message === t.errorSaving || message === t.errorDeleting;

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
      const key = desc.toLowerCase().replace(/\s+/g, ' ');
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(desc);
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
                    <span style={{ fontSize: 12.5, color: '#7C8798', fontVariantNumeric: 'tabular-nums' }}>{MEAL_TYPE_TIMES[meal.type] || '—'}</span>
                  </div>
                  <div style={{ fontSize: 13.5, color: '#93A0B4', marginTop: 5, lineHeight: 1.6 }}>{isHe ? meal.he : (meal.en || meal.he)}</div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <span style={{ fontSize: 11, color: '#F5698C', background: 'rgba(245,105,140,.08)', borderRadius: 999, padding: '3px 9px' }}>{meal.protein}g {isHe ? 'חלבון' : 'protein'}</span>
                    <span style={{ fontSize: 11, color: '#7C8798', background: 'var(--fill-faint)', borderRadius: 999, padding: '3px 9px' }}>{meal.calories} {isHe ? 'קק״ל' : 'kcal'}</span>
                    <button type="button" onClick={() => swapWeeklyMealAt(weeklyDayIdx, mi)} disabled={swappingIdx === `${weeklyDayIdx}-${mi}`}
                      style={{ marginInlineStart: 'auto', display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', color: '#7C8798', fontSize: 12 }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M7 8h11l-3-3M17 16H6l3 3" /></svg>
                      {isHe ? 'החלף' : 'Swap'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {weeklyMenu[weeklyDayIdx] && (
              <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface)', border: '1px solid var(--border-faint)', borderRadius: 14, padding: '13px 16px' }}>
                <span style={{ fontSize: 13.5, color: '#93A0B4' }}>{isHe ? `סה״כ יום ${weeklyDayIdx + 1}` : `Day ${weeklyDayIdx + 1} total`}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>
                  {weeklyMenu[weeklyDayIdx].totalCalories?.toLocaleString()} {isHe ? 'קק״ל' : 'kcal'} · {weeklyMenu[weeklyDayIdx].totalProtein}g {isHe ? 'חלבון' : 'protein'}
                </span>
              </div>
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
              <span style={{ fontSize: 13.5, color: '#7C8798' }}> / {calorieTarget.toLocaleString()} {isHe ? 'קק״ל' : 'kcal'}</span>
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
                onChange={(e) => setFoodInput(e.target.value)}
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

        {/* Live matches from the food database. Free-text Add still works for
            anything not listed — that path keeps the AI fallback. */}
        {searchResults.length > 0 && (
          <div className="food-results">
            <div className="food-results__count">
              {searchResults.length} {isHe ? 'תוצאות' : 'results'}
            </div>
            {searchResults.map((r, i) => (
              <button key={i} type="button" className="food-result" onClick={() => addSearchResult(r.name)} disabled={loading}>
                <span className="food-result__text">
                  <span className="food-result__name">{r.name}</span>
                  <span className="food-result__macros">
                    {isHe ? '100 גרם' : '100g'} · {r.cal} {isHe ? 'קק״ל' : 'kcal'} · {r.p}g {isHe ? 'חלבון' : 'protein'}
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
                key={c}
                className="chip"
                onClick={() => handleQuickChip(c)}
                type="button"
                disabled={loading}
              >
                {c}
              </button>
            ))}
          </div>
        )}

        {message && (
          <div
            style={{
              padding: '10px 16px',
              borderRadius: 'var(--r-md)',
              background: isError ? 'rgba(239,68,68,0.10)' : 'rgba(34,197,94,0.10)',
              color: isError ? 'var(--danger)' : 'var(--success)',
              fontSize: 14,
              marginTop: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <span>{isMealUndo ? t.mealDeleted : message}</span>
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
        const nextIdx = nowIdx >= 0 ? nowIdx : 0;
        const next = menuMeals[nextIdx];
        const eaten = loggedMenuSet.size;
        return (
          <>
            <div style={{ marginTop: 16, background: 'rgba(47,227,194,.05)', border: '1.5px solid rgba(47,227,194,.35)', borderRadius: 20, padding: '18px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: '#04241B', background: '#2FE3C2', borderRadius: 999, padding: '4px 11px' }}>
                  {isHe ? 'הארוחה הבאה' : 'Up next'}
                </span>
                <span style={{ fontSize: 13, color: '#7C8798', fontVariantNumeric: 'tabular-nums' }}>{MEAL_TYPE_TIMES[next.type] || '—'}</span>
              </div>
              <div style={{ fontSize: 17, fontWeight: 700, marginTop: 12, color: 'var(--text-1)' }}>{typeLabel(next.type)}</div>
              <div style={{ fontSize: 13.5, color: '#93A0B4', marginTop: 4, lineHeight: 1.6 }}>{isHe ? next.he : (next.en || next.he)}</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11.5, color: '#F5698C', background: 'rgba(245,105,140,.08)', borderRadius: 999, padding: '4px 10px' }}>{next.protein}g {isHe ? 'חלבון' : 'protein'}</span>
                <span style={{ fontSize: 11.5, color: '#4D9FFF', background: 'rgba(77,159,255,.08)', borderRadius: 999, padding: '4px 10px' }}>{next.carbs}g {isHe ? 'פחמ׳' : 'carbs'}</span>
                <span style={{ fontSize: 11.5, color: '#FFB648', background: 'rgba(255,182,72,.08)', borderRadius: 999, padding: '4px 10px' }}>{next.calories} {isHe ? 'קק״ל' : 'kcal'}</span>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
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
            </div>

            <div style={{ padding: '20px 0 8px', fontSize: 13.5, color: '#7C8798' }}>
              {isHe ? `שאר היום · ${eaten} מתוך ${menuMeals.length} נאכלו` : `Rest of day · ${eaten} of ${menuMeals.length} eaten`}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {menuMeals.map((meal, idx) => {
                const done = loggedMenuSet.has(idx);
                return (
                  <button key={`m-${idx}`} type="button" onClick={() => !done && logMenuMeal(idx)}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface)', border: '1px solid var(--border-faint)', borderRadius: 14, padding: '12px 15px', opacity: done ? 0.75 : 1, cursor: done ? 'default' : 'pointer', fontFamily: 'inherit', textAlign: 'start', width: '100%' }}>
                    {done
                      ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2FE3C2" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M5 12.5l4.5 4.5L19 7" /></svg>
                      : <span style={{ width: 15, height: 15, borderRadius: '50%', border: '2px solid rgba(255,255,255,.18)', flexShrink: 0 }} />}
                    <span style={{ fontSize: 12.5, color: '#7C8798', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{MEAL_TYPE_TIMES[meal.type] || '—'}</span>
                    <span style={{ flex: 1, fontSize: 14, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {typeLabel(meal.type)} · {isHe ? meal.he : (meal.en || meal.he)}
                    </span>
                    <span style={{ fontSize: 12.5, color: '#7C8798', flexShrink: 0 }}>{meal.calories}</span>
                  </button>
                );
              })}
            </div>
            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface)', border: '1px solid var(--border-faint)', borderRadius: 14, padding: '13px 16px' }}>
              <span style={{ fontSize: 13.5, color: '#93A0B4' }}>{isHe ? 'סה״כ היום בתפריט' : "Menu total today"}</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>
                {menu?.totalCalories?.toLocaleString()} {isHe ? 'קק״ל' : 'kcal'} · {menu?.totalProtein}g {isHe ? 'חלבון' : 'protein'}
              </span>
            </div>
          </>
        );
      })()}

      {/* Empty state — nothing logged yet and no menu loaded */}
      {loggedMeals.length === 0 && !menuOpen && (
        <div className="card" style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🍽</div>
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
                  {Math.round(item.current)} / {item.target}{item.unit} ({Math.round(pct)}%)
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
          <span style={{ fontSize: 20 }}>💡</span>
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
