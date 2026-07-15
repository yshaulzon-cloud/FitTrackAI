import { useRef, useState, useEffect, useMemo, useId, useDeferredValue } from 'react';
import { rankItems, highlightParts } from '../lib/searchRank';

// Show results only once the query is meaningful, and cap the first view so
// the panel stays short (spec: 5–8 + an explicit "show all").
const MIN_CHARS = 2;
const INITIAL_LIMIT = 6;

// Accessible settings search (ARIA combobox + listbox). Deliberately calm:
// results render inline under the field — no popup, no full-screen takeover,
// no layout shift of the page around it. State (`query`) is owned by the
// parent so the text survives navigating into a result and back.
export default function SettingsSearch({ items, sections, query, setQuery, onNavigate, isHe }) {
  const [activeIndex, setActiveIndex] = useState(-1);
  const [showAll, setShowAll] = useState(false);
  const inputRef = useRef(null);
  const uid = useId();
  const listId = `${uid}-list`;
  const labelId = `${uid}-label`;
  const optionId = (i) => `${uid}-opt-${i}`;

  const trimmed = query.trim();
  const active = trimmed.length >= MIN_CHARS;

  // useDeferredValue keeps typing snappy without an artificial timer. There's
  // no network here, so a 300–500ms debounce would only add lag — the spec's
  // debounce requirement targets remote search, which this isn't.
  const deferredQuery = useDeferredValue(query);

  const sectionLabel = useMemo(() => {
    const map = {};
    for (const s of sections) map[s.id] = s.label;
    return (id) => map[id] || '';
  }, [sections]);

  const ranked = useMemo(() => {
    if (deferredQuery.trim().length < MIN_CHARS) return [];
    // Title = the item's label; body = optional secondary text (e.g. a
    // section's description) so a query can match on either, title first.
    return rankItems(deferredQuery, items, (it) => ({ title: it.label, body: it.body || '' }));
  }, [deferredQuery, items]);

  const results = showAll ? ranked : ranked.slice(0, INITIAL_LIMIT);

  // A changed query resets the highlighted option and collapses "show all".
  useEffect(() => { setActiveIndex(-1); setShowAll(false); }, [deferredQuery]);

  function selectAt(i) {
    const r = results[i];
    if (r) onNavigate(r.item.screen);
  }

  function onKeyDown(e) {
    if (!active || ranked.length === 0) {
      if (e.key === 'Escape' && query) { e.preventDefault(); setQuery(''); }
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex(i => (i + 1) % results.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex(i => (i <= 0 ? results.length - 1 : i - 1));
        break;
      case 'Enter':
        if (activeIndex >= 0) { e.preventDefault(); selectAt(activeIndex); }
        break;
      case 'Escape':
        e.preventDefault();
        if (query) setQuery(''); else inputRef.current?.blur();
        break;
      default:
        break;
    }
  }

  return (
    <div className="st2-search-wrap">
      <label id={labelId} htmlFor={`${uid}-input`} className="sr-only">
        {isHe ? 'חיפוש הגדרות' : 'Search settings'}
      </label>

      <div className="st2-search-box">
        <svg className="st2-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
        </svg>
        <input
          id={`${uid}-input`}
          ref={inputRef}
          className="st2-search"
          type="text"
          role="combobox"
          aria-expanded={active && ranked.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-labelledby={labelId}
          aria-activedescendant={activeIndex >= 0 ? optionId(activeIndex) : undefined}
          placeholder={isHe ? 'חפש הגדרות…' : 'Search settings…'}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          dir={isHe ? 'rtl' : 'ltr'}
          autoComplete="off"
          autoCorrect="off"
          spellCheck="false"
        />
        {query && (
          <button
            type="button"
            className="st2-search-clear"
            onClick={() => { setQuery(''); inputRef.current?.focus(); }}
            aria-label={isHe ? 'נקה חיפוש' : 'Clear search'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        )}
      </div>

      {/* Polite live region — announces the result count to screen readers. */}
      <div className="sr-only" role="status" aria-live="polite">
        {active
          ? (ranked.length === 0
              ? (isHe ? 'לא נמצאו תוצאות' : 'No results')
              : (isHe ? `${ranked.length} תוצאות` : `${ranked.length} results`))
          : ''}
      </div>

      {active && (ranked.length > 0 ? (
        <>
          <ul className="st2-search-results" id={listId} role="listbox"
              aria-label={isHe ? 'תוצאות חיפוש' : 'Search results'}>
            {results.map((r, i) => (
              <li
                key={`${r.item.screen}:${r.item.label}`}
                id={optionId(i)}
                role="option"
                aria-selected={i === activeIndex}
                className={`st2-search-result-item${i === activeIndex ? ' is-active' : ''}`}
                onMouseEnter={() => setActiveIndex(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectAt(i)}
              >
                <span className="st2-result-label">
                  {highlightParts(r.item.label, deferredQuery).map((p, j) =>
                    p.hit ? <mark key={j}>{p.text}</mark> : <span key={j}>{p.text}</span>
                  )}
                </span>
                <span className="st2-result-cat">{sectionLabel(r.item.screen)}</span>
              </li>
            ))}
          </ul>
          {ranked.length > results.length && (
            <button type="button" className="st2-search-more" onClick={() => setShowAll(true)}>
              {isHe ? `הצג את כל ${ranked.length} התוצאות` : `Show all ${ranked.length} results`}
            </button>
          )}
        </>
      ) : (
        <div className="st2-search-empty">
          <div className="st2-empty-title">
            {isHe ? `לא נמצאו תוצאות עבור “${trimmed}”` : `No results for “${trimmed}”`}
          </div>
          <ul className="st2-empty-tips">
            <li>{isHe ? 'בדקו את האיות' : 'Check the spelling'}</li>
            <li>{isHe ? 'נסו ביטוי קצר יותר' : 'Try a shorter term'}</li>
          </ul>
          <div className="st2-empty-cats-label">{isHe ? 'או עברו לקטגוריה:' : 'Or jump to a category:'}</div>
          <div className="st2-empty-cats">
            {sections.map(s => (
              <button key={s.id} type="button" className="st2-cat-chip" onClick={() => onNavigate(s.id)}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
