import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';
import { useLegal } from '../context/LegalContext';

const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3001' : '');

function ArrowIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 12H5M12 19l-7-7 7-7"/>
    </svg>
  );
}

// Minimal "Step N of 2" indicator for the password-reset flow.
// Two segmented bars (current = teal, future = muted) + a label. `variant`
// swaps the step titles: 'email' for the code-by-email flow, 'google' for
// the verify-with-Google-then-set-password recovery flow.
function ResetStepIndicator({ current, isHe, variant = 'email' }) {
  const title = variant === 'google'
    ? (current === 1
        ? (isHe ? 'אמת עם Google' : 'Verify with Google')
        : (isHe ? 'קבע סיסמה חדשה' : 'Set new password'))
    : (current === 1
        ? (isHe ? 'הזן אימייל' : 'Enter email')
        : (isHe ? 'אמת קוד וסיסמה חדשה' : 'Verify code & new password'));
  return (
    <div className="reset-step-indicator" aria-label={isHe ? `שלב ${current} מתוך 2` : `Step ${current} of 2`}>
      <div className="reset-step-indicator__bars" aria-hidden="true">
        <span className={current >= 1 ? 'is-done' : ''} />
        <span className={current >= 2 ? 'is-done' : ''} />
      </div>
      <span className="reset-step-indicator__label">
        {isHe ? `שלב ${current} מתוך 2` : `Step ${current} of 2`}
        {' · '}
        <span className="reset-step-indicator__title">{title}</span>
      </span>
    </div>
  );
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const reason = sessionStorage.getItem('logoutReason');
    if (reason) {
      sessionStorage.removeItem('logoutReason');
      if (reason === 'session_expired') {
        setError(isHe ? 'הפעלה פגה — אנא התחבר מחדש' : 'Session expired — please sign in again');
      }
    }
  }, []);
  const [resetMode, setResetMode] = useState(null);
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [message, setMessage] = useState('');
  // Resend-code cooldown (seconds). Prevents hammering the rate limiter and
  // gives the email a fair chance to arrive before a second send.
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const tm = setTimeout(() => setResendIn(s => s - 1), 1000);
    return () => clearTimeout(tm);
  }, [resendIn]);

  // Server messages arrive as { message (he), messageEn } — pick by UI language.
  function pickServerMsg(data, fallbackHe, fallbackEn) {
    if (lang === 'he') return data?.message || fallbackHe;
    return data?.messageEn || data?.message || fallbackEn;
  }

  // A failing proxy/host can return an HTML error page; res.json() then
  // throws "Unexpected token <" which we'd show to the user. Parse safely.
  async function safeJson(res) {
    try { return await res.json(); } catch { return null; }
  }
  const [googleLoading, setGoogleLoading] = useState(false);
  // Holds the { token, user } from a deferred Google sign-in during the
  // password-recovery flow — the user is verified but not yet logged in, so
  // they can set a new password before we finish the login.
  const [recoveryAuth, setRecoveryAuth] = useState(null);
  const { login, loginWithGoogle, commitAuth } = useAuth();
  const navigate = useNavigate();
  const { t, lang } = useLang();
  const { openPrivacy, openTerms } = useLegal();

  const isHe = lang === 'he';

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password.trim()) {
      setError(t.fillAllFields);
      return;
    }
    setLoading(true);
    try {
      const data = await login(email, password);
      if (data.user.onboardingComplete) navigate('/dashboard');
      else navigate('/onboarding');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setError('');
    setGoogleLoading(true);
    try {
      const data = await loginWithGoogle();
      if (data.user.onboardingComplete) navigate('/dashboard');
      else navigate('/onboarding');
    } catch (err) {
      setError(err.message || (isHe ? 'התחברות עם Google נכשלה' : 'Google sign-in failed'));
    } finally {
      setGoogleLoading(false);
    }
  }

  // Recovery step 1: verify identity with Google WITHOUT logging in yet
  // (deferCommit), then move to the "choose a new password" step.
  async function handleGoogleRecovery() {
    setError('');
    setGoogleLoading(true);
    try {
      const data = await loginWithGoogle({ deferCommit: true });
      setRecoveryAuth({ token: data.token, user: data.user });
      setResetMode('setpw');
    } catch (err) {
      setError(err.message || (isHe ? 'התחברות עם Google נכשלה' : 'Google sign-in failed'));
    } finally {
      setGoogleLoading(false);
    }
  }

  // Recovery step 2: set the new password using the verified (but not yet
  // committed) session, then finish logging the user in.
  async function handleSetNewPassword(e) {
    e.preventDefault();
    if (newPassword.length < 8 || !/\d/.test(newPassword)) {
      setError(t.passwordMin);
      return;
    }
    if (!recoveryAuth) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/user/set-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${recoveryAuth.token}`,
        },
        body: JSON.stringify({ newPassword }),
      });
      const data = await safeJson(res);
      if (!res.ok) {
        throw new Error(pickServerMsg(data, 'שגיאה בקביעת הסיסמה', 'Failed to set the password'));
      }
      // Password set — finish login with the fresh token and go in.
      const finalToken = data.token || recoveryAuth.token;
      commitAuth(finalToken, recoveryAuth.user);
      setNewPassword('');
      setRecoveryAuth(null);
      navigate(recoveryAuth.user.onboardingComplete ? '/dashboard' : '/onboarding');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // `e` is optional so the "resend code" button can reuse this handler.
  async function handleSendCode(e) {
    e?.preventDefault?.();
    if (!resetEmail.trim() || resendIn > 0) return;
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail.trim() }),
      });
      const data = await safeJson(res);
      if (!res.ok) {
        throw new Error(pickServerMsg(data, 'שגיאה בשליחת הקוד', 'Failed to send the code'));
      }
      setMessage(t.codeSent);
      setResetMode('code');
      setResendIn(45);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    if (!resetCode.trim() || !newPassword.trim()) return;
    // Mirror the server rules exactly (8+ chars incl. a digit) — the old
    // check (6 chars) let passwords through that the server then rejected.
    if (newPassword.length < 8 || !/\d/.test(newPassword)) {
      setMessage('');
      setError(t.passwordMin);
      return;
    }
    setLoading(true);
    setError('');
    setMessage(''); // clear the stale "code sent" note so it can't sit next to an error
    try {
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: resetEmail.trim(),
          code: resetCode.trim(),
          newPassword,
        }),
      });
      const data = await safeJson(res);
      if (!res.ok) {
        throw new Error(pickServerMsg(data, 'שגיאה באיפוס הסיסמה', 'Password reset failed'));
      }
      setMessage(t.passwordResetSuccess);
      setResetMode('done');
      // Hand the user straight back to a login form pre-filled with the
      // email they just reset — they only have to type the new password.
      setEmail(resetEmail.trim());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Auto-close the sheet shortly after a successful reset (the success state
  // also has a manual button for anyone who wants to close it sooner).
  useEffect(() => {
    if (resetMode !== 'done') return;
    const tm = setTimeout(goBackToLogin, 2500);
    return () => clearTimeout(tm);
  }, [resetMode]); // eslint-disable-line

  function goBackToLogin() {
    setResetMode(null);
    setResetEmail('');
    setResetCode('');
    setNewPassword('');
    setShowNewPassword(false);
    setRecoveryAuth(null);
    setError('');
    setMessage('');
    setResendIn(0);
  }

  // Audit P19: forgot-password used to be a full route swap that wiped the
  // login form. It now renders as a bottom-sheet *over* the login screen
  // (built below the main return), so the user keeps context, the email
  // they already typed pre-fills the reset field, and the "back to login"
  // affordance is the sheet's own close button — not a styled link that
  // competes visually with the primary CTA.

  // ── Normal login: split-screen (form on right in RTL, hero on left) ──
  return (
    <div className="auth-split">
      {/* Form — first in DOM = right side in RTL (primary action) */}
      <div className="auth-split__form">
        <div className="auth-form-shell">
          <div className="welcome-pill">
            <span className="welcome-pill__dot" />
            {isHe ? 'ברוך שובך' : 'Welcome back'}
          </div>

          <h2>{isHe ? 'היכנס לחשבון' : 'Sign in to your account'}</h2>
          <p className="helper">
            {t.noAccount}{' '}
            <Link to="/register" style={{ color: 'var(--accent)', fontWeight: 600 }}>
              {t.registerHere} {isHe ? '←' : '→'}
            </Link>
          </p>

          {error && <div className="error-message">{error}</div>}

          {(
            <>
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={googleLoading || loading}
                className="btn-google"
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  padding: '12px 16px',
                  borderRadius: 12,
                  border: '1px solid var(--border, rgba(255,255,255,0.12))',
                  background: '#fff',
                  color: '#1f2937',
                  fontWeight: 600,
                  fontSize: 15,
                  cursor: googleLoading ? 'wait' : 'pointer',
                  marginBottom: 16,
                  opacity: googleLoading || loading ? 0.7 : 1,
                }}
              >
                <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                  <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"/>
                  <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
                  <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.6 39.6 16.2 44 24 44z"/>
                  <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.6l6.2 5.2C41.2 35.6 44 30.3 44 24c0-1.3-.1-2.3-.4-3.5z"/>
                </svg>
                <span>
                  {googleLoading
                    ? (isHe ? 'מתחבר…' : 'Signing in…')
                    : (isHe ? 'המשך עם Google' : 'Continue with Google')}
                </span>
              </button>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                margin: '4px 0 16px',
                color: 'var(--text-3, #6b7280)',
                fontSize: 12,
              }}>
                <span style={{ flex: 1, height: 1, background: 'var(--border, rgba(255,255,255,0.12))' }} />
                <span>{isHe ? 'או' : 'or'}</span>
                <span style={{ flex: 1, height: 1, background: 'var(--border, rgba(255,255,255,0.12))' }} />
              </div>
            </>
          )}

          <form onSubmit={handleSubmit}>
            <label className="field-label" htmlFor="login-email">{t.email}</label>
            <input
              id="login-email"
              type="email"
              className="field-input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              dir="ltr"
              autoComplete="email"
              inputMode="email"
              autoFocus
              style={{ direction: 'ltr', textAlign: isHe ? 'right' : 'left' }}
            />

            <div className="field-row">
              <label className="field-label" style={{ marginBottom: 0 }}>{t.password}</label>
              <a
                onClick={() => {
                  // Account recovery is handled via Google Sign-In (no email
                  // service to maintain). The email-code flow still exists in
                  // code and can be re-enabled if SMTP/an email API is ever
                  // configured — see resetMode 'email'.
                  setResetEmail(email);
                  setResetMode('google');
                }}
                style={{ cursor: 'pointer' }}
              >
                {isHe ? 'שכחת?' : 'Forgot?'}
              </a>
            </div>
            <div style={{ position: 'relative', marginTop: 8 }}>
              <input
                type={showPassword ? 'text' : 'password'}
                className="field-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                dir="ltr"
                autoComplete="current-password"
                style={{ direction: 'ltr', textAlign: isHe ? 'right' : 'left', paddingInlineEnd: 52 }}
              />
              <span
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  insetInlineEnd: 14,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: 12,
                  color: 'var(--text-3)',
                  cursor: 'pointer',
                  fontWeight: 500,
                  userSelect: 'none',
                }}
              >
                {showPassword
                  ? (isHe ? 'הסתר' : 'hide')
                  : (isHe ? 'הצג' : 'show')}
              </span>
            </div>

            <button type="submit" className="btn-primary-cta" disabled={loading}>
              <span>{loading ? t.loggingIn : (isHe ? 'היכנס' : 'Sign in')}</span>
              <ArrowIcon />
            </button>
          </form>

        </div>
      </div>

      {/* Hero — second in DOM = left side in RTL (supporting visual) */}
      <div className="auth-split__hero">
        <div className="brand">
          <div className="brand__mark" aria-label="Areto">A</div>
          <div className="brand__name">{t.appName}</div>
        </div>

        <div>
          <h1 className="hero-headline">
            {isHe ? (
              <>
                בנה גוף בריא.<br/>
                עקוב. תשתפר.<br/>
                <span className="accent">בלי לנחש.</span>
              </>
            ) : (
              <>
                Build your body.<br/>
                Track. Improve.<br/>
                <span className="accent">No guesswork.</span>
              </>
            )}
          </h1>
          <p className="hero-sub">
            {isHe
              ? 'תוכניות אימון ותזונה מדויקות שמתעדכנות בזמן אמת לפי ההתקדמות שלך.'
              : 'Precise workout and nutrition plans that adapt in real time to your progress.'}
          </p>
        </div>

        <div className="proof-bar">
          <div>
            <div className="proof-stat__value">10,000+</div>
            <div className="proof-stat__label">
              {isHe ? 'ספורטאים פעילים' : 'active athletes'}
            </div>
          </div>
          <div className="proof-bar__divider" />
          <div>
            <div className="proof-stat__value">4.8★</div>
            <div className="proof-stat__label">App Store · Play Store</div>
          </div>
          <div className="proof-bar__divider" />
          <div>
            <div className="proof-stat__value">2.4M</div>
            <div className="proof-stat__label">
              {isHe ? 'אימונים הושלמו' : 'workouts logged'}
            </div>
          </div>
        </div>
      </div>

      {/* Audit P19: bottom-sheet for the entire forgot-password flow.
          Renders ON TOP of the login form so the user keeps context. The
          backdrop closes the sheet; the X button does the same. Email
          comes pre-filled from the login email field. The done state
          auto-closes after 2.5s. */}
      {resetMode && (
        <div className="reset-sheet" role="dialog" aria-modal="true" aria-label={t.resetPassword}>
          <button
            type="button"
            className="reset-sheet__scrim"
            onClick={goBackToLogin}
            aria-label={isHe ? 'סגור' : 'Close'}
          />
          <div className="reset-sheet__panel">
            <div className="reset-sheet__handle" aria-hidden="true" />
            <div className="reset-sheet__head">
              <button
                type="button"
                onClick={goBackToLogin}
                className="reset-sheet__close"
                aria-label={isHe ? 'סגור' : 'Close'}
              >
                ✕
              </button>
              <div className="reset-sheet__head-text">
                <div className="reset-sheet__eyebrow">
                  {(resetMode === 'google' || resetMode === 'setpw')
                    ? (isHe ? 'שחזור סיסמה' : 'Password recovery')
                    : t.resetPassword}
                </div>
              </div>
              <div style={{ width: 32 }} aria-hidden="true" />
            </div>
            {resetMode !== 'google' && resetMode !== 'setpw' && (
              <ResetStepIndicator current={resetMode === 'code' ? 2 : resetMode === 'done' ? 2 : 1} isHe={isHe} />
            )}
            {(resetMode === 'google' || resetMode === 'setpw') && (
              <ResetStepIndicator current={resetMode === 'setpw' ? 2 : 1} isHe={isHe} variant="google" />
            )}

            {error && <div className="error-message">{error}</div>}
            {message && <div className="success-message">{message}</div>}

            {/* Recovery step 1 — verify identity with Google (no email). */}
            {resetMode === 'google' && (
              <>
                <p className="reset-sheet__body">
                  {isHe
                    ? 'כדי לאפס סיסמה בבטחה נאמת שזה אתה דרך Google (עם אותו אימייל שנרשמת איתו) — ואז תבחר סיסמה חדשה.'
                    : 'To reset your password securely we’ll verify it’s you via Google (the same email you signed up with) — then you’ll choose a new password.'}
                </p>
                <button
                  type="button"
                  className="btn-google"
                  onClick={handleGoogleRecovery}
                  disabled={googleLoading}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                    padding: '12px 16px',
                    borderRadius: 12,
                    border: '1px solid var(--border, rgba(255,255,255,0.12))',
                    background: '#fff',
                    color: '#1f2937',
                    fontWeight: 600,
                    fontSize: 15,
                    cursor: googleLoading ? 'wait' : 'pointer',
                    marginTop: 4,
                    opacity: googleLoading ? 0.7 : 1,
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"/>
                    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
                    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.6 39.6 16.2 44 24 44z"/>
                    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.6l6.2 5.2C41.2 35.6 44 30.3 44 24c0-1.3-.1-2.3-.4-3.5z"/>
                  </svg>
                  <span>{googleLoading ? (isHe ? 'מאמת…' : 'Verifying…') : (isHe ? 'אמת עם Google' : 'Verify with Google')}</span>
                </button>
                <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 14, lineHeight: 1.5, textAlign: 'center' }}>
                  {isHe
                    ? 'נרשמת עם אימייל שאינו Google? פנה אלינו ונשחזר לך את החשבון.'
                    : 'Signed up with a non-Google email? Contact us and we’ll recover your account.'}
                </p>
              </>
            )}

            {/* Recovery step 2 — set a new password (identity already verified). */}
            {resetMode === 'setpw' && (
              <>
                <p className="reset-sheet__body">
                  {isHe
                    ? 'זהותך אומתה ✓ עכשיו בחר סיסמה חדשה לחשבון.'
                    : 'Identity verified ✓ Now choose a new password for your account.'}
                </p>
                <form onSubmit={handleSetNewPassword}>
                  <label className="field-label">{t.newPassword}</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      className="field-input"
                      placeholder={t.passwordPlaceholder}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      dir="ltr"
                      autoComplete="new-password"
                      autoFocus
                      style={{ direction: 'ltr', textAlign: isHe ? 'right' : 'left', paddingInlineEnd: 52 }}
                    />
                    <span
                      onClick={() => setShowNewPassword(v => !v)}
                      style={{
                        position: 'absolute', insetInlineEnd: 14, top: '50%',
                        transform: 'translateY(-50%)', fontSize: 12, color: 'var(--text-3)',
                        cursor: 'pointer', fontWeight: 500, userSelect: 'none',
                      }}
                    >
                      {showNewPassword ? (isHe ? 'הסתר' : 'hide') : (isHe ? 'הצג' : 'show')}
                    </span>
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 6 }}>
                    {isHe ? 'לפחות 8 תווים, כולל ספרה אחת' : 'At least 8 characters, including a digit'}
                  </div>
                  <button type="submit" className="btn-primary-cta" disabled={loading || newPassword.length < 8} style={{ marginTop: 16 }}>
                    <span>{loading ? (isHe ? 'שומר…' : 'Saving…') : (isHe ? 'קבע סיסמה והיכנס' : 'Set password & sign in')}</span>
                    <ArrowIcon />
                  </button>
                </form>
              </>
            )}

            {resetMode === 'email' && (
              <>
                <p className="reset-sheet__body">
                  {isHe
                    ? 'הזן את האימייל ונשלח לך קוד תוך 30 שניות.'
                    : 'Enter your email and we’ll send you a reset code within 30 seconds.'}
                </p>
                <form onSubmit={handleSendCode}>
                  <label className="field-label">{t.email}</label>
                  <input
                    type="email"
                    className="field-input"
                    placeholder="your@email.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    dir="ltr"
                    autoComplete="email"
                    inputMode="email"
                    autoFocus
                    style={{ direction: 'ltr', textAlign: isHe ? 'right' : 'left' }}
                  />
                  <button type="submit" className="btn-primary-cta" disabled={loading || !resetEmail.trim()} style={{ marginTop: 16 }}>
                    <span>{loading ? t.sendingCode : t.sendCode}</span>
                    <ArrowIcon />
                  </button>
                </form>
              </>
            )}

            {resetMode === 'code' && (
              <>
                <p className="reset-sheet__body">
                  {isHe
                    ? 'הזן את הקוד שנשלח לאימייל ובחר סיסמה חדשה.'
                    : 'Enter the code we sent and choose a new password.'}
                </p>
                <form onSubmit={handleResetPassword}>
                  <label className="field-label">{t.enterCode}</label>
                  <input
                    type="text"
                    className="field-input"
                    placeholder={t.codePlaceholder}
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    dir="ltr"
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    style={{ textAlign: 'center', fontSize: '24px', letterSpacing: '8px', fontWeight: 700 }}
                  />
                  <button
                    type="button"
                    onClick={() => handleSendCode()}
                    disabled={loading || resendIn > 0}
                    style={{
                      display: 'block',
                      margin: '8px auto 0',
                      background: 'none',
                      border: 'none',
                      color: resendIn > 0 ? 'var(--text-4)' : 'var(--accent)',
                      fontSize: 12.5,
                      fontWeight: 600,
                      cursor: resendIn > 0 ? 'default' : 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    {resendIn > 0
                      ? (isHe ? `לא הגיע קוד? שליחה חוזרת בעוד ${resendIn} שנ׳` : `No code? Resend in ${resendIn}s`)
                      : (isHe ? 'לא הגיע קוד? שלח שוב' : "Didn't get a code? Resend")}
                  </button>
                  <label className="field-label" style={{ marginTop: 14 }}>{t.newPassword}</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      className="field-input"
                      placeholder={t.passwordPlaceholder}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      dir="ltr"
                      autoComplete="new-password"
                      style={{ direction: 'ltr', textAlign: isHe ? 'right' : 'left', paddingInlineEnd: 52 }}
                    />
                    <span
                      onClick={() => setShowNewPassword(v => !v)}
                      style={{
                        position: 'absolute',
                        insetInlineEnd: 14,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        fontSize: 12,
                        color: 'var(--text-3)',
                        cursor: 'pointer',
                        fontWeight: 500,
                        userSelect: 'none',
                      }}
                    >
                      {showNewPassword ? (isHe ? 'הסתר' : 'hide') : (isHe ? 'הצג' : 'show')}
                    </span>
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 6 }}>
                    {isHe ? 'לפחות 8 תווים, כולל ספרה אחת' : 'At least 8 characters, including a digit'}
                  </div>
                  <button type="submit" className="btn-primary-cta" disabled={loading || resetCode.length < 6} style={{ marginTop: 16 }}>
                    <span>{loading ? t.resetting : t.resetBtn}</span>
                    <ArrowIcon />
                  </button>
                </form>
              </>
            )}

            {resetMode === 'done' && (
              <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
                <div style={{
                  width: 56, height: 56, margin: '0 auto 14px',
                  borderRadius: '50%',
                  background: 'rgba(34, 197, 94, 0.12)',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 28, color: 'var(--success)',
                }}>✓</div>
                <div className="success-message" style={{ marginBottom: 14 }}>
                  {t.passwordResetSuccess}
                </div>
                <button className="btn-primary-cta" onClick={goBackToLogin} style={{ width: '100%' }}>
                  <span>{t.backToLogin}</span>
                  <ArrowIcon />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
