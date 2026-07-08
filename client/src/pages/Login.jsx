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
// Two segmented bars (current = teal, future = muted) + a label.
function ResetStepIndicator({ current, isHe }) {
  return (
    <div className="reset-step-indicator" aria-label={isHe ? `שלב ${current} מתוך 2` : `Step ${current} of 2`}>
      <div className="reset-step-indicator__bars" aria-hidden="true">
        <span className={current >= 1 ? 'is-done' : ''} />
        <span className={current >= 2 ? 'is-done' : ''} />
      </div>
      <span className="reset-step-indicator__label">
        {isHe ? `שלב ${current} מתוך 2` : `Step ${current} of 2`}
        {' · '}
        <span className="reset-step-indicator__title">
          {current === 1
            ? (isHe ? 'הזן אימייל' : 'Enter email')
            : (isHe ? 'אמת קוד וסיסמה חדשה' : 'Verify code & new password')}
        </span>
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
  const [message, setMessage] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const { login, loginWithGoogle } = useAuth();
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

  async function handleSendCode(e) {
    e.preventDefault();
    if (!resetEmail.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setMessage(t.codeSent);
      setResetMode('code');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    if (!resetCode.trim() || !newPassword.trim()) return;
    if (newPassword.length < 6) {
      setError(t.passwordMin);
      return;
    }
    setLoading(true);
    setError('');
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
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setMessage(t.passwordResetSuccess);
      setResetMode('done');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function goBackToLogin() {
    setResetMode(null);
    setResetEmail('');
    setResetCode('');
    setNewPassword('');
    setError('');
    setMessage('');
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
                  // Pre-fill the reset field with whatever the user already
                  // typed into the login email (audit P19).
                  setResetEmail(email);
                  setResetMode('email');
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
                <div className="reset-sheet__eyebrow">{t.resetPassword}</div>
              </div>
              <div style={{ width: 32 }} aria-hidden="true" />
            </div>
            <ResetStepIndicator current={resetMode === 'code' ? 2 : resetMode === 'done' ? 2 : 1} isHe={isHe} />

            {error && <div className="error-message">{error}</div>}
            {message && <div className="success-message">{message}</div>}

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
                    style={{ textAlign: 'center', fontSize: '24px', letterSpacing: '8px', fontWeight: 700 }}
                  />
                  <label className="field-label" style={{ marginTop: 14 }}>{t.newPassword}</label>
                  <input
                    type="password"
                    className="field-input"
                    placeholder={t.passwordPlaceholder}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    dir="ltr"
                    autoComplete="new-password"
                    style={{ direction: 'ltr', textAlign: isHe ? 'right' : 'left' }}
                  />
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
