import { useState, useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { goalSheetContent, isSuggestionOff, setSuggestionOff } from '../lib/goalSuggestion.mjs';

// Bottom sheet shown when the user tries to train past the workout goal: from
// "Extra workout", and when the server refuses a save with weeklyLimitReached.
// Wording and rules live in lib/goalSuggestion.mjs.
export default function GoalReachedSheet({ done, goal, known = true, loggedToday, saveFailed, userId, isHe, onClose, onOpenSettings }) {
  // Read once, when the sheet opens: ticking the box does not change the open
  // sheet, so it can still be unticked before closing.
  const [suggestionOff] = useState(() => isSuggestionOff(userId));
  const [dontSuggest, setDontSuggest] = useState(false);
  const checkboxId = useId();
  const dialogRef = useRef(null);
  const c = goalSheetContent({ done, goal, known, loggedToday, saveFailed, suggestionOff, isHe });

  // Every way out saves the box as it stands at that moment.
  function leave(next) {
    if (dontSuggest && c.offerSettings) setSuggestionOff(userId);
    next();
  }
  const leaveRef = useRef(leave);
  leaveRef.current = leave;
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    dialogRef.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape') leaveRef.current(closeRef.current); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const button = { width: '100%', minHeight: 50, borderRadius: 14, cursor: 'pointer', fontFamily: 'inherit', fontSize: 15.5 };
  const text = { fontSize: 14.5, lineHeight: 1.6, color: 'var(--text-2)', marginTop: 8 };

  return createPortal(
    <>
      {/* Above .mobile-nav (z-index 100) and the live-session overlay (10050). */}
      <div onClick={() => leave(onClose)}
        style={{ position: 'fixed', inset: 0, background: 'rgba(4,7,12,.68)', backdropFilter: 'blur(2px)', zIndex: 10060 }} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${checkboxId}-title`}
        tabIndex={-1}
        dir={isHe ? 'rtl' : 'ltr'}
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 10061, maxWidth: 520, margin: '0 auto',
          maxHeight: '90vh', overflowY: 'auto', outline: 'none',
          background: 'var(--surface-elev)', borderRadius: '28px 28px 0 0', borderTop: '1px solid var(--border-subtle)',
          padding: '12px 24px calc(env(safe-area-inset-bottom, 0px) + 22px)',
        }}
      >
        <div aria-hidden="true" style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border)', margin: '0 auto 18px' }} />
        <h2 id={`${checkboxId}-title`} style={{ fontSize: 19, fontWeight: 700, lineHeight: 1.35, color: 'var(--text-1)', margin: 0 }}>{c.title}</h2>
        {c.notSaved && <div role="alert" style={{ ...text, color: 'var(--warning)', fontWeight: 700 }}>{c.notSaved}</div>}
        <div style={text}>{c.count}</div>
        {c.suggestion && <div style={{ ...text, marginTop: 4 }}>{c.suggestion}</div>}
        {c.maximum && <div style={{ ...text, marginTop: 4 }}>{c.maximum}</div>}
        {c.tomorrow && <div style={{ ...text, fontSize: 13.5, color: 'var(--text-3)' }}>{c.tomorrow}</div>}

        {c.offerSettings && (
          <label htmlFor={checkboxId} style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 48, marginTop: 12, cursor: 'pointer' }}>
            <input id={checkboxId} type="checkbox" checked={dontSuggest} onChange={(e) => setDontSuggest(e.target.checked)}
              style={{ width: 20, height: 20, flex: 'none', margin: 0, accentColor: '#2FE3C2', cursor: 'pointer' }} />
            <span style={{ fontSize: 14, color: 'var(--text-2)' }}>{c.dontSuggestLabel}</span>
          </label>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: c.offerSettings ? 10 : 20 }}>
          {c.offerSettings && (
            <button type="button" onClick={() => leave(onOpenSettings)}
              style={{ ...button, border: 'none', fontWeight: 700, background: 'linear-gradient(135deg,#36E8C6,#1EC0A2)', color: '#04241B' }}>
              {c.settingsLabel}
            </button>
          )}
          <button type="button" onClick={() => leave(onClose)}
            style={{ ...button, fontWeight: 600, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-1)' }}>
            {c.closeLabel}
          </button>
        </div>
      </div>
    </>,
    document.body,
  );
}
