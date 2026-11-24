# ביקורת ניסוח, עברית ואנגלית (נובמבר 2026)

סבב משימה 3. נוסח בלבד: לא שונו מפתחות `t`, לוגיקה, placeholders או עזרי plural. שתי בדיקות נוספו (`dayTypeNote`, `sleepWeek`) ובדיקה קיימת אחת עודכנה לנוסח החדש (`logFeedback.test.mjs`, שתי אסרציות).

**סיכום:** 283 שינויי נוסח בטבלה (כולל 139 שורות Sentence case ב-`LanguageContext` ו-6 שורות ממשימות 1 ו-2), ועוד 31 החלפות של "—" בלבד (בטבלה האחרונה, לפי קובץ).

## מה נסרק

- `client/src/context/LanguageContext.jsx`: 404 מפתחות בשתי שפות (231 בשימוש, 172 לא בשימוש בקוד).
- נוסח inline (`isHe ? … : …`) בכל `pages/` ו-`components/`: 808 זוגות שזוהו אוטומטית, ועוד נוסחים מרובי-שורות שנקראו בעין.
- `client/src/lib/*.mjs`: `logFeedback`, `manualMeal`, `workoutAdapt`, `sleepAdvice`, `netError`, `equipmentPick`, `foodPick`, `plural`.
- שרת: 58 הודעות `message` בעברית נספרו (ראו "פתוח"); לא נערכו.
- **לא נגעו:** `lib/notifConfig.mjs` (נבדק ומדווח בלבד), `LegalModal.jsx` (גוף משפטי), `privacy.html`, `delete-account.html`, שמות מאכלים ותרגילים (`exerciseLibrary`, `exerciseCues`, `homeExercises`, `FOOD_DB`).

## מילון

| מושג | עברית | אנגלית |
|---|---|---|
| ארוחה / תפריט | ארוחה, תפריט | meal, menu |
| רישום | לרשום, נרשם (ארוחה, שינה, אימון) | log, logged |
| אימון | אימון; יום אימון / יום מנוחה | workout; training day / rest day |
| תרגיל, סט, חזרות | תרגיל, סט, חזרות | exercise, set, reps |
| יעד (מספר שמודדים מולו) | יעד קלוריות, יעד חלבון, יעד שבועי | calorie target, protein target, weekly target |
| מטרה (בחירת כיוון) | חיטוב / עלייה במסה / שמירה | Cut / Bulk / Maintain |
| רצף | רצף של N ימים, N ימים ברצף | N-day streak |
| קלוריות | קלוריות (בטקסט), קק״ל (יחידה) | calories (in text), kcal (unit) |
| מאקרו | חלבון, פחמימות, שומן, סיבים | protein, carbs, fat, fiber |
| שינה | שינה, לילה | sleep, night |
| התקדמות במשחק | רמה, XP, תג, הישג | level, XP, badge, achievement |
| לשוניות | היום · אימון · תזונה · מסע | Today · Train · Eat · Journey |
| כניסה / יציאה | להתחבר, התחברות, להתנתק | log in, log out (היה גם "sign in" ו-"היכנס") |
| שבח | כל הכבוד | Great work (היה גם "Well done" ו-"nice work") |
| יחידות משקל | ק״ג, ג׳ / גרם | kg, g |

**כללי מכניקה שנקבעו בסבב:**

- Sentence case בכותרות, תוויות ולחצנים. כיתוב קטן שבא מיד אחרי מספר או אחרי "·" נשאר באות קטנה (`carbs`, `workouts`, `kcal left`).
- "—" נשאר רק כסימן ערך ריק (`|| '—'`). טווחי מספרים עם "–" (למשל 7–9) לא נחשבו מחבר משפטים ונשארו (ראו "פתוח").
- גרשיים עבריים ״ (ק״ג, קק״ל, סה״כ, ס״מ) במקום מירכאות ASCII.
- תו שלוש-נקודות אחד (…) במקום "...".

## שינויים

מספרי השורות הם במצב הקבצים אחרי הסבב (השורה הראשונה של הנוסח החדש). "—" שהוחלף בלבד מסוכם בטבלה האחרונה.

