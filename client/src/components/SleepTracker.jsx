import { useState, useEffect } from 'react';
import { useLang } from '../context/LanguageContext';
import { scheduleSleepPrompts, cancelSleepPrompts } from '../lib/notifications';

// Prototype sleep sheet: a fixed set of hour chips rather than a drag gauge.
// '9+' logs 9 — the server only needs the qualifying threshold, and a single
// tap beats dragging a slider to a half-hour on a phone.
const HOUR_OPTIONS = [
  { label: '6', value: 6 },
  { label: '6.5', value: 6.5 },
  { label: '7', value: 7 },
  { label: '7.5', value: 7.5 },
  { label: '8', value: 8 },
  { label: '9+', value: 9 },
];

// Ordered best → worst, matching the prototype's row.
const QUALITY_OPTIONS = ['great', 'good', 'ok', 'bad'];

function MoonIcon({ size = 17, color = '#8F8AF7' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 14A8.5 8.5 0 1 1 10 4a7 7 0 0 0 10 10z" />
    </svg>
  );
}

export default function SleepTracker({ api, showXP }) {
  const { t, lang } = useLang();
  const isHe = lang === 'he';
  const [todaySleep, setTodaySleep] = useState(null);
  const [recommendation, setRecommendation] = useState(null);
  const [hours, setHours] = useState(7.5);
  const [quality, setQuality] = useState('good');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => { loadData(); }, []);

  // Lock body scroll while the sheet is up.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; document.removeEventListener('keydown', onKey); };
  }, [open]);

  async function loadData() {
    try {
      const res = await api('/sleep/today');
      setTodaySleep(res.sleep);
      setRecommendation(res.recommendation);
      if (res.sleep) {
        setHours(res.sleep.hours);
        setQuality(res.sleep.quality);
        cancelSleepPrompts().catch(() => {});
      } else {
        scheduleSleepPrompts().catch(() => {});
      }
    } catch (err) {
      console.error('Sleep load error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await api('/sleep/log', { method: 'POST', body: JSON.stringify({ hours, quality }) });
      setTodaySleep(res.sleep);
      setRecommendation(res.recommendation);
      cancelSleepPrompts().catch(() => {});
      if (res.xpResults?.length > 0) {
        for (const xp of res.xpResults) if (xp.xpGained && showXP) showXP(xp);
      }
      setOpen(false);
    } catch (err) {
      console.error('Sleep save error:', err);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return null;

  const rec = recommendation || { min: 7, max: 9 };
  const qLabel = (q) => t[`sleepQuality_${q}`] || q;

  const chip = (selected) => ({
    flex: 1,
    borderRadius: 13,
    padding: '13px 0',
    textAlign: 'center',
    fontSize: 15,
    cursor: 'pointer',
    fontFamily: 'inherit',
    background: selected ? 'rgba(47,227,194,.1)' : 'var(--bg-input)',
    border: selected ? '1.5px solid #2FE3C2' : '1px solid rgba(255,255,255,.07)',
    color: selected ? '#2FE3C2' : '#B9C4D2',
    fontWeight: selected ? 700 : 400,
  });

  return (
    <>
      {/* Compact row */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          width: '100%', marginTop: 14, background: 'var(--surface)',
          border: '1px solid rgba(255,255,255,.06)', borderRadius: 18,
          padding: '15px 18px', display: 'flex', alignItems: 'center', gap: 13,
          cursor: 'pointer', fontFamily: 'inherit', textAlign: isHe ? 'right' : 'left',
        }}
      >
        <span style={{ width: 34, height: 34, borderRadius: 11, background: 'rgba(143,138,247,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <MoonIcon />
        </span>
        <span style={{ flex: 1 }}>
          <span style={{ fontSize: 14.5, fontWeight: 500, color: 'var(--text-1)' }}>{isHe ? 'שינה ' : 'Sleep '}</span>
          {todaySleep ? (
            <span style={{ fontSize: 14.5, color: '#93A0B4' }}>
              · {todaySleep.hours} {isHe ? 'שעות' : 'h'} · {qLabel(todaySleep.quality)}
            </span>
          ) : (
            <span style={{ fontSize: 14.5, color: '#93A0B4' }}>· {isHe ? 'טרם נרשמה' : 'not logged yet'}</span>
          )}
        </span>
        {todaySleep && (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2FE3C2" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7" /></svg>
        )}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5E6B7E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d={isHe ? 'M14 6l-6 6 6 6' : 'M10 6l6 6-6 6'} />
        </svg>
      </button>

      {/* Bottom sheet */}
      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            /* Above .mobile-nav (z-index 100) — otherwise the nav covers the
               sheet's save button on mobile. */
            style={{ position: 'fixed', inset: 0, background: 'rgba(4,7,12,.68)', backdropFilter: 'blur(2px)', zIndex: 200 }}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={isHe ? 'רישום שינה' : 'Log sleep'}
            dir={isHe ? 'rtl' : 'ltr'}
            style={{
              position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 201,
              background: 'var(--surface-elev)', borderRadius: '28px 28px 0 0',
              borderTop: '1px solid rgba(255,255,255,.08)', padding: '12px 24px 30px',
              maxWidth: 520, margin: '0 auto',
            }}
          >
            <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,.15)', margin: '0 auto 20px' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 12, background: 'rgba(143,138,247,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MoonIcon size={18} />
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-1)' }}>
                  {isHe ? 'כמה ישנת הלילה?' : 'How long did you sleep?'}
                </div>
                <div style={{ fontSize: 12.5, color: '#7C8798', marginTop: 2 }}>
                  {isHe ? `מומלץ: ${rec.min}–${rec.max} שעות` : `Recommended: ${rec.min}–${rec.max} hours`}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              {HOUR_OPTIONS.map((h) => (
                <button key={h.label} type="button" onClick={() => setHours(h.value)} style={chip(hours === h.value)}>
                  {h.label}
                </button>
              ))}
            </div>

            <div style={{ fontSize: 13.5, color: '#93A0B4', margin: '20px 0 10px' }}>
              {isHe ? 'איך הייתה השינה?' : 'How was it?'}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {QUALITY_OPTIONS.map((q) => (
                <button key={q} type="button" onClick={() => setQuality(q)} style={{ ...chip(quality === q), fontSize: 13.5, padding: '12px 0', fontWeight: quality === q ? 600 : 400 }}>
                  {qLabel(q)}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              style={{
                width: '100%', background: 'linear-gradient(135deg,#36E8C6,#1EC0A2)', color: '#04241B',
                fontWeight: 700, border: 'none', borderRadius: 16, padding: 16, fontSize: 16,
                fontFamily: 'inherit', cursor: saving ? 'wait' : 'pointer', marginTop: 22, opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? t.saving : (isHe ? 'עדכן שינה' : 'Save sleep')}
            </button>
          </div>
        </>
      )}
    </>
  );
}
