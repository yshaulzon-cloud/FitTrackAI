import { useState, useEffect, useRef, useCallback } from 'react';
import { useLang } from '../context/LanguageContext';

const qualityOptions = [
  { value: 'bad', icon: '😴', color: '#ff6b6b' },
  { value: 'ok', icon: '🙂', color: '#fdcb6e' },
  { value: 'good', icon: '😊', color: '#00b894' },
  { value: 'great', icon: '🌟', color: '#6c5ce7' },
];

function getScoreColor(hours, min) {
  if (hours >= min) return '#00b894';
  if (hours >= min - 1) return '#fdcb6e';
  return '#ff6b6b';
}

export default function SleepTracker({ api, showXP }) {
  const { t } = useLang();
  const [todaySleep, setTodaySleep] = useState(null);
  const [recommendation, setRecommendation] = useState(null);
  const [hours, setHours] = useState(7);
  const [quality, setQuality] = useState('ok');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const barRef = useRef(null);
  const dragging = useRef(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const res = await api('/sleep/today');
      setTodaySleep(res.sleep);
      setRecommendation(res.recommendation);
      if (res.sleep) {
        setHours(res.sleep.hours);
        setQuality(res.sleep.quality);
      }
    } catch (err) {
      console.error('Sleep load error:', err);
    } finally {
      setLoading(false);
    }
  }

  // Drag logic
  const pctToHours = useCallback((pct) => {
    const raw = (pct / 100) * 12;
    return Math.round(raw * 2) / 2; // snap to 0.5
  }, []);

  const handlePointerMove = useCallback((e) => {
    if (!dragging.current || !barRef.current) return;
    const rect = barRef.current.getBoundingClientRect();
    const x = e.touches ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const pct = Math.min(100, Math.max(0, (x / rect.width) * 100));
    setHours(pctToHours(pct));
  }, [pctToHours]);

  const handlePointerUp = useCallback(() => {
    dragging.current = false;
    document.removeEventListener('mousemove', handlePointerMove);
    document.removeEventListener('mouseup', handlePointerUp);
    document.removeEventListener('touchmove', handlePointerMove);
    document.removeEventListener('touchend', handlePointerUp);
  }, [handlePointerMove]);

  const handlePointerDown = useCallback((e) => {
    e.preventDefault();
    dragging.current = true;
    handlePointerMove(e);
    document.addEventListener('mousemove', handlePointerMove);
    document.addEventListener('mouseup', handlePointerUp);
    document.addEventListener('touchmove', handlePointerMove, { passive: false });
    document.addEventListener('touchend', handlePointerUp);
  }, [handlePointerMove, handlePointerUp]);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await api('/sleep/log', {
        method: 'POST',
        body: JSON.stringify({ hours, quality }),
      });
      setTodaySleep(res.sleep);
      setRecommendation(res.recommendation);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      if (res.xpResults?.length > 0) {
        for (const xp of res.xpResults) {
          if (xp.xpGained && showXP) showXP(xp);
        }
      }
    } catch (err) {
      console.error('Sleep save error:', err);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return null;

  const rec = recommendation || { min: 7, max: 9, recommended: 9, workoutBonus: 0 };
  const scoreColor = getScoreColor(hours, rec.min);
  const gaugePercent = Math.min(100, Math.max(0, (hours / 12) * 100));

  return (
    <div className="card">
      <div className="card-header">
        <h3>🌙 {t.sleepLogToday}</h3>
        {todaySleep && (
          <span className="badge" style={{ background: 'rgba(0,184,148,0.15)', color: 'var(--success)' }}>
            ✓ {todaySleep.hours} {t.sleepHours}
          </span>
        )}
      </div>

      {/* Hours display */}
      <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
        <div style={{ fontSize: '40px', fontWeight: 800, color: scoreColor, lineHeight: 1, transition: 'color 0.2s' }}>
          {hours}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{t.sleepHours}</div>
      </div>

      {/* Gauge bar with +/- and drag */}
      <div style={{ margin: '12px auto 0', maxWidth: '360px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', direction: 'ltr' }}>
          <button
            type="button"
            onClick={() => setHours(Math.max(0, Math.round((hours - 0.5) * 10) / 10))}
            style={{
              width: '30px', height: '30px', borderRadius: '50%',
              border: `2px solid ${scoreColor}`, background: 'transparent',
              color: scoreColor, fontSize: '18px', fontWeight: 700,
              cursor: 'pointer', display: 'flex', alignItems: 'center',
              justifyContent: 'center', padding: 0, flexShrink: 0, lineHeight: 1,
            }}
          >−</button>
          <div
            ref={barRef}
            onMouseDown={handlePointerDown}
            onTouchStart={handlePointerDown}
            style={{ flex: 1, position: 'relative', cursor: 'pointer', touchAction: 'none', userSelect: 'none', padding: '10px 0' }}
          >
            <div style={{
              height: '14px', borderRadius: '7px',
              background: 'linear-gradient(to right, #ff6b6b 0%, #fdcb6e 30%, #00b894 55%, #6c5ce7 85%, #a29bfe 100%)',
              position: 'relative',
            }}>
              {/* Recommended zone highlight */}
              <div style={{
                position: 'absolute', top: '-3px',
                left: `${(rec.min / 12) * 100}%`,
                width: `${((rec.max - rec.min) / 12) * 100}%`,
                height: '20px', borderRadius: '4px',
                border: '2px solid rgba(255,255,255,0.5)',
                pointerEvents: 'none',
              }} />
              {/* Draggable pointer */}
              <div
                onMouseDown={handlePointerDown}
                onTouchStart={handlePointerDown}
                style={{
                  position: 'absolute', top: '50%',
                  left: `${gaugePercent}%`,
                  transform: 'translate(-50%, -50%)',
                  width: '26px', height: '26px', borderRadius: '50%',
                  background: 'white', border: `3px solid ${scoreColor}`,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
                  cursor: 'grab',
                  transition: dragging.current ? 'none' : 'left 0.15s ease',
                  zIndex: 2,
                }}
              />
            </div>
          </div>
          <button
            type="button"
            onClick={() => setHours(Math.min(12, Math.round((hours + 0.5) * 10) / 10))}
            style={{
              width: '30px', height: '30px', borderRadius: '50%',
              border: `2px solid ${scoreColor}`, background: 'transparent',
              color: scoreColor, fontSize: '18px', fontWeight: 700,
              cursor: 'pointer', display: 'flex', alignItems: 'center',
              justifyContent: 'center', padding: 0, flexShrink: 0, lineHeight: 1,
            }}
          >+</button>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)', padding: '4px 36px 0', direction: 'ltr' }}>
          <span>0</span><span>3</span><span>6</span><span>9</span><span>12</span>
        </div>
      </div>

      {/* Recommendation */}
      <div style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '10px' }}>
        {t.sleepRecommended}: <strong style={{ color: scoreColor }}>{rec.min}–{rec.max} {t.sleepHours}</strong>
        {rec.workoutBonus > 0 && (
          <span style={{ color: 'var(--primary-light)', marginInlineStart: '6px' }}>💪 +{rec.workoutBonus}</span>
        )}
      </div>

      {/* Quality selector */}
      <div style={{ marginTop: '14px' }}>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', textAlign: 'center' }}>
          {t.sleepQuality}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
          {qualityOptions.map((q) => (
            <button
              key={q.value}
              type="button"
              onClick={() => setQuality(q.value)}
              style={{
                padding: '6px 12px', borderRadius: '10px', cursor: 'pointer',
                border: quality === q.value ? `2px solid ${q.color}` : '1px solid var(--border)',
                background: quality === q.value ? `${q.color}15` : 'transparent',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
                transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: '20px' }}>{q.icon}</span>
              <span style={{ fontSize: '10px', color: quality === q.value ? q.color : 'var(--text-muted)', fontWeight: 600 }}>
                {t[`sleepQuality_${q.value}`]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="btn btn-primary"
        style={{ marginTop: '14px', width: '100%' }}
      >
        {saving ? t.saving : saved ? `✓ ${t.sleepSaved}` : todaySleep ? t.sleepUpdate : t.sleepLog}
      </button>
    </div>
  );
}