| קובץ:שורה | לפני | אחרי | סיבה |
|---|---|---|---|
| components/NutritionTracker.jsx:1042 | `יום מנוחה • יעד היום מותאם −4.5% (הממוצע השבועי לא משתנה)` | `יום מנוחה · היעד היום נמוך בכ-5% מהרגיל. הממוצע השבועי נשאר אותו דבר.` | משימה 1: מינוס צמוד למספר ב-RTL, ספרה עשרונית, סוגריים טכניים |
| components/NutritionTracker.jsx:1042 | `Rest day • today's target −4.5% (weekly average unchanged)` | `Rest day · Today's target is about 5% below usual. Your weekly average stays the same.` | משימה 1: אותו תיקון באנגלית |
| components/NutritionTracker.jsx:1042 | `מנוחה היא חלק מהאימון: השרירים בונים את עצמם בהתאוששות. גם ביום מנוחה, תיעוד ארוחה או שינה שומר על הרצף.` | `מנוחה היא חלק מהאימון: השרירים נבנים בזמן ההתאוששות. תיעוד ארוחה או שינה ישמור על הרצף גם היום.` | משימה 1: "בונים את עצמם" לא טבעי |
| components/WorkoutPlan.jsx:576 | `הגוף בונה שריר במנוחה — נצל את הימים הקרובים להתאוששות, שינה ותזונה טובה.` | `השרירים נבנים בזמן ההתאוששות. נצל את הימים הקרובים לשינה ולתזונה טובה.` | משימה 1: מקף; תאום לכרטיס התזונה |
| components/WorkoutPlan.jsx:576 | `Muscle is built during rest — use the coming days for recovery, sleep and good nutrition.` | `Muscle is built while you recover. Use the coming days for sleep and good nutrition.` | משימה 1: מקף; תאום לכרטיס התזונה |
| components/SleepTracker.jsx:190 | `(חדש) כרטיס ממוצע שינה: השבוע האחרון · מתוך N לילות · ממוצע שעות שינה · איכות שינה ממוצעת` | `(new) Weekly sleep card: Last 7 days · from N nights · Average sleep · Average quality` | משימה 2: מחרוזות חדשות, בכללי הניסוח |
| pages/Login.jsx:125 | `'הפעלה פגה — אנא התחבר מחדש' : 'Session expired — please sign in again'` | `'ההתחברות פגה. התחבר שוב.' : 'Your session expired. Please sign in again.'` | מקף כמחבר; "אנא" רשמי מדי |
| pages/Login.jsx:60 | `'הקלוריות מתאימות את עצמן ליום אימון או ליום מנוחה'` | `'הקלוריות מותאמות ליום אימון או ליום מנוחה'` | תרגום מילולי ("מתאימות את עצמן") |
| pages/Login.jsx:69 | `'See exactly how to perform it, right in your workout'` | `'See how to do every exercise, right in your workout'` | באנגלית "it" ללא מושא ו-"exactly" מוסיף טענה שאין בעברית |
| pages/Login.jsx:528 | `בנה גוף בריא.<br/>` | `בנה את הגוף שלך.<br/>` | תאום לאנגלית ("Build your body"): "בריא" היה רק בעברית |
| pages/Login.jsx:529 | `עקוב. תשתפר.<br/>` | `עקוב. השתפר.<br/>` | ציווי, כמו "Improve" ושאר השורה |
| pages/Login.jsx:542 | `'תוכניות אימון ותזונה מדויקות שמתעדכנות בזמן אמת לפי ההתקדמות שלך.'` | `'תוכניות אימון ותזונה שמתעדכנות לפי ההתקדמות שלך.'` | הוסר "מדויקות" ו"בזמן אמת": אין להבטיח דיוק |
| pages/Login.jsx:543 | `'Precise workout and nutrition plans that adapt in real time to your progress.'` | `'Workout and nutrition plans that adapt to your progress.'` | הוסר "Precise" ו-"in real time": אין להבטיח דיוק |
| pages/Login.jsx:611 | `דרך Google (עם אותו אימייל שנרשמת איתו) — ואז תבחר סיסמה חדשה.` | `דרך Google, עם אותו אימייל שנרשמת איתו. אחר כך תבחר סיסמה חדשה.` | הערה בסוגריים ומקף כמחבר |
| pages/Login.jsx:612 | `via Google (the same email you signed up with) — then you’ll choose a new password.` | `through Google, using the email you signed up with. Then you’ll choose a new password.` | הערה בסוגריים ומקף כמחבר |
| pages/Login.jsx:500 | `(isHe ? 'הסתר' : 'hide')` | `(isHe ? 'הסתר' : 'Hide')` | Sentence case |
| pages/Login.jsx:501 | `(isHe ? 'הצג' : 'show')` | `(isHe ? 'הצג' : 'Show')` | Sentence case |
| pages/OnboardingFlow.jsx:36 | `'At 2 a week you get full-body sessions — every muscle trained twice weekly.'` | `'With 2 workouts a week you get full-body sessions. Every muscle is trained twice a week.'` | מקף; "At 2 a week" לא טבעי (חסר שם עצם) |
| pages/OnboardingFlow.jsx:39 | `'At 3 a week you get a push / pull / legs split — classic and efficient.'` | `'With 3 workouts a week you get a push / pull / legs split. Classic and efficient.'` | מקף; "At 3 a week" לא טבעי |
| pages/OnboardingFlow.jsx:42 | `'At 4 a week you get an upper / lower split — a good balance of recovery and progress.'` | `'With 4 workouts a week you get an upper / lower split. A good balance of recovery and progress.'` | מקף; "At 4 a week" לא טבעי |
| pages/OnboardingFlow.jsx:45 | `'At ${n} a week you get an extended push / pull / legs split — more volume per muscle group.'` | `'With ${n} workouts a week you get an extended push / pull / legs split. More volume per muscle group.'` | מקף; "At N a week" לא טבעי |
| pages/OnboardingFlow.jsx:427 | `isHe ? 'מומלץ' : 'Best'` | `isHe ? 'מומלץ' : 'Recommended'` | עברית ואנגלית אמרו דברים שונים ("מומלץ" / "Best"); אותו מונח כמו במסך המטרה |
| pages/OnboardingFlow.jsx:566 | `isHe ? 'בוא נדייק את התוכנית' : "Let's fine-tune the plan"` | `isHe ? 'כוונן את התוכנית' : 'Fine-tune your plan'` | פתיח "Let's" / "בוא נ-"; "דייק" רומז על דיוק |
| pages/OnboardingFlow.jsx:567 | `isHe ? 'אופציונלי — אפשר לדלג ולהוסיף מאוחר יותר.' : "Optional — you can skip and add this later."` | `isHe ? 'אופציונלי. אפשר לדלג ולהוסיף אחר כך.' : 'Optional. You can skip this and add it later.'` | מקף כמחבר |
| pages/OnboardingFlow.jsx:724 | `isHe ? 'לפחות 8 תווים + ספרה' : 'At least 8 chars + 1 number'` | `isHe ? 'לפחות 8 תווים, כולל ספרה אחת' : 'At least 8 characters, including a digit'` | אותה הנחיית סיסמה כמו במסך ההתחברות |
| pages/OnboardingFlow.jsx:769 | `'תזכורת אחת ביום לאימון או לרישום ארוחה. בלי ספאם — מבטיחים.'` | `'תזכורת אחת ביום לאימון או לרישום ארוחה. בלי ספאם.'` | הוסר "מבטיחים" ומקף |
| pages/OnboardingFlow.jsx:770 | `'One reminder a day to train or log a meal. No spam — promise.'` | `'One reminder a day to train or log a meal. No spam.'` | הוסר "promise" ומקף |
| pages/OnboardingFlow.jsx:869 | `isHe ? 'בוא נתחיל' : "Let's start"` | `isHe ? 'בוא נתחיל' : 'Get started'` | פתיח "Let's" |
| pages/OnboardingFlow.jsx:835 | `desc: 'תזכורות חכמות ורצף ימים שומרים אותך במסלול, גם בשבועות עמוסים.'` | `desc: 'תזכורות ורצף ימים שומרים אותך במסלול, גם בשבועות עמוסים.'` | "חכמות" רומז על AI; אין AI באפליקציה |
| pages/OnboardingFlow.jsx:840 | `desc: 'Smart reminders and day streaks keep you on track, even in busy weeks.'` | `desc: 'Reminders and day streaks keep you on track, even in busy weeks.'` | "Smart" רומז על AI; אין AI באפליקציה |
| pages/Dashboard.jsx:816 | `LVL ${progressionData?.level ?? 1}` | `Level ${progressionData?.level ?? 1}` | מונח אחד לרמה: "Level" (כמו בהגדרות), לא קיצור "LVL" |
| pages/Dashboard.jsx:540 | `"today's target · go"` | `"Today's target · start"` | Sentence case; "go" מול "התחל": תאום |
| pages/Dashboard.jsx:1225 | `'Body Data'` | `'Body data'` | Sentence case |
| pages/Dashboard.jsx:1226 | `'Training Goal'` | `'Training goal'` | Sentence case |
| pages/Dashboard.jsx:1234 | `'Privacy & Data'` | `'Privacy & data'` | Sentence case |
| pages/Dashboard.jsx:1238 | `'Weight & Height'` | `'Weight & height'` | Sentence case |
| pages/Dashboard.jsx:1811 | `'Danger Zone'` | `'Danger zone'` | Sentence case |
| pages/Dashboard.jsx:1806 | `'› Privacy Policy'` | `'› Privacy policy'` | Sentence case |
| pages/Dashboard.jsx:1807 | `'› Terms of Service'` | `'› Terms of service'` | Sentence case |
| pages/Dashboard.jsx:1240 | `isHe ? 'ירידה במשקל'   : 'Cut'` | `isHe ? 'חיטוב'   : 'Cut'` | מונח אחד: "Cut" = "חיטוב" בכל האפליקציה (t.goalCut) |
| pages/Dashboard.jsx:1271 | `'חיתוך, בנייה, שמירה'` | `'חיטוב, עלייה במסה, שמירה'` | אותם שמות מטרה כמו במסך המטרה (חיטוב / עלייה במסה / שמירה) |
| pages/Dashboard.jsx:1245 | `isHe ? 'ארוחת בוקר'    : 'Breakfast reminder'` | `isHe ? 'תזכורת ארוחת בוקר'    : 'Breakfast reminder'` | עברית ואנגלית אמרו דברים שונים (חיפוש בהגדרות) |
| pages/Dashboard.jsx:1246 | `isHe ? 'ארוחת צהריים'  : 'Lunch reminder'` | `isHe ? 'תזכורת ארוחת צהריים'  : 'Lunch reminder'` | תאום עברית ואנגלית |
| pages/Dashboard.jsx:1247 | `isHe ? 'ארוחת ערב'     : 'Dinner reminder'` | `isHe ? 'תזכורת ארוחת ערב'     : 'Dinner reminder'` | תאום עברית ואנגלית |
| pages/Dashboard.jsx:1254 | `isHe ? 'שם פרטי'       : 'Name'` | `isHe ? 'שם פרטי'       : 'First name'` | תאום עם שדה השם בהגדרות ("First name") |
| pages/Dashboard.jsx:1106 | `'הסיסמה שונתה בהצלחה' : 'Password changed successfully'` | `'הסיסמה שונתה' : 'Password changed'` | "בהצלחה" / "successfully" מיותר; כמו במסך איפוס הסיסמה |
| pages/Dashboard.jsx:1396 | `'השעה הזאת (23:00–06:00) עלולה להעיר אותך. אפשר לבחור שעה אחרת.' : 'This time (11 pm–6 am) may wake you. Pick another time if you like.'` | `'השעה הזאת, בין 23:00 ל-06:00, עלולה להעיר אותך. אפשר לבחור שעה אחרת.' : 'This time, between 11 pm and 6 am, may wake you. Pick another time if you l…` | הערה בסוגריים ומקף טווח |
| pages/Dashboard.jsx:1496 | `'Weight and height directly drive your calorie target.'` | `'Weight and height directly affect your calorie target.'` | "drive" לא תואם ל"משפיעים" |
| pages/Dashboard.jsx:1717 | `'מתאר כהה יותר' : 'Stronger outlines'` | `'קווי מתאר בולטים יותר' : 'Stronger outlines'` | עברית ואנגלית אמרו דברים שונים ("כהה" / "stronger") |
| pages/Dashboard.jsx:1770 | `isHe ? 'לפחות 8 תווים + ספרה' : 'At least 8 chars + digit'` | `isHe ? 'לפחות 8 תווים, כולל ספרה אחת' : 'At least 8 characters, including a digit'` | אותה הנחיית סיסמה בכל המסכים |
| pages/Dashboard.jsx:1827 | `'Wipe workouts, meals, and measurements.'` | `'Wipe workouts, meals, and measurements. Your account stays.'` | באנגלית חסר המשפט "החשבון נשמר" שיש בעברית |
| pages/Dashboard.jsx:1621 | `{liveCalories.toLocaleString()} קל'</strong>` | `{liveCalories.toLocaleString()} קק״ל</strong>` | יחידה אחת: "קק״ל" (לא "קל'") |
| components/WorkoutPlan.jsx:499 | `{getDayName(todayWorkout?.dayName \|\| dayTitle, lang)} — {isHe ? 'כל הכבוד!' : 'nice work!'}` | `{getDayName(todayWorkout?.dayName \|\| dayTitle, lang)}. {isHe ? 'כל הכבוד!' : 'Great work!'}` | מקף כמחבר; אנגלית באות קטנה; "כל הכבוד" תורגם בשלוש דרכים (nice work / Well done / Great work), עכשיו "Great work" |
| components/WorkoutPlan.jsx:529 | `'שבוע מלא' : 'week complete'` | `'שבוע מלא' : 'Week complete'` | Sentence case |
| components/WorkoutPlan.jsx:534 | `'מערכת האימון החי — מעקב סטים, משקלים וטיימר מנוחה — תיפתח באימון הבא שלך.' : 'The live workout — set tracking, weights and rest timer — opens on you…` | `'האימון החי, עם מעקב סטים, משקלים וטיימר מנוחה, ייפתח באימון הבא שלך.' : 'The live workout, with set tracking, weights and a rest timer, opens on you…` | מקפים כהערת ביניים; "מערכת" מיותר |
| components/WorkoutPlan.jsx:554 | `'All ${maxPerWeek} workouts of the cycle — done'` | `'All ${maxPerWeek} workouts of the cycle are done'` | מקף; משפט שלם |
| components/WorkoutPlan.jsx:575 | `'The next cycle unlocks soon.'` | `'The next cycle opens soon.'` | "unlock" אסור; בעברית "ייפתח" |
| components/WorkoutPlan.jsx:673 | `isHe ? 'פעם קודמת' : 'last'} ${last.weight}${isHe ? ' ק״ג' : 'kg'}` | `isHe ? 'פעם קודמת' : 'last time'} ${last.weight}${isHe ? ' ק״ג' : ' kg'}` | באנגלית "last" מול "פעם קודמת"; רווח לפני kg כמו בשאר המסכים |
| components/WorkoutSession.jsx:522 | `'Well done${firstName ? ', ${firstName}' : ''}! 🎉'` | `'Great work${firstName ? ', ${firstName}' : ''}! 🎉'` | "כל הכבוד" תורגם בשלוש דרכים; עכשיו "Great work" |
| components/NutritionTracker.jsx:49 | `זה הקרוב ביותר שיש כרגע, אפשר להחליף ארוחות או לערוך אותן כדי להתקרב.` | `זה הקרוב ביותר שיש כרגע. אפשר להחליף ארוחות או לערוך אותן כדי להתקרב.` | שני משפטים מחוברים בפסיק |
| components/NutritionTracker.jsx:573 | `'My Weekly Menu'` | `'My weekly menu'` | Sentence case |
| components/NutritionTracker.jsx:579 | `'My Daily Menu'` | `'My daily menu'` | Sentence case |
| components/NutritionTracker.jsx:1170 | `'יום אימון' : 'training')` | `'יום אימון' : 'training day')` | מונח אחד: "יום אימון" = "training day" (כמו בכרטיס היום) |
| components/NutritionTracker.jsx:1170 | `'יום מנוחה' : 'rest')` | `'יום מנוחה' : 'rest day')` | מונח אחד: "יום מנוחה" = "rest day" |
| components/NutritionTracker.jsx:1259 | `We couldn't find “${notFound.text}”.` | `We couldn't find “${notFound.text}” in the database.` | בעברית כתוב "במאגר", באנגלית חסר |
| components/NutritionTracker.jsx:1314 | `'Less by 10 g'` | `'Decrease by 10 g'` | תרגום מילולי של "הפחת" |
| components/NutritionTracker.jsx:1319 | `'More by 10 g'` | `'Increase by 10 g'` | תרגום מילולי של "הוסף" |
| components/NutritionTracker.jsx:1341 | `יש להזין כמות בגרמים (1–2000).` | `הזן כמות בין 1 ל-2000 גרם.` | מקף טווח; "יש להזין" רשמי, שאר האפליקציה בציווי |
| components/NutritionTracker.jsx:1341 | `Enter an amount in grams (1–2000).` | `Enter an amount between 1 and 2000 grams.` | מקף טווח |
| components/NutritionTracker.jsx:1718 | `שעות, מקסימה את גירוי בניית השריר.` | `שעות, ממקסמת את סינתזת החלבון בשריר.` | "מקסימה" היא שם תואר ("charming"), הפועל הוא "ממקסמת"; תאום לאנגלית (muscle protein synthesis) |
| components/BMICard.jsx:618 | `'${journeyCovered.toFixed(1)} ק"ג עברת · נשארו` | `'עברת ${journeyCovered.toFixed(1)} ק"ג · נשארו` | סדר מילים הפוך ("3.2 ק״ג עברת"); כמו בשורה המקבילה ("עברת 3.2 ק״ג") |
| components/BMICard.jsx:115 | `ק"ג` | `ק״ג` | גרשיים עבריים (״) במקום מירכאות ASCII, כמו בשאר האפליקציה |
| components/BMICard.jsx:120 | `'· YOU ARE HERE ·'` | `'· You are here ·'` | Sentence case (היה באותיות גדולות) |
| components/BMICard.jsx:145 | `'YOU ARE HERE'` | `'You are here'` | Sentence case |
| components/BMICard.jsx:134 | `'· YOU MADE IT ·'` | `'· You made it ·'` | Sentence case |
| components/BMICard.jsx:569 | `Avg ${avgBalance} kcal over target/day` | `Averaging ${avgBalance} kcal/day over target` | קיצור "Avg" וסדר מילים לא טבעי |
| components/BMICard.jsx:577 | `Avg ${Math.abs(avgBalance)} kcal under target/day` | `Averaging ${Math.abs(avgBalance)} kcal/day under target` | קיצור "Avg" וסדר מילים לא טבעי |
| components/BMICard.jsx:572 | `Smaller portions or more cardio.` | `Smaller portions or an extra workout.` | בעברית "הוסף אימון", באנגלית "cardio": טענה שונה |
| components/BMICard.jsx:580 | `Without a surplus, you won\'t gain.` | `Without a surplus, you won\'t gain mass.` | "gain" בלי מושא; בעברית "לא תעלה במסה" |
| components/BMICard.jsx:584 | `Holding at target · avg ${` | `Holding at target · average ${` | קיצור "avg" |
| components/BMICard.jsx:587 | `You\'re maintaining. Keep this rhythm.` | `You\'re maintaining your weight. Keep this pace.` | "maintaining" בלי מושא; "rhythm" → "pace" (כמו "הקצב") |
| components/BMICard.jsx:614 | `Starting line` | `Starting point` | מונח אחד: "Starting point" (כמו בהסבר שמתחתיו) |
| components/BMICard.jsx:646 | `יעדך — שמירה על המשקל הנוכחי` | `היעד שלך: שמירה על המשקל הנוכחי` | מקף כמחבר; "יעדך" גבוה מדי |
| components/BMICard.jsx:988 | `Pick your next direction — we’ll re-tune calories, macros, and your plan.` | `Pick your next direction. We’ll update your calories, macros, and plan.` | מקף; "re-tune" רומז על דיוק |
| components/Progress.jsx:357 | `הכי הרבה קלוריות'` | `הכי הרבה קלוריות שנשרפו'` | באנגלית "Most calories burned"; בעברית לא ברור שנשרפו |
| components/Progress.jsx:446 | `<>שינה מצוינת — מרבית את ההתאוששות.</>` | `<>שינה מצוינת, וזה עוזר להתאוששות.</>` | "מרבית" תרגום מילולי שגוי ("maximum recovery"); מקף; ניסוח מוגזם |
| components/Progress.jsx:447 | `<>Great sleep — maximum recovery.</>` | `<>Great sleep. It helps recovery.</>` | מקף; "maximum recovery" טענה מוגזמת |
| components/Progress.jsx:484 | `'עדיין לא רשמת שינה — הוסף את הלילה האחרון בלוח המחוונים כדי לקבל XP, והמלצה לאימון ולתזונה אחרי לילה קצר.'` | `'עדיין לא רשמת שינה. הוסף את הלילה האחרון בלשונית היום כדי לקבל XP והמלצה לאימון ולתזונה אחרי לילה קצר.'` | "לוח המחוונים" תרגום מילולי של dashboard; האפליקציה קוראת לזה "היום"; מקף |
| components/Progress.jsx:485 | `'No sleep logged yet — log last night on the dashboard to earn XP and get workout and nutrition tips after a short night.'` | `'No sleep logged yet. Log last night on the Today tab to earn XP and get workout and nutrition tips after a short night.'` | המסך נקרא "Today"; מקף |
| components/BMICard.jsx:605 | `'המסלול ליעד' : 'Journey to goal'` | `'המסלול ליעד' : 'Path to your goal'` | "journey" אסור באנגלית (שם הלשונית "Journey" נשאר, ראה "פתוח") |
| components/ExerciseSwapSheet.jsx:33 | `לא נמצאה חלופה שמתאימה לציוד שלך ולא כבר באימון.` | `לא נמצאה חלופה שמתאימה לציוד שלך ואינה כבר באימון.` | "ולא כבר באימון" דקדוק שבור |
| components/MealEditor.jsx:72 | `'Less by 10 g'` | `'Decrease by 10 g'` | תרגום מילולי של "הפחת" |
| components/MealEditor.jsx:74 | `'More by 10 g'` | `'Increase by 10 g'` | תרגום מילולי של "הוסף" |
| lib/logFeedback.mjs:39 | `'לא זיהינו: ${list} — לא נספרו בחישוב.' : 'Not recognised: ${list} — not counted.'` | `'לא זיהינו: ${list}. לא נספרו בחישוב.' : 'Not recognized: ${list}. Not counted.'` | מקף; איות אמריקאי ("recognized") כמו בשאר האנגלית |
| lib/logFeedback.test.mjs:68 | `/לא זיהינו: קינואה, סומסום — לא נספרו בחישוב\./` | `/לא זיהינו: קינואה, סומסום\. לא נספרו בחישוב\./` | עדכון הבדיקה לנוסח החדש |
| lib/logFeedback.test.mjs:69 | `/Not recognised: quinoa — not counted\./` | `/Not recognized: quinoa\. Not counted\./` | עדכון הבדיקה לנוסח החדש |
| lib/manualMeal.mjs:64 | `'${names[field]}: יש להזין מספר'` | `'${names[field]}: הזן מספר'` | "יש להזין" רשמי; שאר האפליקציה בציווי |
| lib/workoutAdapt.mjs:132 | `'עשית ${r.reps} חזרות בכל הסטים, אפשר להוסיף חזרה' : 'You did ${r.reps} reps on every set — add one'` | `'עשית ${r.reps} חזרות בכל הסטים. אפשר להוסיף חזרה' : 'You did ${r.reps} reps on every set. Add one'` | מקף ופסיק שמחבר שני משפטים |
| lib/workoutAdapt.mjs:136 | `'בפעם שעברה לא הגעת למינימום החזרות, נשארים באותו משקל' : 'You missed the minimum reps last time — same weight'` | `'בפעם שעברה לא הגעת למינימום החזרות. נשארים באותו משקל' : 'You missed the minimum reps last time. Same weight'` | מקף ופסיק שמחבר שני משפטים |
| context/LanguageContext.jsx:465 | `tabWorkout: 'Workout Plan'` | `tabWorkout: 'Workout plan'` | Sentence case |
| context/LanguageContext.jsx:474 | `confirmPassword: 'Confirm Password'` | `confirmPassword: 'Confirm password'` | Sentence case |
| context/LanguageContext.jsx:475 | `loginBtn: 'Log In'` | `loginBtn: 'Log in'` | Sentence case |
| context/LanguageContext.jsx:477 | `registerBtn: 'Sign Up'` | `registerBtn: 'Sign up'` | Sentence case |
| context/LanguageContext.jsx:489 | `logout: 'Log Out'` | `logout: 'Log out'` | Sentence case |
| context/LanguageContext.jsx:491 | `resetPassword: 'Reset Password'` | `resetPassword: 'Reset password'` | Sentence case |
| context/LanguageContext.jsx:492 | `sendCode: 'Send Code'` | `sendCode: 'Send code'` | Sentence case |
| context/LanguageContext.jsx:496 | `newPassword: 'New Password'` | `newPassword: 'New password'` | Sentence case |
| context/LanguageContext.jsx:497 | `resetBtn: 'Reset Password'` | `resetBtn: 'Reset password'` | Sentence case |
| context/LanguageContext.jsx:501 | `backToLogin: 'Back to Login'` | `backToLogin: 'Back to login'` | Sentence case |
| context/LanguageContext.jsx:505 | `nameLabel: 'First Name:'` | `nameLabel: 'First name:'` | Sentence case |
| context/LanguageContext.jsx:517 | `bodyFat: 'Body Fat % (optional)'` | `bodyFat: 'Body fat % (optional)'` | Sentence case |
| context/LanguageContext.jsx:521 | `experienceLabel: 'Experience Level'` | `experienceLabel: 'Experience level'` | Sentence case |
| context/LanguageContext.jsx:545 | `caloriesToday: 'Calories Today'` | `caloriesToday: 'Calories today'` | Sentence case |
| context/LanguageContext.jsx:546 | `proteinToday: 'Protein Today'` | `proteinToday: 'Protein today'` | Sentence case |
| context/LanguageContext.jsx:547 | `workoutStreak: 'Workout Streak'` | `workoutStreak: 'Workout streak'` | Sentence case |
| context/LanguageContext.jsx:548 | `dailyBurn: 'Daily Burn (cal)'` | `dailyBurn: 'Daily burn (cal)'` | Sentence case |
| context/LanguageContext.jsx:549 | `burnedToday: 'Burned Today (workouts)'` | `burnedToday: 'Burned today (workouts)'` | Sentence case |
| context/LanguageContext.jsx:555 | `dailyProgress: 'Daily Progress'` | `dailyProgress: 'Daily progress'` | Sentence case |
| context/LanguageContext.jsx:564 | `yourNutritionTargets: 'Your Nutrition Targets'` | `yourNutritionTargets: 'Your nutrition targets'` | Sentence case |
| context/LanguageContext.jsx:565 | `dailyCalorieTarget: 'Daily Calorie Target'` | `dailyCalorieTarget: 'Daily calorie target'` | Sentence case |
| context/LanguageContext.jsx:582 | `nutritionTracking: 'Nutrition Tracking'` | `nutritionTracking: 'Nutrition tracking'` | Sentence case |
| context/LanguageContext.jsx:584 | `addMeal: 'Add Meal'` | `addMeal: 'Add meal'` | Sentence case |
| context/LanguageContext.jsx:588 | `dailySummary: 'Daily Summary'` | `dailySummary: 'Daily summary'` | Sentence case |
| context/LanguageContext.jsx:601 | `workoutPlan: 'Workout Plan'` | `workoutPlan: 'Workout plan'` | Sentence case |
| context/LanguageContext.jsx:602 | `upperLowerSplit: 'Upper/Lower Split'` | `upperLowerSplit: 'Upper/Lower split'` | Sentence case |
| context/LanguageContext.jsx:607 | `importantPrinciples: 'Key Principles'` | `importantPrinciples: 'Key principles'` | Sentence case |
| context/LanguageContext.jsx:618 | `streakDays: 'Workout Streak (days)'` | `streakDays: 'Workout streak (days)'` | Sentence case |
| context/LanguageContext.jsx:619 | `totalWorkouts: 'Total Workouts'` | `totalWorkouts: 'Total workouts'` | Sentence case |
| context/LanguageContext.jsx:620 | `workoutsThisWeek: 'Workouts This Week'` | `workoutsThisWeek: 'Workouts this week'` | Sentence case |
| context/LanguageContext.jsx:621 | `caloriesBurnedWeek: 'Calories Burned This Week'` | `caloriesBurnedWeek: 'Calories burned this week'` | Sentence case |
| context/LanguageContext.jsx:628 | `dietaryFiber: 'Dietary Fiber'` | `dietaryFiber: 'Dietary fiber'` | Sentence case |
| context/LanguageContext.jsx:630 | `weightGainTarget: 'Weight Gain Target'` | `weightGainTarget: 'Weight gain target'` | Sentence case |
| context/LanguageContext.jsx:631 | `weightMaintain: 'Weight Maintenance'` | `weightMaintain: 'Weight maintenance'` | Sentence case |
| context/LanguageContext.jsx:632 | `weeklyLossTarget: 'Weekly Loss Target'` | `weeklyLossTarget: 'Weekly loss target'` | Sentence case |
| context/LanguageContext.jsx:636 | `stableWeight: 'Stable Weight'` | `stableWeight: 'Stable weight'` | Sentence case |
| context/LanguageContext.jsx:639 | `recentWorkouts: 'Recent Workouts'` | `recentWorkouts: 'Recent workouts'` | Sentence case |
| context/LanguageContext.jsx:645 | `updateProfile: 'Update Profile'` | `updateProfile: 'Update profile'` | Sentence case |
| context/LanguageContext.jsx:646 | `saveChanges: 'Save Changes'` | `saveChanges: 'Save changes'` | Sentence case |
| context/LanguageContext.jsx:654 | `exerciseDetails: 'Exercise Details'` | `exerciseDetails: 'Exercise details'` | Sentence case |
| context/LanguageContext.jsx:655 | `muscleGroup: 'Muscle Group'` | `muscleGroup: 'Muscle group'` | Sentence case |
| context/LanguageContext.jsx:656 | `watchTutorial: 'Watch Tutorial Video'` | `watchTutorial: 'Watch tutorial video'` | Sentence case |
| context/LanguageContext.jsx:681 | `bmiAnalysis: 'BMI Analysis'` | `bmiAnalysis: 'BMI analysis'` | Sentence case |
| context/LanguageContext.jsx:682 | `bmiValue: 'BMI Value'` | `bmiValue: 'BMI value'` | Sentence case |
| context/LanguageContext.jsx:685 | `bmiNormal: 'Normal Weight'` | `bmiNormal: 'Normal weight'` | Sentence case |
| context/LanguageContext.jsx:687 | `bmiObese1: 'Obese Class I'` | `bmiObese1: 'Obese class I'` | Sentence case |
| context/LanguageContext.jsx:688 | `bmiObese2: 'Obese Class II'` | `bmiObese2: 'Obese class II'` | Sentence case |
| context/LanguageContext.jsx:689 | `bmiObese3: 'Obese Class III'` | `bmiObese3: 'Obese class III'` | Sentence case |
| context/LanguageContext.jsx:690 | `healthyWeightRange: 'Healthy Weight Range'` | `healthyWeightRange: 'Healthy weight range'` | Sentence case |
| context/LanguageContext.jsx:691 | `targetWeight: 'Target Weight'` | `targetWeight: 'Target weight'` | Sentence case |
| context/LanguageContext.jsx:692 | `currentWeight: 'Current Weight'` | `currentWeight: 'Current weight'` | Sentence case |
| context/LanguageContext.jsx:695 | `weeklyRate: 'Weekly Rate'` | `weeklyRate: 'Weekly rate'` | Sentence case |
| context/LanguageContext.jsx:697 | `estimatedTime: 'Estimated Time'` | `estimatedTime: 'Estimated time'` | Sentence case |
| context/LanguageContext.jsx:700 | `dailyDeficit: 'Daily Caloric Deficit'` | `dailyDeficit: 'Daily caloric deficit'` | Sentence case |
| context/LanguageContext.jsx:701 | `dailySurplus: 'Daily Caloric Surplus'` | `dailySurplus: 'Daily caloric surplus'` | Sentence case |
| context/LanguageContext.jsx:703 | `bmiRecommendGoal: 'Recommended Goal'` | `bmiRecommendGoal: 'Recommended goal'` | Sentence case |
| context/LanguageContext.jsx:707 | `applyRecommendation: 'Apply Recommendation'` | `applyRecommendation: 'Apply recommendation'` | Sentence case |
| context/LanguageContext.jsx:709 | `bmiSimulator: 'BMI Simulator'` | `bmiSimulator: 'BMI simulator'` | Sentence case |
| context/LanguageContext.jsx:711 | `simulatedWeight: 'Simulated Weight'` | `simulatedWeight: 'Simulated weight'` | Sentence case |
| context/LanguageContext.jsx:716 | `sleepTitle: 'Sleep Tracking'` | `sleepTitle: 'Sleep tracking'` | Sentence case |
| context/LanguageContext.jsx:723 | `sleepQuality: 'Sleep Quality'` | `sleepQuality: 'Sleep quality'` | Sentence case |
| context/LanguageContext.jsx:728 | `sleepLog: 'Log Sleep'` | `sleepLog: 'Log sleep'` | Sentence case |
| context/LanguageContext.jsx:729 | `sleepUpdate: 'Update Sleep'` | `sleepUpdate: 'Update sleep'` | Sentence case |
| context/LanguageContext.jsx:731 | `sleepWeeklyStats: 'Weekly Stats'` | `sleepWeeklyStats: 'Weekly stats'` | Sentence case |
| context/LanguageContext.jsx:733 | `sleepGoalDays: 'Goal Met'` | `sleepGoalDays: 'Goal met'` | Sentence case |
| context/LanguageContext.jsx:734 | `sleepLoggedDays: 'Days Logged'` | `sleepLoggedDays: 'Days logged'` | Sentence case |
| context/LanguageContext.jsx:735 | `sleepHistory: 'Last 7 Days'` | `sleepHistory: 'Last 7 days'` | Sentence case |
| context/LanguageContext.jsx:745 | `xpSleepGoal: 'Sleep Goal'` | `xpSleepGoal: 'Sleep goal'` | Sentence case |
| context/LanguageContext.jsx:746 | `xpSleepGreat: 'Great Sleep'` | `xpSleepGreat: 'Great sleep'` | Sentence case |
| context/LanguageContext.jsx:749 | `dailyMenu: 'Daily Menu'` | `dailyMenu: 'Daily menu'` | Sentence case |
| context/LanguageContext.jsx:750 | `dailyMenuBtn: 'Suggested Daily Menu'` | `dailyMenuBtn: 'Suggested daily menu'` | Sentence case |
| context/LanguageContext.jsx:751 | `swapMenu: 'Swap Menu'` | `swapMenu: 'Swap menu'` | Sentence case |
| context/LanguageContext.jsx:752 | `swapMeal: 'Swap Meal'` | `swapMeal: 'Swap meal'` | Sentence case |
| context/LanguageContext.jsx:761 | `hideMenu: 'Hide Menu'` | `hideMenu: 'Hide menu'` | Sentence case |
| context/LanguageContext.jsx:765 | `adminDashboard: 'Admin Dashboard'` | `adminDashboard: 'Admin dashboard'` | Sentence case |
| context/LanguageContext.jsx:766 | `totalUsers: 'Total Users'` | `totalUsers: 'Total users'` | Sentence case |
| context/LanguageContext.jsx:767 | `activeUsersLabel: 'Active Users'` | `activeUsersLabel: 'Active users'` | Sentence case |
| context/LanguageContext.jsx:768 | `newThisWeek: 'New This Week'` | `newThisWeek: 'New this week'` | Sentence case |
| context/LanguageContext.jsx:769 | `totalWorkoutsAdmin: 'Total Workouts'` | `totalWorkoutsAdmin: 'Total workouts'` | Sentence case |
| context/LanguageContext.jsx:770 | `workoutsThisWeekAdmin: 'Workouts This Week'` | `workoutsThisWeekAdmin: 'Workouts this week'` | Sentence case |
| context/LanguageContext.jsx:771 | `totalMealsAdmin: 'Total Meals'` | `totalMealsAdmin: 'Total meals'` | Sentence case |
| context/LanguageContext.jsx:772 | `userList: 'User List'` | `userList: 'User list'` | Sentence case |
| context/LanguageContext.jsx:774 | `lastWorkoutDate: 'Last Workout'` | `lastWorkoutDate: 'Last workout'` | Sentence case |
| context/LanguageContext.jsx:784 | `homeWorkout: 'Home Workout'` | `homeWorkout: 'Home workout'` | Sentence case |
| context/LanguageContext.jsx:791 | `clickForTutorial: 'Click on an exercise to watch a YouTube tutorial'` | `clickForTutorial: 'Click on an exercise to watch a youTube tutorial'` | Sentence case |
| context/LanguageContext.jsx:796 | `progressionTitle: 'Your Journey'` | `progressionTitle: 'Your journey'` | Sentence case |
| context/LanguageContext.jsx:803 | `currentStreak: 'Activity Streak'` | `currentStreak: 'Activity streak'` | Sentence case |
| context/LanguageContext.jsx:804 | `longestStreak: 'Calorie Goal Streak'` | `longestStreak: 'Calorie goal streak'` | Sentence case |
| context/LanguageContext.jsx:806 | `weekStreaks: 'Week Streaks'` | `weekStreaks: 'Week streaks'` | Sentence case |
| context/LanguageContext.jsx:808 | `xpWorkout: 'Workout Completed'` | `xpWorkout: 'Workout completed'` | Sentence case |
| context/LanguageContext.jsx:809 | `xpCalorieGoal: 'Calorie Goal Met'` | `xpCalorieGoal: 'Calorie goal met'` | Sentence case |
| context/LanguageContext.jsx:810 | `xpProteinGoal: 'Protein Goal Met'` | `xpProteinGoal: 'Protein goal met'` | Sentence case |
| context/LanguageContext.jsx:811 | `xpStreakDay: 'Streak Day'` | `xpStreakDay: 'Streak day'` | Sentence case |
| context/LanguageContext.jsx:812 | `xpStreakWeek: 'Weekly Streak Bonus'` | `xpStreakWeek: 'Weekly streak bonus'` | Sentence case |
| context/LanguageContext.jsx:814 | `statDiscipline: 'Workout Discipline'` | `statDiscipline: 'Workout discipline'` | Sentence case |
| context/LanguageContext.jsx:816 | `statRecovery: 'Weight Goal'` | `statRecovery: 'Weight goal'` | Sentence case |
| context/LanguageContext.jsx:818 | `statsTitle: 'Progress Rates'` | `statsTitle: 'Progress rates'` | Sentence case |
| context/LanguageContext.jsx:823 | `badge_first_workout: 'First Step'` | `badge_first_workout: 'First step'` | Sentence case |
| context/LanguageContext.jsx:827 | `badge_workout_50: 'Workout Machine'` | `badge_workout_50: 'Workout machine'` | Sentence case |
| context/LanguageContext.jsx:829 | `badge_workout_100: 'Fitness Legend'` | `badge_workout_100: 'Fitness legend'` | Sentence case |
| context/LanguageContext.jsx:831 | `badge_streak_3: '3 Day Streak'` | `badge_streak_3: '3-day streak'` | Sentence case |
| context/LanguageContext.jsx:833 | `badge_streak_7: 'Perfect Week'` | `badge_streak_7: 'Perfect week'` | Sentence case |
| context/LanguageContext.jsx:837 | `badge_streak_30: 'Monthly Champion'` | `badge_streak_30: 'Monthly champion'` | Sentence case |
| context/LanguageContext.jsx:845 | `badge_nutrition_streak_7: 'Clean Eater'` | `badge_nutrition_streak_7: 'Clean eater'` | Sentence case |
| context/LanguageContext.jsx:847 | `badge_nutrition_streak_4: 'Nutrition Master'` | `badge_nutrition_streak_4: 'Nutrition master'` | Sentence case |
| context/LanguageContext.jsx:849 | `badge_xp_1000: '1K Club'` | `badge_xp_1000: '1K club'` | Sentence case |
| context/LanguageContext.jsx:851 | `badge_xp_5000: '5K Club'` | `badge_xp_5000: '5K club'` | Sentence case |
| context/LanguageContext.jsx:858 | `badge_workout_200: 'Fitness Soldier'` | `badge_workout_200: 'Fitness soldier'` | Sentence case |
| context/LanguageContext.jsx:870 | `badge_nutrition_streak_8: 'Nutrition Medalist'` | `badge_nutrition_streak_8: 'Nutrition medalist'` | Sentence case |
| context/LanguageContext.jsx:872 | `badge_nutrition_streak_12: 'Pro Chef'` | `badge_nutrition_streak_12: 'Pro chef'` | Sentence case |
| context/LanguageContext.jsx:874 | `badge_first_calorie_goal: 'First Calorie Goal'` | `badge_first_calorie_goal: 'First calorie goal'` | Sentence case |
| context/LanguageContext.jsx:876 | `badge_first_protein_goal: 'First Protein Goal'` | `badge_first_protein_goal: 'First protein goal'` | Sentence case |
| context/LanguageContext.jsx:878 | `badge_xp_500: 'Getting Started'` | `badge_xp_500: 'Getting started'` | Sentence case |
| context/LanguageContext.jsx:885 | `badge_first_sleep: 'Good Night'` | `badge_first_sleep: 'Good night'` | Sentence case |
| context/LanguageContext.jsx:887 | `badge_sleep_7: 'Sleep Week'` | `badge_sleep_7: 'Sleep week'` | Sentence case |
| context/LanguageContext.jsx:889 | `badge_sleep_14: 'Sleep Fortnight'` | `badge_sleep_14: 'Sleep fortnight'` | Sentence case |
| context/LanguageContext.jsx:891 | `badge_sleep_30: 'Sleep Month'` | `badge_sleep_30: 'Sleep month'` | Sentence case |
| context/LanguageContext.jsx:893 | `badge_sleep_logs_30: 'Sleep Logger'` | `badge_sleep_logs_30: 'Sleep logger'` | Sentence case |
| context/LanguageContext.jsx:895 | `badge_sleep_logs_100: 'Sleep Expert'` | `badge_sleep_logs_100: 'Sleep expert'` | Sentence case |
| context/LanguageContext.jsx:898 | `recentActivity: 'Recent Activity'` | `recentActivity: 'Recent activity'` | Sentence case |
| context/LanguageContext.jsx:62 | `ס"מ` | `ס״מ` | גרשיים עבריים (״) במקום מירכאות ASCII |
| context/LanguageContext.jsx:63 | `ק"ג` | `ק״ג` | גרשיים עבריים (״) במקום מירכאות ASCII |
| context/LanguageContext.jsx:101 | `סה"כ` | `סה״כ` | גרשיים עבריים (״) במקום מירכאות ASCII |
| context/LanguageContext.jsx:24 | `...'` | `…'` | תו שלוש-נקודות אחד (…) כמו בשאר האפליקציה |
| context/LanguageContext.jsx:35 | `passwordPlaceholder: 'לפחות 6 תווים'` | `passwordPlaceholder: 'לפחות 8 תווים'` | הכלל בפועל הוא 8 תווים וספרה (ההנחיה שמתחת לשדה אומרת כך); הטקסט אמר 6 |
| context/LanguageContext.jsx:487 | `passwordPlaceholder: 'At least 6 characters'` | `passwordPlaceholder: 'At least 8 characters'` | הכלל בפועל הוא 8 תווים וספרה |
| context/LanguageContext.jsx:48 | `'הסיסמה שונתה בהצלחה! התחבר עם הסיסמה החדשה'` | `'הסיסמה שונתה. התחבר עם הסיסמה החדשה'` | "בהצלחה!" מיותר |
| context/LanguageContext.jsx:500 | `'Password changed successfully! Log in with your new password'` | `'Password changed. Log in with your new password'` | "successfully!" מיותר |
| context/LanguageContext.jsx:233 | `'הארוחה נמחקה בהצלחה'` | `'הארוחה נמחקה'` | "בהצלחה" מיותר |
| context/LanguageContext.jsx:677 | `'Meal deleted successfully'` | `'Meal deleted'` | "successfully" מיותר |
| context/LanguageContext.jsx:163 | `workoutSaved: 'נרשם בהצלחה!'` | `workoutSaved: 'נרשם'` | "בהצלחה!" מיותר |
| context/LanguageContext.jsx:610 | `workoutSaved: 'saved successfully!'` | `workoutSaved: 'logged'` | "successfully!" מיותר; "log" הוא הפועל לאימון/ארוחה/שינה |
| context/LanguageContext.jsx:171 | `'מעקב אחר ההתקדמות שלך \| מטרה:'` | `'מעקב אחר ההתקדמות שלך'` | הסיומת "\| מטרה:" נשארה בלי ערך אחריה |
| context/LanguageContext.jsx:617 | `'Track your progress \| Goal:'` | `'Track your progress'` | הסיומת "\| Goal:" נשארה בלי ערך אחריה |
| context/LanguageContext.jsx:219 | `'שמור על משקלי העבודה - ירידה בכוח = סימן לגירעון אגרסיבי מדי'` | `'שמור על משקלי העבודה: ירידה בכוח היא סימן לגירעון אגרסיבי מדי'` | מקף כמחבר ו-"=" בטקסט |
| context/LanguageContext.jsx:663 | `'Maintain working weights - strength loss = sign of too aggressive deficit'` | `'Maintain your working weights: losing strength is a sign of too aggressive a deficit'` | מקף כמחבר ו-"=" בטקסט |
| context/LanguageContext.jsx:221 | `'העדף אופניים/שחייה על ריצה - פחות פגיעה בשריר'` | `'העדף אופניים או שחייה על ריצה: פחות פגיעה בשריר'` | מקף כמחבר |
| context/LanguageContext.jsx:665 | `'Prefer cycling/swimming over running - less muscle damage'` | `'Prefer cycling or swimming over running: less muscle damage'` | מקף כמחבר |
| context/LanguageContext.jsx:222 | `'נפח אימון מינימלי (4-6 סטים לשריר בשבוע) - MV'` | `'נפח אימון מינימלי: 4-6 סטים לשריר בשבוע'` | מקף והקיצור "MV" שלא אומר דבר למשתמש |
| context/LanguageContext.jsx:666 | `'Minimum training volume (4-6 sets per muscle per week) - MV'` | `'Minimum training volume: 4-6 sets per muscle per week'` | מקף והקיצור "MV" |
| context/LanguageContext.jsx:223 | `'שמור על עצימות גבוהה (RPE 8-9) - זה מה ששומר על שריר'` | `'שמור על עצימות גבוהה (RPE 8-9): זה מה ששומר על שריר'` | מקף כמחבר |
| context/LanguageContext.jsx:667 | `'Keep high intensity (RPE 8-9) - this is what preserves muscle'` | `'Keep intensity high (RPE 8-9): this is what preserves muscle'` | מקף כמחבר |
| context/LanguageContext.jsx:224 | `'אין צורך להגדיל משקלים - שמירה על רמה נוכחית'` | `'אין צורך להגדיל משקלים: שמירה על רמה נוכחית'` | מקף כמחבר |
| context/LanguageContext.jsx:668 | `'No need to increase weights - maintain current level'` | `'No need to increase weights: maintain current level'` | מקף כמחבר |
| context/LanguageContext.jsx:226 | `'עלייה הדרגתית (Progressive Overload) - שיטת Double Progression'` | `'עלייה הדרגתית (Progressive Overload), בשיטת Double Progression'` | מקף כמחבר |
| context/LanguageContext.jsx:670 | `'Progressive Overload - Double Progression method'` | `'Progressive overload, using the double progression method'` | מקף כמחבר; Sentence case |
| context/LanguageContext.jsx:228 | `מתחילים 1-1.5%/חודש, מתקדמים 0.5-1%, מתאמנים מנוסים <0.5%` | `מתחילים 1-1.5%/חודש, מתקדמים 0.5-1%, מתאמנים מנוסים פחות מ-0.5%` | בעיית bidi: "<" מתהפך ל-">" בתוך טקסט RTL (כמו SleepTracker) |
| context/LanguageContext.jsx:672 | `advanced <0.5%` | `advanced under 0.5%` | תאום לעברית ("פחות מ-") |
| context/LanguageContext.jsx:229 | `'עלייה מהירה מדי = צבירת שומן מיותרת - התאם קלוריות'` | `'עלייה מהירה מדי היא צבירת שומן מיותרת: התאם קלוריות'` | מקף כמחבר ו-"=" בטקסט |
| context/LanguageContext.jsx:673 | `'Gaining too fast = unnecessary fat gain - adjust calories'` | `'Gaining too fast means unnecessary fat gain: adjust calories'` | מקף כמחבר ו-"=" בטקסט |
| context/LanguageContext.jsx:408 | `'1K מועדון'` | `'מועדון 1K'` | סדר מילים הפוך (תרגום מילולי של "1K Club") |
| context/LanguageContext.jsx:410 | `'5K מועדון'` | `'מועדון 5K'` | סדר מילים הפוך (תרגום מילולי של "5K Club") |
| context/LanguageContext.jsx:424 | `'הגעת לרמה 3'` | `'הגע לרמה 3'` | תיאור תג שעוד לא הושג צריך להיות בציווי ("Reach level N") |
| context/LanguageContext.jsx:399 | `'הגעת לרמה 5'` | `'הגע לרמה 5'` | תיאור תג שעוד לא הושג צריך להיות בציווי ("Reach level N") |
| context/LanguageContext.jsx:401 | `'הגעת לרמה 10'` | `'הגע לרמה 10'` | תיאור תג שעוד לא הושג צריך להיות בציווי ("Reach level N") |
| context/LanguageContext.jsx:426 | `'הגעת לרמה 15'` | `'הגע לרמה 15'` | תיאור תג שעוד לא הושג צריך להיות בציווי ("Reach level N") |
| context/LanguageContext.jsx:403 | `'הגעת לרמה 20'` | `'הגע לרמה 20'` | תיאור תג שעוד לא הושג צריך להיות בציווי ("Reach level N") |
| context/LanguageContext.jsx:428 | `'הגעת לרמה 30'` | `'הגע לרמה 30'` | תיאור תג שעוד לא הושג צריך להיות בציווי ("Reach level N") |
| context/LanguageContext.jsx:832 | `badge_streak_3_desc: '3 day streak'` | `badge_streak_3_desc: '3-day streak'` | "N-day" עם מקף, כמו בשאר האפליקציה |
| context/LanguageContext.jsx:834 | `badge_streak_7_desc: '7 day streak'` | `badge_streak_7_desc: '7-day streak'` | "N-day" עם מקף, כמו בשאר האפליקציה |
| context/LanguageContext.jsx:836 | `badge_streak_14_desc: '14 day streak'` | `badge_streak_14_desc: '14-day streak'` | "N-day" עם מקף, כמו בשאר האפליקציה |
| context/LanguageContext.jsx:838 | `badge_streak_30_desc: '30 day streak!'` | `badge_streak_30_desc: '30-day streak!'` | "N-day" עם מקף, כמו בשאר האפליקציה |
| context/LanguageContext.jsx:861 | `badge_streak_60_desc: '60 day streak'` | `badge_streak_60_desc: '60-day streak'` | "N-day" עם מקף, כמו בשאר האפליקציה |
| context/LanguageContext.jsx:863 | `badge_streak_100_desc: '100 day streak!'` | `badge_streak_100_desc: '100-day streak!'` | "N-day" עם מקף, כמו בשאר האפליקציה |
| context/LanguageContext.jsx:536 | `'Less than 6 months training'` | `'Less than 6 months of training'` | דקדוק |
| context/LanguageContext.jsx:593 | `todayMeals: "Today's Meals"` | `todayMeals: "Today's meals"` | Sentence case |
| context/LanguageContext.jsx:622 | `calorieProgressToday: "Today's Calorie Progress"` | `calorieProgressToday: "Today's calorie progress"` | Sentence case |
| context/LanguageContext.jsx:625 | `proteinProgressToday: "Today's Protein Progress"` | `proteinProgressToday: "Today's protein progress"` | Sentence case |
| context/LanguageContext.jsx:718 | `sleepLogToday: "Today's Sleep"` | `sleepLogToday: "Today's sleep"` | Sentence case |
| pages/Login.jsx:125 | `'Your session expired. Please sign in again.'` | `'Your session expired. Please log in again.'` | מונח אחד: "log in" / "התחבר" (היו "sign in" ו-"log in" לסירוגין) |
| pages/Login.jsx:209 | `'Google sign-in failed'` | `'Google login failed'` | מונח אחד: log in |
| pages/Login.jsx:420 | `'Signing in…'` | `'Logging in…'` | מונח אחד: log in |
| pages/Login.jsx:510 | `isHe ? 'היכנס' : 'Sign in'` | `isHe ? 'התחבר' : 'Log in'` | מונח אחד: "התחבר" / "Log in" (היה "היכנס" / "Sign in" בכפתור ו"התחבר" בשאר המקומות) |
| pages/Login.jsx:679 | `'קבע סיסמה והיכנס' : 'Set password & sign in'` | `'קבע סיסמה והתחבר' : 'Set password & log in'` | מונח אחד: log in |
| pages/OnboardingFlow.jsx:278 | `'Google sign-in failed'` | `'Google login failed'` | מונח אחד: log in |
| pages/OnboardingFlow.jsx:691 | `'Signing in…'` | `'Logging in…'` | מונח אחד: log in |
| context/AuthContext.jsx:105 | `'Google Sign-In not available — please refresh the page.'` | `'Google login isn\'t available. Please refresh the page.'` | מקף; Title case; מונח אחד: login |
| context/AuthContext.jsx:123 | `'Google sign-in was cancelled'` | `'Google login was canceled'` | מונח אחד: login; איות אמריקאי |
| context/LanguageContext.jsx:56 | `onboardingTitle: 'בוא נכיר אותך'` | `onboardingTitle: 'ספר לנו על עצמך'` | "בוא נ-" כפתיח (מחרוזת לא בשימוש כרגע) |
| context/LanguageContext.jsx:509 | `onboardingTitle: "Let's get to know you"` | `onboardingTitle: 'Tell us about yourself'` | פתיח "Let's" (מחרוזת לא בשימוש כרגע) |
| context/LanguageContext.jsx:380 | `badgeUnlocked: 'נפתח!'` | `badgeUnlocked: 'הושג!'` | תאום ל-"Earned" (מחרוזת לא בשימוש כרגע) |
| context/LanguageContext.jsx:821 | `badgeUnlocked: 'Unlocked!'` | `badgeUnlocked: 'Earned!'` | "unlock" אסור; המונח במסך התגים הוא "Earned" |
| context/LanguageContext.jsx:353 | `'צבור XP, עלה רמות וגלה הישגים'` | `'צבור XP, עלה רמות ואסוף הישגים'` | תאום לאנגלית (collect) |
| context/LanguageContext.jsx:797 | `'Earn XP, level up, and unlock achievements'` | `'Earn XP, level up, and collect achievements'` | "unlock" אסור |
| pages/Dashboard.jsx:1291 | `'Privacy & Security'` | `'Privacy & security'` | Sentence case |
| components/NutritionTracker.jsx:1367 | `'fibre'` | `'fiber'` | איות אמריקאי ומונח אחד ("Fiber" כמו ב-t.fiber) |
| components/WorkoutPlan.jsx:362 | `'ק"ג'` | `'ק״ג'` | גרשיים עבריים (״) במקום מירכאות ASCII, כמו בשאר האפליקציה |
| components/AdminPanel.jsx:150 | `'ס"מ'` | `'ס״מ'` | גרשיים עבריים (״) במקום מירכאות ASCII, כמו בשאר האפליקציה |
| components/NutritionTracker.jsx:29 | `'קק"ל'` | `'קק״ל'` | גרשיים עבריים (״) במקום מירכאות ASCII, כמו בשאר האפליקציה |
| components/NutritionTracker.jsx:565 | `'סה"כ'` | `'סה״כ'` | גרשיים עבריים (״) במקום מירכאות ASCII, כמו בשאר האפליקציה |

