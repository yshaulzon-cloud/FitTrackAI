# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

**Areto** — Hebrew fitness app (RTL). React + Vite SPA, Express/MongoDB API, Capacitor Android wrapper.
- Frontend: `https://app.digtal-c.co.il` (Wangus static host)
- Backend: `https://bodysync-api.onrender.com` (Render free tier — named under old brand, still active)
- Android: Google Play via signed AAB built with Gradle

---

## Development commands

### Run locally (two terminals)

```bash
# Terminal 1 — backend (port 3001)
cd server && node server.js          # or: npm run dev  (nodemon watch)

# Terminal 2 — frontend (port 5173)
cd client && npx vite
```

Vite proxies `/auth`, `/user`, `/workout`, `/nutrition` → `localhost:3001` automatically.

### Build & deploy

```bash
# Build frontend
cd client && npm run build           # → client/dist/

# Sync to Android (run from client/). Use npm run cap:sync — NOT bare
# `npx cap sync`: Capacitor 8 regenerates
# android/capacitor-cordova-android-plugins/build.gradle as an EMPTY file,
# which breaks the Gradle build ("No variants exist"). The wrapper runs the
# sync then restores the stub via scripts/fix-cordova-gradle.mjs.
npm run cap:sync

# Build the signed release AAB from the CLI (requires client/android/key.properties):
cd android && JAVA_HOME="/c/Program Files/Android/Android Studio/jbr" ./gradlew bundleRelease
#   → android/app/build/outputs/bundle/release/app-release.aab
# NOTE: use the JDK 21 bundled with Android Studio; the system JDK 25 is too
# new for this Gradle/AGP toolchain.

# ...or open in Android Studio instead: npx cap open android
#    then Build → Generate Signed Bundle/APK → release track
```

### Screenshot automation (Playwright)

```bash
# Requires both servers running first
node screenshot-photos3.mjs          # comprehensive — all screens → photos3/
node make-store-screenshots.mjs      # Hebrew Play Store assets → store-screenshots/
node make-store-screenshots-en.mjs   # English version
```

---

## Architecture

### Client (`client/src/`)

Single-page app with React Router. Five routes: `/welcome`, `/login`, `/register`, `/onboarding`, `/dashboard`.

**Context providers** (wrap the whole app):
- `AuthContext` — JWT in `localStorage`, `api()` helper pre-attached with `Authorization` header, Google Sign-In (native Capacitor plugin vs. web GIS popup auto-detected via `isCapacitorNative()`)
- `LanguageContext` — Hebrew/English toggle, persisted to `localStorage`; all UI strings live in the `t` object from `useLang()`
- `ThemeContext` — dark/light
- `LegalContext` — tracks which legal docs have been accepted

**Dashboard** (`pages/Dashboard.jsx`) is the entire authenticated app. It renders four mobile bottom-nav tabs: *היום* (overview), *אימון* (workout), *תזונה* (nutrition), *מסע* (progress/journey). Settings lives behind the topbar avatar chip. Desktop uses a wider sidebar-style layout with more tabs.

**Daily activity streak** is **server-authoritative** — it counts consecutive calendar days on which the user did something trackable (completed a workout, logged a meal, or logged sleep), *not* days the app was opened. It lives on the `Progression` doc (`currentStreak` / `lastActivityDate`) and only advances via `updateStreak()` in `server/utils/progression.js`; deletes recompute it via `recalcStreak()`. All day-boundary math is anchored to the **user's local midnight** through `profile.timezone` (IANA, default `Asia/Jerusalem`) using `server/utils/dates.js` — never the server's UTC clock. `GET /progression/status` reports the *live* streak (0 if the last activity is older than yesterday), so a lapsed streak never shows stale. The client (`Dashboard.jsx`) keeps a `areto_streak_cache` entry only so the topbar flame renders instantly before the server value arrives. The flame icon (`FlameIcon`) renders a Canvas particle simulation (Perlin fbm noise, additive blending) sized to 5 tiers based on streak count. Concurrent activity/delete requests are serialized per user via `server/utils/userLock.js` to keep the read-modify-write safe.

