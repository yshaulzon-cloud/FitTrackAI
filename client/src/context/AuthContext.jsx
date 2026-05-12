import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

// Production: VITE_API_URL points to the Render deployment (the Render service name was kept from the original deploy and may not match the current app name)
// Dev: falls back to local Express on port 3001
const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3001' : '');

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, []);

  async function fetchProfile() {
    try {
      const res = await fetch(`${API_BASE}/user/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        logout();
      }
    } catch {
      logout();
    } finally {
      setLoading(false);
    }
  }

  async function login(email, password) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    localStorage.setItem('token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data;
  }

  const GOOGLE_CLIENT_ID = '674273831957-r79t2lo52fpddlairlldu9gvihkjvf7h.apps.googleusercontent.com';

  // Detects whether we're running inside a Capacitor native shell (Android/iOS).
  // On native we use the @codetrix-studio plugin (returns an ID token).
  // On web we use Google Identity Services (returns an access token via popup).
  function isCapacitorNative() {
    return typeof window !== 'undefined'
      && window.Capacitor
      && typeof window.Capacitor.isNativePlatform === 'function'
      && window.Capacitor.isNativePlatform();
  }

  async function loginWithGoogleNative() {
    const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth');
    try {
      GoogleAuth.initialize({
        clientId: GOOGLE_CLIENT_ID,
        scopes: ['profile', 'email'],
      });
    } catch { /* already initialized */ }
    const googleUser = await GoogleAuth.signIn();
    const idToken = googleUser.authentication.idToken;
    if (!idToken) throw new Error('Google did not return an ID token');
    return { idToken };
  }

  // Web flow: open Google's popup, receive an access token, send it to the
  // backend which verifies it via Google's tokeninfo endpoint.
  function loginWithGoogleWeb() {
    return new Promise((resolve, reject) => {
      if (!window.google || !window.google.accounts || !window.google.accounts.oauth2) {
        reject(new Error('Google Sign-In לא זמין (GIS script לא נטען). נסה לרענן את הדף.'));
        return;
      }
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: 'openid email profile',
        callback: (response) => {
          if (response.error) {
            reject(new Error(response.error_description || response.error));
            return;
          }
          if (!response.access_token) {
            reject(new Error('Google did not return an access token'));
            return;
          }
          resolve({ accessToken: response.access_token });
        },
        error_callback: (err) => {
          reject(new Error(err?.message || 'Google sign-in was cancelled'));
        },
      });
      tokenClient.requestAccessToken({ prompt: 'select_account' });
    });
  }

  async function loginWithGoogle() {
    const credential = isCapacitorNative()
      ? await loginWithGoogleNative()
      : await loginWithGoogleWeb();

    const res = await fetch(`${API_BASE}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credential),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    localStorage.setItem('token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data;
  }

  async function register(email, password) {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    localStorage.setItem('token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data;
  }

  function logout() {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  }

  async function api(path, options = {}) {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    return data;
  }

  function updateUser(data) {
    setUser((prev) => ({ ...prev, ...data }));
  }

  return (
    <AuthContext.Provider
      value={{ user, token, loading, login, loginWithGoogle, register, logout, api, updateUser, fetchProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
