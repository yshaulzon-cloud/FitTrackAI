// In-app bridge — runs INSIDE the iframe, mounted only in dev and only when
// the app is embedded in the harness (window.parent !== self). It is loaded via
// a guarded dynamic import from main.jsx, so it never enters a production build.
//
// Its whole job: receive commands from the harness and carry them out against
// the app's REAL hooks/router, then report back. No app logic is duplicated
// here — it only calls what the app already exposes.
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { useLang } from '../../context/LanguageContext';
import { CMD, EVT, makeMsg, isPreviewMsg } from './protocol';

export default function PreviewBridge() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setTheme } = useTheme();
  const { setLanguage } = useLang();

  // Announce the current route to the harness whenever it changes, so the
  // sidebar can highlight "where am I" without polling.
  useEffect(() => {
    post(makeMsg('evt', EVT.ROUTE, { path: location.pathname }));
  }, [location.pathname]);

  useEffect(() => {
    function onMessage(e) {
      if (!isPreviewMsg(e) || e.data.kind !== 'cmd') return;
      const { type, payload } = e.data;
      try {
        switch (type) {
          case CMD.PING:
            post(makeMsg('evt', EVT.PONG, { path: location.pathname }));
            break;
          case CMD.NAVIGATE:
            navigate(payload.path);
            break;
          case CMD.SET_THEME:
            setTheme(payload.theme);
            break;
          case CMD.SET_LANG:
            setLanguage(payload.lang);
            break;
          default:
            return; // unknown command: ignore (later stages add more)
        }
        post(makeMsg('evt', EVT.ACK, { of: type, ok: true }));
      } catch (err) {
        post(makeMsg('evt', EVT.ACK, { of: type, ok: false, error: String(err?.message || err) }));
      }
    }

    window.addEventListener('message', onMessage);
    // Let the harness know we're live (covers the case where the harness
    // finished loading before this iframe did).
    post(makeMsg('evt', EVT.READY, { path: location.pathname }));
    return () => window.removeEventListener('message', onMessage);
    // location.pathname is intentionally read fresh inside the handler via
    // closure refresh on each render; re-subscribing per route is cheap.
  }, [location.pathname, navigate, setTheme, setLanguage]);

  return null;
}

function post(msg) {
  try {
    window.parent?.postMessage(msg, window.location.origin);
  } catch {
    /* parent gone / cross-origin — harmless in the dev harness */
  }
}
