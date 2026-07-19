// Shared contract between the harness (host window) and the in-app bridge
// (inside the iframe). Both sides live under src/preview/, so importing this
// never pulls preview code into the app's production graph.
//
// Every message is tagged so we ignore unrelated postMessage traffic (Vite
// HMR, Google GSI, extensions, …). Messages only travel same-origin.

export const TAG = '__areto_preview__';

// Host → app: things to do to the running app.
export const CMD = {
  PING: 'ping',
  NAVIGATE: 'navigate',
  SET_THEME: 'set-theme',
  SET_LANG: 'set-lang',
  LOGOUT: 'logout', // A3 — calls the app's real logout()
  // filled in later stages (A4 flags, A5 taps, A7 stubs)
};

// App → host: replies and streamed events.
export const EVT = {
  READY: 'ready', // bridge mounted and listening
  PONG: 'pong',
  ROUTE: 'route', // current path, sent on change
  ACK: 'ack', // a command completed { of, ok, error? }
  LOG: 'log', // A5
  NET: 'net', // A5
  CRASH: 'crash', // A5
};

export function makeMsg(kind, type, payload) {
  return { [TAG]: true, kind, type, payload };
}

// Guard used by both sides before trusting a message.
export function isPreviewMsg(e) {
  return (
    e &&
    e.origin === window.location.origin &&
    e.data &&
    e.data[TAG] === true &&
    typeof e.data.type === 'string'
  );
}