**Weekly body-prompt** banner (`bodyUpdateLastSeen` in `localStorage`) shows on the overview tab after 7 days of silence. First visit sets the key without showing the banner.

### Server (`server/`)

Express API, CommonJS modules. MongoDB via Mongoose.

**Routes:**
| Prefix | File | Purpose |
|--------|------|---------|
| `/auth` | `routes/auth.js` | register, login, Google OAuth, password reset |
| `/user` | `routes/user.js` | profile CRUD, measurements, settings |
| `/workout` | `routes/workout.js` | generated plan, log completion, history + streak |
| `/nutrition` | `routes/nutrition.js` | meal log, today summary, daily menu |
| `/progression` | `routes/progression.js` | XP, level, achievements |
| `/sleep` | `routes/sleep.js` | sleep log |
| `/admin` | `routes/admin.js` | admin-only user management |

**`server/utils/calculations.js`** — the core engine, all pure functions:
- `calculateTDEE` / `calculateCalorieTarget` / `calculateMacros` — Mifflin-St Jeor (default) or Katch-McArdle (when body-fat % is known)
- `generateWorkoutPlan` — builds a weekly split (push/pull/legs/upper-lower) from `profile.goal` + `profile.experience` + `workoutsPerWeek`
- `estimateNutrition` — 3-pass lookup against `FOOD_DB` (substring → prefix → Levenshtein fuzzy). Falls back to `estimateNutritionAI` (Claude API) when not found, then a generic 350 kcal placeholder
- `FOOD_DB` — large array of Hebrew/English keyed food entries with cal/protein/carbs/fat/fiber

**Nutrition logging flow:** `POST /nutrition/log` receives a free-text Hebrew description → `estimateNutrition()` → Claude API fallback → saves `Nutrition` document → triggers XP check.

**XP / Progression:** `server/utils/progression.js` awards XP for meal logs, workout completions, streaks; tracks levels and unlocks.

### Android (`client/android/`)

Capacitor shell wrapping `client/dist/`. Release signing uses `client/android/key.properties` (gitignored — see `key.properties.example`). SDK compiled against the version in `client/android/variables.gradle`.

Capacitor plugins in use: `SplashScreen`, `StatusBar`, `App` (back-button handler), `LocalNotifications`, `@capacitor-mlkit/barcode-scanning`, `@codetrix-studio/capacitor-google-auth`.

Local notifications are scheduled via `client/src/lib/notifications.js` — no-ops on web, active on Android.

---

## Environment variables

Server requires a `.env` in `server/`:

```
MONGODB_URI=          # MongoDB Atlas connection string (database: fittrack-ai)
JWT_SECRET=           # Long random string
ANTHROPIC_API_KEY=    # Used only for AI fallback in estimateNutritionAI()
EMAIL_USER=           # Gmail address for password-reset emails
EMAIL_PASS=           # Gmail 16-char app password
CORS_ORIGIN=          # Comma-separated production origins (blank = allow all in dev)
GOOGLE_CLIENT_ID=     # 674273831957-r79t2lo52fpddlairlldu9gvihkjvf7h.apps.googleusercontent.com
```

Client build requires `VITE_API_URL` set to the production API base URL for non-dev builds.

---

## Key conventions

- All user-facing strings must exist in both Hebrew and English (`isHe ? '...' : '...'`); never hardcode one language.
- The app is mobile-first RTL. CSS uses `inset-inline-start/end` (logical properties) for RTL-safe positioning.
- `api()` from `AuthContext` is the standard way to make authenticated calls from the client — it handles the `Authorization` header and re-throws on non-OK responses.
- Food entries added to `FOOD_DB` need both Hebrew and English `keys`; order matters — more specific entries must come before generic catch-alls.
- The Anthropic API (`@anthropic-ai/sdk`) is a server-side-only dependency; never import it in client code.
