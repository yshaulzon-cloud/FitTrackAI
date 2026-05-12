import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';
import { useLegal } from '../context/LegalContext';

function ArrowIcon({ flip = false }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ transform: flip ? 'scaleX(-1)' : 'none' }}>
      <path d="M19 12H5M12 19l-7-7 7-7"/>
    </svg>
  );
}

// Returns a strength 0..3:
//   0 = empty/too short, 1 = weak, 2 = ok, 3 = strong
function scorePassword(pw) {
  if (!pw || pw.length < 8) return 0;
  let s = 1;
  if (/\d/.test(pw)) s++;
  if (/[A-Z]/.test(pw) || /[^A-Za-z0-9]/.test(pw)) s++;
  return Math.min(s, 3);
}

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { register, loginWithGoogle } = useAuth();
  const { t, lang } = useLang();
  const { openPrivacy, openTerms } = useLegal();
  const navigate = useNavigate();

  const isHe = lang === 'he';
  const strength = useMemo(() => scorePassword(password), [password]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError(isHe ? 'מלא את כל השדות' : 'Please fill in all fields');
      return;
    }
    if (password.length < 8) {
      setError(isHe ? 'הסיסמה חייבת להכיל לפחות 8 תווים' : 'Password must be at least 8 characters');
      return;
    }
    if (!/\d/.test(password)) {
      setError(isHe ? 'הסיסמה חייבת לכלול לפחות ספרה אחת' : 'Password must include at least one number');
      return;
    }
    if (!acceptedTerms) {
      setError(isHe ? 'יש לאשר את תנאי השימוש ומדיניות הפרטיות' : 'Please accept the terms and privacy policy');
      return;
    }

    setLoading(true);
    try {
      await register(email, password);
      navigate('/onboarding');
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
      setError(err.message || (isHe ? 'הרשמה עם Google נכשלה' : 'Google sign-up failed'));
    } finally {
      setGoogleLoading(false);
    }
  }

  const strengthLabels = isHe
    ? ['בחר סיסמה', 'חלשה', 'תקינה', 'חזקה']
    : ['Choose a password', 'Weak', 'OK', 'Strong'];
  const strengthColors = ['var(--text-4)', '#ef4444', '#f59e0b', 'var(--accent)'];

  const benefits = isHe
    ? ['תוכנית מותאמת אישית', 'מעקב יומי אוטומטי', 'ללא פרסומות']
    : ['Personalized plan', 'Daily auto-tracking', 'No ads, ever'];

  return (
    <div className="auth-container">
      <div className="auth-card" style={{ textAlign: isHe ? 'right' : 'left' }}>
        <div className="brand" style={{ marginBottom: 20 }}>
          <div className="brand__mark" aria-label="Areto">A</div>
          <div className="brand__name">{t.appName}</div>
        </div>

        <h1>{isHe ? 'צור חשבון' : 'Create your account'}</h1>
        <p className="subtitle">
          {isHe
            ? 'תוכנית מותאמת תוך 60 שניות. תוכל לבטל בכל זמן.'
            : 'A personalized plan in 60 seconds. Cancel anytime.'}
        </p>

        {/* Value strip — 3 quick checkmarks (audit: trust signals above fold) */}
        <ul className="benefit-strip" aria-label={isHe ? 'יתרונות' : 'Benefits'}>
          {benefits.map((b, i) => (
            <li key={i} className="benefit-strip__item">
              <span className="benefit-strip__check" aria-hidden="true">✓</span>
              {b}
            </li>
          ))}
        </ul>

        {error && <div className="error-message">{error}</div>}

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={googleLoading || loading}
          className="btn-google-sso"
        >
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"/>
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.6 39.6 16.2 44 24 44z"/>
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.6l6.2 5.2C41.2 35.6 44 30.3 44 24c0-1.3-.1-2.3-.4-3.5z"/>
          </svg>
          <span>
            {googleLoading
              ? (isHe ? 'נרשם…' : 'Signing up…')
              : (isHe ? 'הרשם עם Google' : 'Sign up with Google')}
          </span>
        </button>

        <div className="or-divider">
          <span />
          <span>{isHe ? 'או' : 'or'}</span>
          <span />
        </div>

        <form onSubmit={handleSubmit}>
          <label className="field-label" htmlFor="register-email">{isHe ? 'אימייל' : 'Email'}</label>
          <input
            id="register-email"
            className="field-input"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            dir="ltr"
            autoComplete="email"
            inputMode="email"
            style={{ direction: 'ltr', textAlign: isHe ? 'right' : 'left' }}
          />

          <div className="field-row">
            <label className="field-label" htmlFor="register-password" style={{ marginBottom: 0 }}>
              {isHe ? 'סיסמה' : 'Password'}
            </label>
            <a
              role="button"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={0}
              aria-pressed={showPassword}
            >
              {showPassword
                ? (isHe ? '🙈 הסתר' : '🙈 Hide')
                : (isHe ? '👁 הצג' : '👁 Show')}
            </a>
          </div>
          <input
            id="register-password"
            className="field-input"
            type={showPassword ? 'text' : 'password'}
            placeholder={isHe ? 'לפחות 8 תווים + ספרה' : 'At least 8 chars + 1 number'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            dir="ltr"
            autoComplete="new-password"
            style={{ direction: 'ltr', textAlign: isHe ? 'right' : 'left', marginTop: 8 }}
          />

          {/* Password strength meter */}
          <div className="pw-strength" aria-live="polite">
            <div className="pw-strength__bars" aria-hidden="true">
              {[1, 2, 3].map((b) => (
                <span
                  key={b}
                  className={`pw-strength__bar${strength >= b ? ' pw-strength__bar--on' : ''}`}
                  style={strength >= b ? { background: strengthColors[strength] } : undefined}
                />
              ))}
            </div>
            <span className="pw-strength__label" style={{ color: strengthColors[strength] }}>
              {strengthLabels[strength]}
            </span>
          </div>

          {/* Terms checkbox (audit: legal compliance) */}
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
            />
            <span className="checkbox-row__text">
              {isHe ? (
                <>
                  אני מאשר את{' '}
                  <a onClick={openTerms} role="button" tabIndex={0}>תנאי השימוש</a>
                  {' ו'}
                  <a onClick={openPrivacy} role="button" tabIndex={0}>מדיניות הפרטיות</a>
                </>
              ) : (
                <>
                  I agree to the{' '}
                  <a onClick={openTerms} role="button" tabIndex={0}>Terms</a>
                  {' and '}
                  <a onClick={openPrivacy} role="button" tabIndex={0}>Privacy Policy</a>
                </>
              )}
            </span>
          </label>

          <button
            type="submit"
            className="btn-primary-cta"
            disabled={loading || !acceptedTerms}
          >
            <span>{loading ? (isHe ? 'יוצר חשבון…' : 'Creating…') : (isHe ? 'צור חשבון' : 'Create account')}</span>
            <ArrowIcon flip={!isHe} />
          </button>
        </form>

        {/* Trust band (audit: social proof at bottom of register, not login) */}
        <div className="trust-band">
          <span>★ 4.8 · App Store · Play Store</span>
          <span className="trust-band__sep">·</span>
          <span>{isHe ? '+10,000 ספורטאים פעילים' : '+10,000 active athletes'}</span>
        </div>

        <div className="auth-footer">
          {isHe ? 'כבר יש לך חשבון?' : 'Already have an account?'}{' '}
          <Link to="/login">{isHe ? 'התחבר' : 'Log in'}</Link>
        </div>
      </div>
    </div>
  );
}
