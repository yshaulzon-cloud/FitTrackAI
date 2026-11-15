// Audit of the suggested menus against the food database. Read-only: it changes no
// menu value and no food value; it only writes docs/nutrition-menu-audit.md.
//
//   cd server && node scripts/menu-audit.js
//
// For each of the 150 menu meals (30 plans × 5) it reads the menu line the way the app
// does (utils/mealItems.js → utils/foodText.js), adds up the matched foods from FOOD_DB
// with the quantities the line gives, and compares that with the numbers the menu
// states. How far the comparison can be trusted depends on the line, so every meal gets
// a certainty tier:
//   גבוהה   every food is in FOOD_DB and ≤10% of the calories rest on an amount nobody wrote
//   בינונית every food is in FOOD_DB but 10–25% of the calories rest on an assumed amount
//   נמוכה   a food is missing from FOOD_DB, or >25% of the calories rest on assumed amounts
// "assumed amount" = the line gives no weight, count or measure for that food, so the
// engine uses one serving (or 100 g) — see data/portions.js.
// A line is also demoted to נמוכה when the engine left a word that is not a food it
// knows ("סקופ", "סנדוויץ׳", "הודו" …): it then read only part of the line.
const fs = require('fs');
const path = require('path');
const { mealPlans } = require('../data/mealPlans');
const { estimator } = require('../utils/calculations');
const { splitComponents } = require('../utils/mealItems');

const OUT = path.join(__dirname, '..', '..', 'docs', 'nutrition-menu-audit.md');
const TYPE_HE = { breakfast: 'בוקר', snack: 'חטיף', lunch: 'צהריים', dinner: 'ערב' };
const r0 = (n) => Math.round(n);
const pct = (n) => `${Math.round(n * 100)}%`;
const esc = (s) => String(s).replace(/\|/g, '\\|');

const plans = Object.entries(mealPlans).flatMap(([range, list]) => list.map((p) => ({ range, ...p })));

const rows = [];
for (const plan of plans) {
  plan.meals.forEach((m, mi) => {
    const eng = { cal: 0, p: 0, c: 0, f: 0 };
    let assumedCal = 0;
    const missing = [];
    const assumedFoods = [];
    const unread = [];
    for (const comp of splitComponents(m.he)) {
      const { foods, unmatched } = estimator.parse(comp);
      if (!foods.length) { missing.push(comp); continue; }
      unread.push(...unmatched); // the engine already leaves out cooking and size words
      const f = foods.reduce((b, x) => (x.name.length > b.name.length ? x : b), foods[0]);
      const k = f.grams / 100;
      const cal = f.entry.cal * k;
      eng.cal += cal; eng.p += f.entry.p * k; eng.c += f.entry.c * k; eng.f += f.entry.f * k;
      if (f.quantityAssumed) { assumedCal += cal; assumedFoods.push(`${f.entry.keys[0]} (${r0(f.grams)} ג׳)`); }
    }
    const assumedShare = eng.cal > 0 ? assumedCal / eng.cal : 0;
    const tier = missing.length || unread.length || assumedShare > 0.25 ? 'נמוכה' : assumedShare > 0.1 ? 'בינונית' : 'גבוהה';
    const ratio = eng.cal > 0 ? m.calories / eng.cal : null;
    const atwater = 4 * m.protein + 4 * m.carbs + 9 * m.fat;
    const atwaterOff = Math.abs(atwater - m.calories) / m.calories > 0.1;
    let rec;
    if (missing.length) rec = 'חסר במאגר: ' + missing.join(' · ');
    else if (unread.length) rec = 'המנוע לא קרא: ' + [...new Set(unread)].join(' · ');
    else if (ratio >= 0.85 && ratio <= 1.15) rec = tier === 'גבוהה' ? 'תואם — להשאיר' : 'תואם בקירוב — כדאי לכתוב משקל';
    else if (tier === 'גבוהה') rec = 'פער אמיתי — להכריע איזה מקור נכון';
    else if (tier === 'בינונית') rec = 'אי אפשר להכריע — חלק מהכמויות הונחו';
    else rec = 'אי אפשר להכריע — רוב הכמויות הונחו';
    rows.push({ plan: plan.id, type: m.type, he: m.he, menu: m, eng, ratio, assumedShare, tier, missing, unread, assumedFoods, atwater, atwaterOff, rec });
  });
}

