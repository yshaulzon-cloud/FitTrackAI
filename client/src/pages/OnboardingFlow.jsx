import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';
import { useLegal } from '../context/LegalContext';
import { requestNotificationPermission } from '../lib/notifications';

// ─────────────────────────────────────────────────────────────────────
// Single-flow onboarding: value prop → one question per screen → plan
// reveal → signup (moved to the END, not the start) → notifications →
// success. Registration used to gate everything; now the user answers
// every personalization question first and only signs up to save the
// plan that was already built for them (Commitment + Loss-Aversion,
// same pattern Duolingo/Fitbod use). See design doc for full rationale.
//
// Works for both anonymous visitors (full flow, real signup step) and
// an already-authenticated-but-incomplete user (e.g. someone who hit
// Google sign-in directly from /login) — in that case the signup step
// detects the existing session and submits onboarding data directly
// instead of showing signup UI.
// ─────────────────────────────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3001' : '');
const INTRO_FLAG = 'areto:intro-seen';

const STEPS = ['valueprop', 'goal', 'experience', 'equipment', 'frequency', 'body', 'planreveal', 'signup', 'notif', 'success'];
const QUESTION_STEPS = ['goal', 'experience', 'equipment', 'frequency', 'body'];

// Mirrors EQUIPMENT in server/utils/equipment.js — keep the two in step.
const EQUIPMENT_OPTIONS = [
  { value: 'dumbbells',  he: 'משקולות יד',    en: 'Dumbbells' },
  { value: 'barbell',    he: 'מוט ומשקולות',  en: 'Barbell & plates' },
  { value: 'machines',   he: 'מכונות',        en: 'Machines' },
  { value: 'bands',      he: 'גומיות',        en: 'Resistance bands' },
  { value: 'trx',        he: 'TRX',           en: 'TRX' },
  { value: 'pullup_bar', he: 'מתח ומקבילים',  en: 'Pull-up & dip bars' },
  { value: 'kettlebell', he: 'קטלבל',         en: 'Kettlebell' },
  { value: 'none',       he: 'בלי ציוד',      en: 'No equipment' },
];

// What the chosen frequency buys you, in the plan generator's own terms
// (see generateWorkoutPlan in server/utils/calculations.js).
function splitAdvice(n, isHe) {
  if (n <= 2) return isHe
    ? 'עם 2 אימונים בשבוע נבנה לך אימוני Full Body — כל שריר נעבד פעמיים בשבוע.'
    : 'At 2 a week you get full-body sessions — every muscle trained twice weekly.';
  if (n === 3) return isHe
    ? 'עם 3 אימונים בשבוע נבנה לך פיצול Push / Pull / Legs — קלאסי ויעיל.'
    : 'At 3 a week you get a push / pull / legs split — classic and efficient.';
  if (n === 4) return isHe
    ? 'עם 4 אימונים בשבוע נבנה לך פיצול פלג גוף עליון / תחתון — איזון טוב בין התאוששות להתקדמות.'
    : 'At 4 a week you get an upper / lower split — a good balance of recovery and progress.';
  return isHe
    ? `עם ${n} אימונים בשבוע נבנה לך פיצול Push / Pull / Legs מורחב — יותר נפח לכל קבוצת שריר.`
    : `At ${n} a week you get an extended push / pull / legs split — more volume per muscle group.`;
}

// Which split generateWorkoutPlan actually builds at this frequency — kept in
// step with splitAdvice() above.
function splitName(n, isHe) {
  if (n <= 2) return isHe ? 'Full Body' : 'Full body';
  if (n === 3) return isHe ? 'Push / Pull / Legs' : 'Push / pull / legs';
  if (n === 4) return isHe ? 'פיצול עליון / תחתון' : 'Upper / lower split';
  return isHe ? 'Push / Pull / Legs מורחב' : 'Extended push / pull / legs';
}

