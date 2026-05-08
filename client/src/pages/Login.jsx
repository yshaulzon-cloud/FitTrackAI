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
  const { login } = useAuth();
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
          <div className="brand" style={{ marginBottom: 24 }}>
            <div className="brand__mark">BS</div>
            <div className="brand__name">{t.appName}</div>
          </div>
          <h1>{t.resetPassword}</h1>
          <p className="subtitle">
            {isHe
              ? 'הזן את כתובת האימייל שלך ונשלח לך קוד איפוס.'
              : 'Enter your email and we’ll send you a reset code.'}
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
          <div className="brand" style={{ marginBottom: 24 }}>
            <div className="brand__mark">BS</div>
            <div className="brand__name">{t.appName}</div>
          </div>
          <h1>{t.resetPassword}</h1>
          <p className="subtitle">
            {isHe
              ? 'הזן את הקוד שנשלח לאימייל ובחר סיסמה חדשה.'
              : 'Enter the code we sent to your email and choose a new password.'}
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
            <div className="brand__mark">BS</div>
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

          <form onSubmit={handleSubmit}>
            <label className="field-label">{t.email}</label>
            <input
              type="email"
              className="field-input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              dir="ltr"
              autoComplete="email"
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
          <div className="brand__mark">BS</div>
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