const count = (arr, fn) => arr.filter(fn).length;
const tiers = ['גבוהה', 'בינונית', 'נמוכה'].map((t) => [t, count(rows, (r) => r.tier === t)]);
const comparable = rows.filter((r) => r.ratio != null && !r.missing.length);
const inRange = (rs) => count(rs, (r) => r.ratio >= 0.85 && r.ratio <= 1.15);
const sortedRatios = comparable.map((r) => r.ratio).sort((a, b) => a - b);
const median = sortedRatios[Math.floor(sortedRatios.length / 2)];
const high = rows.filter((r) => r.tier === 'גבוהה');
const mid = rows.filter((r) => r.tier === 'בינונית');
// Only meals whose comparison means something (tier גבוהה / בינונית) belong in a "biggest gaps"
// list; for the others the gap is mostly the engine's own assumptions.
const gaps = rows.filter((r) => (r.tier === 'גבוהה' || r.tier === 'בינונית') && r.ratio != null)
  .sort((a, b) => Math.abs(Math.log(b.ratio)) - Math.abs(Math.log(a.ratio)));
const unreadMeals = rows.filter((r) => r.unread.length);

// Foods the menus name that FOOD_DB does not know, and amounts nobody wrote — both feed the food audit.
const missingFreq = new Map();
rows.forEach((r) => r.missing.forEach((x) => missingFreq.set(x, (missingFreq.get(x) || 0) + 1)));
const unreadFreq = new Map();
rows.forEach((r) => [...new Set(r.unread)].forEach((x) => unreadFreq.set(x, (unreadFreq.get(x) || 0) + 1)));
const assumedFreq = new Map();
rows.forEach((r) => r.assumedFoods.forEach((x) => assumedFreq.set(x, (assumedFreq.get(x) || 0) + 1)));
const top = (map, n) => [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);

const L = [];
L.push('# ביקורת התפריטים מול מאגר המזון');
L.push('');
L.push('נוצר על ידי `server/scripts/menu-audit.js` (קריאה בלבד: הסקריפט לא משנה ערך בתפריט ולא במאגר). להרצה מחדש: `cd server && node scripts/menu-audit.js`.');
L.push('');
L.push(`נבדקו ${plans.length} תפריטים, ${rows.length} ארוחות. לכל ארוחה: הערכים שהתפריט מצהיר עליהם מול סכום המאכלים מהמאגר (\`FOOD_DB\`, ערכים ל-100 גרם) לפי הכמויות שכתובות בשורת הארוחה.`);
L.push('');
L.push('## איך לקרוא את הדוח');
L.push('');
L.push('- **יחס** = קלוריות התפריט ÷ קלוריות לפי המאגר. 1.00 = הסכמה מלאה; מתחת ל-1 = התפריט נמוך מהמאגר.');
L.push('- **כמות שהונחה:** כשהשורה לא כותבת משקל, ספירה או מידה (למשל ״סלט ירקות״), המנוע לוקח מנה אחת או 100 גרם. כל חלק מהסכום שנשען על הנחה כזו מוגדר כאן ״הנחה״, והוא לא ראיה לכאן או לכאן.');
L.push('- **רמת ודאות:** גבוהה = כל המאכלים במאגר ולא יותר מ-10% מהקלוריות נשענות על הנחה; בינונית = כל המאכלים במאגר, 10–25% הנחה; נמוכה = יש מאכל שחסר במאגר, מילה שהמנוע לא קרא, או יותר מ-25% הנחה. (הסף נקבע מהנתונים: ככל שהחלק המונח גדל, ההסכמה בין התפריט למאגר נעלמת, ראו הטבלה למטה.)');
L.push('- **בדיקת אטווטר:** האם קלוריות התפריט תואמות את המאקרו שלו (4×חלבון + 4×פחמימה + 9×שומן), בלי מאגר ובלי הנחות.');
L.push('');
L.push('## סיכום');
L.push('');
L.push('| מדד | ערך |');
L.push('|---|---|');
for (const [t, n] of tiers) L.push(`| ארוחות ברמת ודאות ${t} | ${n} מתוך ${rows.length} |`);
L.push(`| ארוחות שכל המאכלים שלהן במאגר (מותר שחלק מהכמויות הונחו) | ${comparable.length} מתוך ${rows.length} |`);
L.push(`| ארוחות עם מאכל שחסר במאגר | ${count(rows, (r) => r.missing.length)} |`);
L.push(`| ארוחות שהמנוע לא קרא בהן מילה שהיא כנראה מאכל | ${unreadMeals.length} |`);
L.push(`| חציון היחס (קלוריות תפריט ÷ מאגר), ארוחות שכולן במאגר | ${median.toFixed(2)} |`);
L.push(`| ארוחות במאגר שהיחס שלהן בין 0.85 ל-1.15 | ${inRange(comparable)} מתוך ${comparable.length} (${pct(inRange(comparable) / comparable.length)}) |`);
L.push(`| …מתוכן ברמת ודאות גבוהה | ${inRange(high)} מתוך ${high.length} |`);
L.push(`| …מתוכן ברמת ודאות בינונית | ${inRange(mid.filter((r) => !r.missing.length))} מתוך ${mid.length} |`);
L.push(`| ארוחות שהקלוריות שלהן לא תואמות את המאקרו שלהן (אטווטר, פער מעל 10%) | ${count(rows, (r) => r.atwaterOff)} מתוך ${rows.length} |`);
L.push('');
const lowShare = count(rows, (r) => r.tier === 'נמוכה');
L.push(`**מה זה אומר:** ${lowShare} מתוך ${rows.length} ארוחות ברמת ודאות נמוכה: התפריט לא כותב משקל לרוב הרכיבים, או שהמנוע לא קרא חלק מהשורה. בארוחות כאלה הפער מול המאגר נובע בעיקר מהנחות של 100 גרם (למשל 100 גרם שיבולת שועל + 100 גרם חלב + 100 גרם תמרים בבוקר אחד), ולא ראיה שהתפריט שגוי או שהמאגר שגוי. רק ${high.length} ארוחות ברמת ודאות גבוהה ו-${mid.length} בבינונית מאפשרות השוואה של ממש, ובהן ${inRange(high)} מתוך ${high.length} ו-${inRange(mid)} מתוך ${mid.length} בטווח 0.85–1.15.`);
L.push('');

