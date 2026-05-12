import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { useLang } from './context/LanguageContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';

function SplashScreen({ onDone }) {
  const { t, lang } = useLang();
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFading(true), 1500);
    const doneTimer = setTimeout(() => onDone(), 2000);
    return () => { clearTimeout(fadeTimer); clearTimeout(doneTimer); };
  }, [onDone]);

  const tagline = lang === 'he' ? 'בנה · עקוב · תשתפר' : 'Build · Track · Improve';

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

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
      </div>
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
      <div className="loading">
        <div className="spinner" />
      </div>
    );
  }

  if (user && user.onboardingComplete) return <Navigate to="/dashboard" />;
  if (user && !user.onboardingComplete) return <Navigate to="/onboarding" />;
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
        path="/register"
        element={
          <AuthRoute>
            <Register />
          </AuthRoute>
        }
      />
      <Route
        path="/onboarding"
        element={
          <OnboardingRoute>
            <Onboarding />
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
      <Route path="*" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
}

function OnboardingRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" />;
  if (user.onboardingComplete) return <Navigate to="/dashboard" />;
  return children;
}
