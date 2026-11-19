// A failed network request in the browser is a bare TypeError("Failed to fetch") — English, technical, and
// shown as-is inside a Hebrew screen (QA Q3: logging a meal offline). These turn it into a sentence the
// user can act on, in the language of the app. Pure functions, no DOM.

const NETWORK_MSG = {
  he: 'אין חיבור לשרת. בדוק את האינטרנט ונסה שוב.',
  en: 'Can’t reach the server. Check your connection and try again.',
};
const SERVER_MSG = {
  he: 'שגיאת שרת, נסה שוב עוד רגע.',
  en: 'Server error, please try again in a moment.',
};

// What browsers (and the Capacitor WebView) throw when the request never got an answer:
// Chrome "Failed to fetch", Firefox "NetworkError when attempting to fetch resource.",
// Safari / iOS WebView "Load failed", a dropped connection "network error".
export function isNetworkError(err) {
  if (!err) return false;
  if (err.code === 'NETWORK') return true;
  if (err.name === 'AbortError') return false;
  const text = String(err.message || '');
  return err instanceof TypeError && /failed to fetch|networkerror|load failed|network request failed|network error/i.test(text);
}

export const networkMessage = (isHe) => (isHe ? NETWORK_MSG.he : NETWORK_MSG.en);
export const serverMessage = (isHe) => (isHe ? SERVER_MSG.he : SERVER_MSG.en);

// The message to show for a caught error: the friendly network sentence, else the error's own text
// (the server's, already localised), else `fallback`.
export function friendlyError(err, isHe, fallback) {
  if (isNetworkError(err)) return networkMessage(isHe);
  const msg = err && err.message;
  if (msg && !/^(Unexpected token|JSON\.parse|The string did not match)/i.test(msg)) return msg;
  return fallback || serverMessage(isHe);
}

// fetch() that fails with an Error carrying `code: 'NETWORK'` and the friendly message.
export async function fetchOrNetworkError(fetchFn, url, options, isHe) {
  try {
    return await fetchFn(url, options);
  } catch (err) {
    if (err && err.name === 'AbortError') throw err;
    const e = new Error(networkMessage(isHe));
    e.code = 'NETWORK';
    e.status = 0;
    throw e;
  }
}

// The JSON body of a response, or {} when it is not JSON (a proxy's HTML error page).
export async function readJsonSafe(res) {
  try { return await res.json(); } catch { return {}; }
}