L.push('## הסכמה בין התפריט למאגר, לפי כמה מהכמויות הונחו');
L.push('');
L.push('ארוחות שכל המאכלים שלהן במאגר (בלי מילים שלא נקראו). ככל שהחלק המונח קטן, התפריט והמאגר מסכימים; ככל שהוא גדל, המאגר גבוה מהתפריט, כי המנוע מניח 100 גרם לכל רכיב שלא נכתב לו משקל (גם שמן, אגוזים ותמרים).');
L.push('');
L.push('| חלק הקלוריות שנשען על הנחה | ארוחות | בטווח 0.85–1.15 | חציון היחס |');
L.push('|---|---|---|---|');
const pure = rows.filter((r) => r.ratio != null && !r.missing.length && !r.unread.length);
for (const [lo, hi, label] of [[0, 0.001, '0% (הכול כתוב)'], [0.001, 0.1, 'עד 10%'], [0.1, 0.25, '10%–25%'], [0.25, 0.5, '25%–50%'], [0.5, 1.01, 'מעל 50%']]) {
  const g = pure.filter((r) => r.assumedShare >= lo && r.assumedShare < hi);
  const med = g.map((r) => r.ratio).sort((a, b) => a - b)[Math.floor(g.length / 2)];
  L.push(`| ${label} | ${g.length} | ${inRange(g)} | ${g.length ? med.toFixed(2) : '—'} |`);
}
L.push('');

L.push('## ההחלטה: המספרים של התפריט הם האמת (אפשרות א׳, אושרה)');
L.push('');
L.push('כשהכמויות כתובות, התפריט והמאגר מסכימים (הטבלה למעלה), כלומר הערכים בתפריט סבירים. **שורות התפריט לא שונו.** מה שבוצע בעקבות ההחלטה הוא שיפור בקריאת השורות, וכן תיקון קלוריות של חמש ארוחות:');
L.push('');
L.push('- יחידת ״סקופ״ (עם אבקת חלבון של 30 ג׳ לסקופ), ״סנדוויץ׳ X״ (X + שתי פרוסות לחם שמסומנות כהנחה), ״סטייק בקר״ ו-״סטייק הודו״, ותיאורי הכנה וגודל שכבר לא נחשבים ״מילים שלא זוהו״.');
L.push('- שמן, טחינה, דבש, חמאת בוטנים, מיונז וחמאה בלי כמות נקראים ככף אחת (מסומן כהנחה) ולא כ-100 גרם. עד עכשיו ״שמן זית״ בלי משקל נספר כ-884 קק״ל.');
L.push('- תוקנו ערכים במאגר (טחינה, אבקת חלבון ועוד, ראו docs/nutrition-audit.md).');
L.push('- **חמש ארוחות שהקלוריות שלהן לא תאמו את המאקרו שלהן** תוקנו כך שהקלוריות הן מה שהמאקרו נותנים (4×חלבון + 4×פחמימה + 9×שומן), מעוגל ל-10: חטיף חלבון 180 ← 210; תפריט 144 צהריים 780 ← 690; תפריט 281 צהריים 1200 ← 1080; תפריט 283 צהריים 1400 ← 1240 וערב 1050 ← 930. הבחירה לתקן את הקלוריות ולא את המאקרו היא החלטה שלי (אין דרך לדעת מה שגוי); ההערה בקוד ליד כל ארוחה שומרת את הערך הישן. סכומי התפריטים עודכנו, ובדיקה חדשה שומרת על ההתאמה.');
L.push('');
L.push('**עדיין פתוח:** רכיבים בלי משקל בשורות התפריט (הטבלה ״הכמויות שהתפריט לא כותב״). כדי לצמצם עוד את אי-הוודאות צריך לכתוב להם משקל. זה משנה את הטקסט שהמשתמש רואה ודורש לדעת מה הכמות המתוכננת, ולכן לא נעשה.');
L.push('');

