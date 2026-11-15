# Preview Harness (dev only)

A local preview environment for the Areto app. It runs the **real app** — the
exact code that ships in the APK — inside a phone frame, with a control sidebar
that drives it. Not a mock, not a copy.

> Areto is a Capacitor app: on Android, `MainActivity` is an empty
> `BridgeActivity` and the whole app is the React bundle in a WebView. So "the
> real Android code" *is* this React app. There is no native layer to mirror in
> software — the optional real-device mode (step B) uses scrcpy against an
> emulator/device for that.

## Run

```bash
# from client/ , with the API running (server/ node server.js)
npm run dev
# then open:
http://localhost:5173/preview.html
```

## How it stays out of production

- `preview.html` is a separate Vite entry. `vite build` only bundles
  `index.html` (pinned in `vite.config.js`), so the harness is served in dev but
  never built.
- `src/preview/**` is never statically imported by the app. The in-app bridge is
  pulled in from `main.jsx` via a `import.meta.env.DEV`-guarded dynamic import,
  which folds to `null` in production and is tree-shaken away.
- `isolation.test.mjs` builds the bundle and fails if any harness string
  survives — the guarantee is enforced, not just intended.

## Architecture

```
preview.html ─► src/preview/main.jsx ─► PreviewApp
                                          ├─ PhoneFrame ─► <iframe src="/…">  ← the real app
                                          └─ sidebar sections ─┐
                                                               │ commands / same-origin ops
   ┌───────────────────────────────────────────────────────────┘
   ▼
useHarnessBridge (host side)
   • postMessage command channel  ◄──►  PreviewBridge (mounted inside the app, dev-only)
   • same-origin helpers: applyToken / clearStorage / runInApp / openScreen / setFlag
   • fetch·console·error taps  → logs / network / crash panels
   • fetch stub table          → fake-data injection
```

The bridge only ever calls what the app already exposes (router, ThemeContext,
LanguageContext, AuthContext) — no app logic is duplicated.

## Sections

| Section | What it does | How |
|---|---|---|
| Users & data | switch personas, demo data, reset, logout, clear storage/cache | real `/auth`,`/user`,`/workout`,`/nutrition`,`/sleep` endpoints + token injection |
| Screens | jump to any tab / settings sub-screen | operates the real app DOM (same-origin clicks) |
| Feature flags | toggle real `a11y:*` / `intro-seen` keys, force body banner | writes the app's own localStorage + reload |
| Observability | live logs / network / crashes | host-side taps on the iframe's console/fetch/errors |
| Fake data | empty / extreme / error states per endpoint | fetch stub table short-circuits matching requests |
| Capture | PNG screenshot + WEBM recording of the phone | getDisplayMedia → canvas crop to the phone rect |
| Device mode | live mirror of a **real** connected phone + launch / nav / tap | adb via the device bridge (see below) |

## Device mode (path B — real hardware)

Toggle "מצב מכשיר → מכשיר אמיתי" to swap the web iframe for a live view of a
physically connected Android device.

```bash
# separate terminal, with a phone on USB (debugging enabled):
npm run device-bridge          # localhost:8787, shells out to adb
```

- **Bridge**: `scripts/device-bridge.mjs` — a localhost-only HTTP server that
  streams `adb screencap` frames and forwards taps / keys / app-launch to the
  phone. adb path defaults to `C:/android-sdk/platform-tools/adb.exe`
  (`ANDROID_ADB` env to override).
- **View**: ~2 fps screencap mirror embedded in the phone frame. Clicking the
  frame maps to a real `input tap` at device pixels.
- **Smooth video**: for fluid real-time, run `scrcpy` in a terminal (its own
  window); the embedded mirror is the interactive, in-page one.
- **Input caveat**: some ROMs (MIUI / Android 16) block `adb input` until
  "USB debugging (Security settings)" is also enabled in developer options.
  Screen view and app-launch work regardless; tap/keys need that toggle. The
  UI surfaces this when a control is blocked.

## Test personas

Stable, namespaced accounts (`preview-*@areto.local`, password `Preview123!`)
created on demand and reused across runs. Delete them from the sidebar when done.
