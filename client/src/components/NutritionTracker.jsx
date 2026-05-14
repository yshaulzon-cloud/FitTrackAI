import { useState, useEffect, useMemo } from 'react';
import { useLang } from '../context/LanguageContext';
import { scanBarcode, lookupBarcode } from '../lib/barcode';

function isNativeShell() {
  try {
    return typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.() === true;
  } catch { return false; }
}

function ScanIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 7V5a2 2 0 0 1 2-2h2"/>
      <path d="M17 3h2a2 2 0 0 1 2 2v2"/>
      <path d="M21 17v2a2 2 0 0 1-2 2h-2"/>
      <path d="M7 21H5a2 2 0 0 1-2-2v-2"/>
      <path d="M7 8v8M11 8v8M15 8v8M19 8v8"/>
    </svg>
  );
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
        stroke="#2dd4bf" strokeWidth="5" fill="none"
        strokeDasharray={`${dash} ${c}`}
        strokeLinecap="round"
        transform="rotate(-90 24 24)"
      />
    </svg>
  );
}


function MealRow({ time, emoji, name, desc, cal, p, c, f, status, onLog, onDelete, onSwap, swapping, isHe, t }) {
  return (
    <div className={`meal-row meal-row--${status}`}>
      <div className="meal-row__time-block">
        <div className="meal-row__icon">
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
        <div className="meal-row__macros">
          {p > 0 && <span className="m-p">{Math.round(p)}g {isHe ? 'חלבון' : 'protein'}</span>}
          {c > 0 && <span className="m-c">{Math.round(c)}g {isHe ? 'פחמ\'' : 'carbs'}</span>}
          {f > 0 && <span className="m-f">{Math.round(f)}g {isHe ? 'שומן' : 'fat'}</span>}
        </div>
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
            className={`meal-row__cta${status === 'now' ? ' meal-row__cta--primary' : ''}`}
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

export default function NutritionTracker({ targets, todayData, api, onUpdate, showXP }) {
  const { t, lang } = useLang();
  const isHe = lang === 'he';

  const [foodInput, setFoodInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const isNative = isNativeShell();
  const [message, setMessage] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [lastDeletedMeal, setLastDeletedMeal] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menu, setMenu] = useState(null);
  const [menuCalTarget, setMenuCalTarget] = useState(null);
  const [menuLoading, setMenuLoading] = useState(false);
  const [swappingIdx, setSwappingIdx] = useState(null);
  const [loggingIdx, setLoggingIdx] = useState(null);
  const [history, setHistory] = useState([]);

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
      setMenuOpen(true);
    } catch (err) {
      console.error('Menu fetch error:', err);
    } finally {
      setMenuLoading(false);
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
      setMessage(`${t.added} ${result.meal.description}`);
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
      const aiTag = result.meal.source === 'ai' ? ` 🤖 ${t.aiEstimate}` : '';
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

  async function handleScan() {
    setMessage('');
    setScanning(true);
    try {
      const code = await scanBarcode();
      if (!code) return;
      const name = await lookupBarcode(code, lang);
      if (!name) {
        setMessage(isHe
          ? `המוצר ${code} לא נמצא במאגר. תוכל להקליד אותו ידנית.`
          : `Product ${code} not found. You can type it manually.`);
        setTimeout(() => setMessage(''), 4000);
        return;
      }
      setFoodInput(name);
      setMessage(isHe ? `נסרק: ${name}` : `Scanned: ${name}`);
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage(err.message || (isHe ? 'הסריקה נכשלה' : 'Scan failed'));
      setTimeout(() => setMessage(''), 4000);
    } finally {
      setScanning(false);
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
      setMessage(`${t.added} ${result.meal.description}`);
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

  // For the "now" status: the first not-yet-completed planned meal
  // We'll mark the first menu item as 'now' if user has logged 0 meals today,
  // otherwise the (loggedCount + 1)th menu item is 'now'.
  let nowIdx = -1;
  if (menuMeals.length > 0) {
    nowIdx = Math.min(loggedMeals.length, menuMeals.length - 1);
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

  return (
    <>
      {/* Header */}
      <div className="nutrition-header">
        <div>
          <div className="nutrition-header__eyebrow">
            {isHe ? `תזונה · יום ${dayLabelHe}` : `Nutrition · ${dayLabelEn}`}
          </div>
          <h1 className="nutrition-header__title">
            {isHe ? 'מה אכלת היום?' : 'What did you eat today?'}
          </h1>
        </div>
        <div className="nutrition-summary-pill">
          <MacroRingSmall pct={caloriePct} />
          <div>
            <div className="nutrition-summary-pill__label">
              {isHe ? 'נצרכו' : 'Consumed'}
            </div>
            <div className="nutrition-summary-pill__value">
              <span style={{ color: 'var(--accent)' }}>{Math.round(calorieProgress).toLocaleString()}</span>
              <span style={{ color: 'var(--text-4)' }}> / {calorieTarget.toLocaleString()}</span>
              <span style={{ color: 'var(--text-3)', fontSize: 13, fontWeight: 500, marginInlineStart: 4 }}>{t.kcal}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick add */}
      <div className="quick-add">
        <form onSubmit={handleAddFood}>
          <div className="quick-add__row">
            <div className="quick-add__search">
              <input
                type="text"
                placeholder={isHe
                  ? 'חפש מזון... למשל: חזה עוף, יוגורט, שייק חלבון'
                  : 'Search food... e.g. chicken breast, yogurt, protein shake'}
                value={foodInput}
                onChange={(e) => setFoodInput(e.target.value)}
                disabled={loading}
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

        {quickChips.length > 0 && (
          <div className="quick-add__chips">
            <span className="quick-add__chips-label">{isHe ? 'מהירים:' : 'Quick:'}</span>
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

      {/* Timeline header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '20px 0 14px' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, margin: 0 }}>
          {isHe ? 'היום שלך' : 'Your day'}
        </h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className={`chip${menuOpen ? ' chip--active' : ''}`}
            onClick={() => menuOpen ? setMenuOpen(false) : fetchMenu()}
            disabled={menuLoading}
          >
            {menuLoading ? t.menuLoading : (isHe ? 'תפריט מומלץ' : 'Recommended menu')}
          </button>
          {menuOpen && menu && (
            <button
              type="button"
              className="chip"
              onClick={() => fetchMenu(menu.id)}
              disabled={menuLoading}
            >
              🔄 {isHe ? 'החלף' : 'Swap'}
            </button>
          )}
        </div>
      </div>

      {/* Timeline rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Done meals from today's log */}
        {loggedMeals.map((meal, i) => (
          <MealRow
            key={meal._id || `logged-${i}`}
            time={meal.createdAt
              ? new Date(meal.createdAt).toLocaleTimeString(isHe ? 'he-IL' : 'en-US', { hour: '2-digit', minute: '2-digit' })
              : '—'}
            emoji="✓"
            name={isHe ? meal.description : (meal.englishName || meal.description)}
            desc={meal.source === 'ai' ? `🤖 ${isHe ? 'הערכה אוטומטית' : 'AI estimate'}` : ''}
            cal={meal.calories}
            p={meal.protein}
            c={meal.carbs}
            f={meal.fat}
            status="done"
            isHe={isHe}
            t={t}
            onDelete={deletingId === meal._id ? null : () => handleDeleteMeal(meal._id)}
          />
        ))}

        {/* Planned meals from the menu */}
        {menuOpen && menuMeals.map((meal, idx) => {
          const status = idx === nowIdx ? 'now' : idx < nowIdx ? 'upcoming' : 'upcoming';
          const time = MEAL_TYPE_TIMES[meal.type] || '—';
          const emoji = MEAL_TYPE_EMOJI[meal.type] || '🍽';
          const typeLabel = isHe
            ? ({ breakfast: 'ארוחת בוקר', snack: 'חטיף', lunch: 'ארוחת צהריים', dinner: 'ארוחת ערב' }[meal.type] || meal.type)
            : ({ breakfast: 'Breakfast', snack: 'Snack', lunch: 'Lunch', dinner: 'Dinner' }[meal.type] || meal.type);

          return (
            <MealRow
              key={`menu-${idx}`}
              time={time}
              emoji={emoji}
              name={typeLabel}
              desc={isHe ? meal.he : (meal.en || meal.he)}
              cal={meal.calories}
              p={meal.protein}
              c={meal.carbs}
              f={meal.fat}
              status={status}
              isHe={isHe}
              t={t}
              onLog={loggingIdx === idx ? null : () => logMenuMeal(idx)}
              onSwap={() => swapMealAtIndex(idx)}
              swapping={swappingIdx === idx}
            />
          );
        })}

        {/* Empty state */}
        {loggedMeals.length === 0 && !menuOpen && (
          <div className="card" style={{ textAlign: 'center', marginBottom: 0 }}>
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
      </div>

      {/* Daily summary — only useful once something has been logged.
          On an empty day, 4 zero-progress bars are noise (audit). */}
      {calorieProgress > 0 && (
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
      {targets?.macros?.proteinPerMeal && (
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