L.push('## הפערים הגדולים ביותר (רק ארוחות ברמת ודאות גבוהה או בינונית)');
L.push('');
L.push('| תפריט · ארוחה | שורת התפריט | קק״ל תפריט | קק״ל מאגר | יחס | חלבון תפריט/מאגר | ודאות |');
L.push('|---|---|---|---|---|---|---|');
for (const r of gaps.slice(0, 15)) {
  L.push(`| ${r.plan} · ${TYPE_HE[r.type] || r.type} | ${esc(r.he)} | ${r.menu.calories} | ${r0(r.eng.cal)} | ${r.ratio.toFixed(2)} | ${r.menu.protein} / ${r0(r.eng.p)} | ${r.tier} |`);
}
L.push('');

L.push('## מילים בשורות התפריט שהמנוע לא קרא');
L.push('');
L.push('מילים שבהן המנוע לא זיהה מאכל (תיאורי הכנה וגודל כמו אפוי או גדולה כבר מוחרגים). בארוחה כזו המנוע קרא רק חלק מהשורה. אחרי התיקונים האחרונים נקראים כעת נכון ״סקופ״, ״סנדוויץ׳ X״ (X + שתי פרוסות לחם שמסומנות כהנחה), ״סטייק בקר״ ו-״סטייק הודו״.');
L.push('');
L.push('| מילה | ארוחות |');
L.push('|---|---|');
for (const [name, n] of top(unreadFreq, 30)) L.push(`| ${esc(name)} | ${n} |`);
if (!unreadFreq.size) L.push('| (אין) | 0 |');
L.push('');

L.push('## מאכלים שהתפריטים מזכירים ואינם במאגר');
L.push('');
L.push('| רכיב בשורת התפריט | מופעים |');
L.push('|---|---|');
for (const [name, n] of top(missingFreq, 30)) L.push(`| ${esc(name)} | ${n} |`);
if (!missingFreq.size) L.push('| (אין) | 0 |');
L.push('');

L.push('## הכמויות שהתפריט לא כותב (הנחות נפוצות)');
L.push('');
L.push('אם יוחלט שהמאגר הוא האמת, הדרך ליישור היא לכתוב משקל בשורה, ובמיוחד עבור הרכיבים האלה:');
L.push('');
L.push('| רכיב (משקל שהונח) | מופעים |');
L.push('|---|---|');
for (const [name, n] of top(assumedFreq, 20)) L.push(`| ${esc(name)} | ${n} |`);
L.push('');

L.push('## ארוחות שהקלוריות שלהן לא תואמות את המאקרו שלהן');
L.push('');
L.push('בדיקה פנימית של התפריט עצמו, בלי מאגר: קלוריות מול 4P+4C+9F.');
L.push('');
L.push('| תפריט · ארוחה | שורת התפריט | קק״ל מוצהרות | קק״ל לפי המאקרו |');
L.push('|---|---|---|---|');
for (const r of rows.filter((x) => x.atwaterOff)) L.push(`| ${r.plan} · ${TYPE_HE[r.type] || r.type} | ${esc(r.he)} | ${r.menu.calories} | ${r0(r.atwater)} |`);
L.push('');

L.push('## כל 150 הארוחות');
L.push('');
L.push('קק״ל ח/פ/ש = חלבון/פחמימה/שומן בגרמים. ״הנחה״ = שיעור הקלוריות (לפי המאגר) שנשען על כמות שהונחה.');
L.push('');
L.push('| תפריט · ארוחה | שורת התפריט | תפריט: קק״ל | מאגר: קק״ל | יחס | תפריט: ח/פ/ש | מאגר: ח/פ/ש | הנחה | ודאות | המלצה |');
L.push('|---|---|---|---|---|---|---|---|---|---|');
for (const r of rows) {
  L.push(`| ${r.plan} · ${TYPE_HE[r.type] || r.type} | ${esc(r.he)} | ${r.menu.calories} | ${r.eng.cal ? r0(r.eng.cal) : '—'} | ${r.ratio ? r.ratio.toFixed(2) : '—'} | ${r.menu.protein}/${r.menu.carbs}/${r.menu.fat} | ${r0(r.eng.p)}/${r0(r.eng.c)}/${r0(r.eng.f)} | ${pct(r.assumedShare)} | ${r.tier} | ${esc(r.rec)}${r.atwaterOff ? ' · קלוריות≠מאקרו' : ''} |`);
}
L.push('');
fs.writeFileSync(OUT, L.join('\n'), 'utf8');
console.log(`wrote ${path.relative(process.cwd(), OUT)}: ${rows.length} meals; tiers`, Object.fromEntries(tiers), `; missing-food meals ${count(rows, (r) => r.missing.length)}`);
