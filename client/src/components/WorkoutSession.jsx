import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useLang } from '../context/LanguageContext';

// ─────────────────────────────────────────────────────────────────────
// Live workout session — full-screen tracked workout experience.
//
// Design decisions (vs. the old checkbox-only flow):
// • One exercise in focus at a time — less scrolling mid-set, bigger
//   touch targets, clear "where am I" feeling.
// • Every set is a row prefilled from the user's last performance, so
//   the common case is a single tap (✓) per set.
// • Completing a set auto-starts a rest timer sized to the exercise
//   type (compound 90s / isolation 60s / core+cardio 45s).
// • Session state persists to localStorage on every change — killing
//   the app mid-workout and reopening resumes exactly where you were.
// • Home mode drops the weight column entirely and supports time-based
//   exercises (plank, cardio) with an inline countdown.
// ─────────────────────────────────────────────────────────────────────

export const ACTIVE_SESSION_KEY = 'areto:activeWorkout';

const MUSCLE_COLORS = {
  'חזה': '#ff5c7c', 'גב': '#4aa8ff', 'כתפיים': '#ffb020',
  'זרועות': '#a78bfa', 'רגליים': '#2ee6c4', 'תאומים': '#4aa8ff',
  'ליבה': '#ffb020', 'אירובי': '#2ee6c4', 'כללי': '#5b6675',
};

function getEnglishName(name) {
  const match = name.match(/\(([^)]+)\)/);
  return match ? match[1] : name;
}

// Rest length heuristic: big compound lifts need more recovery.
function restSecondsFor(ex) {
  const en = getEnglishName(ex.name).toLowerCase();
  if (/squat|deadlift|bench|press|row|pull up|pull-up|pullup/.test(en)) return 90;
  if (ex.muscleGroup === 'ליבה' || ex.muscleGroup === 'אירובי') return 45;
  return 60;
}

// "8-12" → 10 (mid, rounded); "12" → 12. Fallback 10.
function suggestReps(repsStr) {
  if (!repsStr) return 10;
  const m = String(repsStr).match(/(\d+)\s*-\s*(\d+)/);
  if (m) return Math.round((parseInt(m[1]) + parseInt(m[2])) / 2);
  const single = String(repsStr).match(/(\d+)/);
  return single ? parseInt(single[1]) : 10;
}

// Time-based exercise detection + target seconds.
// "20-30 דק" → minutes; "30-60 שנ" → seconds; plank defaults to 45s.
function timeTargetFor(ex) {
  const reps = String(ex.reps || '');
  const name = ex.name || '';
  const isTime = /דק|שנ|min|sec/i.test(reps) || /פלאנק|plank|zone 2|hiit|הליכה/i.test(name);
  if (!isTime) return null;
  const m = reps.match(/(\d+)\s*(?:-\s*(\d+))?/);
  const val = m ? parseInt(m[2] || m[1]) : null;
  if (/דק|min/i.test(reps) && val) return val * 60;
  if (/שנ|sec/i.test(reps) && val) return val;
  if (/פלאנק|plank/i.test(name)) return 45;
  return val ? val * 60 : 60;
}

