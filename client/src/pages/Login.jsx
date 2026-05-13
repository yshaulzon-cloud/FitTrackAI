import { useState } from 'react';
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

  // ── Reset flow: email step ──────────────────────────────
  if (resetMode === 'email') {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="brand" style={{ marginBottom: 20 }}>
            <div className="brand__mark" aria-label="Areto">A</div>
            <div className="brand__name">{t.appName}</div>
          </div>
          <ResetStepIndicator current={1} isHe={isHe} />
          <h1>{t.resetPassword}</h1>
          <p className="subtitle">
            {isHe
              ? 'הזן את כתובת האימייל שלך ונשלח לך קוד איפוס תוך 30 שניות.'
              : 'Enter your email and we’ll send you a reset code within 30 seconds.'}
          </p>

          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleSendCode}>
            <div className="form-group">
              <label>{t.email}</label>
              <input
                type="email"
                placeholder="your@email.com"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                dir="ltr"
                autoComplete="email"
                inputMode="email"
                autoFocus
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? t.sendingCode : t.sendCode}
            </button>
          </form>

          <div className="auth-footer">
            <a onClick={goBackToLogin} style={{ cursor: 'pointer' }}>
              {t.backToLogin}
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ── Reset flow: code + new password ─────────────────────
  if (resetMode === 'code') {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="brand" style={{ marginBottom: 20 }}>
            <div className="brand__mark" aria-label="Areto">A</div>
            <div className="brand__name">{t.appName}</div>
          </div>
          <ResetStepIndicator current={2} isHe={isHe} />
          <h1>{t.resetPassword}</h1>
          <p className="subtitle">
            {isHe
              ? 'הזן את הקוד שנשלח לאימייל ובחר סיסמה חדשה. לא קיבלת? בדוק בספאם.'
              : 'Enter the code we sent and choose a new password. Didn’t arrive? Check spam.'}
          </p>

          {message && <div className="success-message">{message}</div>}
          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleResetPassword}>
            <div className="form-group">
              <label>{t.enterCode}</label>
              <input
                type="text"
                placeholder={t.codePlaceholder}
                value={resetCode}
                onChange={(e) => setResetCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                dir="ltr"
                autoComplete="one-time-code"
                style={{ textAlign: 'center', fontSize: '24px', letterSpacing: '8px', fontWeight: 700 }}
              />
            </div>
            <div className="form-group">
              <label>{t.newPassword}</label>
              <input
                type="password"
                placeholder={t.passwordPlaceholder}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                dir="ltr"
                autoComplete="new-password"
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading || resetCode.length < 6}>
              {loading ? t.resetting : t.resetBtn}
            </button>
          </form>

          <div className="auth-footer">
            <a onClick={goBackToLogin} style={{ cursor: 'pointer' }}>
              {t.backToLogin}
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ── Reset flow: done ────────────────────────────────────
  if (resetMode === 'done') {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="brand" style={{ marginBottom: 24 }}>
            <div className="brand__mark" aria-label="Areto">A</div>
            <div className="brand__name">{t.appName}</div>
          </div>
          <div style={{ textAlign: 'center', padding: '12px 0 4px' }}>
            <div style={{
              width: 56, height: 56,
              margin: '0 auto 16px',
              borderRadius: '50%',
              background: 'rgba(34, 197, 94, 0.12)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28, color: 'var(--success)',
            }}>✓</div>
            <div className="success-message" style={{ marginBottom: 20 }}>
              {t.passwordResetSuccess}
            </div>
            <button className="btn btn-primary" onClick={goBackToLogin}>
              {t.backToLogin}
            </button>
          </div>
        </div>
      </div>
    );
  }

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
                onClick={() => setResetMode('email')}
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
                style={{ direction: 'ltr', textAlign: isHe ? 'right' : 'left' }}
              />
              <span
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  insetInlineStart: 14,
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

          <p className="legal-text">
            {isHe ? (
              <>בכניסה אתה מאשר את <a style={{ cursor: 'pointer' }} onClick={openTerms}>תנאי השימוש</a> ו<a style={{ cursor: 'pointer' }} onClick={openPrivacy}>מדיניות הפרטיות</a></>
            ) : (
              <>By signing in you agree to our <a style={{ cursor: 'pointer' }} onClick={openTerms}>Terms</a> and <a style={{ cursor: 'pointer' }} onClick={openPrivacy}>Privacy Policy</a></>
            )}
          </p>
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
                בנה גוף.<br/>
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
    </div>
  );
}
