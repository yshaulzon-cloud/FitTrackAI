// helmet + CORS + the global rate limiter, kept out of server.js so the real stack can be tested.
//
// ORDER MATTERS: CORS comes BEFORE the limiter. The limiter used to be first, so its 429 carried no
// Access-Control-Allow-Origin header: the browser reported a "CORS error" and the app looked broken
// instead of saying "try again in a minute" (QA finding Q4).
//
// The limiter counts per signed-in USER when the request carries a valid token, and per IP otherwise.
// Per IP alone, several users behind one mobile-carrier NAT (or one office) shared 120 requests a
// minute. A token only counts after jwt.verify succeeds (HS256, 24-hex userId), so a forged or random
// token cannot be used to pick a fresh bucket and dodge the limit: it falls back to the IP bucket.
const jwt = require('jsonwebtoken');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = rateLimit;

function limiterKey(req) {
  const h = req.headers && req.headers.authorization;
  if (typeof h === 'string' && h.startsWith('Bearer ') && process.env.JWT_SECRET) {
    try {
      const { userId } = jwt.verify(h.slice(7), process.env.JWT_SECRET, { algorithms: ['HS256'] });
      if (typeof userId === 'string' && /^[a-f0-9]{24}$/i.test(userId)) return `user:${userId}`;
    } catch { /* not a valid token: count it against the IP */ }
  }
  return `ip:${ipKeyGenerator(req.ip || '')}`;
}

const NATIVE_ORIGINS = ['capacitor://localhost', 'https://localhost', 'http://localhost'];

function corsMiddleware(allowlistEnv = process.env.CORS_ORIGIN) {
  const corsAllowlist = (allowlistEnv || '').split(',').map((o) => o.trim()).filter(Boolean);
  if (corsAllowlist.length === 0 && process.env.NODE_ENV === 'production') {
    console.warn('WARNING: CORS_ORIGIN is empty in production — every origin is allowed. Set it on the host.');
  }
  return cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);              // curl/same-origin
      if (corsAllowlist.length === 0) return callback(null, true); // dev mode
      const allowed = [...corsAllowlist, ...NATIVE_ORIGINS];
      if (allowed.includes(origin)) return callback(null, true);
      // Allow subdomains of an allowlisted host only — match against the origin's *parsed*
      // hostname with a leading-dot suffix check, so an allowlist of "example.com" does not
      // match "evilexample.com".
      let originHost;
      try { originHost = new URL(origin).hostname; }
      catch { return callback(new Error(`CORS blocked: ${origin}`)); }
      const ok = allowed.some((o) => {
        let allowHost;
        try { allowHost = new URL(o).hostname; } catch { return false; }
        return originHost === allowHost || originHost.endsWith('.' + allowHost);
      });
      if (ok) return callback(null, true);
      return callback(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
  });
}

function globalLimiter(max = 120) {
  return rateLimit({
    windowMs: 60 * 1000,
    max,
    keyGenerator: limiterKey,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many requests', messageHe: 'יותר מדי בקשות, נסה שוב עוד דקה' },
  });
}

// GLOBAL_RATE_LIMIT_MAX exists only so the local test servers can raise the limit; it is unset in production.
function applyBaseMiddleware(app, { limitMax = Number(process.env.GLOBAL_RATE_LIMIT_MAX) || 120, corsOrigin } = {}) {
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", 'https://accounts.google.com', 'https://apis.google.com'],
        frameSrc: ["'self'", 'https://accounts.google.com'],
        connectSrc: ["'self'", 'https://accounts.google.com', 'https://oauth2.googleapis.com', 'https://www.googleapis.com'],
        imgSrc: ["'self'", 'data:', 'https://lh3.googleusercontent.com'],
        styleSrc: ["'self'", "'unsafe-inline'"],
      },
    },
  }));
  app.use(corsMiddleware(corsOrigin));
  app.use(globalLimiter(limitMax));
}

module.exports = { applyBaseMiddleware, limiterKey, corsMiddleware, globalLimiter };
