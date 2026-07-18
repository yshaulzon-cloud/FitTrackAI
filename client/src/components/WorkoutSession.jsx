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
  'חזה': '#F5698C', 'גב': '#4D9FFF', 'כתפיים': '#FFB648',
  'זרועות': '#8F8AF7', 'רגליים': '#2FE3C2', 'תאומים': '#4D9FFF',
  'ליבה': '#FFB648', 'אירובי': '#2FE3C2', 'כללי': '#7C8798',
};

const CONFETTI_COLORS = ['#F5698C', '#4D9FFF', '#FFB648', '#8F8AF7', '#e879f9', '#2FE3C2'];

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

export default function WorkoutSession({ planExercises, dayName, location, api, onFinish, onDiscard, restore, userName }) {
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
  const [xpAnimated, setXpAnimated] = useState(0);
  const perfApplied = useRef(!!restore);
  const wakeLockRef = useRef(null);
  const touchXRef = useRef(null);
  const xpTimerRef = useRef(null);

  const confetti = useMemo(() => Array.from({ length: 18 }, (_, i) => ({
    left: (i * 5.5) % 100,
    size: 6 + (i % 3) * 3,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    radius: i % 2 === 0 ? '2px' : '50%',
    dur: 2.5 + (i % 4) * 0.4,
    delay: (i % 6) * 0.3,
  })), []);

  const cur = exs[curIdx];
  const totalSets = exs.reduce((n, e) => n + e.sets.length, 0);
  const doneSets = exs.reduce((n, e) => n + e.sets.filter(s => s.done).length, 0);
  const pct = totalSets ? Math.round((doneSets / totalSets) * 100) : 0;
  const exColor = MUSCLE_COLORS[cur?.muscleGroup] || '#2FE3C2';

  // ── Persist session to localStorage on every meaningful change ──
  useEffect(() => {
    if (summary) return; // finished — storage already cleared
    try {
      localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify({
        exercises: exs, curIdx, startedAt, dayName, location,
      }));
    } catch { /* storage unavailable */ }
  }, [exs, curIdx, startedAt, dayName, location, summary]);

  // ── Elapsed clock — stops when summary (finish screen) is shown ──
  useEffect(() => {
    if (summary) return;
    const iv = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(iv);
  }, [startedAt, summary]);

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

  useEffect(() => () => clearInterval(xpTimerRef.current), []);

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

  // One-tap: mark every set in the current exercise done, start rest once.
  function markAllSets() {
    const ex = exs[curIdx];
    const wasAllDone = ex.sets.every(s => s.done);
    setExs(prev => prev.map((e, i) => i !== curIdx ? e : { ...e, sets: e.sets.map(s => ({ ...s, done: true })) }));
    if (wasAllDone) return;
    navigator.vibrate?.(40);
    const isLastExercise = curIdx === exs.length - 1;
    if (!isLastExercise) {
      const secs = restSecondsFor(ex);
      setRest({ total: secs, left: secs });
    }
  }

  // Smart weight suggestion: last time's weight + progressive overload step.
  function applySuggestion() {
    const p = lastPerf[cur.name];
    if (!p) return;
    const suggested = (p.sets[0]?.weight ?? 0) + 2.5;
    setExs(prev => prev.map((e, i) => i !== curIdx ? e : { ...e, sets: e.sets.map(s => ({ ...s, weight: suggested })) }));
  }

  // Swipe left/right to move between exercises.
  function onTouchStart(e) { touchXRef.current = e.touches[0].clientX; }
  function onTouchEnd(e) {
    if (touchXRef.current == null) return;
    const dx = e.changedTouches[0].clientX - touchXRef.current;
    touchXRef.current = null;
    if (dx < -60) setCurIdx(i => Math.min(exs.length - 1, i + 1));
    else if (dx > 60) setCurIdx(i => Math.max(0, i - 1));
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
      const xpTarget = result.xp?.xpGained || 0;
      setXpAnimated(0);
      clearInterval(xpTimerRef.current);
      if (xpTarget > 0) {
        let cur = 0;
        xpTimerRef.current = setInterval(() => {
          cur += Math.max(1, Math.round(xpTarget / 20));
          if (cur >= xpTarget) {
            cur = xpTarget;
            clearInterval(xpTimerRef.current);
          }
          setXpAnimated(cur);
        }, 40);
      }
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
    const xpGained = summary.xp?.xpGained || 0;
    const streak = summary.streak?.currentStreak ?? 0;
    const firstName = (userName || '').trim().split(' ')[0] || '';
    const nextAt = summary.xp?.xpForNextLevel;
    const totalXP = summary.xp?.totalXP;
    const toNextLevel = nextAt != null && totalXP != null ? Math.max(0, nextAt - totalXP) : null;
    const prs = summary.prs || [];
    const doneExercises = exs.filter(e => e.sets.some(s => s.done));
    return (
      <div className="ws-overlay ws-done">
        <div className="ws-done__top">
          <div className="ws-done__check">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--accent)"
                 strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12.5l4.5 4.5L19 7" />
            </svg>
          </div>
          <h1 className="ws-done__title">
            {isHe ? `כל הכבוד${firstName ? `, ${firstName}` : ''}! 🎉` : `Well done${firstName ? `, ${firstName}` : ''}! 🎉`}
          </h1>
          <p className="ws-done__sub">
            {dayName ? `${dayName} · ` : ''}{isHe ? 'הושלם' : 'complete'}
          </p>
        </div>

        <div className="ws-done__stats">
          <div className="ws-done__stat">
            <div className="ws-done__stat-value">{Math.max(1, Math.round(elapsed / 60))}</div>
            <div className="ws-done__stat-label">{isHe ? 'דקות' : 'minutes'}</div>
          </div>
          <div className="ws-done__stat">
            <div className="ws-done__stat-value">
              {location === 'gym' && vol > 0 ? vol.toLocaleString() : doneSets}
            </div>
            <div className="ws-done__stat-label">
              {location === 'gym' && vol > 0 ? (isHe ? 'ק״ג נפח' : 'kg volume') : (isHe ? 'סטים' : 'sets')}
            </div>
          </div>
          <div className="ws-done__stat ws-done__stat--streak">
            <div className="ws-done__stat-value">
              <span>{streak}</span>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--streak)"
                   strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3c1 3.5 5 5.5 5 9.5a5 5 0 0 1-10 0C7 10 8.5 8.5 9.5 7c.5 1.5 1.3 2.4 2.8 3-.8-2.3-.8-4.7-.3-7z" />
              </svg>
            </div>
            <div className="ws-done__stat-label">{isHe ? 'ימי רצף' : 'day streak'}</div>
          </div>
        </div>

        {xpGained > 0 && (
          <div className="ws-done__xp">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--violet)"
                 strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 4l1.7 4.6 4.8 1.7-4.8 1.7L12 16.6l-1.7-4.6-4.8-1.7 4.8-1.7z" />
            </svg>
            <span>
              +{xpAnimated} XP
              {toNextLevel != null && ` · ${isHe ? `עוד ${toNextLevel} XP לרמה ${(summary.xp?.level ?? 1) + 1}` : `${toNextLevel} XP to level ${(summary.xp?.level ?? 1) + 1}`}`}
            </span>
          </div>
        )}

        {prs.length > 0 && (
          <div className="ws-done__prs">
            <div className="ws-done__prs-title">🏆 {isHe ? 'שיאים חדשים' : 'New records'}</div>
            {prs.map((pr, i) => (
              <div className="ws-done__pr" key={i}>
                <span>{isHe ? pr.name : getEnglishName(pr.name)}</span>
                <strong>{pr.weight} {isHe ? 'ק״ג' : 'kg'}</strong>
              </div>
            ))}
          </div>
        )}

        {doneExercises.length > 0 && (
          <div className="ws-done__summary">
            {doneExercises.map((ex, i) => {
              const done = ex.sets.filter(s => s.done);
              const top = done.reduce((m, s) => (s.weight || 0) > (m?.weight || 0) ? s : m, done[0]);
              return (
                <div className="ws-done__ex" key={i}>
                  <span className="ws-done__ex-dot" style={{ background: MUSCLE_COLORS[ex.muscleGroup] || 'var(--accent)' }} />
                  <span className="ws-done__ex-name">{isHe ? ex.name : getEnglishName(ex.name)}</span>
                  <span className="ws-done__ex-detail" dir="ltr">
                    {ex.mode === 'time'
                      ? fmtClock(done.reduce((n, s) => n + (s.durationSec || 0), 0))
                      : `${done.length}×${top?.reps || '—'}${top?.weight ? ` @ ${top.weight}` : ''}`}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <div className="ws-done__cta">
          <button type="button" className="ws-live__primary" style={{ width: '100%' }} onClick={() => onFinish(summary, { goHome: true })}>
            {isHe ? 'חזרה הביתה' : 'Back home'}
          </button>
          {/* Closing without goHome lands back on the workout tab, where the
              start button for the next session is. */}
          <button type="button" className="ws-done__again" onClick={() => onFinish(summary)}>
            {isHe ? 'רוצה עוד? התחל אימון נוסף' : 'Want more? Start another workout'}
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────── Active session ───────────────────────────
  if (!cur) return null;
  const primaryName = isHe ? cur.name : getEnglishName(cur.name);
  const perf = lastPerf[cur.name];
  const curSetIdx = cur.sets.findIndex(s => !s.done);
  const allDone = exs.every(e => e.sets.every(s => s.done));
  const restSecs = restSecondsFor(cur);

  // Set rows are read-only here: the numbers come from the last-performance
  // prefill, so a set is one tap rather than four.
  const setDetail = (s) => {
    if (cur.mode === 'time') return fmtClock(s.durationSec || 60);
    const reps = s.reps ?? suggestReps(cur.targetReps);
    return s.weight
      ? `${reps} × ${s.weight} ${isHe ? 'ק״ג' : 'kg'}`
      : `${reps} ${isHe ? 'חזרות' : 'reps'}`;
  };

  // The single CTA walks the plan: finish this set, roll onto the next
  // exercise when this one runs out, and become "finish" at the very end.
  function handleSetCta() {
    if (allDone) { handleFinish(); return; }
    const nextUnfinished = (from) => exs.findIndex((e, i) => i > from && e.sets.some(s => !s.done));
    if (curSetIdx === -1) {
      const n = nextUnfinished(curIdx);
      setCurIdx(n === -1 ? exs.findIndex(e => e.sets.some(s => !s.done)) : n);
      return;
    }
    completeSet(curSetIdx);
    const remaining = cur.sets.filter((s, j) => j !== curSetIdx && !s.done).length;
    if (remaining === 0) {
      const n = nextUnfinished(curIdx);
      if (n !== -1) setCurIdx(n);
    }
  }

  const openTutorial = () => window.open(
    `https://www.youtube.com/results?search_query=${encodeURIComponent(getEnglishName(cur.name) + ' exercise tutorial form')}`,
    '_blank',
  );

  return (
    <div className="ws-overlay ws-live">
      {/* Header: elapsed pill · position · exit */}
      <div className="ws-live__head">
        <div className="ws-live__clock" dir="ltr">
          <ClockIcon color="var(--accent)" />
          <span>{fmtClock(elapsed)}</span>
        </div>
        <span className="ws-live__pos">
          {isHe ? `תרגיל ${curIdx + 1} מתוך ${exs.length}` : `Exercise ${curIdx + 1} of ${exs.length}`}
        </span>
        <button type="button" className="ws-live__x" onClick={() => setConfirmExit(true)} aria-label={isHe ? 'יציאה' : 'Exit'}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      {/* Exit confirm */}
      {confirmExit && (
        <div className="ws-confirm">
          <div className="ws-confirm__box">
            <div className="ws-confirm__title">{isHe ? 'לצאת מהאימון?' : 'Leave workout?'}</div>
            <div className="ws-confirm__sub">{isHe ? 'ההתקדמות שלך תישמר — תוכל להמשיך מאוחר יותר.' : 'Your progress is saved — you can continue later.'}</div>
            <div className="ws-confirm__actions">
              <button type="button" className="ws-btn-danger" onClick={handleExit}>{isHe ? 'צא' : 'Leave'}</button>
              <button type="button" className="ws-btn-ghost" onClick={() => setConfirmExit(false)}>{isHe ? 'המשך אימון' : 'Keep training'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Exercise card: demo strip, the prescription, then the set rows */}
      <div className="ws-live__card" key={curIdx}>
        <button type="button" className="ws-live__demo" onClick={openTutorial}>
          <DumbbellIcon />
          <span>{isHe ? 'וידאו הדגמת תרגיל' : 'Exercise demo video'}</span>
        </button>
        <div className="ws-live__card-body">
          <div className="ws-live__name">{primaryName}</div>
          <div className="ws-live__meta">
            {cur.sets.length} {isHe ? 'סטים' : 'sets'}
            {cur.mode === 'reps' && cur.targetReps && ` × ${cur.targetReps} ${isHe ? 'חזרות' : 'reps'}`}
            {` · ${isHe ? 'מנוחה' : 'rest'} ${restSecs} ${isHe ? 'שנ׳' : 's'}`}
          </div>

          {/* What you did last time, and the nudge past it */}
          {perf && cur.mode === 'reps' && (
            <div className="ws-live__last">
              <span>
                {isHe ? 'פעם קודמת: ' : 'Last time: '}
                <strong>
                  {perf.sets.length}×{perf.sets[0]?.reps || '—'}
                  {perf.sets[0]?.weight ? ` @ ${perf.sets[0].weight} ${isHe ? 'ק״ג' : 'kg'}` : ''}
                </strong>
              </span>
              {location === 'gym' && perf.sets[0]?.weight != null && (
                <button type="button" className="ws-live__suggest" onClick={applySuggestion}>
                  ⚡ {perf.sets[0].weight + 2.5} {isHe ? 'ק״ג' : 'kg'}
                </button>
              )}
            </div>
          )}

          {cur.mode === 'reps' && (
            <div className="ws-live__setops">
              <button type="button" className="ws-live__op" onClick={markAllSets}>
                ✓ {isHe ? 'סמן הכל' : 'Mark all'}
              </button>
              <button type="button" className="ws-live__op" onClick={addSet}>+ {isHe ? 'סט' : 'Set'}</button>
              {cur.sets.length > 1 && (
                <button type="button" className="ws-live__op" onClick={removeSet}>− {isHe ? 'סט' : 'Set'}</button>
              )}
            </div>
          )}

          <div className="ws-live__sets">
            {cur.sets.map((s, si) => {
              const state = s.done ? 'done' : si === curSetIdx ? 'current' : 'pending';
              return (
                <div key={si} className={`ws-live__set ws-live__set--${state}`}>
                  <button
                    type="button"
                    className="ws-live__set-main"
                    onClick={() => completeSet(si)}
                    aria-pressed={s.done}
                  >
                    {state === 'done' ? (
                      <svg className="ws-live__set-mark" width="16" height="16" viewBox="0 0 24 24" fill="none"
                           stroke="var(--accent)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12.5l4.5 4.5L19 7" />
                      </svg>
                    ) : (
                      <span className="ws-live__set-mark ws-live__set-dot" />
                    )}
                    <span className="ws-live__set-name">{isHe ? `סט ${si + 1}` : `Set ${si + 1}`}</span>
                    <span className="ws-live__set-detail" dir="ltr">{setDetail(s)}</span>
                  </button>

                  {/* Only the set in focus carries the editor: the numbers have
                      to be writable — volume and PRs are computed from them —
                      but four steppers on every row would bury the design. */}
                  {state === 'current' && cur.mode === 'reps' && (
                    <div className="ws-live__edit">
                      {location === 'gym' && (
                        <Stepper
                          label={isHe ? 'ק״ג' : 'kg'}
                          value={s.weight ?? 0}
                          step={2.5}
                          onChange={(v) => updateSet(si, { weight: v })}
                        />
                      )}
                      <Stepper
                        label={isHe ? 'חזרות' : 'reps'}
                        value={s.reps ?? suggestReps(cur.targetReps)}
                        step={1}
                        onChange={(v) => updateSet(si, { reps: v })}
                      />
                    </div>
                  )}

                  {state === 'current' && cur.mode === 'time' && (
                    <div className="ws-live__edit">
                      <button
                        type="button"
                        className="ws-live__timer"
                        onClick={() => (workTimer?.setIdx === si
                          ? setWorkTimer(null)
                          : setWorkTimer({ setIdx: si, total: s.durationSec || 60, left: s.durationSec || 60 }))}
                      >
                        {workTimer?.setIdx === si
                          ? `⏸ ${fmtClock(workTimer.left)}`
                          : `▶ ${isHe ? 'התחל' : 'Start'} ${fmtClock(s.durationSec || 60)}`}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* What happens next */}
      <div className="ws-live__note">
        <ClockIcon color="var(--violet)" />
        <span>
          {allDone
            ? (isHe ? 'כל הסטים הושלמו — מעולה!' : 'All sets done — great work!')
            : (isHe
                ? `מנוחה של ${restSecs} שנ׳ תתחיל אוטומטית בסיום הסט`
                : `A ${restSecs}s rest starts automatically when you finish the set`)}
        </span>
      </div>

      {error && <div className="ws-error">{error}</div>}

      {/* Rest timer sheet */}
      {rest && (
        <div className="ws-rest">
          <div className="ws-rest__ring" dir="ltr">
            <svg width="120" height="120" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="52" stroke="rgba(255,255,255,0.08)" strokeWidth="8" fill="none" />
              <circle
                cx="60" cy="60" r="52"
                stroke="#2FE3C2" strokeWidth="8" fill="none" strokeLinecap="round"
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

      {/* Finish early sits beside the set CTA; it needs at least one logged set
          to have anything worth saving. */}
      <div className="ws-live__cta">
        <button type="button" className="ws-live__early" onClick={handleFinish} disabled={saving || doneSets === 0}>
          {saving ? (isHe ? 'שומר…' : 'Saving…') : (isHe ? 'סיים מוקדם' : 'Finish early')}
        </button>
        <button type="button" className="ws-live__primary" onClick={handleSetCta} disabled={saving}>
          {allDone
            ? (isHe ? 'סיים אימון' : 'Finish workout')
            : (isHe ? 'סיימתי את הסט' : 'Set complete')}
        </button>
      </div>
    </div>
  );
}

function Stepper({ label, value, step, onChange }) {
  const dec = () => onChange(Math.max(0, Math.round((value - step) * 100) / 100));
  const inc = () => onChange(Math.round((value + step) * 100) / 100);
  return (
    <div className="ws-step">
      <button type="button" className="ws-step__btn" onClick={dec} aria-label={`− ${label}`}>−</button>
      <div className="ws-step__val">
        <span className="ws-step__num">{value}</span>
        <span className="ws-step__unit">{label}</span>
      </div>
      <button type="button" className="ws-step__btn" onClick={inc} aria-label={`+ ${label}`}>+</button>
    </div>
  );
}

function ClockIcon({ color = 'currentColor' }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round">
      <circle cx="12" cy="13" r="7" />
      <path d="M12 10v3.5l2.5 1.5M9 3h6" />
    </svg>
  );
}

function DumbbellIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)"
         strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6.5 8v8M3.5 10v4M17.5 8v8M20.5 10v4M6.5 12h11" />
    </svg>
  );
}
