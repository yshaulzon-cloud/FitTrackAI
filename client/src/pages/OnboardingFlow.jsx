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

  function selectGoal(g) { setGoal(g); setTimeout(next, 220); }
  function selectExperience(e) { setExperience(e); setTimeout(next, 220); }
  function toggleEquipment(e) {
    setEquipment((prev) => (prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]));
  }
  function selectFrequency(n) { setFrequency(n); setTimeout(next, 220); }

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
      .then((d) => setPlanPreview(d.day1 || null))
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

  const goalLabel = goal === 'cut' ? t.goalCut : goal === 'bulk' ? t.goalBulk : goal === 'maintain' ? t.goalMaintain : '';
  const expLabel = experience === 'beginner' ? t.expBeginner : experience === 'intermediate' ? t.expIntermediate : experience === 'advanced' ? t.expAdvanced : '';

  return (
    <div className="onboarding-container">
      <div className="onboarding-card onboarding-wizard" style={{ minHeight: 480, display: 'flex', flexDirection: 'column' }}>

        {questionIdx >= 0 && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <span style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600 }}>{stepLabel}</span>
              {stepIdx > 1 && (
                <button type="button" onClick={back} style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: 20, cursor: 'pointer' }} aria-label={isHe ? 'חזרה' : 'Back'}>
                  {isHe ? '←' : '→'}
                </button>
              )}
            </div>
            <div className="wizard-progress" style={{ gridTemplateColumns: `repeat(${QUESTION_STEPS.length}, 1fr)`, marginBottom: 24 }}>
              {QUESTION_STEPS.map((s, i) => (
                <div key={s} className={`wizard-progress__bar${i <= questionIdx ? ' wizard-progress__bar--done' : ''}`} />
              ))}
            </div>
          </>
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
            <h1 className="wizard-step__title">{isHe ? 'מה המטרה שלך?' : "What's your goal?"}</h1>
            <p className="wizard-step__sub">{isHe ? 'נבנה תוכנית סביב המטרה הזו. תמיד אפשר לשנות בהמשך.' : "We'll build a plan around this goal. You can change it anytime."}</p>
            <div className="goal-options goal-options--stack">
              {[
                { value: 'cut', icon: '🔥', label: t.goalCut, desc: t.goalCutDesc, recommended: true },
                { value: 'bulk', icon: '💪', label: t.goalBulk, desc: t.goalBulkDesc },
                { value: 'maintain', icon: '⚖️', label: t.goalMaintain, desc: t.goalMaintainDesc },
              ].map((g) => (
                <button key={g.value} type="button" className={`goal-option${goal === g.value ? ' selected' : ''}`} onClick={() => selectGoal(g.value)}>
                  {goal === g.value && <div className="goal-option__check">✓</div>}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div className="goal-icon">{g.icon}</div>
                    {g.recommended && goal !== g.value && (
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#f5a623', background: 'rgba(245,166,35,0.15)', padding: '4px 10px', borderRadius: 999 }}>
                        {isHe ? 'מומלץ' : 'Recommended'}
                      </span>
                    )}
                  </div>
                  <div className="goal-label">{g.label}</div>
                  <div className="goal-desc">{g.desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ═══ EXPERIENCE ═══ */}
        {key === 'experience' && (
          <div className="wizard-step">
            <h1 className="wizard-step__title">{isHe ? 'מה רמת הניסיון שלך?' : "What's your experience level?"}</h1>
            <p className="wizard-step__sub">{isHe ? 'כדי לקבוע עומס ומורכבות תרגילים נכונים.' : 'So we can set the right load and exercise complexity.'}</p>
            <div className="goal-options goal-options--stack">
              {[
                { value: 'beginner', label: t.expBeginner, desc: t.expBeginnerDesc },
                { value: 'intermediate', label: t.expIntermediate, desc: t.expIntermediateDesc },
                { value: 'advanced', label: t.expAdvanced, desc: t.expAdvancedDesc },
              ].map((ex) => (
                <button key={ex.value} type="button" className={`goal-option${experience === ex.value ? ' selected' : ''}`} onClick={() => selectExperience(ex.value)} style={{ padding: '18px 20px', minHeight: 64 }}>
                  {experience === ex.value && <div className="goal-option__check">✓</div>}
                  <div className="goal-label" style={{ fontSize: 16 }}>{ex.label}</div>
                  <div className="goal-desc">{ex.desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ═══ EQUIPMENT ═══ */}
        {key === 'equipment' && (
          <div className="wizard-step">
            <h1 className="wizard-step__title">{isHe ? 'אילו אמצעים זמינים לך?' : 'What equipment do you have access to?'}</h1>
            <p className="wizard-step__sub">{isHe ? 'אפשר לבחור יותר מאפשרות אחת.' : "You can pick more than one."}</p>
            <div className="goal-options goal-options--stack">
              {[
                { value: 'home', icon: '🏠', label: isHe ? 'אימוני בית' : 'Home workouts' },
                { value: 'gym', icon: '🏋️', label: isHe ? 'חדר כושר מלא' : 'Full gym' },
                { value: 'none', icon: '🧘', label: isHe ? 'בלי ציוד בכלל' : 'No equipment at all' },
              ].map((eq) => (
                <button
                  key={eq.value}
                  type="button"
                  className={`goal-option${equipment.includes(eq.value) ? ' selected' : ''}`}
                  onClick={() => toggleEquipment(eq.value)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: '16px 18px' }}
                >
                  <span style={{ fontSize: 26 }}>{eq.icon}</span>
                  <span className="goal-label">{eq.label}</span>
                  {equipment.includes(eq.value) && <span style={{ marginInlineStart: 'auto', color: 'var(--accent)', fontWeight: 800 }}>✓</span>}
                </button>
              ))}
            </div>
            <button type="button" className="btn btn-primary cta-sticky" onClick={next} style={{ marginTop: 20 }}>
              <span>{isHe ? 'המשך' : 'Continue'} {isHe ? '←' : '→'}</span>
            </button>
          </div>
        )}

        {/* ═══ FREQUENCY ═══ */}
        {key === 'frequency' && (
          <div className="wizard-step">
            <h1 className="wizard-step__title">{isHe ? 'כמה פעמים בשבוע?' : 'How many times a week?'}</h1>
            <p className="wizard-step__sub">{isHe ? 'כמות ריאלית תשמור על מוטיבציה לאורך זמן.' : 'A realistic amount keeps motivation up over time.'}</p>
            <div className="chip-row" role="radiogroup" aria-label={t.workoutsPerWeek}>
              {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                <button key={n} type="button" className={`chip-row__chip${frequency === n ? ' chip-row__chip--active' : ''}`} onClick={() => selectFrequency(n)} style={{ minWidth: 60, minHeight: 60, fontSize: 18 }}>
                  {n}
                </button>
              ))}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 16, textAlign: 'center' }}>
              {isHe ? 'מומלץ עבורך: 4 אימונים בשבוע' : 'Recommended for you: 4 workouts a week'}
            </div>
          </div>
        )}

        {/* ═══ BODY (optional, always has sensible defaults) ═══ */}
        {key === 'body' && (
          <div className="wizard-step">
            <h1 className="wizard-step__title">{isHe ? 'בוא נדייק את התוכנית' : "Let's fine-tune the plan"}</h1>
            <p className="wizard-step__sub">{isHe ? 'אופציונלי — אפשר לדלג ולהוסיף מאוחר יותר.' : "Optional — you can skip and add this later."}</p>
            <div className="form-group">
              <label>{t.genderLabel}</label>
              <div className="toggle-row" role="radiogroup" aria-label={t.genderLabel}>
                <button type="button" role="radio" aria-checked={gender === 'male'} className={`toggle-row__btn${gender === 'male' ? ' toggle-row__btn--active' : ''}`} onClick={() => setGender('male')}>{t.male}</button>
                <button type="button" role="radio" aria-checked={gender === 'female'} className={`toggle-row__btn${gender === 'female' ? ' toggle-row__btn--active' : ''}`} onClick={() => setGender('female')}>{t.female}</button>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>{t.heightLabel}</label>
                <input className="field-input" type="number" inputMode="decimal" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} min="100" max="250" />
              </div>
              <div className="form-group">
                <label>{t.weightLabel}</label>
                <input className="field-input" type="number" inputMode="decimal" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} min="30" max="300" />
              </div>
            </div>
            <div className="form-group">
              <label>{t.age}</label>
              <input className="field-input" type="number" inputMode="numeric" value={age} onChange={(e) => setAge(e.target.value)} min="13" max="120" />
            </div>
            <button type="button" className="btn btn-primary cta-sticky" onClick={next} style={{ marginTop: 8 }}>
              <span>{isHe ? 'המשך' : 'Continue'} {isHe ? '←' : '→'}</span>
            </button>
            <button type="button" onClick={next} style={{ border: 'none', background: 'none', color: 'var(--text-3)', fontSize: 13, fontWeight: 600, padding: 12, cursor: 'pointer', alignSelf: 'center' }}>
              {isHe ? 'דלג בינתיים' : 'Skip for now'}
            </button>
          </div>
        )}

        {/* ═══ PLAN REVEAL ═══ */}
        {key === 'planreveal' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', flex: 1, justifyContent: 'center', animation: 'wizardFade 0.3s ease-out' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🎉</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: 'var(--text-1)', marginBottom: 6 }}>
              {isHe ? 'התוכנית שלך מוכנה' : 'Your plan is ready'}
            </div>
            <div style={{ fontSize: 14, color: 'var(--text-3)', marginBottom: 20, maxWidth: 300 }}>
              {isHe ? 'בנינו לך תוכנית אישית על סמך התשובות שלך' : "We built a personal plan from your answers"}
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', justifyContent: 'center' }}>
              <span style={{ background: 'var(--accent-glow)', border: '1px solid rgba(45,212,191,0.35)', color: 'var(--accent)', fontSize: 12, fontWeight: 700, padding: '6px 12px', borderRadius: 999 }}>{goalLabel}</span>
              <span style={{ background: 'var(--accent-glow)', border: '1px solid rgba(45,212,191,0.35)', color: 'var(--accent)', fontSize: 12, fontWeight: 700, padding: '6px 12px', borderRadius: 999 }}>
                {frequency} {isHe ? 'אימונים בשבוע' : 'workouts / week'}
              </span>
            </div>
            <div style={{ position: 'relative', width: '100%', maxWidth: 340, borderRadius: 20, overflow: 'hidden', background: 'var(--surface)', border: '1px solid var(--border-subtle)', padding: 18, marginBottom: 24 }}>
              <div style={{ filter: 'blur(4px)', opacity: 0.6, textAlign: 'start' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)', marginBottom: 8 }}>
                  {previewLoading ? '···' : (planPreview?.day || (isHe ? 'שבוע 1 · יום 1' : 'Week 1 · Day 1'))}
                </div>
                {(planPreview?.exercises || [{ name: 'סקוואט', sets: 4, reps: '10' }, { name: 'לחיצת חזה', sets: 3, reps: '12' }, { name: 'פלאנק', sets: 3, reps: "45 שנ'" }]).slice(0, 3).map((ex, i) => (
                  <div key={i} style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 4 }}>{ex.name} — {ex.sets}×{ex.reps}</div>
                ))}
              </div>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.25)' }}>
                <span style={{ fontSize: 26 }}>🔒</span>
              </div>
            </div>
            <button type="button" className="btn btn-primary cta-sticky" onClick={next} style={{ width: '100%', maxWidth: 340 }}>
              <span>{isHe ? 'שמור את ההתקדמות שלי' : 'Save my progress'} {isHe ? '←' : '→'}</span>
            </button>
            <div style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 10 }}>{isHe ? '15 שניות, בלי כרטיס אשראי' : '15 seconds, no credit card'}</div>
          </div>
        )}

        {/* ═══ SIGNUP ═══ */}
        {key === 'signup' && (
          user ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)' }}>
              {isHe ? 'שומר את ההתקדמות שלך…' : 'Saving your progress…'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'inline-flex', alignSelf: 'flex-start', background: 'var(--accent-glow)', color: 'var(--accent)', fontSize: 12, fontWeight: 700, padding: '8px 14px', borderRadius: 999, marginBottom: 18 }}>
                {isHe ? '● התוכנית שלך שמורה זמנית' : '● Your plan is saved temporarily'}
              </div>
              <h1 className="wizard-step__title" style={{ fontSize: 24 }}>{isHe ? 'שמור את ההתקדמות שלך' : 'Save your progress'}</h1>
              <p className="wizard-step__sub" style={{ marginBottom: 18 }}>{isHe ? 'יצירת חשבון לוקחת פחות מ-15 שניות' : 'Creating an account takes less than 15 seconds'}</p>

              {authError && <div className="error-message">{authError}</div>}

              <label className="checkbox-row" style={{ marginBottom: 14 }}>
                <input type="checkbox" checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} />
                <span className="checkbox-row__text">
                  {isHe ? (
                    <>קראתי ואני מאשר את <a onClick={openTerms} role="button" tabIndex={0}>תנאי השימוש</a> ו<a onClick={openPrivacy} role="button" tabIndex={0}>מדיניות הפרטיות</a></>
                  ) : (
                    <>I agree to the <a onClick={openTerms} role="button" tabIndex={0}>Terms</a> and <a onClick={openPrivacy} role="button" tabIndex={0}>Privacy Policy</a></>
                  )}
                </span>
              </label>

              <button
                type="button"
                onClick={handleGoogleSignup}
                disabled={googleLoading || authLoading}
                className="btn-google"
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '12px 16px', borderRadius: 12, border: '1px solid var(--border)', background: '#fff', color: '#1f2937', fontWeight: 600, fontSize: 15, cursor: googleLoading ? 'wait' : 'pointer', marginBottom: 16, opacity: googleLoading || authLoading ? 0.7 : 1 }}
              >
                <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                  <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"/>
                  <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
                  <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.6 39.6 16.2 44 24 44z"/>
                  <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.6l6.2 5.2C41.2 35.6 44 30.3 44 24c0-1.3-.1-2.3-.4-3.5z"/>
                </svg>
                <span>{googleLoading ? (isHe ? 'מתחבר…' : 'Signing in…') : (isHe ? 'המשך עם Google' : 'Continue with Google')}</span>
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0 16px', color: 'var(--text-3)', fontSize: 12 }}>
                <span style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                <span>{isHe ? 'או' : 'or'}</span>
                <span style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              </div>

              <form onSubmit={handleEmailSignup}>
                <label className="field-label" htmlFor="flow-email">{t.email}</label>
                <input id="flow-email" className="field-input" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" autoComplete="email" inputMode="email" style={{ direction: 'ltr', textAlign: isHe ? 'right' : 'left' }} />

                <div className="field-row" style={{ marginTop: 12 }}>
                  <label className="field-label" htmlFor="flow-password" style={{ marginBottom: 0 }}>{t.password}</label>
                  <a role="button" onClick={() => setShowPassword(!showPassword)} tabIndex={0} aria-pressed={showPassword} style={{ cursor: 'pointer' }}>
                    {showPassword ? (isHe ? 'הסתר' : 'hide') : (isHe ? 'הצג' : 'show')}
                  </a>
                </div>
                <input id="flow-password" className="field-input" type={showPassword ? 'text' : 'password'} placeholder={isHe ? 'לפחות 8 תווים + ספרה' : 'At least 8 chars + 1 number'} value={password} onChange={(e) => setPassword(e.target.value)} dir="ltr" autoComplete="new-password" style={{ direction: 'ltr', textAlign: isHe ? 'right' : 'left' }} />

                <button type="submit" className="btn btn-primary cta-sticky" disabled={authLoading || !acceptedTerms} style={{ marginTop: 16 }}>
                  <span>{authLoading ? (isHe ? 'יוצר חשבון…' : 'Creating…') : (isHe ? 'המשך עם אימייל' : 'Continue with email')} {isHe ? '←' : '→'}</span>
                </button>
              </form>

              <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 18, textAlign: 'center' }}>
                {isHe ? 'כבר יש לך חשבון? ' : 'Already have an account? '}
                <a href="/login" style={{ color: 'var(--accent)', fontWeight: 700 }}>{isHe ? 'התחבר' : 'Log in'}</a>
              </div>
            </div>
          )
        )}

        {/* ═══ NOTIFICATIONS SOFT-ASK ═══ */}
        {key === 'notif' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', flex: 1, justifyContent: 'center', animation: 'popIn 0.3s ease-out' }}>
            <div style={{ width: 84, height: 84, borderRadius: 24, background: 'var(--accent-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 38, marginBottom: 20 }}>🔔</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color: 'var(--text-1)', marginBottom: 8 }}>
              {isHe ? 'אל תפספס אף אימון' : "Don't miss a workout"}
            </div>
            <div style={{ fontSize: 14, color: 'var(--text-3)', marginBottom: 30, maxWidth: 280, lineHeight: 1.6 }}>
              {isHe ? 'נזכיר לך בעדינות מתי להתאמן ונחגוג איתך רצפים והישגים.' : "We'll gently remind you when to train and celebrate streaks and achievements with you."}
            </div>
            <button type="button" className="btn btn-primary cta-sticky" onClick={allowNotif} style={{ width: '100%', maxWidth: 340, marginBottom: 12 }}>
              <span>{isHe ? 'הפעל התראות' : 'Enable notifications'} {isHe ? '←' : '→'}</span>
            </button>
            <button type="button" onClick={denyNotif} style={{ border: 'none', background: 'none', color: 'var(--text-3)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              {isHe ? 'אולי מאוחר יותר' : 'Maybe later'}
            </button>
          </div>
        )}

        {/* ═══ SUCCESS ═══ */}
        {key === 'success' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', flex: 1, justifyContent: 'center', animation: 'popIn 0.35s ease-out' }}>
            <div style={{ width: 88, height: 88, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent), var(--accent-soft))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, color: 'var(--bg-0)', marginBottom: 20, boxShadow: '0 12px 30px rgba(45,212,191,0.35)' }}>✓</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: 'var(--text-1)', marginBottom: 8 }}>
              {isHe ? 'מוכן! הכל בנוי בשבילך' : "Ready! It's all built for you"}
            </div>
            <div style={{ fontSize: 14, color: 'var(--text-3)', marginBottom: 24, maxWidth: 280 }}>
              {isHe ? 'האימון הראשון שלך מחכה' : 'Your first workout is waiting'}
            </div>
            {finalPlan?.days?.[0] && (
              <div style={{ width: '100%', maxWidth: 340, background: 'var(--surface)', border: '1px solid var(--border-subtle)', borderRadius: 18, padding: 16, display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24, textAlign: 'start' }}>
                <div style={{ width: 46, height: 46, borderRadius: 12, background: 'var(--accent-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🏋️</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>{finalPlan.days[0].day}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
                    {finalPlan.days[0].exercises?.length || 0} {isHe ? 'תרגילים' : 'exercises'} · {expLabel}
                  </div>
                </div>
              </div>
            )}
            <button type="button" className="btn btn-primary cta-sticky" onClick={goToWorkout} style={{ width: '100%', maxWidth: 340 }}>
              <span>{isHe ? 'התחל אימון' : 'Start workout'} {isHe ? '←' : '→'}</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

function ValueProp({ isHe, slide, setSlide, onSkip, onNext }) {
  const slides = isHe
    ? [
        { icon: '🎯', title: 'תוכנית שנבנית בשבילך', desc: 'שתי שאלות קצרות, ונבנה עבורך תוכנית אימונים ותזונה מותאמת אישית — לא תבנית גנרית.' },
        { icon: '📊', title: 'התקדמות שרואים', desc: 'גרפים יומיים ושבועיים, מעקב משקל, שינה ורצף הרגלים — הכל במקום אחד.' },
        { icon: '🔥', title: 'בונים הרגל, לא רק אימון', desc: 'תזכורות חכמות ורצף ימים שומרים אותך במסלול, גם בשבועות עמוסים.' },
      ]
    : [
        { icon: '🎯', title: 'A plan built for you', desc: "A couple of quick questions, and we'll build a personalized workout and nutrition plan — not a generic template." },
        { icon: '📊', title: 'Progress you can see', desc: 'Daily and weekly charts, weight tracking, sleep, and habit streaks — all in one place.' },
        { icon: '🔥', title: 'Building a habit, not just a workout', desc: 'Smart reminders and day streaks keep you on track, even in busy weeks.' },
      ];
  const s = slides[slide];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, animation: 'wizardFade 0.3s ease-out' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
        <button type="button" onClick={onSkip} style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          {isHe ? 'דלג' : 'Skip'}
        </button>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 20 }}>
        <div key={slide} style={{ width: 140, height: 140, borderRadius: 32, background: 'var(--accent-glow)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 56, animation: 'floatUp 0.4s ease-out' }}>
          {s.icon}
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color: 'var(--text-1)' }}>{s.title}</div>
        <div style={{ fontSize: 14, color: 'var(--text-3)', lineHeight: 1.6, maxWidth: 280 }}>{s.desc}</div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 7, margin: '18px 0' }}>
        {slides.map((_, i) => (
          <button key={i} type="button" onClick={() => setSlide(i)} aria-label={`${isHe ? 'שקף' : 'Slide'} ${i + 1}`} style={{ width: 22, height: 6, borderRadius: 4, border: 'none', cursor: 'pointer', background: i === slide ? 'var(--accent)' : 'var(--bg-input)' }} />
        ))}
      </div>
      <button type="button" className="btn btn-primary cta-sticky" onClick={onNext}>
        <span>{slide < 2 ? (isHe ? 'המשך' : 'Continue') : (isHe ? 'בוא נתחיל' : "Let's start")} {isHe ? '←' : '→'}</span>
      </button>
    </div>
  );
}