// Plan days come back Hebrew-labelled from the generator; English builds get the
// same treatment WorkoutPlan.getDayName applies.
function getDayLabel(day, isHe) {
  if (isHe || !day) return day;
  return day
    .replace(/יום א'/g, 'Day 1').replace(/יום ב'/g, 'Day 2').replace(/יום ג'/g, 'Day 3')
    .replace(/יום ד'/g, 'Day 4').replace(/יום ה'/g, 'Day 5').replace(/יום ו'/g, 'Day 6')
    .replace('פלג גוף עליון', 'Upper Body').replace('פלג גוף תחתון', 'Lower Body')
    .replace('כוח', 'Strength').replace('היפרטרופיה', 'Hypertrophy')
    .replace('אירובי קל', 'Light Cardio').replace('ליבה', 'Core');
}

function ObArrow({ isHe }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={isHe ? 'M4 12h16M14 6l6 6-6 6' : 'M20 12H4M10 6l-6 6 6 6'} />
    </svg>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M23 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.2a5.3 5.3 0 0 1-2.3 3.5v2.9h3.7c2.2-2 3.4-5 3.4-8.5z" />
      <path fill="#34A853" d="M12 24c3.1 0 5.7-1 7.6-2.8l-3.7-2.9c-1 .7-2.4 1.1-3.9 1.1-3 0-5.5-2-6.4-4.7H1.8v3A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.6 14.7a7.2 7.2 0 0 1 0-4.6v-3H1.8a12 12 0 0 0 0 10.7l3.8-3.1z" />
      <path fill="#EA4335" d="M12 4.8c1.7 0 3.2.6 4.4 1.7L19.7 3A12 12 0 0 0 1.8 7.1l3.8 3c.9-2.7 3.4-4.7 6.4-4.7z" />
    </svg>
  );
}

// Same shape as Login's FieldError — sits with the form, not above it.
function FieldNote({ msg }) {
  return (
    <div className="field-error" role="alert">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v5M12 16.5v.5" />
      </svg>
      <span>{msg}</span>
    </div>
  );
}

function ObCheck() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--on-accent)"
         strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12.5l4.5 4.5L19 7" />
    </svg>
  );
}

function ObIcon({ type, color, size = 22 }) {
  const p = {
    width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color,
    strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round',
  };
  if (type === 'flame')    return <svg {...p}><path d="M12 3c1 3.5 5 5.5 5 9.5a5 5 0 0 1-10 0C7 10 8.5 8.5 9.5 7c.5 1.5 1.3 2.4 2.8 3-.8-2.3-.8-4.7-.3-7z" /></svg>;
  if (type === 'dumbbell') return <svg {...p}><path d="M6.5 8v8M3.5 10v4M17.5 8v8M20.5 10v4M6.5 12h11" /></svg>;
  if (type === 'target')   return <svg {...p}><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3.5" /></svg>;
  if (type === 'spark')    return <svg {...p}><path d="M12 4l1.7 4.6 4.8 1.7-4.8 1.7L12 16.6l-1.7-4.6-4.8-1.7 4.8-1.7z" /></svg>;
  // Value-prop slides use a lighter stroke at 52px so they don't read as heavy
  if (type === 'chart')    return <svg {...p} strokeWidth="1.6"><path d="M4 19h16M6 15l4-4.5 3 3L18 8" /></svg>;
  if (type === 'pulse')    return <svg {...p} strokeWidth="2.2"><path d="M3 13h4l2.5-6 3.5 10 2.5-6H21" /></svg>;
  return null;
}

async function safeJson(res) {
  try { return await res.json(); } catch { return null; }
}