## החלפות "—" בלבד (מספר לפי קובץ)

| קובץ | החלפות |
|---|---|
| pages/Login.jsx | 2 |
| pages/OnboardingFlow.jsx | 8 |
| pages/Dashboard.jsx | 4 |
| components/WorkoutPlan.jsx | 1 |
| components/WorkoutSession.jsx | 2 |
| components/NutritionTracker.jsx | 3 |
| components/BMICard.jsx | 2 |
| components/Progress.jsx | 8 |
| components/ProgressionPanel.jsx | 1 |
| **סה״כ** | **31** |

בנוסף: 45 מהשינויים בטבלה הראשית כוללים הסרת מקף יחד עם תיקון נוסף.

## "—" שנשארו בקוד שמוצג למשתמש

**סימן ערך ריק (מותר):** 10 שורות.

- `pages/Dashboard.jsx:1747:                  ? (isHe ? 'נשלח קוד לכתובת ${user?.email || '—'}.' : 'We'll send a code to ${user?.email || '—'}.')`
- `components/WorkoutPlan.jsx:948:                  : done.length > 0 ? '${done.length}×${top?.reps || '—'}${top?.weight ? ' @ ${top.weight}' : ''}' : '$`
- `components/WorkoutPlan.jsx:1050:    if (d.kind === 'legacy') return d.sets + '×' + (d.reps || '—');`
- `components/WorkoutPlan.jsx:1051:    return d.sets + '×' + (d.reps ?? '—') + (d.weight ? ' @ ' + d.weight + (isHe ? ' ק״ג' : ' kg') : '');`
- `components/NutritionTracker.jsx:1138:                    <span style={{ fontSize: 12.5, color: '#7C8798', fontVariantNumeric: 'tabular-nums' }}>{weekl`
- `components/NutritionTracker.jsx:1456:                <span style={{ fontSize: 13, color: '#7C8798', fontVariantNumeric: 'tabular-nums' }}>{menuTimes[n`
- `components/NutritionTracker.jsx:1509:                      {Math.round(r.cur).toLocaleString()} / {r.tgt > 0 ? Math.round(r.tgt).toLocaleString() : '—`
- `components/NutritionTracker.jsx:1557:                      <span style={{ fontSize: 12.5, color: '#7C8798', fontVariantNumeric: 'tabular-nums', flexSh`
- `components/WorkoutSession.jsx:596:                      : '${done.length}×${top?.reps || '—'}${top?.weight ? ' @ ${top.weight}' : ''}'}`
- `components/WorkoutSession.jsx:764:                  {perf.sets.length}×{perf.sets[0]?.reps || '—'}`

