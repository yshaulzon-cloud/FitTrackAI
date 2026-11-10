import { useState, useEffect } from 'react';
import { ensureItems, totalsOf, setItemGrams, removeItem, addFood, replaceWithFood, rebuildMeal, gramsLabel } from '../lib/mealEdit.mjs';

const chip = (color, bg) => ({ fontSize: 11.5, color, background: bg, borderRadius: 999, padding: '4px 10px' });

// Read-only per-food breakdown of a meal: weight, calories and protein for each
// food. "~" marks a food that is not in the food database (a rough share).
export function MealItemsList({ meal, isHe }) {
  const items = Array.isArray(meal?.items) ? meal.items : [];
  if (items.length === 0) return null;
  return (
    <ul style={{ listStyle: 'none', margin: '10px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
      {items.map((it, i) => (
        <li key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 8, fontSize: 12.5, color: 'var(--text-2)' }}>
          <span style={{ flex: 1, minWidth: 0, overflowWrap: 'anywhere' }}>{isHe ? it.name.he : (it.name.en || it.name.he)}</span>
          <span dir="ltr" style={{ flex: 'none', color: 'var(--text-4)', fontVariantNumeric: 'tabular-nums' }}>{gramsLabel(it.grams, isHe)}</span>
          <span style={{ flex: 'none', color: 'var(--text-3)', fontVariantNumeric: 'tabular-nums' }}>
            {it.estimated ? '~' : ''}{it.calories} {isHe ? 'קק״ל' : 'kcal'} · {it.protein}g
          </span>
        </li>
      ))}
    </ul>
  );
}