function fmtClock(totalSec) {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// Build the initial per-exercise session state from the plan.
function initExercises(planExercises, location) {
  return planExercises.map((ex) => {
    const timeTarget = location === 'home' ? timeTargetFor(ex) : (timeTargetFor(ex) ? timeTargetFor(ex) : null);
    const mode = timeTarget ? 'time' : 'reps';
    const count = Math.max(1, ex.sets || 3);
    return {
      name: ex.name,
      muscleGroup: ex.muscleGroup || 'כללי',
      targetReps: ex.reps || '',
      mode,
      timeTarget: timeTarget || null,
      sets: Array.from({ length: mode === 'time' ? 1 : count }, () => ({
        weight: null,
        reps: suggestReps(ex.reps),
        durationSec: timeTarget || null,
        done: false,
      })),
    };
  });
}

export function readActiveSession() {
  try {
    const raw = JSON.parse(localStorage.getItem(ACTIVE_SESSION_KEY) || 'null');
    if (!raw || !raw.startedAt || !Array.isArray(raw.exercises)) return null;
    // Discard sessions older than 12h — almost certainly abandoned.
    if (Date.now() - raw.startedAt > 12 * 3600 * 1000) {
      localStorage.removeItem(ACTIVE_SESSION_KEY);
      return null;
    }
    return raw;
  } catch { return null; }
}

export function clearActiveSession() {
  try { localStorage.removeItem(ACTIVE_SESSION_KEY); } catch { /* ignore */ }
}

export default function WorkoutSession({ planExercises, dayName, location, api, onFinish, onDiscard, restore }) {
  const { lang } = useLang();
  const isHe = lang === 'he';

  const [exs, setExs] = useState(() =>
    restore?.exercises || initExercises(planExercises, location)
  );
  const [curIdx, setCurIdx] = useState(restore?.curIdx || 0);
  const [startedAt] = useState(restore?.startedAt || Date.now());
  const [elapsed, setElapsed] = useState(() => Math.floor((Date.now() - (restore?.startedAt || Date.now())) / 1000));
  const [rest, setRest] = useState(null); // { total, left }
  const [workTimer, setWorkTimer] = useState(null); // { setIdx, left, total }
  const [summary, setSummary] = useState(null); // server result → finish screen
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [confirmExit, setConfirmExit] = useState(false);
  const [lastPerf, setLastPerf] = useState({});
  const perfApplied = useRef(!!restore);
  const wakeLockRef = useRef(null);

  const cur = exs[curIdx];
  const totalSets = exs.reduce((n, e) => n + e.sets.length, 0);
  const doneSets = exs.reduce((n, e) => n + e.sets.filter(s => s.done).length, 0);
  const pct = totalSets ? Math.round((doneSets / totalSets) * 100) : 0;
  const exColor = MUSCLE_COLORS[cur?.muscleGroup] || '#2ee6c4';

  // ── Persist session to localStorage on every meaningful change ──
  useEffect(() => {
    if (summary) return; // finished — storage already cleared
    try {
      localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify({
        exercises: exs, curIdx, startedAt, dayName, location,
      }));
    } catch { /* storage unavailable */ }
  }, [exs, curIdx, startedAt, dayName, location, summary]);

  // ── Elapsed clock ──
  useEffect(() => {
    const iv = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(iv);
  }, [startedAt]);

  // ── Keep the screen awake during the session (best-effort) ──
  useEffect(() => {
    let released = false;
    (async () => {
      try {
        wakeLockRef.current = await navigator.wakeLock?.request('screen');
        if (released) wakeLockRef.current?.release();
      } catch { /* unsupported / denied */ }
    })();
    return () => {
      released = true;
      wakeLockRef.current?.release?.();
    };
  }, []);

  // ── Rest countdown ──
  useEffect(() => {
    if (!rest) return;
    if (rest.left <= 0) {
      navigator.vibrate?.(300);
      setRest(null);
      // Auto-advance when the current exercise is fully done.
      setExs(prev => {
        const done = prev[curIdx]?.sets.every(s => s.done);
        if (done && curIdx < prev.length - 1) setCurIdx(curIdx + 1);
        return prev;
      });
      return;
    }
    const tm = setTimeout(() => setRest(r => (r ? { ...r, left: r.left - 1 } : null)), 1000);
    return () => clearTimeout(tm);
  }, [rest, curIdx]);

  // ── Work (time-based) countdown ──
  useEffect(() => {
    if (!workTimer) return;
    if (workTimer.left <= 0) {
      navigator.vibrate?.([200, 100, 200]);
      completeSet(workTimer.setIdx, { autoFromTimer: true });
      setWorkTimer(null);
      return;
    }
    const tm = setTimeout(() => setWorkTimer(w => (w ? { ...w, left: w.left - 1 } : null)), 1000);
    return () => clearTimeout(tm);
  }, [workTimer]); // eslint-disable-line

  // ── Fetch last performance once, prefill empty weights/reps ──
  useEffect(() => {
    (async () => {
      try {
        // Names come from session state (works for both fresh + restored).
        const names = exs.map(e => e.name);
        if (names.length === 0) return;
        const res = await api('/workout/performance', {
          method: 'POST',
          body: JSON.stringify({ names }),
        });
        const perf = res.performances || {};
        setLastPerf(perf);
        if (!perfApplied.current) {
          perfApplied.current = true;
          setExs(prev => prev.map(ex => {
            const p = perf[ex.name];
            if (!p || ex.mode === 'time') return ex;
            return {
              ...ex,
              sets: ex.sets.map((s, i) => ({
                ...s,
                weight: s.weight ?? p.sets[Math.min(i, p.sets.length - 1)]?.weight ?? null,
                reps: p.sets[Math.min(i, p.sets.length - 1)]?.reps ?? s.reps,
              })),
            };
          }));
        }
      } catch { /* non-critical */ }
    })();
  }, []); // eslint-disable-line

  // ── Set mutations ──
  function updateSet(setIdx, patch) {
    setExs(prev => prev.map((ex, i) => i !== curIdx ? ex : {
      ...ex,
      sets: ex.sets.map((s, j) => j === setIdx ? { ...s, ...patch } : s),
    }));
  }

  function completeSet(setIdx, { autoFromTimer = false } = {}) {
    const ex = exs[curIdx];
    const set = ex.sets[setIdx];
    const nowDone = !set.done;
    updateSet(setIdx, { done: nowDone });
    if (nowDone && !autoFromTimer) navigator.vibrate?.(40);
    if (nowDone) {
      // Start rest — unless this was the very last set of the last exercise.
      const isLastExercise = curIdx === exs.length - 1;
      const remainingHere = ex.sets.filter((s, j) => j !== setIdx && !s.done).length;
      if (!(isLastExercise && remainingHere === 0)) {
        const secs = restSecondsFor(ex);
        setRest({ total: secs, left: secs });
      }
    }
  }

  const addSet = useCallback(() => {
    setExs(prev => prev.map((ex, i) => {
      if (i !== curIdx) return ex;
      const last = ex.sets[ex.sets.length - 1];
      return { ...ex, sets: [...ex.sets, { ...last, done: false }] };
    }));
  }, [curIdx]);

  const removeSet = useCallback(() => {
    setExs(prev => prev.map((ex, i) => {
      if (i !== curIdx || ex.sets.length <= 1) return ex;
      return { ...ex, sets: ex.sets.slice(0, -1) };
    }));
  }, [curIdx]);

  // ── Finish ──
  async function handleFinish() {
    setSaving(true);
    setError('');
    try {
      const payload = {
        dayName,
        location,
        durationMinutes: Math.max(1, Math.round(elapsed / 60)),
        exercises: exs.map(ex => ({
          name: ex.name,
          muscleGroup: ex.muscleGroup,
          mode: ex.mode,
          sets: ex.sets.filter(s => s.done).length,
          reps: ex.targetReps,
          setLog: ex.sets.map(s => ({
            reps: s.reps ?? null,
            weight: s.weight ?? null,
            durationSec: s.durationSec ?? null,
            done: !!s.done,
          })),
        })),
      };
      const result = await api('/workout/complete', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      clearActiveSession();
      navigator.vibrate?.([100, 60, 100, 60, 200]);
      setSummary(result);
    } catch (err) {
      const msg = err?.message || '';
      if (msg === 'alreadyTrainedToday') setError(isHe ? 'כבר נרשם אימון היום' : 'Already logged a workout today');
      else if (msg === 'weeklyLimitReached') setError(isHe ? 'הגעת למגבלה השבועית' : 'Weekly limit reached');
      else setError(isHe ? 'שגיאה בשמירת האימון' : 'Error saving workout');
    } finally {
      setSaving(false);
    }
  }

  function handleExit() {
    clearActiveSession();
    onDiscard();
  }

  // ─────────────────────────── Finish screen ───────────────────────────
  if (summary) {
    const vol = summary.totalVolume || 0;
    const prev = summary.prevVolume;
    const volDelta = prev && prev > 0 ? Math.round(((vol - prev) / prev) * 100) : null;
    const xpGained = summary.xp?.xpGained || 0;
    const prs = summary.prs || [];
    return (
      <div className="ws-overlay">
        <div className="ws-summary">
          <div className="ws-summary__burst">🎉</div>
          <h2 className="ws-summary__title">{isHe ? 'כל הכבוד!' : 'Well done!'}</h2>
          <p className="ws-summary__sub">
            {isHe ? 'האימון נשמר בהצלחה' : 'Workout saved successfully'}
          </p>

          <div className="ws-summary__grid">
            <div className="ws-stat">
              <div className="ws-stat__value">{fmtClock(elapsed)}</div>
              <div className="ws-stat__label">{isHe ? 'משך' : 'Duration'}</div>
            </div>
            <div className="ws-stat">
              <div className="ws-stat__value">{doneSets}</div>
              <div className="ws-stat__label">{isHe ? 'סטים' : 'Sets'}</div>
            </div>
            <div className="ws-stat">
              <div className="ws-stat__value">{summary.caloriesBurned || 0}</div>
              <div className="ws-stat__label">{isHe ? 'קק״ל' : 'kcal'}</div>
            </div>
            {location === 'gym' && vol > 0 && (
              <div className="ws-stat">
                <div className="ws-stat__value">{vol.toLocaleString()}</div>
                <div className="ws-stat__label">
                  {isHe ? 'נפח (ק״ג)' : 'Volume (kg)'}
                  {volDelta !== null && (
                    <span style={{ color: volDelta >= 0 ? '#2ee6c4' : '#ffb020', marginInlineStart: 4 }}>
                      {volDelta >= 0 ? '↑' : '↓'}{Math.abs(volDelta)}%
                    </span>
                  )}
                </div>
              </div>
            )}
            {xpGained > 0 && (
              <div className="ws-stat ws-stat--xp">
                <div className="ws-stat__value">+{xpGained}</div>
                <div className="ws-stat__label">XP</div>
              </div>
            )}
          </div>

          {prs.length > 0 && (
            <div className="ws-prs">
              <div className="ws-prs__title">🏆 {isHe ? 'שיאים חדשים!' : 'New records!'}</div>
              {prs.map((pr, i) => (
                <div key={i} className="ws-prs__row">
                  <span>{isHe ? pr.name : getEnglishName(pr.name)}</span>
                  <strong>{pr.weight} {isHe ? 'ק״ג' : 'kg'}</strong>
                </div>
              ))}
            </div>
          )}

          <div className="ws-summary__list">
            {exs.filter(e => e.sets.some(s => s.done)).map((ex, i) => {
              const done = ex.sets.filter(s => s.done);
              const top = done.reduce((m, s) => (s.weight || 0) > (m?.weight || 0) ? s : m, done[0]);
              return (
                <div key={i} className="ws-summary__ex">
                  <span className="ws-summary__ex-dot" style={{ background: MUSCLE_COLORS[ex.muscleGroup] || '#2ee6c4' }} />
                  <span className="ws-summary__ex-name">{isHe ? ex.name : getEnglishName(ex.name)}</span>
                  <span className="ws-summary__ex-detail">
                    {ex.mode === 'time'
                      ? fmtClock(done.reduce((n, s) => n + (s.durationSec || 0), 0))
                      : `${done.length}×${top?.reps || '—'}${top?.weight ? ` @ ${top.weight}` : ''}`}
                  </span>
                </div>
              );
            })}
          </div>

          <button type="button" className="ws-btn-primary" onClick={() => onFinish(summary)}>
            {isHe ? 'סגור' : 'Done'}
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────── Active session ───────────────────────────
  if (!cur) return null;
  const primaryName = isHe ? cur.name : getEnglishName(cur.name);
  const secondaryName = isHe && getEnglishName(cur.name) !== cur.name ? getEnglishName(cur.name) : null;
  const perf = lastPerf[cur.name];

  return (
    <div className="ws-overlay">
      {/* Header */}
      <div className="ws-header">
        <button type="button" className="ws-header__exit" onClick={() => setConfirmExit(true)} aria-label={isHe ? 'יציאה' : 'Exit'}>
          ✕
        </button>
        <div className="ws-header__clock" dir="ltr">⏱ {fmtClock(elapsed)}</div>
        <div className="ws-header__progress-text">{doneSets}/{totalSets} {isHe ? 'סטים' : 'sets'}</div>
      </div>
      <div className="ws-progress-track">
        <div className="ws-progress-fill" style={{ width: `${pct}%` }} />
      </div>

      {/* Exit confirm */}
      {confirmExit && (
        <div className="ws-confirm">
          <div className="ws-confirm__box">
            <div className="ws-confirm__title">{isHe ? 'לצאת מהאימון?' : 'Leave workout?'}</div>
            <div className="ws-confirm__sub">{isHe ? 'ההתקדמות שלך לא תישמר.' : 'Your progress will not be saved.'}</div>
            <div className="ws-confirm__actions">
              <button type="button" className="ws-btn-danger" onClick={handleExit}>{isHe ? 'צא' : 'Leave'}</button>
              <button type="button" className="ws-btn-ghost" onClick={() => setConfirmExit(false)}>{isHe ? 'המשך אימון' : 'Keep training'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Body */}
      <div className="ws-body">
        {/* Exercise pager dots */}
        <div className="ws-dots">
          {exs.map((e, i) => {
            const exDone = e.sets.every(s => s.done);
            return (
              <button
                key={i}
                type="button"
                className={`ws-dot${i === curIdx ? ' ws-dot--active' : ''}${exDone ? ' ws-dot--done' : ''}`}
                onClick={() => setCurIdx(i)}
                aria-label={`${isHe ? 'תרגיל' : 'Exercise'} ${i + 1}`}
              />
            );
          })}
        </div>

        {/* Exercise card */}
        <div className="ws-exercise" key={curIdx}>
          <div className="ws-exercise__head">
            <div className="ws-exercise__bar" style={{ background: exColor }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="ws-exercise__name">{primaryName}</div>
              <div className="ws-exercise__meta">
                {secondaryName && <span>{secondaryName} · </span>}
                <span style={{ color: exColor }}>{cur.muscleGroup}</span>
                {cur.targetReps && cur.mode === 'reps' && (
                  <span> · {isHe ? 'יעד' : 'target'} {cur.targetReps}</span>
                )}
              </div>
            </div>
            <button
              type="button"
              className="ws-video-btn"
              onClick={() => window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(getEnglishName(cur.name) + ' exercise tutorial form')}`, '_blank')}
              aria-label={isHe ? 'סרטון הדרכה' : 'Tutorial video'}
            >▶</button>
          </div>

          {/* Last performance hint */}
          {perf && cur.mode === 'reps' && (
            <div className="ws-lasttime">
              {isHe ? 'פעם קודמת: ' : 'Last time: '}
              <strong>
                {perf.sets.length}×{perf.sets[0]?.reps || '—'}
                {perf.sets[0]?.weight ? ` @ ${perf.sets[0].weight} ${isHe ? 'ק״ג' : 'kg'}` : ''}
              </strong>
            </div>
          )}

          {/* Set rows */}
          <div className="ws-sets">
            {cur.sets.map((s, si) => (
              <div key={si} className={`ws-set${s.done ? ' ws-set--done' : ''}`}>
                <div className="ws-set__num">{si + 1}</div>

                {cur.mode === 'time' ? (
                  <>
                    <div className="ws-set__time" dir="ltr">
                      {workTimer?.setIdx === si
                        ? fmtClock(workTimer.left)
                        : fmtClock(s.durationSec || 60)}
                    </div>
                    {!s.done && (
                      workTimer?.setIdx === si ? (
                        <button type="button" className="ws-set__timerbtn ws-set__timerbtn--stop" onClick={() => setWorkTimer(null)}>
                          ⏸
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="ws-set__timerbtn"
                          onClick={() => setWorkTimer({ setIdx: si, total: s.durationSec || 60, left: s.durationSec || 60 })}
                        >▶</button>
                      )
                    )}
                  </>
                ) : (
                  <>
                    {location === 'gym' && (
                      <div className="ws-set__field">
                        <input
                          type="number"
                          inputMode="decimal"
                          step="2.5"
                          min="0"
                          dir="ltr"
                          value={s.weight ?? ''}
                          placeholder="—"
                          onChange={(e) => updateSet(si, { weight: e.target.value === '' ? null : parseFloat(e.target.value) })}
                        />
                        <span className="ws-set__unit">{isHe ? 'ק״ג' : 'kg'}</span>
                      </div>
                    )}
                    <div className="ws-set__field">
                      <input
                        type="number"
                        inputMode="numeric"
                        min="0"
                        dir="ltr"
                        value={s.reps ?? ''}
                        placeholder="—"
                        onChange={(e) => updateSet(si, { reps: e.target.value === '' ? null : parseInt(e.target.value) })}
                      />
                      <span className="ws-set__unit">{isHe ? 'חזרות' : 'reps'}</span>
                    </div>
                  </>
                )}

                <button
                  type="button"
                  className={`ws-set__check${s.done ? ' ws-set__check--on' : ''}`}
                  style={s.done ? { borderColor: exColor, background: `${exColor}22`, color: exColor } : {}}
                  onClick={() => completeSet(si)}
                  aria-label={isHe ? 'סמן סט' : 'Mark set'}
                >
                  ✓
                </button>
              </div>
            ))}
          </div>

          {/* Add / remove set */}
          {cur.mode === 'reps' && (
            <div className="ws-set-actions">
              <button type="button" className="ws-chip" onClick={addSet}>+ {isHe ? 'הוסף סט' : 'Add set'}</button>
              {cur.sets.length > 1 && (
                <button type="button" className="ws-chip" onClick={removeSet}>− {isHe ? 'הסר סט' : 'Remove set'}</button>
              )}
            </div>
          )}
        </div>

        {error && <div className="ws-error">{error}</div>}
      </div>

      {/* Rest timer sheet */}
      {rest && (
        <div className="ws-rest">
          <div className="ws-rest__ring" dir="ltr">
            <svg width="120" height="120" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="52" stroke="rgba(255,255,255,0.08)" strokeWidth="8" fill="none" />
              <circle
                cx="60" cy="60" r="52"
                stroke="#2ee6c4" strokeWidth="8" fill="none" strokeLinecap="round"
                strokeDasharray={`${(rest.left / rest.total) * 326.7} 326.7`}
                transform="rotate(-90 60 60)"
                style={{ transition: 'stroke-dasharray 1s linear' }}
              />
              <text x="60" y="68" textAnchor="middle" fontFamily="Heebo" fontSize="26" fontWeight="800" fill="#fff">
                {fmtClock(rest.left)}
              </text>
            </svg>
          </div>
          <div className="ws-rest__label">{isHe ? 'מנוחה' : 'Rest'}</div>
          <div className="ws-rest__actions">
            <button type="button" className="ws-chip" onClick={() => setRest(r => r ? { ...r, left: r.left + 15, total: r.total + 15 } : null)}>
              +15{isHe ? ' שנ׳' : 's'}
            </button>
            <button type="button" className="ws-chip ws-chip--accent" onClick={() => setRest(null)}>
              {isHe ? 'דלג ←' : 'Skip →'}
            </button>
          </div>
        </div>
      )}

      {/* Footer nav */}
      <div className="ws-footer">
        <button
          type="button"
          className="ws-nav-btn"
          disabled={curIdx === 0}
          onClick={() => setCurIdx(i => Math.max(0, i - 1))}
        >
          {isHe ? '→ הקודם' : '← Prev'}
        </button>

        {doneSets > 0 ? (
          <button type="button" className="ws-finish-btn" onClick={handleFinish} disabled={saving}>
            {saving ? (isHe ? 'שומר…' : 'Saving…') : (isHe ? '✓ סיים אימון' : '✓ Finish')}
          </button>
        ) : (
          <div className="ws-footer__count">{curIdx + 1}/{exs.length}</div>
        )}

        <button
          type="button"
          className="ws-nav-btn"
          disabled={curIdx === exs.length - 1}
          onClick={() => setCurIdx(i => Math.min(exs.length - 1, i + 1))}
        >
          {isHe ? 'הבא ←' : 'Next →'}
        </button>
      </div>
    </div>
  );
}
