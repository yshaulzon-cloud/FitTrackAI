# Areto · Android / Google Play Deployment Runbook

> Status: the React app builds with `npm run build` and syncs to the
> Capacitor Android project (`client/android/`). Release signing is
> wired into `android/app/build.gradle` but needs a `key.properties`
> file with the keystore credentials, an installed Android SDK, and
> a Google Cloud OAuth client for Sign-In-with-Google on native.

---

## A. One-time setup on this machine

### A.1 Install Android Studio (the easiest path)

Download from <https://developer.android.com/studio>. The installer
also installs:
- Android SDK
- `adb` (debug bridge — needed to test on a real phone)
- Bundled JDK (you already have Eclipse Adoptium 25, which also works)

After install, open Android Studio once and let it download the
SDK Platform that matches `compileSdkVersion` in
`client/android/variables.gradle`.

### A.2 Set `ANDROID_HOME` (PowerShell)

```powershell
[System.Environment]::SetEnvironmentVariable(
  'ANDROID_HOME',
  "$env:LOCALAPPDATA\Android\Sdk",
  'User'
)
```

Open a new terminal and confirm: `echo $env:ANDROID_HOME` should
print a path that exists.

---

## B. Configure release signing

The keystore already exists at:

```
C:\Users\avisb\FitTrackAI\keystores\fitvora-release.keystore
```

### B.1 Create `client/android/key.properties`

Copy `client/android/key.properties.example` to
`client/android/key.properties` and fill in your real values. The
file is gitignored, so it stays on your machine only.

You need four values:

| Key             | What it is                                              |
| --------------- | ------------------------------------------------------- |
| `storeFile`     | Absolute path to the keystore (use forward slashes)     |
| `storePassword` | Password you set when you created the keystore         |
| `keyAlias`      | The alias inside the keystore (probably `fitvora` or `areto`) |
| `keyPassword`   | Password for that alias (often same as `storePassword`)|

### B.2 Confirm the alias if you've forgotten it

```powershell
keytool -list -keystore "C:\Users\avisb\FitTrackAI\keystores\fitvora-release.keystore"
```

Enter the keystore password when prompted. The output lists each
alias (the line starting with the alias name).

---

## C. SHA-1 fingerprints (for Google Sign-In on Android)

The Capacitor Google-Auth plugin validates the calling app against
OAuth clients registered in Google Cloud Console. Each Android
OAuth client is bound to a specific `(package name, SHA-1)` pair.

### C.1 Release SHA-1 (for production)

```powershell
keytool -list -v `
  -keystore "C:\Users\avisb\FitTrackAI\keystores\fitvora-release.keystore" `
  -alias <YOUR_ALIAS>
```

Look for the line `SHA1:` in the output (40-char hex with colons).

### C.2 Debug SHA-1 (for `npx cap run android` builds)

```powershell
keytool -list -v `
  -keystore "$env:USERPROFILE\.android\debug.keystore" `
  -alias androiddebugkey -storepass android -keypass android
```

If `.android/debug.keystore` doesn't exist yet, build any debug APK
once (via Android Studio or `cd client/android && .\gradlew assembleDebug`)
and Android will create it.

### C.3 Register both fingerprints in Google Cloud Console

1. <https://console.cloud.google.com> → APIs & Services → Credentials
2. **Create Credentials → OAuth client ID → Android**
3. Package name: `com.areto.app`
4. SHA-1: paste the release fingerprint
5. (Repeat with the debug fingerprint if you want to test sign-in
   from `npx cap run android` builds)
6. Save

You already have the **Web** OAuth client
(`674273831957-r79t2lo52fpddlairlldu9gvihkjvf7h.apps.googleusercontent.com`)
which the plugin uses as its audience — don't remove it.

---

## D. Build the AAB

From the project root (after setup A + B):

```powershell
cd client
npm run build              # produces dist/
npx cap sync android       # copies dist into android/app/src/main/assets/public/
cd android
.\gradlew bundleRelease
```

Output: `client/android/app/build/outputs/bundle/release/app-release.aab`.

This is the file Google Play accepts.

---

## E. Google Play Console

### E.1 Developer account ($25 one-time)

<https://play.google.com/console>. Requires a Google account, a
phone number for verification, and a government ID.

### E.2 Create the app

- App name: **Areto**
- Default language: עברית (Hebrew - Israel) — or English depending
  on your target market
- App or game: App
- Free or paid: Free
- Declarations: accept guidelines and US export laws

### E.3 Store listing

| Field              | What you need                                          |
| ------------------ | ------------------------------------------------------ |
| Short description  | Up to 80 chars                                         |
| Full description   | Up to 4,000 chars                                      |
| App icon           | 512×512 PNG (use `client/assets/icon-only.png` resized)|
| Feature graphic    | 1024×500 PNG (banner shown at the top of the listing) |
| Phone screenshots  | At least 2, ideally 4–8 (1080×1920 or so)              |
| Privacy policy URL | Required — must be a real public URL, not in-app text |
| Contact email      | Required                                               |
| Category           | Health & Fitness                                       |

**Privacy policy:** the in-app `LegalModal` is enough text, but
Play Store requires a public URL. Cheapest path: paste it into a
static `privacy.html` and upload to Wangus at
`https://app.digtal-c.co.il/privacy.html`. Use that URL.

### E.4 Required questionnaires

Play Console will block submission until you've answered:

- **Data safety** — what data you collect, why, whether you share
  with third parties. (You collect email + profile + activity logs;
  no third-party sharing per your current privacy policy.)
- **Content rating** — short questionnaire → Pegi/ESRB rating
- **Target audience** — adults / health & fitness
- **Government apps**, **News apps**, **COVID-19** — answer "no" to
  each unless applicable

### E.5 Upload the AAB → testing tracks

Go to **Testing → Internal testing** first. Add a few test emails,
upload `app-release.aab`, and roll out. Internal testing is
**instant** — no Play review. Test sign-in, the daily menu, the
workout flow, push notifications, etc. on a real device.

Move to **Closed testing** for a wider group (still no full Play
review, but you can have many testers).

When ready, promote the AAB to **Production**. First production
submission goes through Play review — typically 1–7 days.

---

## F. Pre-launch checklist (don't skip)

- [ ] Open the AAB on a real phone via Internal testing and verify:
  - [ ] App opens, shows the Areto splash, lands on login
  - [ ] Google sign-in popup appears and completes (this is where
        the SHA-1 must match)
  - [ ] Email/password sign-in works
  - [ ] Onboarding wizard advances through all 4 steps and saves
  - [ ] Bottom nav: every tab loads
  - [ ] Logging a meal succeeds (or shows "not in DB" if invalid)
  - [ ] "Finish workout" FAB logs a workout
  - [ ] Notifications appear at the configured times (if enabled)
- [ ] `versionCode` and `versionName` in `android/app/build.gradle`
      are bumped every time you upload a new AAB (Play rejects
      duplicate versionCodes)
- [ ] Keystore is backed up to a password manager or encrypted
      cloud storage. **If you lose this file, you can never publish
      an update to the same app on the same Play listing.**

---

## G. What happens if Sign-In-with-Google fails on Android

Most common cause: the SHA-1 of the keystore that built the APK
doesn't match any Android OAuth client in Google Cloud Console.
Re-run section C to confirm both the release and debug fingerprints
are registered with package name `com.areto.app`.

Second most common: Play Store re-signs uploaded AABs with their
own **upload key** (Play App Signing). The SHA-1 of the
*upload key* and the SHA-1 of the *app signing key* are different —
Play shows both under **Setup → App signing**. Add **both** as
Android OAuth clients in Google Cloud Console.
