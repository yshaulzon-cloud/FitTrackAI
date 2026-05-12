import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function ArrowIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 12H5M12 19l-7-7 7-7"/>
    </svg>
  );
}

/**
 * Register page is intentionally LTR English regardless of the user's
 * stored language preference — the post-onboarding name detection is
 * what drives the rest of the app's language.
 */
export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim() || !confirmPassword.trim()) {
      setError('Please fill in all fields');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
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
      setError(err.message || 'Google sign-in failed');
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <div className="auth-container" dir="ltr" lang="en">
      <div className="auth-card" style={{ textAlign: 'left' }}>
        <div className="brand" style={{ marginBottom: 24 }}>
          <div className="brand__mark" aria-label="Areto">A</div>
          <div className="brand__name">Areto</div>
        </div>

        <h1>Create your account</h1>
        <p className="subtitle">Sign up and start tracking your progress.</p>

        {error && <div className="error-message">{error}</div>}

        {(
          <>
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={googleLoading || loading}
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
              <span>{googleLoading ? 'Signing in…' : 'Continue with Google'}</span>
            </button>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              margin: '4px 0 16px', color: 'var(--text-3, #6b7280)', fontSize: 12,
            }}>
              <span style={{ flex: 1, height: 1, background: 'var(--border, rgba(255,255,255,0.12))' }} />
              <span>or</span>
              <span style={{ flex: 1, height: 1, background: 'var(--border, rgba(255,255,255,0.12))' }} />
            </div>
          </>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              dir="ltr"
              autoComplete="email"
              style={{ direction: 'ltr', textAlign: 'left' }}
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              dir="ltr"
              autoComplete="new-password"
              style={{ direction: 'ltr', textAlign: 'left' }}
            />
          </div>

          <div className="form-group">
            <label>Confirm password</label>
            <input
              type="password"
              placeholder="Enter password again"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              dir="ltr"
              autoComplete="new-password"
              style={{ direction: 'ltr', textAlign: 'left' }}
            />
          </div>

          <button type="submit" className="btn-primary-cta" disabled={loading} style={{ marginTop: 8 }}>
            <span>{loading ? 'Signing up…' : 'Sign up'}</span>
            <ArrowIcon />
          </button>
        </form>

        <div className="auth-footer">
          Already have an account? <Link to="/login">Log in here</Link>
        </div>
      </div>
    </div>
  );
}