**אחר (הערות קוד ומחרוזות שאינן מוצגות):** 4

- `pages/OnboardingFlow.jsx:644:                  save it to — blurred rather than absent so it reads as "more",`
- `pages/OnboardingFlow.jsx:730:                      tick — it's the record that consent was actually given, and`
- `components/NutritionTracker.jsx:1538:                          circle) — tapping it directly toggles the meal without`
- `components/WorkoutSession.jsx:818:                      to be writable — volume and PRs are computed from them —`

בנוסף: `LegalModal.jsx`, `notifConfig.mjs` ושמות התרגילים לא נבדקו לפי ההנחיה (ראו להלן את נוסח ההתראות).

## פתוח (לא מומש)

1. **צורת פנייה.** רוב האפליקציה בציווי בלשון זכר יחיד ("הזן", "בחר", "הוסף"), וזה נשמר. חריגים שזוהו ולא הומרו:
   - ציווי ברבים, 5 מחרוזות: `SettingsSearch.jsx:170,171,173` ("בדקו", "נסו", "עברו"), `NutritionTracker.jsx:1263` ("נסו", "בחרו"), `logFeedback.mjs:30` ("כתבו").
   - לשון סתמית "יש ל-…", 6 מחרוזות: `OnboardingFlow.jsx:261,301` ("יש לאשר"), `LanguageContext.jsx:32,71` ("יש למלא"), `:249,250` ("יש להוריד / יש להעלות"). שתי מחרוזות מהקבוצה הזו הומרו לציווי כשנגעתי בהן ממילא (`NutritionTracker` כמות בגרמים, `manualMeal` "הזן מספר").
   - הצעה: להמיר את 5 הרבים ל"בדוק / נסה / עבור / בחר / כתוב".
