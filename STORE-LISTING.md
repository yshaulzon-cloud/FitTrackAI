# Areto · Google Play Store Listing

מקור האמת לטקסטים של המדף בחנות. העתק מכאן ל-Play Console.

---

## עברית (iw-IL — שפת ברירת מחדל)

### תיאור קצר (עד 80 תווים)

```
אימונים מותאמים אישית, תזונה מדויקת ומעקב התקדמות — בדרך לתוצאות אמיתיות
```

### תיאור ארוך (עד 4,000 תווים)

```
Areto היא אפליקציית הכושר והתזונה שמלווה אותך מהיעד הראשון ועד התוצאה.

אחרי אונבורדינג קצר שמכיר אותך — מטרה, רמת כושר, העדפות תזונה — Areto בונה לך תוכנית מותאמת אישית ועוזרת לך לעקוב אחריה יום-יום.

תזונה חכמה
תפריט יומי מותאם ליעד שלך — ירידה במשקל, עלייה במסה או שמירה. מעקב קלוריות ומאקרו פשוט ומהיר, ורישום ארוחות בכמה הקשות.

אימונים שמתקדמים איתך
תוכניות אימון לפי רמה ויעד, עם פיצול לפלג גוף עליון ותחתון ומעקב אחר התקדמות והעמסה הדרגתית.

מעקב והתקדמות
גרף התקדמות לעבר היעד, מעקב משקל, שינה ו-BMI, ותובנות שמראות לך מה עובד.

מוטיבציה שנשארת
מערכת נקודות ורצף ימים, יעדים יומיים שמחזיקים אותך במסלול, והתראות בזמנים שמתאימים לך.

בין אם אתה מתחיל את המסע או מחפש לדייק את התוצאות — Areto נותן לך מבנה, מעקב ומוטיבציה, בעברית מלאה ובממשק נקי ופשוט.

אימונים מותאמים אישית, תזונה מדויקת ומעקב אחר ההתקדמות שלך — בדרך לתוצאות אמיתיות.
```

---

## English (en-US — שפה נוספת)

### Short description (max 80 chars)

```
Nutrition, workouts & smart progress tracking — personalized, all in one
```

### Full description (max 4,000 chars)

```
Areto is the fitness and nutrition app that guides you from your first goal all the way to results.

After a short onboarding that gets to know you — your goal, fitness level, and food preferences — Areto builds a personalized plan and helps you stick to it, day by day.

Smart nutrition
A daily menu tailored to your goal — lose weight, build muscle, or maintain. Simple, fast calorie and macro tracking, and meal logging in just a few taps.

Workouts that progress with you
Training plans by level and goal, with an upper/lower body split and tracking for progressive overload.

Track your progress
A progress graph toward your goal, plus weight, sleep, and BMI tracking, and insights that show you what's working.

Motivation that sticks
XP points and daily streaks, daily goals that keep you on track, and reminders at the times that fit you.

Whether you're just starting out or fine-tuning your results, Areto gives you the structure, tracking, and motivation you need — in a clean, simple interface.
```

---

## נכסים גרפיים — מוכנים בתיקיית `play-assets/`

| נכס | דרישה | קובץ |
| --- | --- | --- |
| אייקון אפליקציה | 512×512 PNG | ✅ `play-assets/icon-512.png` |
| Feature graphic | 1024×500 PNG | ✅ `play-assets/feature-graphic.png` |
| צילום מסך 1 (תזונה) | 1080×1920 | ✅ `play-assets/screenshot-1-nutrition.png` |
| צילום מסך 2 (סקירה) | 1080×1920 | ✅ `play-assets/screenshot-2-overview.png` |
| צילום מסך 3 (XP) | 1080×1920 | ✅ `play-assets/screenshot-3-xp.png` |
| פוליסת פרטיות | URL ציבורי | ⬜ לפרסם — הקובץ מוכן: `client/public/privacy.html` |

**פוליסת פרטיות:** הקובץ `client/public/privacy.html` עצמאי (עברית+אנגלית).
לפי ה-runbook, להעלות ל-`https://app.digtal-c.co.il/privacy.html` ולהשתמש ב-URL הזה.

**הערה משפטית:** תנאי השימוש באפליקציה (סעיף 6) טוענים שהערכת ארוחות
נעשית ב-AI, אבל בפועל המערכת משתמשת רק במאגר מזון מקומי (`estimateNutritionAI`
מוגדרת אך לא נקראת). הפוליסה נכונה; כדאי לתקן את סעיף 6 בתנאים כדי להתאים
לשאלון Data Safety של גוגל.
