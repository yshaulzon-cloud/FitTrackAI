# ביקורת אבטחה, סבב 2

תאריך: 2026-11-18. ממשיך את [`security-audit.md`](security-audit.md) (2026-11-08, קריאת קוד בלבד). הפעם נוספו בדיקות דינמיות, `npm audit`, בדיקת היסטוריית git, בדיקת Android ו-AAB, ובדיקות פסיביות של הייצור.

## איך נבדק (וגבולות הבדיקה)

- **בדיקות דינמיות רק מול `localhost`.** `server/.env` מצביע ל-Atlas של הייצור, ולכן השרת הורץ דרך `server/scripts/local-isolated-server.mjs`: מסד MongoDB בזיכרון, סוד JWT חד-פעמי, בלי שליחת מייל. הסקריפט `server/scripts/security-local-tests.mjs` מסרב לרוץ מול כתובת שאינה localhost. הרצה אחרונה: **42 עברו, 2 נכשלו, 3 מידעיות** (שני הכשלים הם ממצאים מתועדים ולא תוקנו בכוונה, ראו S12 ו-S13).
- **מול הייצור רק קריאה פסיבית:** `GET /health`, בקשה אחת עם כותרת `Origin` זרה, `curl -I` ללקוח, שאילתת DNS ו-GitHub API קריאה בלבד. לא נשלחה אף בקשה שמשנה מצב, לא נוסו סיסמאות או אסימונים, ולא נעשה חיבור לאף מסד נתונים.
- הערך הסודי שנמצא בהיסטוריית git (S1) **לא הודפס ולא נוסה**.

## סטטוס שמונת הסעיפים

