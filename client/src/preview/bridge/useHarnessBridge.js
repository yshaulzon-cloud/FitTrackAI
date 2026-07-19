import { useCallback, useEffect, useRef, useState } from 'react';
import { CMD, EVT, TAG, makeMsg, isPreviewMsg } from './protocol';

// Host side of the bridge. Owns the iframe ref, sends commands into the
// embedded app, and subscribes to the events it streams back. Everything the
// sidebar does routes through `send`; everything it displays (connection,
// current route, and later logs/network/crashes) comes from here.
export function useHarnessBridge() {
  const iframeRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [route, setRoute] = useState(null);
  // Event subscribers keyed by EVT type — A5 panels register here.
  const subs = useRef(new Map());

  const emit = useCallback((type, payload) => {
    const set = subs.current.get(type);
    if (set) set.forEach((fn) => fn(payload));
  }, []);

  const on = useCallback((type, fn) => {
    if (!subs.current.has(type)) subs.current.set(type, new Set());
    subs.current.get(type).add(fn);
    return () => subs.current.get(type)?.delete(fn);
  }, []);

  useEffect(() => {
    function onMessage(e) {
      if (!isPreviewMsg(e) || e.data.kind !== 'evt') return;
      const { type, payload } = e.data;
      switch (type) {
        case EVT.READY:
          setConnected(true);
          if (payload?.path) setRoute(payload.path);
          break;
        case EVT.PONG:
          setConnected(true);
          break;
        case EVT.ROUTE:
          setRoute(payload?.path ?? null);
          break;
        default:
          break;
      }
      emit(type, payload);
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [emit]);

  // Post a command to the embedded app.
  const send = useCallback((type, payload = {}) => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    win.postMessage(makeMsg('cmd', type, payload), window.location.origin);
  }, []);

  // Called by the iframe's onLoad — the app just (re)mounted, so re-handshake.
  // Connection drops until the fresh bridge answers, avoiding a stale "green".
  const onIframeLoad = useCallback(() => {
    setConnected(false);
    // Give the bridge a tick to attach its listener, then ping.
    setTimeout(() => send(CMD.PING), 120);
  }, [send]);

  // ── Same-origin iframe helpers ──────────────────────────────
  // The harness and the embedded app share an origin, so the harness can read
  // and write the app's storage directly. This is how "switch user" works: put
  // the token where AuthContext reads it (localStorage['token']) and reload so
  // the app boots authenticated.
  const reloadTo = useCallback((path = '/dashboard') => {
    const f = iframeRef.current;
    if (f) f.src = path; // assigning src forces a fresh load even to the same path base
  }, []);

  const applyToken = useCallback((token, path = '/dashboard') => {
    try {
      iframeRef.current?.contentWindow?.localStorage.setItem('token', token);
    } catch { /* not yet loaded — the reload below will still land on `path` */ }
    reloadTo(path);
  }, [reloadTo]);

  const clearAppStorage = useCallback((path = '/onboarding') => {
    try {
      const w = iframeRef.current?.contentWindow;
      w?.localStorage.clear();
      w?.sessionStorage.clear();
    } catch { /* ignore */ }
    reloadTo(path);
  }, [reloadTo]);

  const clearAppCache = useCallback(async () => {
    try {
      const w = iframeRef.current?.contentWindow;
      if (w?.caches) {
        const keys = await w.caches.keys();
        await Promise.all(keys.map((k) => w.caches.delete(k)));
      }
    } catch { /* ignore */ }
    reloadTo(iframeRef.current?.contentWindow?.location?.pathname || '/dashboard');
  }, [reloadTo]);

  // Read/write a single app localStorage key (feature flags). null value
  // removes the key. Reloads so the app re-reads it on mount.
  const getFlag = useCallback((key) => {
    try { return iframeRef.current?.contentWindow?.localStorage.getItem(key); }
    catch { return null; }
  }, []);

  const setFlag = useCallback((key, value, { reload = true } = {}) => {
    try {
      const ls = iframeRef.current?.contentWindow?.localStorage;
      if (value === null) ls?.removeItem(key);
      else ls?.setItem(key, value);
    } catch { /* ignore */ }
    if (reload) reloadTo(iframeRef.current?.contentWindow?.location?.pathname || '/dashboard');
  }, [reloadTo]);

  // Operate the real app DOM the way a user would — same origin, so the harness
  // can find and click actual elements. Steps: {click|clickIndex|delay|waitFor}.
  const runInApp = useCallback(async (steps) => {
    const doc = () => iframeRef.current?.contentDocument;
    const waitFor = async (sel, timeout = 3500) => {
      const start = Date.now();
      while (Date.now() - start < timeout) {
        const el = doc()?.querySelector(sel);
        if (el) return el;
        await new Promise((r) => setTimeout(r, 90));
      }
      return null;
    };
    for (const step of steps) {
      if (step.waitFor) await waitFor(step.waitFor);
      if (step.click) { const el = await waitFor(step.click); el?.click(); }
      if (step.clickIndex) {
        await waitFor(step.clickIndex.sel);
        doc()?.querySelectorAll(step.clickIndex.sel)?.[step.clickIndex.i]?.click();
      }
      if (step.delay) await new Promise((r) => setTimeout(r, step.delay));
    }
  }, []);

  // Land on /dashboard (real routing), then drive the app to the target screen.
  const openScreen = useCallback(async (steps) => {
    const onDash = iframeRef.current?.contentWindow?.location?.pathname === '/dashboard';
    if (!onDash) { send(CMD.NAVIGATE, { path: '/dashboard' }); await new Promise((r) => setTimeout(r, 500)); }
    await runInApp(steps);
  }, [send, runInApp]);

  return {
    iframeRef, connected, route, send, on, onIframeLoad,
    reloadTo, applyToken, clearAppStorage, clearAppCache,
    getFlag, setFlag, runInApp, openScreen,
    CMD, TAG,
  };
}