2. **הודעות שרת בעברית בלבד.** 58 מחרוזות `message` בעברית בשרת: 52 ב-`server/routes` (`auth` 25, `user` 19, `admin` 3, `sleep` 3, `workout` 2) ו-6 ב-`middleware` / `utils`. רק 17 מהן מלוות ב-`messageEn` (`auth` 12, `user` 5). `AuthContext.jsx:46` מציג `messageHe` בעברית, ואחרת `message`, כלומר משתמש באנגלית שמקבל שגיאה בלי `messageEn` עלול לראות עברית. לא אומת בפועל. לא נערך, כי זה שינוי שרת שדורש פריסה.
3. **שגיאות Google באנגלית בלבד בקליינט.** `AuthContext.jsx:96,105,117,123` מחזיר מחרוזות באנגלית בלבד שמוצגות גם למשתמש בעברית (`Login.jsx:209,225`). הוספת תרגום דורשת גישה לשפה בתוך `AuthContext`, כלומר שינוי קוד.
4. **נוסח התראות (`lib/notifConfig.mjs`), בדיקה ודיווח בלבד.**
   - הקובץ `ניסוחים של ההתראות.pdf` לא נמצא במאגר ולא בסביבת העבודה, ולכן לא ניתן היה להשוות מולו. `docs/notifications.md` מתאר מבנה בלבד ואינו כולל את הנוסח.
   - מצאתי לפי כללי הסבב: מקף בגוף התראת האימון (`COPY.workout`, עברית ואנגלית); "מעקב מדויק" / "tracking accurate" בהתראת ארוחת הבוקר (`COPY.meal_morning`), כלומר הבטחת דיוק; באנגלית התראת הרצף חוזרת על "keep your streak going" גם בכותרת וגם בגוף; כותרות ההתראות מכילות אימוג'י (לא נסתר, רק נרשם).
   - הנוסח סומן שם "approved in 3dcec53", ולכן לא שיניתי.
