# Areto — Deployment Runbook (Stage 1: Web)

> Note: the Render service URL (`bodysync-api*.onrender.com`) and the contact Gmail (`bodysync11@gmail.com`) below were set up under the previous app name. They still work and are documented here as-is. Renaming them requires creating a new Render service and a new Gmail address — see the bottom of this doc.


End state:
- Backend running on Render (free tier) at `https://bodysync-api.onrender.com`
- Frontend running on Wangus at `https://app.digtal-c.co.il`
- WordPress at `https://digtal-c.co.il` unchanged

---

## A. MongoDB Atlas (database)

You already have an Atlas URI in the original `render.yaml`. To verify it still
works (or create a new one):

1. Go to [https://cloud.mongodb.com](https://cloud.mongodb.com) and sign in.
2. Create / open the cluster → **Network Access** → add `0.0.0.0/0` (allow from anywhere).
3. **Database Access** → user with read/write to the `fittrack-ai` database.
4. **Connect → Drivers** → copy the connection string. It looks like:
   ```
   mongodb+srv://<user>:<password>@<cluster>.mongodb.net/fittrack-ai?retryWrites=true&w=majority
   ```
5. Save this string — you'll paste it into Render in the next step.

---

## B. Backend → Render (free tier)

1. Push the repo to GitHub (private repo is fine).
2. Go to [https://dashboard.render.com](https://dashboard.render.com) → **New → Blueprint**.
3. Connect the GitHub repo. Render reads `render.yaml` automatically.
4. The first deploy will pause asking for the secret env vars. Set them now:
   - `MONGODB_URI` → the Atlas string from step A.5
   - `JWT_SECRET` → any long random string (`openssl rand -hex 64`)
   - `GOOGLE_CLIENT_ID` → the Web OAuth client ID used for Google Sign-In (Google Cloud Console → APIs & Services → Credentials)
   - `RESEND_API_KEY` → Resend → API Keys → Create API Key, permission **Sending access**, limited to your verified domain. Password-reset codes go out through Resend over HTTPS, because Render's free tier blocks SMTP. (Gmail / `EMAIL_USER` / `EMAIL_PASS` are no longer used.)
   - `EMAIL_FROM` → a sender on that Resend-verified domain, e.g. `Areto <no-reply@digtal-c.co.il>`

   The sending domain must show **Verified** in Resend before mail is delivered: add the DKIM TXT (`resend._domainkey`) and the `send` MX + SPF TXT records Resend lists to the domain's DNS zone. Do not add Resend's optional root (`@`) MX if the domain already has mail.
5. Click **Apply**. First build takes ~3 minutes.
6. Once status is **Live**, copy the URL — likely `https://bodysync-api.onrender.com`.
7. Smoke test:
   ```bash
   curl https://bodysync-api.onrender.com/health
   # → {"status":"ok","timestamp":"..."}
   ```

### Free-tier behavior to be aware of

- Service sleeps after **15 min** of no traffic.
- First request after sleep takes **30–50 seconds** to respond.
- Upgrade to **Starter ($7/mo)** later from the Render dashboard with one click — no code change.

---

## C. Frontend → Vangus subdomain (`app.digtal-c.co.il`)

The hosting company is spelled "Wangus" elsewhere in this repo; its panel is Plesk at `vangus.io`. **The web client is not deployed by git or by Render.** Pushing to `master` only redeploys the API; the web build has to be uploaded by hand (C.4). Until that is done the site keeps serving the old build.

### C.1 The subdomain (already exists)

`app.digtal-c.co.il` lives in the Vangus Plesk panel (`https://c6.vangus.io:8443`) as its own entry under **אתרי אינטרנט ודומיינים** (Websites & Domains), with its own site folder `app.digtal-c.co.il` and working HTTPS. The same Plesk subscription hosts other, unrelated sites: only ever use the **File Manager** button of the `app.digtal-c.co.il` entry and never touch the others. If the subdomain ever has to be recreated, add `app` under `digtal-c.co.il` in that panel and make sure SSL is enabled for it.

### C.2 The API URL in `client/.env.production`

`client/.env.production` already points at the live API:
```
VITE_API_URL=https://bodysync-api-admm.onrender.com
```
Keep the `-admm` suffix: the bare `bodysync-api.onrender.com` does not exist. If you recreate the Render service, put its URL from step B.6 here before building.

### C.3 Build the frontend

From the project root:
```bash
cd client
npm run build       # produces client/dist/
```

Do not run `npm install` inside this project folder on the owner's I: drive: it corrupts `node_modules`. Install on a copy on the C: drive and copy `node_modules` back.

`dist/` contains:
- `index.html`, `privacy.html`, `delete-account.html`, `logo.png`, `streak-logo.png`
- `assets/` with hashed files (`index-XXXX.js`, `index-XXXX.css`, `web-XXXX.js`)
- `exercise-videos/` (about 150 MB, never changes between releases)
- `.htaccess` (copied from `public/`; already on the host)

### C.4 Upload to Vangus (Plesk File Manager)

A normal release changes only `index.html` and a few hashed files in `assets/`. Do not re-upload all of `dist/`.

1. Plesk → **אתרי אינטרנט ודומיינים** → the `app.digtal-c.co.il` entry → **File Manager**. It opens the site's root folder.
2. Find out which `assets/` files are missing on the host. The host answers HTTP 200 with `index.html` for **any** path that does not exist, so a 200 proves nothing. Compare the `Content-Type` (`application/javascript` or `text/css` means it exists, `text/html` means it does not) or a hash:
   ```bash
   curl -s -o /dev/null -w "%{http_code} %{content_type}\n" https://app.digtal-c.co.il/assets/<file>
   ```
3. Save the current `index.html` first, so you can roll back: `curl -s https://app.digtal-c.co.il/ -o index.html.bak`.
4. Open `assets/` → **הוספת קובץ חדש** (Add new file) → **העלה קובץ** (Upload file) and pick every missing file from `client/dist/assets/` (several at once is fine). Leave the old hashed files where they are: they make a rollback trivial.
5. Go up one level and upload `privacy.html` / `delete-account.html` only if they changed. `.htaccess` only if `client/public/.htaccess` changed.
6. Upload `index.html` **last**, so the page never points at assets that are not there yet.
7. When a file already exists, Plesk asks **להחליף את הקבצים הקיימים?** (Replace the existing files?). Click **החלף** (Replace). The dialog is easy to miss, and if it is left open the old file silently stays.

**Rollback:** upload the saved old `index.html` (and `privacy.html` if it was replaced). The old `assets/` files are still on the host.

### C.5 Verify

First check that the host serves exactly what you built:
```bash
curl -s https://app.digtal-c.co.il/ | sha256sum    # must equal: sha256sum client/dist/index.html
```

Then visit `https://app.digtal-c.co.il` in a browser (hard refresh with Ctrl+Shift+R):
- Splash screen should appear with the Areto logo.
- After ~2 seconds, the Login page should render.
- Try logging in. If you get a CORS error, check that:
  - `CORS_ORIGIN` on Render = `https://app.digtal-c.co.il` (exactly, no trailing slash)
  - The Render service has been redeployed since you set that env var

### C.6 First user note

Backend is on Render Free tier, so the **very first login of the day** will hang ~45 seconds while the server wakes. Subsequent users (within 15 minutes) get instant response. This is expected.

---

## D. Add a CTA on WordPress

In Elementor, add a button on your homepage / menu:
- Label: "כניסה לאפליקציה"
- Link: `https://app.digtal-c.co.il`
- Target: same window (better UX than new tab on mobile)

That's it. The app is now reachable from your main site.

---

## E. Updates going forward

When you want to push a frontend change:
```bash
cd client
npm run build
# then upload the changed files by hand: see C.4 (Plesk File Manager), verify with C.5
```

When you push backend changes to GitHub, Render redeploys automatically. It does **not** deploy the web client.

---

## F. Troubleshooting

**"CORS blocked" in browser console**
→ Check `CORS_ORIGIN` env var on Render exactly matches the subdomain URL (no trailing slash, https not http).

**Login button does nothing / network error**
→ Open browser DevTools → Network tab → look at the failed request. If it's hitting `localhost:3001`, the build wasn't done with `.env.production`. Rebuild and re-upload.

**Page refreshes return a blank page or 404**
→ `.htaccess` didn't upload. Re-upload it explicitly. Or your hosting has Apache rewrites disabled — contact Wangus support.

**Site loads but assets (JS/CSS) 404**
→ The path inside `index.html` is wrong. Make sure you uploaded the `assets/` folder along with `index.html`.

**Blank page, and the browser console complains about a JS/CSS file with MIME type `text/html`**
→ `index.html` points at a hashed file in `assets/` that was not uploaded. The host answers `index.html` (HTTP 200) for a missing file instead of a 404. Upload the missing file (see C.4) or put the previous `index.html` back.

**The site still shows the old version after a deploy**
→ Check what the host really serves: `curl -s https://app.digtal-c.co.il/ | grep -o 'assets/[^"]*'` and compare with `client/dist/index.html`. If they differ, `index.html` was not replaced (the replace dialog in C.4 step 7 was missed).

**Render deploy fails**
→ Check the build log for the missing env var name. Set it in Render dashboard → Environment.

**Render free tier is too slow**
→ Upgrade to Starter ($7/mo) in one click. No code change needed.
