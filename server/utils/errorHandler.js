// The Express error handler, kept free of the app so it can be tested.
//
// A client mistake that Express / body-parser already knows the status of (malformed JSON → 400,
// body over the 1 MB limit → 413, an origin the CORS list refuses → 403) must be answered with
// that status. It used to become "500 Internal server error" plus a stack trace in the log, so
// anyone could fill the log and the error monitoring with junk requests, and a real outage was
// indistinguishable from a bad request. Only genuine server errors are 500 and are logged.
function statusOf(err) {
  const s = Number(err && (err.status || err.statusCode));
  if (s >= 400 && s < 500) return s;
  if (err && typeof err.message === 'string' && err.message.startsWith('CORS blocked')) return 403;
  // JSON nested deeper than the parser's stack ("[[[[…" × 100 000): body-parser only wraps SyntaxError,
  // so this RangeError would otherwise be a 500 caused entirely by the request.
  if (err instanceof RangeError && /call stack/i.test(err.message)) return 400;
  return 500;
}

const MESSAGES = {
  400: ['Invalid request', 'בקשה לא תקינה'],
  403: ['Origin not allowed', 'המקור אינו מורשה'],
  413: ['Request too large', 'הבקשה גדולה מדי'],
};

function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  const status = statusOf(err);
  if (status === 500) {
    console.error(err && err.stack ? err.stack : err);
    return res.status(500).json({ message: 'Internal server error', messageHe: 'שגיאת שרת פנימית' });
  }
  const [en, he] = MESSAGES[status] || MESSAGES[400];
  return res.status(status).json({ message: en, messageHe: he });
}

module.exports = { errorHandler, statusOf };