5. **שם הלשונית "Journey" / "מסע".** כלל 4 אוסר "journey" באנגלית, אבל זה שם הלשונית (`Dashboard.jsx:122`, כותרת המסך `:318`) ובמפתחות שלא בשימוש (`startJourney`, `progressionTitle`). שינוי שם לשונית הוא החלטת מוצר ולכן לא נגעתי. "Progress" תתנגש בתת-הלשונית הקיימת. הוסר "Journey to goal" ב-`BMICard` (עכשיו "Path to your goal").
6. **גרמים בעברית.** שלוש צורות: `g` לטינית במסכי המאקרו ("0/124g"), "ג׳" ב-`ManualMealForm` וב-`logFeedback`, "גרם" במילים. לא הוחלפו כי המסכים צפופים. הצעה: "ג׳" או "גרם" בכל מקום.
7. **טווחי מספרים עם "–".** `BMICard.jsx:778`, `SleepTracker.jsx` (מומלץ 7–9), `sleepAdvice.mjs` ×4. נחשבו טווח ולא מחבר משפטים. לפי קריאה קשיחה של כלל 1, צריך "7 עד 9" / "7 to 9".
8. **כותרות לא זהות בעברית ובאנגלית, ללא שינוי.** כרטיס השינה (משימה 2): "השבוע האחרון" מול "Last 7 days" (אותו חלון של 7 ימים). לשונית התזונה: "תפריט מומלץ" מול "Menu" (הכפתור צר ב-360px).
9. **"בוא נתחיל"** נשאר בעברית (האנגלית שונתה ל-"Get started"): כלל 2 מונה "Let's" אבל לא את המקבילה העברית.
10. **מחרוזות שלא בשימוש.** 172 מפתחות ב-`LanguageContext` אינם מופיעים בקוד (בהם 5 עם מקף מחבר: `tipProtein/Carbs/Fat/Fiber`, `consistencyMatters`). הומר רק Sentence case ו-"unlock/Let's". הצעה: למחוק אותם.
11. **שמות מאכלים ותרגילים** (`FOOD_DB`, `exerciseLibrary`, `exerciseCues`, `homeExercises`) לא נסרקו באופן שיטתי, ולכן לא נרשמו שגיאות כתיב.
12. **גרשיים באנגלית.** ’ וגם ' משמשים לסירוגין באותן שפות (למשל `Login.jsx`, `BMICard.jsx`). קוסמטי, לא שונה.
13. **"Menu" לעומת "My daily menu".** נשאר כך, כל אחד בהקשר שלו.

## אימות

- `cd client && npm test`: 205 / 205. `cd server && node --test "utils/*.test.js"`: 154 / 154. `npm run build`: עובר.
- בדיקה ויזואלית: 6 מסכים (התחברות, הרשמה, היום, אימון, תזונה, מסע) × עברית / אנגלית × dark / light, ב-360×740. 24 צילומים, אין גלישה אופקית באף אחד (`scrollWidth ≤ clientWidth`). כל התוכן הוצג מול שרת API מזויף בלי מסד נתונים (`localhost:3001`, מחשב יעדים עם פונקציות השרת האמיתיות), כי `mongodb-memory-server` לא מותקן בסביבה. **לא אומת על מכשיר.**