export default function OnboardingFlow() {
  const { t, lang } = useLang();
  const isHe = lang === 'he';
  const { user, register, loginWithGoogle, api, updateUser } = useAuth();
  // Guards the "already-authenticated" effect below from also firing (and
  // racing) when a signup handler here is the one that just created the
  // session — that effect is only for a user who was ALREADY logged in
  // when they landed on this screen (e.g. via Google sign-in from /login).
  const submitLockRef = useRef(false);
  const { openTerms, openPrivacy } = useLegal();
  const navigate = useNavigate();

  const [stepIdx, setStepIdx] = useState(0);
  const [vpSlide, setVpSlide] = useState(0);

  const [goal, setGoal] = useState(null);
  const [experience, setExperience] = useState(null);
  const [equipment, setEquipment] = useState([]);
  const [frequency, setFrequency] = useState(4);
  const [gender, setGender] = useState('male');
  const [heightCm, setHeightCm] = useState('175');
  const [weightKg, setWeightKg] = useState('75');
  const [age, setAge] = useState('25');

  const [planPreview, setPlanPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [submittingExisting, setSubmittingExisting] = useState(false);

  const [finalPlan, setFinalPlan] = useState(null);
  const [notifChoice, setNotifChoice] = useState(null);

  const key = STEPS[Math.min(stepIdx, STEPS.length - 1)];
  const questionIdx = QUESTION_STEPS.indexOf(key);
  const stepLabel = isHe ? `שלב ${questionIdx + 1} מתוך ${QUESTION_STEPS.length}` : `Step ${questionIdx + 1} of ${QUESTION_STEPS.length}`;
  const progressPct = questionIdx >= 0 ? Math.round(((questionIdx + 1) / QUESTION_STEPS.length) * 100) : 0;

  function next() { setStepIdx((i) => Math.min(i + 1, STEPS.length - 1)); }
  function back() { setStepIdx((i) => Math.max(i - 1, 0)); }

  // No auto-advance: the redesign gives every question step its own CTA, so a
  // pick stays reversible and the frequency insight has time to be read.
  function selectGoal(g) { setGoal(g); }
  function selectExperience(e) { setExperience(e); }
  // "No equipment" and an actual kit are contradictory, so they evict each
  // other here rather than letting normalizeEquipment() silently drop one.
  function toggleEquipment(e) {
    setEquipment((prev) => {
      if (prev.includes(e)) return prev.filter((x) => x !== e);
      if (e === 'none') return ['none'];
      return [...prev.filter((x) => x !== 'none'), e];
    });
  }
  function selectFrequency(n) { setFrequency(n); }

  // ── Plan Reveal: fetch a real (not faked) day-1 preview ──────────────
  useEffect(() => {
    if (key !== 'planreveal' || planPreview || previewLoading) return;
    setPreviewLoading(true);
    fetch(`${API_BASE}/user/preview-plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ goal: goal || 'maintain', workoutsPerWeek: frequency, experience: experience || 'beginner' }),
    })
      .then((r) => r.json())
      .then((d) => setPlanPreview(d ? { day1: d.day1 || null, days: d.days || [] } : null))
      .catch(() => {})
      .finally(() => setPreviewLoading(false));
  }, [key]); // eslint-disable-line

  // ── Submit the collected profile to /user/onboarding. Uses an explicit
  // token (from a just-completed register/loginWithGoogle call) instead of
  // the context's api() helper when one is passed — api()'s closure still
  // holds the pre-auth token until this component re-renders, which hasn't
  // happened yet at the point register()'s promise resolves. ──────────────
  async function submitOnboarding(explicitToken) {
    const payload = {
      // Google supplies a name at sign-in; the email path only gets one because
      // the signup step now asks. Without it the account stays name-less and
      // the app greets you as "משתמש" with a "?" avatar forever.
      ...(fullName.trim() ? { name: fullName.trim() } : {}),
      age: Number(age) || 25,
      height: Number(heightCm) || 175,
      weight: Number(weightKg) || 75,
      gender: gender || 'male',
      goal: goal || 'maintain',
      workoutsPerWeek: frequency,
      experience: experience || 'beginner',
      equipment,
      // Capture the device timezone so the server computes the user's local
      // day boundary for streaks (falls back to Israel server-side if absent).
      timezone: (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return undefined; } })(),
    };
    if (explicitToken) {
      const res = await fetch(`${API_BASE}/user/onboarding`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${explicitToken}` },
        body: JSON.stringify(payload),
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(isHe ? (data?.message || 'שגיאה בשמירת הפרופיל') : (data?.messageEn || data?.message || 'Failed to save your profile'));
      return data;
    }
    return api('/user/onboarding', { method: 'POST', body: JSON.stringify(payload) });
  }

  // Already-authenticated-but-incomplete edge case: skip the signup UI
  // entirely and submit directly under the existing session. Guarded by
  // submitLockRef so it can't also fire (and race) for a user who just
  // signed up via the handlers below, in this same component.
  useEffect(() => {
    if (key !== 'signup' || !user || submitLockRef.current || finalPlan) return;
    submitLockRef.current = true;
    setSubmittingExisting(true);
    submitOnboarding(null)
      .then((result) => { setFinalPlan(result.workoutPlan); next(); })
      .catch((err) => setAuthError(err.message))
      .finally(() => setSubmittingExisting(false));
  }, [key, user]); // eslint-disable-line

  async function handleGoogleSignup() {
    setAuthError('');
    if (!acceptedTerms) {
      setAuthError(isHe ? 'יש לאשר את תנאי השימוש ומדיניות הפרטיות' : 'Please accept the terms and privacy policy');
      return;
    }
    submitLockRef.current = true;
    setGoogleLoading(true);
    try {
      const data = await loginWithGoogle();
      const result = await submitOnboarding(data.token);
      // Deliberately NOT calling updateUser({onboardingComplete:true}) here —
      // OnboardingRoute redirects away the instant that becomes true, which
      // would yank the user out before they ever see notif/success. The
      // server already has onboardingComplete:true from submitOnboarding();
      // the local context is updated at the very end, in goToWorkout().
      setFinalPlan(result.workoutPlan);
      next();
    } catch (err) {
      submitLockRef.current = false;
      setAuthError(err.message || (isHe ? 'התחברות עם Google נכשלה' : 'Google sign-in failed'));
    } finally {
      setGoogleLoading(false);
    }
  }

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  async function handleEmailSignup(e) {
    e.preventDefault();
    setAuthError('');
    if (!email.trim() || !password.trim()) {
      setAuthError(isHe ? 'מלא את כל השדות' : 'Please fill in all fields');
      return;
    }
    if (!EMAIL_RE.test(email.trim())) {
      setAuthError(isHe ? 'כתובת אימייל לא תקינה' : 'Invalid email address');
      return;
    }
    if (password.length < 8 || !/\d/.test(password)) {
      setAuthError(t.passwordMin);
      return;
    }
    if (!acceptedTerms) {
      setAuthError(isHe ? 'יש לאשר את תנאי השימוש ומדיניות הפרטיות' : 'Please accept the terms and privacy policy');
      return;
    }
    submitLockRef.current = true;
    setAuthLoading(true);
    try {
      const data = await register(email, password);
      const result = await submitOnboarding(data.token);
      // See comment in handleGoogleSignup — onboardingComplete flips to
      // true in context only once the user reaches goToWorkout().
      setFinalPlan(result.workoutPlan);
      next();
    } catch (err) {
      submitLockRef.current = false;
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  }

  async function allowNotif() {
    setNotifChoice('allow');
    await requestNotificationPermission().catch(() => {});
    next();
  }
  function denyNotif() { setNotifChoice('deny'); next(); }

  function goToWorkout() {
    updateUser({ onboardingComplete: true });
    navigate('/dashboard', { state: { tab: 'workout' } });
  }

  // Google users never fill fullName, so fall back to what auth gave us.
  const firstName = (fullName || user?.name || '').trim().split(' ')[0] || '';
  const goalLabel = goal === 'cut' ? t.goalCut : goal === 'bulk' ? t.goalBulk : goal === 'maintain' ? t.goalMaintain : '';
  const expLabel = experience === 'beginner' ? t.expBeginner : experience === 'intermediate' ? t.expIntermediate : experience === 'advanced' ? t.expAdvanced : '';

  return (
    <div className="ob-shell">
      <div className="ob-screen">

        {questionIdx >= 0 && (
          <div>
            <div className="ob-head">
              <span className="ob-step-label">{stepLabel}</span>
              {stepIdx > 1 && (
                <button type="button" className="ob-back" onClick={back} aria-label={isHe ? 'חזרה' : 'Back'}>
                  <ObArrow isHe={isHe} />
                </button>
              )}
            </div>
            <div className="ob-bars">
              {QUESTION_STEPS.map((s, i) => (
                <div key={s} className={`ob-bar${i <= questionIdx ? ' ob-bar--on' : ''}`} />
              ))}
            </div>
          </div>
        )}

        {/* ═══ VALUE PROP CAROUSEL ═══ */}
        {key === 'valueprop' && (
          <ValueProp
            isHe={isHe}
            slide={vpSlide}
            setSlide={setVpSlide}
            onSkip={() => { try { localStorage.setItem(INTRO_FLAG, '1'); } catch {} setStepIdx(STEPS.indexOf('goal')); }}
            onNext={() => {
              if (vpSlide < 2) { setVpSlide((s) => s + 1); return; }
              try { localStorage.setItem(INTRO_FLAG, '1'); } catch {}
              next();
            }}
          />
        )}

        {/* ═══ GOAL ═══ */}
        {key === 'goal' && (
          <div className="wizard-step">
            <h1 className="ob-title">{isHe ? 'מה המטרה שלך?' : "What's your goal?"}</h1>
            <p className="ob-sub">{isHe ? 'התוכנית תיבנה סביבה. אפשר לשנות בכל רגע.' : "Your plan is built around it. You can change it anytime."}</p>
            <div className="ob-body">
              {[
                { value: 'cut', icon: 'flame', tint: 'var(--streak)', label: t.goalCut, desc: t.goalCutDesc, recommended: true },
                { value: 'bulk', icon: 'dumbbell', tint: 'var(--accent)', label: t.goalBulk, desc: t.goalBulkDesc },
                { value: 'maintain', icon: 'target', tint: 'var(--violet)', label: t.goalMaintain, desc: t.goalMaintainDesc },
              ].map((g) => (
                <button key={g.value} type="button" className={`ob-opt${goal === g.value ? ' ob-opt--on' : ''}`} onClick={() => selectGoal(g.value)}>
                  <span className="ob-opt__icon" style={{ background: `color-mix(in srgb, ${g.tint} 11%, transparent)` }}>
                    <ObIcon type={g.icon} color={g.tint} />
                  </span>
                  <span className="ob-opt__text">
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="ob-opt__label">{g.label}</span>
                      {g.recommended && <span className="ob-badge">{isHe ? 'מומלץ' : 'Recommended'}</span>}
                    </span>
                    <span className="ob-opt__desc">{g.desc}</span>
                  </span>
                  <span className="ob-opt__radio">{goal === g.value && <ObCheck />}</span>
                </button>
              ))}
            </div>
            <div className="ob-cta">
              <button type="button" className="ob-btn" onClick={next} disabled={!goal}>
                {isHe ? 'המשך' : 'Continue'}
              </button>
            </div>
          </div>
        )}

        {/* ═══ EXPERIENCE ═══ */}
        {key === 'experience' && (
          <div className="wizard-step">
            <h1 className="ob-title">{isHe ? 'כמה ניסיון יש לך?' : 'How much experience do you have?'}</h1>
            <p className="ob-sub">{isHe ? 'זה קובע את רמת הקושי של האימונים.' : 'This sets how hard your workouts are.'}</p>
            <div className="ob-body">
              {[
                { value: 'beginner', label: t.expBeginner, desc: t.expBeginnerDesc },
                { value: 'intermediate', label: t.expIntermediate, desc: t.expIntermediateDesc },
                { value: 'advanced', label: t.expAdvanced, desc: t.expAdvancedDesc },
              ].map((ex) => (
                <button key={ex.value} type="button" className={`ob-opt${experience === ex.value ? ' ob-opt--on' : ''}`} onClick={() => selectExperience(ex.value)}>
                  <span className="ob-opt__text">
                    <span className="ob-opt__label">{ex.label}</span>
                    <span className="ob-opt__desc">{ex.desc}</span>
                  </span>
                  <span className="ob-opt__radio">{experience === ex.value && <ObCheck />}</span>
                </button>
              ))}
            </div>
            <div className="ob-cta">
              <button type="button" className="ob-btn" onClick={next} disabled={!experience}>
                {isHe ? 'המשך' : 'Continue'}
              </button>
            </div>
          </div>
        )}

        {/* ═══ EQUIPMENT ═══ */}
        {key === 'equipment' && (
          <div className="wizard-step">
            <h1 className="ob-title">{isHe ? 'איזה ציוד זמין לך?' : 'What equipment do you have?'}</h1>
            <p className="ob-sub">{isHe ? 'אפשר לבחור כמה. התרגילים יותאמו למה שיש.' : 'Pick as many as apply. Exercises adapt to what you have.'}</p>
            <div className="ob-body">
              <div className="ob-pills">
                {EQUIPMENT_OPTIONS.map((eq) => {
                  const on = equipment.includes(eq.value);
                  return (
                    <button
                      key={eq.value}
                      type="button"
                      className={`ob-pill${on ? ' ob-pill--on' : ''}`}
                      onClick={() => toggleEquipment(eq.value)}
                      aria-pressed={on}
                    >
                      {isHe ? eq.he : eq.en}
                      {on && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)"
                             strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 12.5l4.5 4.5L19 7" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="ob-hint">
                {equipment.length > 0 && (isHe ? `נבחרו ${equipment.length} · ` : `${equipment.length} selected · `)}
                {isHe ? 'חדר כושר ביתי? סמן רק מה שיש לך' : 'Home gym? Tick only what you own'}
              </div>
            </div>
            <div className="ob-cta">
              <button type="button" className="ob-btn" onClick={next} disabled={equipment.length === 0}>
                {isHe ? 'המשך' : 'Continue'}
              </button>
            </div>
          </div>
        )}

        {/* ═══ FREQUENCY ═══ */}
        {key === 'frequency' && (
          <div className="wizard-step">
            <h1 className="ob-title">{isHe ? 'כמה אימונים בשבוע?' : 'How many workouts a week?'}</h1>
            <p className="ob-sub">{isHe ? 'עדיף מספר שתעמוד בו באמת.' : 'Pick a number you can actually keep.'}</p>
            <div className="ob-body">
              <div className="ob-freq" role="radiogroup" aria-label={t.workoutsPerWeek}>
                {[2, 3, 4, 5, 6].map((n) => (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={frequency === n}
                    className={`ob-freq__tile${frequency === n ? ' ob-freq__tile--on' : ''}`}
                    onClick={() => selectFrequency(n)}
                  >
                    {n}
                    {n === 4 && <span className="ob-freq__rec">{isHe ? 'מומלץ' : 'Best'}</span>}
                  </button>
                ))}
              </div>
              <div className="ob-insight">
                <ObIcon type="spark" color="var(--violet)" size={18} />
                <span>{splitAdvice(frequency, isHe)}</span>
              </div>
            </div>
            {/* Frequency defaults to 4, so without this the only way forward is
                tapping the tile that's already selected. */}
            <div className="ob-cta">
              <button type="button" className="ob-btn" onClick={next}>
                {isHe ? 'המשך' : 'Continue'}
              </button>
            </div>
          </div>
        )}

        {/* ═══ BODY (optional, always has sensible defaults) ═══ */}
        {key === 'body' && (
          <div className="wizard-step">
            <h1 className="ob-title">{isHe ? 'בוא נדייק את התוכנית' : "Let's fine-tune the plan"}</h1>
            <p className="ob-sub">{isHe ? 'אופציונלי — אפשר לדלג ולהוסיף מאוחר יותר.' : "Optional — you can skip and add this later."}</p>
            <div className="ob-body" style={{ gap: 18 }}>
              <div>
                <div className="ob-field__label">{t.genderLabel}</div>
                <div className="ob-freq" role="radiogroup" aria-label={t.genderLabel}>
                  {[{ v: 'male', l: t.male }, { v: 'female', l: t.female }].map((g) => (
                    <button
                      key={g.v}
                      type="button"
                      role="radio"
                      aria-checked={gender === g.v}
                      className={`ob-freq__tile${gender === g.v ? ' ob-freq__tile--on' : ''}`}
                      style={{ fontSize: 15.5, padding: '14px 0' }}
                      onClick={() => setGender(g.v)}
                    >
                      {g.l}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div className="ob-field__label">{t.heightLabel}</div>
                  <input className="ob-input" type="number" inputMode="decimal" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} min="100" max="250" />
                </div>
                <div style={{ flex: 1 }}>
                  <div className="ob-field__label">{t.weightLabel}</div>
                  <input className="ob-input" type="number" inputMode="decimal" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} min="30" max="300" />
                </div>
                <div style={{ flex: 1 }}>
                  <div className="ob-field__label">{t.age}</div>
                  <input className="ob-input" type="number" inputMode="numeric" value={age} onChange={(e) => setAge(e.target.value)} min="13" max="120" />
                </div>
              </div>
            </div>
            <div className="ob-cta">
              <button type="button" className="ob-btn" onClick={next}>
                {isHe ? 'בנה את התוכנית שלי' : 'Build my plan'}
              </button>
              <button type="button" className="ob-skip" onClick={next}>
                {isHe ? 'דלג בינתיים' : 'Skip for now'}
              </button>
            </div>
          </div>
        )}

        {/* ═══ PLAN REVEAL ═══ */}
        {key === 'planreveal' && (
          <div className="wizard-step">
            <div className="pr-hero">
              <div className="pr-hero__disc">
                <ObIcon type="spark" color="var(--accent)" size={32} />
              </div>
              <h1 className="pr-hero__title">{isHe ? 'התוכנית שלך מוכנה' : 'Your plan is ready'}</h1>
              <p className="pr-hero__sub">{isHe ? 'נבנתה אישית על סמך התשובות שלך' : 'Built personally from your answers'}</p>
              <div className="pr-hero__pills">
                <span className="pr-pill">{goalLabel}</span>
                <span className="pr-pill">{frequency} {isHe ? 'אימונים בשבוע' : 'workouts / week'}</span>
              </div>
            </div>

            <div className="pr-card">
              <div className="pr-card__head">
                <span className="pr-card__title">{isHe ? 'שבוע לדוגמה' : 'A sample week'}</span>
                <span className="pr-card__split">{splitName(frequency, isHe)}</span>
              </div>
              {previewLoading && <div className="pr-card__loading">{isHe ? 'בונה…' : 'Building…'}</div>}
              {!previewLoading && (planPreview?.days || []).slice(0, 2).map((d, i) => (
                <div className="pr-day" key={i}>
                  <div>
                    <div className="pr-day__name">{getDayLabel(d.day, isHe)}</div>
                    <div className="pr-day__meta">{d.exerciseCount} {isHe ? 'תרגילים' : 'exercises'}</div>
                  </div>
                  <ObIcon type="dumbbell" color="var(--text-4)" size={18} />
                </div>
              ))}
              {/* The rest is deliberately withheld until there's an account to
                  save it to — blurred rather than absent so it reads as "more",
                  not "that's all there is". */}
              {!previewLoading && (planPreview?.days || []).length > 2 && (
                <div className="pr-locked">
                  <div className="pr-locked__blur" aria-hidden="true">
                    {planPreview.days.slice(2, 4).map((d, i) => (
                      <div key={i} style={{ marginTop: i ? 14 : 0 }}>
                        <div className="pr-day__name">{getDayLabel(d.day, isHe)}</div>
                        <div className="pr-day__meta">{d.exerciseCount} {isHe ? 'תרגילים' : 'exercises'}</div>
                      </div>
                    ))}
                  </div>
                  <div className="pr-locked__veil">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-2)"
                         strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="5" y="11" width="14" height="9" rx="2" />
                      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                    </svg>
                    <span>{isHe ? 'התוכנית המלאה נשמרת אחרי הרשמה קצרה' : 'The full plan is saved after a short signup'}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="ob-cta">
              <button type="button" className="ob-btn" onClick={next}>
                {isHe ? 'שמור את ההתקדמות שלי' : 'Save my progress'}
              </button>
              <div className="pr-fine">{isHe ? '15 שניות · בלי כרטיס אשראי' : '15 seconds · no credit card'}</div>
            </div>
          </div>
        )}

        {/* ═══ SIGNUP ═══ */}
        {key === 'signup' && (
          user ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)' }}>
              {isHe ? 'שומר את ההתקדמות שלך…' : 'Saving your progress…'}
            </div>
          ) : (
            <div className="wizard-step">
              <h1 className="ob-title" style={{ marginTop: 12 }}>{isHe ? 'כמעט שם' : 'Almost there'}</h1>
              <p className="ob-sub">{isHe ? 'צור חשבון כדי שהתוכנית וההתקדמות יישמרו.' : 'Create an account so your plan and progress are saved.'}</p>

              <div className="ob-body" style={{ gap: 16 }}>
                <button type="button" onClick={handleGoogleSignup} disabled={googleLoading || authLoading} className="ob-google">
                  <GoogleMark />
                  <span>{googleLoading ? (isHe ? 'מתחבר…' : 'Signing in…') : (isHe ? 'המשך עם Google' : 'Continue with Google')}</span>
                </button>

                <div className="ob-divider"><span />{isHe ? 'או' : 'or'}<span /></div>

                <form onSubmit={handleEmailSignup} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <div className="ob-field__label">{isHe ? 'שם' : 'Name'}</div>
                    <input
                      className="ob-input" style={{ fontSize: 15.5, fontWeight: 400 }}
                      type="text" autoComplete="name"
                      placeholder={isHe ? 'איך לקרוא לך?' : 'What should we call you?'}
                      value={fullName} onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>
                  <div>
                    <div className="ob-field__label">{t.email}</div>
                    <input
                      id="flow-email" className="ob-input" style={{ fontSize: 15.5, fontWeight: 400, direction: 'ltr', textAlign: isHe ? 'right' : 'left' }}
                      type="email" placeholder="you@example.com" value={email}
                      onChange={(e) => setEmail(e.target.value)} dir="ltr" autoComplete="email" inputMode="email"
                    />
                  </div>
                  <div>
                    <div className="ob-field__label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>{t.password}</span>
                      <a role="button" tabIndex={0} onClick={() => setShowPassword(!showPassword)} aria-pressed={showPassword} style={{ cursor: 'pointer', color: 'var(--text-4)' }}>
                        {showPassword ? (isHe ? 'הסתר' : 'hide') : (isHe ? 'הצג' : 'show')}
                      </a>
                    </div>
                    <input
                      id="flow-password" className="ob-input" style={{ fontSize: 15.5, fontWeight: 400, direction: 'ltr', textAlign: isHe ? 'right' : 'left' }}
                      type={showPassword ? 'text' : 'password'}
                      placeholder={isHe ? 'לפחות 8 תווים + ספרה' : 'At least 8 chars + 1 number'}
                      value={password} onChange={(e) => setPassword(e.target.value)} dir="ltr" autoComplete="new-password"
                    />
                  </div>
                  {authError && <FieldNote msg={authError} />}
                  {/* The mockup implies consent by signing up. Keep the explicit
                      tick — it's the record that consent was actually given, and
                      LegalContext tracks acceptance. It sits above the button so
                      the reason the button is disabled is already on screen. */}
                  <label className="checkbox-row">
                    <input type="checkbox" checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} />
                    <span className="checkbox-row__text">
                      {isHe ? (
                        <>קראתי ואני מאשר את <a onClick={openTerms} role="button" tabIndex={0}>תנאי השימוש</a> ו<a onClick={openPrivacy} role="button" tabIndex={0}>מדיניות הפרטיות</a></>
                      ) : (
                        <>I agree to the <a onClick={openTerms} role="button" tabIndex={0}>Terms</a> and <a onClick={openPrivacy} role="button" tabIndex={0}>Privacy Policy</a></>
                      )}
                    </span>
                  </label>
                  <button type="submit" className="ob-btn" disabled={authLoading || !acceptedTerms}>
                    {authLoading ? (isHe ? 'יוצר חשבון…' : 'Creating…') : (isHe ? 'צור חשבון' : 'Create account')}
                  </button>
                </form>
              </div>

              <div className="ob-cta" style={{ paddingTop: 14 }}>
                <div className="pr-fine">
                  {isHe ? 'כבר יש לך חשבון? ' : 'Already have an account? '}
                  <a href="/login" style={{ color: 'var(--accent)', fontWeight: 600 }}>{isHe ? 'התחבר' : 'Log in'}</a>
                </div>
              </div>
            </div>
          )
        )}

        {/* ═══ NOTIFICATIONS SOFT-ASK ═══ */}
        {key === 'notif' && (
          <div className="wizard-step">
            <div className="ob-center">
              <div className="ob-center__disc">
                <ObIcon type="bell" color="var(--accent)" size={38} />
              </div>
              <h1 className="ob-center__title">{isHe ? 'תזכורת קטנה, הרגל גדול' : 'A small reminder, a big habit'}</h1>
              <p className="ob-center__sub">
                {isHe
                  ? 'תזכורת אחת ביום לאימון או לרישום ארוחה. בלי ספאם — מבטיחים.'
                  : 'One reminder a day to train or log a meal. No spam — promise.'}
              </p>
              <div className="ob-perks">
                {[
                  isHe ? 'תזכורת לאימון ביום שבחרת' : 'A workout reminder on the days you picked',
                  isHe ? 'עדכון כשמגיע הישג חדש' : 'A nudge when a new achievement lands',
                ].map((line) => (
                  <div className="ob-perk" key={line}>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--accent)"
                         strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12.5l4.5 4.5L19 7" />
                    </svg>
                    <span>{line}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="ob-cta">
              <button type="button" className="ob-btn" onClick={allowNotif}>
                {isHe ? 'אפשר התראות' : 'Enable notifications'}
              </button>
              <button type="button" className="ob-skip" onClick={denyNotif}>
                {isHe ? 'אולי אחר כך' : 'Maybe later'}
              </button>
            </div>
          </div>
        )}

        {/* ═══ SUCCESS ═══ */}
        {key === 'success' && (
          <div className="wizard-step">
            <div className="ob-center">
              <div className="ob-center__disc ob-center__disc--solid">
                <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="var(--accent)"
                     strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12.5l4.5 4.5L19 7" />
                </svg>
              </div>
              <h1 className="ob-center__title" style={{ fontSize: 28 }}>
                {isHe
                  ? `הכל מוכן${firstName ? `, ${firstName}` : ''}! 🎉`
                  : `All set${firstName ? `, ${firstName}` : ''}! 🎉`}
              </h1>
              <p className="ob-center__sub" style={{ fontSize: 15 }}>
                {isHe ? 'התוכנית שלך נשמרה. האימון הראשון מחכה לך.' : 'Your plan is saved. Your first workout is waiting.'}
              </p>
            </div>
            <div className="ob-cta">
              <button type="button" className="ob-btn" onClick={goToWorkout}>
                {isHe ? 'קח אותי לאפליקציה' : 'Take me to the app'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

function ValueProp({ isHe, slide, setSlide, onSkip, onNext }) {
  const slides = isHe
    ? [
        { icon: 'target', title: 'תוכנית שנבנית בשבילך', desc: 'כמה שאלות קצרות — ותקבל תוכנית אימונים ותזונה אישית. לא תבנית גנרית.' },
        { icon: 'chart',  title: 'התקדמות שרואים', desc: 'גרפים יומיים ושבועיים, מעקב משקל, שינה ורצף הרגלים — הכל במקום אחד.' },
        { icon: 'flame',  title: 'בונים הרגל, לא רק אימון', desc: 'תזכורות חכמות ורצף ימים שומרים אותך במסלול, גם בשבועות עמוסים.' },
      ]
    : [
        { icon: 'target', title: 'A plan built for you', desc: "A few quick questions — and you get a personal training and nutrition plan. Not a generic template." },
        { icon: 'chart',  title: 'Progress you can see', desc: 'Daily and weekly charts, weight tracking, sleep, and habit streaks — all in one place.' },
        { icon: 'flame',  title: 'Building a habit, not just a workout', desc: 'Smart reminders and day streaks keep you on track, even in busy weeks.' },
      ];
  const s = slides[slide];
  return (
    <div className="vp">
      <div className="vp__skip-row">
        <button type="button" className="vp__skip" onClick={onSkip}>{isHe ? 'דלג' : 'Skip'}</button>
      </div>
      <div className="vp__body">
        <div className="vp__icon" key={slide}>
          <ObIcon type={s.icon} color="var(--accent)" size={52} />
        </div>
        <h1 className="vp__title">{s.title}</h1>
        <p className="vp__desc">{s.desc}</p>
      </div>
      <div className="vp__foot">
        <div className="vp__dots">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setSlide(i)}
              aria-label={`${isHe ? 'שקף' : 'Slide'} ${i + 1}`}
              aria-current={i === slide ? 'true' : undefined}
              className={`vp__dot${i === slide ? ' vp__dot--on' : ''}`}
            />
          ))}
        </div>
        <button type="button" className="ob-btn" onClick={onNext}>
          {slide < 2 ? (isHe ? 'המשך' : 'Continue') : (isHe ? 'בוא נתחיל' : "Let's start")}
        </button>
      </div>
    </div>
  );
}