// Edit one meal at food level: change a weight, remove a food, replace it or add
// another from the food database. Totals are recomputed live. The result goes
// back through onSave(meal); nothing is saved anywhere until the user taps Save.
export default function MealEditor({ meal, api, isHe, onSave, onCancel }) {
  const [items, setItems] = useState(() => ensureItems(meal));
  const [picker, setPicker] = useState(null); // null | { kind: 'add' } | { kind: 'replace', idx }
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  // search-as-you-type (debounced), the same endpoint the "add food" box uses
  useEffect(() => {
    if (!picker || query.trim().length < 1) { setResults([]); return undefined; }
    let alive = true;
    setSearching(true);
    const tm = setTimeout(async () => {
      try {
        const r = await api('/nutrition/search?q=' + encodeURIComponent(query.trim()));
        if (alive) setResults(r.results || []);
      } catch { if (alive) setResults([]); } finally { if (alive) setSearching(false); }
    }, 250);
    return () => { alive = false; clearTimeout(tm); };
  }, [query, picker, api]);

  const totals = totalsOf(items);
  const pick = (food) => {
    setItems((prev) => (picker.kind === 'replace' ? replaceWithFood(prev, picker.idx, food) : addFood(prev, food, 100)));
    setPicker(null); setQuery(''); setResults([]);
  };
  const step = (idx, delta) => setItems((prev) => setItemGrams(prev, idx, (prev[idx].grams || 100) + delta));

  const btn = { minWidth: 36, minHeight: 36, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--fill-faint)', color: 'var(--text-1)', fontSize: 16, cursor: 'pointer', fontFamily: 'inherit' };
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        <span style={chip('#FFB648', 'rgba(255,182,72,.1)')}>{totals.calories} {isHe ? 'קק״ל' : 'kcal'}</span>
        <span style={chip('#F5698C', 'rgba(245,105,140,.08)')}>{totals.protein}g {isHe ? 'חלבון' : 'protein'}</span>
        <span style={chip('#4D9FFF', 'rgba(77,159,255,.08)')}>{totals.carbs}g {isHe ? 'פחמ׳' : 'carbs'}</span>
        <span style={chip('var(--text-3)', 'var(--fill-faint)')}>{totals.fat}g {isHe ? 'שומן' : 'fat'}</span>
      </div>

      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((it, i) => (
          <li key={i} style={{ background: 'var(--bg-input, var(--fill-faint))', border: '1px solid var(--border-faint)', borderRadius: 12, padding: '10px 12px' }}>
            <div style={{ fontSize: 13.5, color: 'var(--text-1)', overflowWrap: 'anywhere' }}>{isHe ? it.name.he : (it.name.en || it.name.he)}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
              <button type="button" style={btn} onClick={() => step(i, -10)} aria-label={isHe ? 'הפחת 10 גרם' : 'Less by 10 g'}>−</button>
              <span dir="ltr" style={{ minWidth: 56, textAlign: 'center', fontSize: 14, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{gramsLabel(it.grams, isHe)}</span>
              <button type="button" style={btn} onClick={() => step(i, 10)} aria-label={isHe ? 'הוסף 10 גרם' : 'More by 10 g'}>+</button>
              <span style={{ flex: 1, fontSize: 12, color: 'var(--text-3)', textAlign: 'end', fontVariantNumeric: 'tabular-nums' }}>{it.estimated ? '~' : ''}{it.calories} {isHe ? 'קק״ל' : 'kcal'} · {it.protein}g</span>
              <button type="button" style={{ ...btn, fontSize: 13 }} onClick={() => { setPicker({ kind: 'replace', idx: i }); setQuery(''); }} aria-label={isHe ? 'החלף מאכל' : 'Replace food'}>⇄</button>
              <button type="button" style={{ ...btn, color: '#E5484D' }} onClick={() => setItems((prev) => removeItem(prev, i))} aria-label={isHe ? 'הסר מאכל' : 'Remove food'}>×</button>
            </div>
          </li>
        ))}
      </ul>
      {items.length === 0 && (
        <div style={{ fontSize: 13, color: 'var(--text-3)', padding: '8px 2px' }}>{isHe ? 'הארוחה ריקה. הוסף מאכל כדי לשמור.' : 'The meal is empty. Add a food to save it.'}</div>
      )}

      {picker ? (
        <div style={{ marginTop: 10 }}>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={picker.kind === 'replace' ? (isHe ? 'חפש מאכל להחלפה' : 'Search a replacement food') : (isHe ? 'חפש מאכל להוספה' : 'Search a food to add')}
            style={{ width: '100%', minHeight: 44, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-input, var(--fill-faint))', color: 'var(--text-1)', padding: '0 12px', fontSize: 16, fontFamily: 'inherit', boxSizing: 'border-box' }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
            {results.map((r, i) => (
              <button key={i} type="button" onClick={() => pick(r)} style={{ textAlign: 'start', minHeight: 48, borderRadius: 12, border: '1px solid var(--border-faint)', background: 'var(--surface)', padding: '8px 12px', cursor: 'pointer', fontFamily: 'inherit', color: 'var(--text-1)' }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{r.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
                  {isHe ? '100 גרם' : '100 g'} · {r.cal} {isHe ? 'קק״ל' : 'kcal'} · {r.p}g {isHe ? 'חלבון' : 'protein'} · {r.c}g {isHe ? 'פחמ׳' : 'carbs'} · {r.f}g {isHe ? 'שומן' : 'fat'}
                </div>
              </button>
            ))}
            {!searching && query.trim() && results.length === 0 && (
              <div style={{ fontSize: 12.5, color: 'var(--text-3)', padding: 4 }}>{isHe ? 'לא נמצא במאגר.' : 'Not in the food database.'}</div>
            )}
          </div>
          <button type="button" onClick={() => { setPicker(null); setQuery(''); }} style={{ ...btn, marginTop: 8, width: '100%', fontSize: 13.5 }}>{isHe ? 'סגור חיפוש' : 'Close search'}</button>
        </div>
      ) : (
        <button type="button" onClick={() => { setPicker({ kind: 'add' }); setQuery(''); }} style={{ ...btn, marginTop: 10, width: '100%', fontSize: 13.5 }}>
          + {isHe ? 'הוסף מאכל' : 'Add a food'}
        </button>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button type="button" disabled={items.length === 0} onClick={() => onSave(rebuildMeal(meal, items))}
          style={{ flex: 2, minHeight: 46, borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#36E8C6,#1EC0A2)', color: '#04241B', fontWeight: 700, fontSize: 14.5, fontFamily: 'inherit', cursor: 'pointer', opacity: items.length === 0 ? 0.45 : 1 }}>
          {isHe ? 'שמור שינויים' : 'Save changes'}
        </button>
        <button type="button" onClick={onCancel}
          style={{ flex: 1, minHeight: 46, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--fill-faint)', color: 'var(--text-1)', fontSize: 14, fontFamily: 'inherit', cursor: 'pointer' }}>
          {isHe ? 'ביטול' : 'Cancel'}
        </button>
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--text-4)', marginTop: 8, lineHeight: 1.5 }}>
        {isHe ? 'השינוי חל על התפריט של היום. סימון "שאכלתי" ירשום את הערכים המעודכנים.' : 'The change applies to today’s menu. Marking it eaten logs the updated values.'}
      </div>
    </div>
  );
}
