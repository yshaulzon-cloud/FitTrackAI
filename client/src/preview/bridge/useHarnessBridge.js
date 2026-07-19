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

  return { iframeRef, connected, route, send, on, onIframeLoad, CMD, TAG };
}
