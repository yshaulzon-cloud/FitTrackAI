import { useState, useEffect, Component } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { useLang } from './context/LanguageContext';
import Login from './pages/Login';
import OnboardingFlow from './pages/OnboardingFlow';
import Dashboard from './pages/Dashboard';

const INTRO_FLAG = 'areto:intro-seen';

function shouldShowIntroSync() {
  try {
    if (localStorage.getItem(INTRO_FLAG) === '1') return false;
    return true; // Show Welcome to all first-time visitors (web + native)
  } catch { return false; }
}

class ErrorBoundary extends Component {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(err) { console.error('App error:', err); }
  render() {
    if (this.state.hasError) {
      const isHe = localStorage.getItem('areto:lang') !== 'en';
      return (
        <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'Heebo, sans-serif' }}>
          <p style={{ fontSize: 16, color: '#e2e8f0' }}>
            {isHe ? 'משהו השתבש. רענן את הדף.' : 'Something went wrong. Please refresh.'}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: 12, padding: '8px 20px', cursor: 'pointer', borderRadius: 8, border: 'none', background: '#2dd4bf', color: '#000', fontWeight: 600 }}
          >
            {isHe ? 'רענן' : 'Refresh'}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function SplashScreen({ onDone }) {
  const { t, lang } = useLang();
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFading(true), 1500);
    const doneTimer = setTimeout(() => onDone(), 2000);
    return () => { clearTimeout(fadeTimer); clearTimeout(doneTimer); };
  }, [onDone]);

  const tagline = lang === 'he' ? 'תזונה · אימונים · תוצאות' : 'Nutrition · Training · Results';

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'linear-gradient(155deg, #131a2c 0%, #0a0e1a 50%, #1a1438 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      opacity: fading ? 0 : 1,
      transition: 'opacity 0.5s ease',
    }}>
      <div style={{
        position: 'absolute',
        width: 480, height: 480,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(45,212,191,0.18), transparent 60%)',
        top: -120, insetInlineStart: -120,
        filter: 'blur(40px)',
      }} />
      <div style={{
        position: 'absolute',
        width: 360, height: 360,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(139,92,246,0.18), transparent 60%)',
        bottom: -80, insetInlineEnd: -60,
        filter: 'blur(40px)',
      }} />
      <div style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 18,
        marginBottom: 18,
      }}>
        <img
          src="/logo.png"
          alt={t.appName}
          width="140"
          height="140"
          style={{
            display: 'block',
            filter: 'drop-shadow(0 12px 40px rgba(45, 212, 191, 0.25))',
          }}
        />
        <div style={{
          fontFamily: 'Heebo, sans-serif',
          fontSize: 42,
          fontWeight: 800,
          color: '#f4f6fb',
          letterSpacing: '-0.025em',
        }}>
          {t.appName}
        </div>
      </div>
      <div style={{
        position: 'relative',
        fontSize: 14,
        color: '#7e879d',
        letterSpacing: lang === 'he' ? '0.04em' : '0.18em',
        textTransform: lang === 'he' ? 'none' : 'uppercase',
        fontWeight: 600,
      }}>
        {tagline}
      </div>
      {/* Pulse-dot loader — keeps the splash feeling alive while assets warm up */}
      <div className="splash-loader" aria-hidden="true">
        <span /><span /><span />
      </div>
    </div>
  );
}

// Shown while auth resolves — the app's real splash moment, so it wears the
// brand rather than a bare spinner.
function Splash() {
  const { lang } = useLang();
  return (
    <div className="sp">
      <div className="sp__mark">
        <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="var(--on-accent)"
             strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 13h4l2.5-6 3.5 10 2.5-6H21" />
        </svg>
      </div>
      <div className="sp__name">Areto</div>
      <div className="sp__tag">
        {lang === 'he' ? 'תזונה · אימונים · תוצאות' : 'Nutrition · Training · Results'}
      </div>
      <div className="sp__dots" aria-hidden="true">
        <span className="sp__dot sp__dot--on" />
        <span className="sp__dot" />
        <span className="sp__dot" />
      </div>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Splash />
    );
  }

  if (!user) return <Navigate to="/login" />;
  if (!user.onboardingComplete) return <Navigate to="/onboarding" />;
  return children;
}

function AuthRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Splash />
    );
  }

  if (user && user.onboardingComplete) return <Navigate to="/dashboard" />;
  if (user && !user.onboardingComplete) return <Navigate to="/onboarding" />;
  if (!user && shouldShowIntroSync()) return <Navigate to="/onboarding" />;
  return children;
}

// Unlike the old flow, onboarding now comes BEFORE account creation — the
// whole point of the redesign is that anonymous visitors answer every
// personalization question first and only sign up at the end to save the
// plan. So this route must admit anonymous users too; it only redirects
// away once onboarding is actually complete.
function OnboardingRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Splash />
    );
  }

  if (user && user.onboardingComplete) return <Navigate to="/dashboard" />;
  return children;
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  // Native (Capacitor) bootstrap — runs only on Android/iOS, no-op on web.
  // Hides the native splash, sets the status bar style, and wires the Android
  // hardware back button to React Router instead of immediately exiting.
  useEffect(() => {
    let backHandler;
    (async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (!Capacitor.isNativePlatform()) return;

        const { SplashScreen } = await import('@capacitor/splash-screen');
        const { StatusBar, Style } = await import('@capacitor/status-bar');
        const { App: NativeApp } = await import('@capacitor/app');

        await StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
        await StatusBar.setBackgroundColor({ color: '#0a0e1a' }).catch(() => {});
        await SplashScreen.hide().catch(() => {});

        backHandler = await NativeApp.addListener('backButton', ({ canGoBack }) => {
          if (canGoBack) window.history.back();
          else NativeApp.exitApp();
        });
      } catch {
        // Plugins missing or web mode — ignore
      }
    })();
    return () => { if (backHandler && backHandler.remove) backHandler.remove(); };
  }, []);

  if (showSplash) {
    return <SplashScreen onDone={() => setShowSplash(false)} />;
  }

  return (
    <ErrorBoundary>
    <Routes>
      <Route
        path="/login"
        element={
          <AuthRoute>
            <Login />
          </AuthRoute>
        }
      />
      <Route
        path="/onboarding"
        element={
          <OnboardingRoute>
            <OnboardingFlow />
          </OnboardingRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      {/* Signup and the old welcome page are now the first/last steps of the
          single onboarding flow — keep these as redirects so old links and
          bookmarks still land somewhere sensible. */}
      <Route path="/welcome" element={<Navigate to="/onboarding" />} />
      <Route path="/register" element={<Navigate to="/onboarding" />} />
      <Route path="*" element={<Navigate to="/dashboard" />} />
    </Routes>
    </ErrorBoundary>
  );
}