| # | סעיף | סטטוס | עיקר הממצא |
|---|---|---|---|
| 1 | הרשאות (כל ה-route, IDOR, אסימונים, admin) | **נבדק** | כל 30 ה-route המוגנים מחזירים 401 עם: בלי אסימון, זבל, פג תוקף, סוד שגוי, `alg:none` (גם `NONE`), payload ששונה, `userId` כאובייקט, משתמש שלא קיים. משתמש רגיל ב-`/admin/*` ← 403. משתמש B לא יכול למחוק מדידה / ארוחה / אימון של A (404, והנתונים נשארו). אסימון של חשבון שנמחק ← 401. `/user/preview-plan` פתוח בכוונה (תצוגת תוכנית לפני הרשמה, יש לו מגבלת קצב). תוקנו: אלגוריתם לא מוצמד, `userId` לא מאומת (S10) |
| 2 | קלט (mass-assignment, גבולות, NoSQL, ReDoS) | **נבדק** | `isAdmin`, `email`, `password`, `userId`, `date`, `totalVolume`, `caloriesBurned`, `__proto__` ב-register, PUT profile, onboarding, workout, nutrition, sleep, measurements: נתעלמו. אופרטורי NoSQL ב-login / forgot / reset ובמחרוזת השאילתה ← 400. גופים עצומים, מערכים של 5000, ערכים כמו 1e308 ← 4xx. `estimateNutrition` על 15 קלטים עוינים של עד 500 תווים: **פחות מ-1 מילישנייה לכל קריאה**, אין ReDoS. תוקנו: JSON עמוק מדי ← 500 (S9), סיסמה בלי תקרה (S11) |
| 3 | auth (קיום משתמש, קצב, איפוס, Google, סוד) | **נבדק חלקית** | login: אותה הודעה וסטטוס לסיסמה שגויה ולמייל לא קיים (אבל זמן תגובה שונה: ~350 מ"ש מול ~10, ראו S12). מגבלות קצב: login ← 429 אחרי 10, forgot אחרי 5, reset אחרי 15. קוד איפוס (6 ספרות, sha256, 10 דקות) מתבטל אחרי 5 ניחושים שגויים גם מכתובות IP משתנות. `/auth/google` דוחה אסימון מזויף, והקוד בודק `audience`. **לא נבדק:** חוזק `JWT_SECRET` בייצור (ראו צעדים ידניים) |
| 4 | תלויות (`npm audit`) | **נבדק** | ראו S2 עד S7: כל ממצא סווג ל״נגיש בייצור״ או ״כלי בנייה בלבד״ |
| 5 | לקוח (XSS, `window.open`, localStorage) | **נבדק** | אין `dangerouslySetInnerHTML` / `innerHTML` / `eval`. `window.open` רק לכתובות YouTube בנויות מקבועים, ולהדפסת התפריט (`document.write` של HTML שנבנה מטקסט תפריט ללא escape: אין מקור לא מהימן היום, ראו S14). אין ניווט שמונע מפרמטר URL. ב-localStorage: `token` (JWT, 7 ימים), העדפות ומטמונים בלבד |
| 6 | Android (Manifest, רכיבים, AAB) | **נבדק (קוד + AAB קיים)** | `allowBackup=false`, תעבורת cleartext חסומה, רכיב exported יחיד (`MainActivity`, ה-launcher), `FileProvider` לא exported, אין `debuggable`, ב-WebView של ההדפסה JavaScript כבוי. ב-AAB 1.3.5 (627 קבצים): **אין** `.env`, keystore, `key.properties`, קבצי harness של `src/preview` או סודות; יש רק `proguard.map` (תקין). **לא נבדק על מכשיר** |
| 7 | סודות בהיסטוריית git | **נבדק (קריאה בלבד)** | קבצי סוד (`.env`, keystore, `key.properties`) מעולם לא נכנסו. אבל **נמצאה מחרוזת חיבור אמיתית ל-Atlas בקומיט ישן, והריפו ציבורי** (S1) |
| 8 | `data-inventory.md` מול `privacy.html` | **נבדק** | מתאימים: Resend, Google Sign-In, Google Fonts, Render, Atlas, Wangus, שינה, מדידות, אזור זמן, מחיקת חשבון, ללא AI ובלי ייצוא נתונים (המדיניות מבטיחה עריכה, איפוס ומחיקה בלבד). נוסף ל-inventory המפתח המקומי החדש `areto:sleepAdvice:choice`. אין צורך בשינוי ב-`privacy.html` או ב-Data Safety |

## ממצאים

| # | חומרה | קובץ:שורה | איך שוחזר / נמצא | תיקון או סטטוס |
|---|---|---|---|---|
| **S1** | **גבוה ← נסגר (2026-11-19)** | היסטוריית git: `render.yaml` בקומיט `75f6fd8` (2026-04-21) | `git log --all -G` על דפוסי סודות. הקומיט כולל מחרוזת חיבור `mongodb+srv://` עם שם משתמש וסיסמה של אשכול Atlas **ישן** (לא האשכול הנוכחי, `bodysync`). הריפו ב-GitHub **ציבורי** (`api.github.com`: `private=false`). שאילתת DNS SRV פסיבית לאשכול הישן **עדיין מחזירה כתובות**, כלומר ייתכן שהאשכול קיים. לא נוסה חיבור **נסגר (2026-11-19), באישור המשתמש:** האשכול הישן נמצא בחשבון Atlas נפרד (מושהה מאז אוגוסט 2026, בלי חיבורים). משתמש ה-DB היחיד בו הוא בדיוק שם המשתמש מהקומיט (הושווה לפי טביעת SHA-256, בלי להדפיס), והוא **נמחק** ב-Database Access; רשימת המשתמשים בפרויקט ריקה. הסיסמה עדיין כתובה בהיסטוריה הציבורית אבל אין מאחוריה משתמש. **לא בוצע:** מחיקת האשכול הישן עצמו (מחיקת נתונים לצמיתות) וכתיבה מחדש של ההיסטוריה (`git filter-repo` ו-force push, הרסני); שתיהן החלטה של הבעלים |
| **S2** | **קריטי ← תוקן בקוד, לא אומת על מכשיר** | `client/package.json` (`@capacitor/android`) | `npm audit`: GHSA-rvm3-566m-v7fv (CVSS 9.3), נתיב ה-proxy הפנימי של Capacitor נטען במקור האפליקציה. גרסה מותקנת 8.3.3 (פגיעה: ≤ 8.3.4). **תנאי ניצול:** המשתמש לוחץ על קישור זדוני בתוך ה-WebView; באפליקציה אין תוכן משתמש עם קישורים, ולכן החשיפה בפועל נמוכה | שודרג ל-**8.4.3** (גרסה מתוקנת; גם `core` ו-`cli`). בניית ה-AAB ו-`cap:sync` נדרשות כדי שהתיקון יגיע למשתמשים: **שער שחרור** (משימה 6). לא נבדק על מכשיר |
| **S3** | **קריטי ← תוקן** | `server/package.json` (`mongoose`) | `npm audit`: `sanitizeFilter` לא מוחל ב-`countDocuments` / ברמת החיבור, ומפתחות discriminator. **לא נגיש:** האפליקציה לא משתמשת ב-`sanitizeFilter` ולא ב-discriminators (חיפוש בקוד), וה-HTTP עטוף ב-`express-mongo-sanitize` | `npm audit fix` ללא `--force`: mongoose 8.24.1 ← 8.24.10. 141 בדיקות שרת עוברות |
| **S4** | **גבוה** ← **תוקן (הוסר)** | `server/routes/auth.js:4,120` (`nodemailer` 9.1.1) | `npm audit`: מספר פרצות ב-nodemailer ≤ 10.1.3 (פענוח כתובות, DoS בקריאת תשובות SMTP, DNS cache בין tenants). הנתיב הזה הוא **גיבוי SMTP לפיתוח מקומי בלבד**; בייצור המייל עובר ב-Resend (`RESEND_API_KEY`). הכתובת שמוזנת עוברת `isEmail` | הוחלט והוסר (2026-11-19): `nodemailer` נמחק מהקוד ומ-`package.json`/`package-lock.json`. המייל עובר רק ב-Resend; בפיתוח מקומי `RESET_CODE_LOG=1` מדפיס את הקוד לקונסולה (ולא בייצור). `npm audit` של השרת: נשארו 2 ממצאים בינוניים ב-`nodemon` (כלי פיתוח, תלוי ב-`minimatch`, אין תיקון זמין בלי שדרוג שבור; לא רץ בייצור) |
| S5 | בינוני ← תוקן | `server/package.json` (`express`, `qs`) | `npm audit` | express 4.22.2 ← 4.22.3, qs 6.15.4 ← 6.16.2 (`npm audit fix`) |
| S6 | בינוני ← תוקן חלקית | `client/package.json` (`react-router-dom`) | GHSA-jjmj-jmhj-qwj2 (open redirect ← XSS) | שודרג ל-6.30.6. נשארו שני ממצאים בינוניים שהתיקון להם רק ב-v7 (מג'ור): redirect עם `\` ו-hydration של SSR. **תנאי הניצול לא קיים:** כל ה-`navigate` / `<Navigate>` הם קבועים, ואין SSR. לא שודרג |
| S7 | גבוה/קריטי (לפי npm) ← **כלי בנייה בלבד**, אין תיקון | `client/package.json` (`vite`, `@capacitor/assets`, `@capacitor/cli`) | 25 ממצאים בלקוח (2 קריטיים, 14 גבוהים). אף אחד מהם לא נכנס לחבילת הדפדפן או ל-AAB: `vite`, `esbuild`, `postcss`, `nanoid`, `source-map-js`, `browserslist`, `@babel/core` (שרשרת הבנייה), `tar`, `xmldom`, `glob`, `minimatch`, `rimraf` (דרך `@capacitor/cli`), `handlebars`, `sharp`, `@trapezedev/project`, `replace`, `tmp`, `uuid`, `xcode` (דרך `@capacitor/assets`, כלי יצירת אייקונים). שרת הפיתוח של vite רץ על localhost בלבד | תיקון דורש vite 8 / `@capacitor/assets` 4 (מג'ור). לא בוצע; לא משפיע על המשתמשים |
| S8 | בינוני | המארח של הלקוח (Wangus), `client/index.html` | `curl -I https://app.digtal-c.co.il`: אין CSP, HSTS, X-Frame-Options, X-Content-Type-Options או Referrer-Policy (Server: nginx) | **לא שונה** (דורש הגדרת מארח). נבדקה מועמדת ל-CSP מול גרסת הלקוח המקומית: **0 הפרות** בזרימות לוח המחוונים, אימון, תזונה, מסע ושינה (ראו למטה). **לא נבדק:** כפתור Google Sign-In ו-Google Fonts מול CSP, ולכן לא הוספתי `<meta>` שעלול לשבור התחברות |
| S9 | נמוך ← תוקן | `server/server.js` (מטפל השגיאות) → `server/utils/errorHandler.js` | `POST /auth/login` עם JSON פגום ← 500 ו-stack בלוג. בייצור: בקשה עם `Origin` זר ← **500** (נבדק פסיבית; הכותרת `Access-Control-Allow-Origin` לא הוחזרה, כלומר `CORS_ORIGIN` מוגדר ופועל). גוף עמוק מדי (100,000 סוגריים מרובעים) ← 500 | JSON פגום ← 400, גוף מעל 1MB ← 413, מקור חסום ← 403, גוף עמוק מדי ← 400, בלי stack בלוג. 7 בדיקות ב-`securityHardening.test.js`. יפעל בייצור אחרי פריסה |
| S10 | נמוך ← תוקן | `server/middleware/auth.js:12-20` | אסימון שנחתם בסוד הנכון אבל עם HS512 התקבל, ו-`userId` כאובייקט (`{"$ne":null}`) הגיע ל-`findById` והחזיר משתמש. ניצול דורש את הסוד, ולכן זו הקשחה בלבד | `jwt.verify(..., { algorithms: ['HS256'] })` ובדיקת `userId` כ-24 תווי hex לפני כל שאילתה. 5 בדיקות |
| S11 | נמוך ← תוקן | `server/routes/auth.js:144,403`, `server/routes/user.js:474` | הרשמה עם סיסמה של 400KB התקבלה (201) | `max: 128` בשלושת הנתיבים. אומת בבדיקה הדינמית |
| S12 | נמוך, **התקבל כסיכון** | `server/routes/auth.js:159-170` | הרשמה עם מייל קיים ← 400 (הודעה כללית); הרשמה חדשה ← 201 עם אסימון. הסטטוס חושף אם המייל רשום. גם זמן התגובה של login שונה בין משתמש קיים (bcrypt) ללא קיים | אי אפשר לסגור בלי זרימת אימות מייל (החלטת מוצר). הקצב מוגבל ל-10 ניסיונות ל-15 דקות ל-IP. התוקף יכול לדעת רק אם מייל רשום |
| S13 | נמוך ← **תוקן** | `server/routes/auth.js:381-388` | `forgot-password` למשתמש קיים כשספק המייל לא זמין ← 500, למשתמש לא קיים ← 200 (שוחזר מקומית, שם המייל לא מוגדר). בייצור זה קורה רק בזמן תקלת Resend | **תוקן (2026-11-19):** כשל בשליחת המייל נרשם ביומן והתשובה נשארת הכללית (200) לכתובת רשומה ולא רשומה, כך שאי אפשר לגלות רישום בזמן תקלה. הלקוח מסביר בהודעה שאם הקוד לא הגיע אפשר לבדוק בספאם או לאמת עם Google. בדיקה: `security-local-tests.mjs` |
| S14 | נמוך | `client/src/components/NutritionTracker.jsx:566-614`, `client/android/.../file_paths.xml`, `localStorage` | (1) ייצוא תפריט ל-PDF משרשר טקסט ארוחה ל-HTML בלי escape (אין היום מקור לא מהימן; ב-WebView הנטיבי של ההדפסה JavaScript כבוי). (2) `FileProvider` חושף `external-path path="."` (לא exported). (3) אסימון JWT של 7 ימים ב-localStorage (כבר בביקורת הקודמת) | המלצות: escape לטקסט התפריט, צמצום נתיב ה-FileProvider, ואסימון קצר עם חידוש. לא שונה |
| S15 | מידעי | `server/utils/mealEstimate.js` | `/nutrition/log` מקבל ערכים ידניים (עד 3000 קק"ל לארוחה) | בכוונה (הזנה ידנית). אפשר "לשחק" ב-XP על נתוני עצמך בלבד |

### מועמדת ל-CSP להגדרת המארח (נבדקה מקומית, ללא הפרות)

```
Content-Security-Policy: default-src 'self'; script-src 'self' https://accounts.google.com https://apis.google.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https://lh3.googleusercontent.com; media-src 'self' blob:; connect-src 'self' https://bodysync-api-admm.onrender.com https://accounts.google.com https://oauth2.googleapis.com https://www.googleapis.com; frame-src https://accounts.google.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
```

הבדיקה: גרסת הלקוח שנבנתה מול API מקומי הוגשה עם הכותרת הזו (`connect-src` עם כתובת ה-API המקומית במקום הייצור), ו-Playwright עבר על לוח המחוונים, אימון, תזונה, מסע וגיליון השינה עם מאזין ל-`securitypolicyviolation`: אפס הפרות ואפס שגיאות קונסול. **לא נבדק:** חלון Google Sign-In, והאם הגופנים נטענו מהרשת. להתחיל ב-`Content-Security-Policy-Report-Only` ולבדוק התחברות עם Google לפני אכיפה.

## צעדים ידניים (דורשים גישה שאין לי)

1. ~~**S1 (דחוף):** Atlas ← Database Access: למחוק את משתמש ה-DB של הסיסמה שהופיעה ב-`render.yaml` בקומיט `75f6fd8`.~~ **בוצע ב-2026-11-19** (ראו S1). נשאר להחליט: למחוק את האשכול הישן (מושהה, עם נתונים ישנים) והאם לכתוב מחדש את ההיסטוריה.
2. **`JWT_SECRET` ב-Render:** לוודא שהוא אקראי וארוך (לפחות 48 תווים אקראיים). ליצירה: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`. החלפה מנתקת את כל המשתמשים. אין לי דרך לבדוק את הערך בייצור.
3. **משתני Render** (`CORS_ORIGIN`, `RESEND_API_KEY`, `EMAIL_FROM`, `MONGODB_URI`, `GOOGLE_CLIENT_ID`): **נבדקו שמות המשתנים בלבד (2026-11-19)** בשירות של `bodysync-api-admm`: מוגדרים `MONGODB_URI`, `JWT_SECRET`, `GOOGLE_CLIENT_ID`, `CORS_ORIGIN`, `NODE_VERSION`, ושאריות שלא בשימוש בקוד: `EMAIL_USER`, `EMAIL_PASS`, `BREVO_API_KEY`. **חסרים `RESEND_API_KEY` ו-`EMAIL_FROM`**, ולכן בייצור קוד איפוס באימייל **לא נשלח** (המשתמש מקבל את התשובה הכללית; Google עדיין עובד). תיקון (רק בעלים, כי מדובר במפתח API אמיתי): ליצור מפתח ב-Resend, לאמת את הדומיין `digtal-c.co.il` ב-Resend (רשומות DNS), להוסיף את שני המשתנים ב-Render, ולשלוח קוד לחשבון בדיקה. אחר כך אפשר למחוק את `EMAIL_USER`, `EMAIL_PASS`, `BREVO_API_KEY`.
4. **Atlas ← Network Access:** לבדוק שאין `0.0.0.0/0` אם אפשר להסתפק בכתובות של Render (בתוכנית החינמית של Render הכתובות משתנות, ולכן ייתכן ש-`0.0.0.0/0` נחוץ; בכל מקרה הסיסמה חייבת להיות חזקה).
5. **כותרות אבטחה ב-Wangus:** להוסיף את הכותרות שלמעלה. אימות: `curl -I https://app.digtal-c.co.il` ולחפש `content-security-policy`, `strict-transport-security`, `x-content-type-options`.
6. ~~**פריסה של שינויי השרת** (S3, S5, S9, S10, S11) ל-Render~~ **נפרס ב-2026-11-19:** push ל-`master`, ו-`/health` בייצור מחזיר `1.0.10`. נשאר לאמת: בקשה עם `Origin: https://evil.example` ל-`/health` צריכה להחזיר 403 ולא 500.
7. ~~**בניית AAB חדש** עם Capacitor 8.4.3 (S2)~~ **בוצע:** 1.3.6 פעילה ב-Alpha, 1.3.7 נשלחה לבדיקה ב-2026-11-19. נשאר: בדיקה על מכשיר.
8. ~~**nodemailer (S4):** להחליט להשאיר, להסיר או לשדרג.~~ **בוצע:** הוסר (ראו S4).

## לא נבדק, וסיבה

- ערכי משתני הסביבה בייצור (נבדקו רק השמות, ראו צעד 3), כללי Atlas וגיבויים. תקפות הסיסמה ב-S1 לא נבדקה (לא נוסה חיבור); המשתמש שלה נמחק.
- חוזק `JWT_SECRET` בייצור, וניסיונות כוח גס מול הייצור (אסור).
- Google Sign-In נטייבי (מכשיר), התראות, הרשאות, התנהגות R8 על מכשיר.
- תלויות Gradle / Android הנטיביות (`gradle dependencies`): לא נסרקו, רק חבילות npm.
- ReDoS בביטויים הרגולריים של הולידטורים ושל שאר הנתיבים: נבדק רק `estimateNutrition`.
- חתימת ה-AAB ושמירת ה-keystore (בנייה וחתימה במשימה 6).
- בדיקת עומס (DoS) אמיתית: לא בוצעה, רק קלטים עוינים בודדים.

## ממצאים שנשארים פתוחים מהביקורת הקודמת

אסימון ב-localStorage ל-7 ימים (S14), כותרות הלקוח (S8), `SCHEDULE_EXACT_ALARM` (נדרשת הצהרת Play, משימה 6). `CORS_ORIGIN` ריק בייצור: **סגור**, כי נראה מוגדר בייצור (S9). `npm audit` של הלקוח: **נבדק עכשיו** (S2, S6, S7).
