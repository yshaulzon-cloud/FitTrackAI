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
   - `ANTHROPIC_API_KEY` → from [https://console.anthropic.com](https://console.anthropic.com) (used for AI meal estimation; optional — without it the app falls back to defaults)
   - `EMAIL_USER` → `bodysync11@gmail.com` (or your own Gmail)
   - `EMAIL_PASS` → 16-char Gmail app password (Google account → Security → 2FA → App passwords)
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

## C. Frontend → Wangus subdomain

### C.1 Create the subdomain in Wangus cPanel

1. Log in to your Wangus control panel.
2. **Subdomains** → create `app` under `digtal-c.co.il`.
3. Set the document root to something like `/public_html/app/`.
4. Wangus will provision SSL automatically (Let's Encrypt). Verify in
   **SSL/TLS Status** that the new subdomain has a green lock.

### C.2 Update the Render URL in `client/.env.production`

Open `client/.env.production` and replace the placeholder:
```
VITE_API_URL=https://bodysync-api.onrender.com
```
with your actual Render URL from step B.6.

### C.3 Build the frontend

From the project root:
```bash
cd client
npm install         # only first time
npm run build       # produces client/dist/
```

You should see `dist/` containing:
- `index.html`
- `logo.png`
- `assets/index-XXX.js` and `assets/index-XXX.css`
- `.htaccess` (auto-copied from `public/`)

### C.4 Upload `dist/` to Wangus

Two options:

**Option 1 — File Manager (cPanel):**
1. cPanel → **File Manager** → `/public_html/app/`
2. Delete anything that's there (except `.well-known/` if it exists for SSL).
3. Upload all contents of `client/dist/` (drag-and-drop the **contents**, not the folder itself).
4. Make sure `.htaccess` is included — File Manager hides dotfiles by default; toggle "Show Hidden Files" in Settings.

**Option 2 — FTP (faster for repeated deploys):**
1. Get FTP credentials from cPanel → **FTP Accounts**.
2. Use FileZilla → connect → upload contents of `client/dist/` to `/public_html/app/`.

### C.5 Verify

Visit `https://app.digtal-c.co.il` in a browser:
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
# upload client/dist/ contents to /public_html/app/ via FTP
```

When you push backend changes to GitHub, Render redeploys automatically.

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

**Render deploy fails**
→ Check the build log for the missing env var name. Set it in Render dashboard → Environment.

**Render free tier is too slow**
→ Upgrade to Starter ($7/mo) in one click. No code change needed.
