// Audit of the food database (utils/calculations.js → FOOD_DB). Read-only: it changes no
// food value and writes only docs/nutrition-audit.md.
//
//   cd server && node scripts/food-audit.js
//
// What it can and cannot say
//   • INTERNAL checks run on all entries: fibre larger than carbohydrate, calories against
//     the macros (Atwater), macros adding up to more than 100 g, entries that hold one
//     portion instead of 100 g.
//   • SOURCE checks need a source: USDA FoodData Central SR Legacy, loaded from scripts/usda-verified.json.
//     Every entry without a record there is "לא אומת". Nothing is marked verified from memory.
const fs = require('fs');
const path = require('path');
const { FOOD_DB, estimator } = require('../utils/calculations');
const { mealPlans } = require('../data/mealPlans');
const { splitComponents } = require('../utils/mealItems');
const portions = require('../data/portions');

const OUT = path.join(__dirname, '..', '..', 'docs', 'nutrition-audit.md');
const esc = (s) => String(s).replace(/\|/g, '\\|');
const r1 = (n) => Math.round(n * 10) / 10;
const nameOf = (e) => e.keys[0];
const enOf = (e) => e.keys.find((k) => /^[a-zA-Z0-9 %'\-/().]+$/.test(k)) || '';

// The comparison with USDA FoodData Central (SR Legacy, April 2018 release) comes from
// scripts/usda-verified.json, written by scripts/usda-verify.js from the dataset's CSV files. Each
// food there was mapped BY HAND to one SR record (by exact description); a food with no suitable
// record (an Israeli dish, a brand, a generic "cheese") is simply absent and stays "לא אומת".
const USDA = JSON.parse(fs.readFileSync(path.join(__dirname, 'usda-verified.json'), 'utf8'));
const VERIFIED = USDA.records;
const NOTES = {
  'ביצים': 'המאגר קרוב יותר לביצה מבושלת (155) מלביצה חיה (143); לא ברור למה התכוון המאגר',
  'קפה שחור': 'פער של קלוריה אחת, זניח',
};

// What the audit found and the corrections made after approval (nutrition audit decision 3).
// "before" is the value that was in FOOD_DB (kcal / protein / carbs / fat / fibre per 100 g).
const FIXED = [
  { key: 'טחינה', before: '200 / 5 / 0 / 18 / 2', why: 'הערך הישן היה מנה של כ-30 גרם. USDA 168604 (כף = 15 ג׳, מאומת).' },
  { key: 'חלבון', before: '120 / 25 / 3 / 1 / 0', why: 'הערך הישן היה סקופ של כ-30 גרם. USDA 173180. נוסף שם ״אבקת חלבון״, מוזגה אליו הרשומה הכפולה ״חלבון מי גבינה / whey״ (שגם היא הייתה 120 לסקופ), ונוספה מידת סקופ (30 ג׳).' },
  { key: 'חומוס', before: '170 / 10 / 20 / 6 / 6', why: 'חומוס מוכן (commercial), USDA 174289. הפער העיקרי היה בשומן (6 מול 17.8). חומוס ישראלי עשוי להיות שונה מעט; הערך הוא של USDA.' },
  { key: 'גרנולה', before: '200 / 5 / 30 / 8 / 3', why: 'הערך הישן היה מנה של כ-40 גרם. USDA 171646 (גרנולה ביתית); נוספו מידת כוס (122 ג׳, מאומת) ומנה של 40 ג׳ כהנחה.' },
  { key: 'סרטן', before: '155 / 18 / 0 / 1.5 / 0', why: '155 קק״ל הם של קציצת סרטן; המאקרו הם של סרטן רגיל. מבושל, USDA 174202.' },
  { key: 'גמבה', before: '31 / 1 / 6 / 0.3 / 2', why: 'פלפל אדום חי, USDA 170108.' },
  { key: 'פסטה מלאה', before: '124 / 5.3 / 25 / 0.5 / 4', why: 'מבושלת, USDA 168910.' },
  { key: 'שרימפס', before: '99 / 24 / 0.2 / 0.3 / 0', why: 'מבושל, USDA 171971 (עשוי להכיל חומרים לשימור לחות).' },
  { key: 'קטשופ', before: '112 / 1.3 / 27 / 0.1 / 0', why: 'USDA 168556 ״Catsup״.' },
  { key: 'מוצרלה', before: '280 / 22 / 0 / 20 / 0', why: 'מוצרלה מחלב מלא, USDA 170845.' },
  { key: 'גבינת שמנת', before: '340 / 6 / 0 / 34 / 0', why: 'USDA 173418 (פחמימות 5.5 במקום 0).' },
];

// The 24 entries whose fibre was larger than their carbohydrate (impossible): corrected from USDA after
// approval. "before" = kcal / protein / carbs / fat / fibre that was in FOOD_DB.
const FIBRE_FIXED = {
  'אגוזי מקדמיה': '718 / 8 / 0 / 76 / 9', 'צנוברים': '673 / 14 / 0 / 68 / 4', 'זרעי המפ': '550 / 31 / 0 / 48 / 4',
  "ג'יקמה": '38 / 0.7 / 9 / 0.1 / 14', 'קרמבולה': '31 / 1 / 7 / 0.3 / 14', 'גויאבה': '68 / 2.6 / 14 / 1 / 27',
  'קיוואנו': '44 / 1.8 / 8 / 1.3 / 27', "ג'וג'ובה": '79 / 1.2 / 20 / 0.2 / 27', 'אצת נורי': '35 / 6 / 5 / 0.3 / 23',
  'אצת וואקאמה': '45 / 3 / 9 / 0.6 / 24', "בוק צ'וי": '13 / 1.5 / 2 / 0.2 / 10', 'נבטי שעועית': '31 / 3 / 6 / 0.2 / 11',
  'קייל': '39 / 2.6 / 6 / 1 / 11', 'קומקוואט': '71 / 1.9 / 16 / 0.9 / 28', 'סמבוק': '73 / 0.7 / 18 / 0.5 / 28',
  'דוריאן': '147 / 1.5 / 27 / 5 / 28', 'סברס': '41 / 0.7 / 10 / 0.5 / 28', 'שומר': '31 / 1.2 / 7 / 0.2 / 10',
  'לפת': '23 / 0.7 / 5 / 0.1 / 11', 'דלעת ערמונים': '40 / 1 / 10 / 0.1 / 11',
};
// Only the fibre was corrected: SR Legacy has these two fruits only canned in syrup, with the same kcal and macros as the entry.
const FIBRE_ONLY = [
  { key: 'רמבוטן', before: 25, fdc: 168167, desc: 'Rambutan, canned, syrup pack' },
  { key: 'מנגוסטין', before: 21, fdc: 169090, desc: 'Mangosteen, canned, syrup pack' },
];
// No SR Legacy record: corrected from a manufacturer label in USDA FoodData Central (Branded), per 100 g.
const LABEL_FIXED = [
  { key: 'קזאין', fdc: 2412810, before: '120 / 24 / 3 / 1 / 0', why: 'הערך הישן היה סקופ של 35 ג׳. תווית אבקת קזאין מיסלרית (eSupplements), ל-100 ג׳; נוספה מידת סקופ (35 ג׳).' },
  { key: 'אסאי', fdc: 2038653, before: '70 / 2 / 4 / 5 / 28', why: 'פירה טהור ללא סוכר, תווית Sambazon ל-100 ג׳ (הסיבים היו 28, בלתי אפשרי).' },
  { key: 'פרי הדרקון', fdc: 2376793, before: 'סיבים 20', why: 'רק הסיבים תוקנו (ל-3.6), לפי תווית פרי טרי (Save Mart); שאר הערכים לא אומתו.' },
];

// Entries that still look like ONE PORTION although the engine reads every entry per 100 g.
// (Granola and casein used to be listed here; both were corrected.)
const PER_PORTION = {
  'שייק חלבון': 'ערך לשייק אחד (מסומן ב-portions.js כ-entry, ולכן נספר נכון כשייק).',
};

const ALCOHOL = ['בירה', 'יין', 'וודקה', 'ויסקי', "ג'ין", 'שמפניה', 'פרוסקו', 'נגרוני', 'דאיקירי', 'היינקן', 'בודווייזר', 'קפטן', 'טובורג', 'קרלסברג', 'סטלה', 'האוואנה', 'מרטיני', 'ראקיה', 'קוקטייל', 'ליקר', 'ברנדי', 'טקילה', 'רום', 'ערק', 'סיידר', 'vodka', 'whisky', 'beer', 'wine', 'gin', 'rum', 'tequila', 'liqueur', 'brandy'];
const isAlcohol = (e) => e.keys.some((k) => ALCOHOL.some((a) => k.toLowerCase().includes(a.toLowerCase())));
const atwater = (e) => 4 * e.p + 4 * e.c + 9 * e.f;
const atwaterFibre = (e) => 4 * e.p + 4 * Math.max(0, e.c - (e.fb || 0)) + 2 * (e.fb || 0) + 9 * e.f; // fibre at 2 kcal/g
const off = (cal, est) => cal > 0 && Math.abs(est - cal) / cal > 0.25 && Math.abs(est - cal) > 25;

const flagsOf = (e) => {
  const fl = [];
  if ((e.fb || 0) > e.c) fl.push('סיבים>פחמימות');
  if (!isAlcohol(e) && off(e.cal, atwater(e)) && off(e.cal, atwaterFibre(e))) fl.push(`קלוריות≠מאקרו (${Math.round(atwater(e))})`);
  if (e.p + e.c + e.f > 100) fl.push('מאקרו>100 ג׳');
  const pp = e.keys.map((k) => PER_PORTION[k]).find(Boolean);
  if (pp) fl.push('נראה כמנה');
  return fl;
};

// ── usage in the menus + staples → the ~150 foods listed in detail ──────────
const usage = new Map();
for (const list of Object.values(mealPlans)) for (const p of list) for (const m of p.meals) for (const c of splitComponents(m.he)) {
  const { foods } = estimator.parse(c);
  if (!foods.length) continue;
  const f = foods.reduce((b, x) => (x.name.length > b.name.length ? x : b), foods[0]);
  usage.set(f.entry, (usage.get(f.entry) || 0) + 1);
}
const STAPLES = ['פיתה', 'לבנה', 'גבינה לבנה', 'גבינה צהובה', 'יוגורט', 'שוקולד', 'פלאפל', 'שווארמה', 'מלפפון', 'גזר', 'תפוח עץ', 'תפוח', 'תפוז', 'אבטיח', 'ענבים', 'תותים', 'קישוא', 'חציל', 'פלפל', 'בצל', 'תפוח אדמה', 'תפוחי אדמה', 'ברוקולי', 'כרובית', 'חסה', 'כרוב', 'פטריות', 'תירס', 'עדשים', 'חומוס מבושל', 'שעועית', 'קינואה', 'בורגול', 'קוסקוס', 'פסטה', 'לחם מלא', 'חלה', 'בגט', 'קורנפלקס', 'קרקר', 'עוגה', 'עוגיות', 'גלידה', 'שוקולד מריר', 'חמאה', 'שמנת', 'מיונז', 'קטשופ', 'ממרח שוקולד', 'סוכר', 'ריבה', 'נקניק', 'נקניקיה', 'המבורגר', 'פיצה', 'סושי', 'טונה', 'סרדינים', 'דג', 'שניצל', 'כבד', 'בשר טחון', 'חזה הודו', 'עוף', 'ביצת עין', 'חביתה', 'שקשוקה', 'מרק', 'קפה', 'קפה הפוך', 'לאטה', 'מיץ תפוזים', 'קולה', 'בירה', 'יין', 'אבקת חלבון', 'חטיף חלבון', 'בטטה', 'דלעת', 'לימון', 'אבוקדו', 'זיתים', 'מלפפון חמוץ', 'תמרים', 'צימוקים', 'שזיפים', 'פירות יבשים', 'גרעינים', 'שומשום', 'פיסטוק', 'קשיו', 'בוטנים', 'חמאת שקדים',
  'גבינה לבנה 5%', 'גמבה', 'כרובית', 'קולסלאו', 'לחמנייה', 'בורקס', 'סביח', 'חלווה', 'קקאו', 'שוקולד חלב', 'וופל', 'במבה', 'ביסלי', 'צ׳יפס', 'חרדל', 'סלסה', 'גבינת שמנת', 'ריקוטה', 'מוצרלה', 'פטה', 'בולגרית', 'שמנת חמוצה', 'חלב סויה', 'חלב שקדים', 'טופו', 'אפונה', 'פול', 'אדממה', 'כוסמת', 'אורז מלא', 'אורז בסמטי', 'פסטה מלאה', 'לזניה', 'קציצות', 'קבב', 'כבד עוף', 'אנטריקוט', 'סלמון', 'אמנון', 'לברק', 'דניס', 'טונה בשמן', 'הרינג', 'שרימפס', 'קלמנטינה', 'אשכולית', 'אפרסק', 'נקטרינה', 'שזיף', 'משמש', 'דובדבנים', 'תאנים', 'רימון', 'מנגו', 'אננס', 'קיווי', 'מלון', 'פטל', 'אוכמניות', 'קפה הפוך', 'שוקו', 'חלב עיזים', 'גבינת עיזים', 'חמאת בוטנים', 'שיבולת שועל', 'קוטג׳'];
const detailed = [];
const seen = new Set();
const push = (e) => { if (e && !seen.has(e)) { seen.add(e); detailed.push(e); } };
[...usage.entries()].sort((a, b) => b[1] - a[1]).forEach(([e]) => push(e));
let skipped = 0;
for (const k of STAPLES) { const e = FOOD_DB.find((x) => x.keys.some((kk) => kk.toLowerCase() === k.toLowerCase())); if (e) push(e); else skipped++; }
const detailedList = detailed.slice(0, 150);

// ── checks over the whole database ───────────────────────────────────────────
const dbOf = (key) => FOOD_DB.find((e) => e.keys.includes(key));
const verifiedKeys = new Set(VERIFIED.map((v) => dbOf(v.key)).filter(Boolean));
const fibreOver = FOOD_DB.filter((e) => (e.fb || 0) > e.c);
const macroOver = FOOD_DB.filter((e) => e.p + e.c + e.f > 100);
const POLYOLS = { 'אורביט': 'מסטיק עם פוליאולים', 'טריידנט': 'מסטיק עם פוליאולים' }; // sugar alcohols sit inside "carbs" at ~2.4 kcal/g — a plausible explanation, not verified
const atwaterAll = FOOD_DB.filter((e) => !isAlcohol(e) && off(e.cal, atwater(e)) && off(e.cal, atwaterFibre(e)));
const atwaterOff = atwaterAll.filter((e) => !verifiedKeys.has(e) && !e.keys.some((k) => POLYOLS[k]));
const atwaterBenign = FOOD_DB.filter((e) => !isAlcohol(e) && off(e.cal, atwater(e)) && !off(e.cal, atwaterFibre(e)));
const alcoholEntries = FOOD_DB.filter(isAlcohol);

const recordOf = (e) => VERIFIED.find((v) => dbOf(v.key) === e);

// DB value against its USDA record: kcal within 10% and each macro within max(2 g, 20%).
const compare = (e, v) => {
  const kcalOk = v.cal > 5 ? Math.abs(e.cal - v.cal) / v.cal <= 0.1 : Math.abs(e.cal - v.cal) <= 3;
  const macroOk = ['p', 'c', 'f'].every((k) => Math.abs(e[k] - v[k]) <= Math.max(2, 0.2 * v[k]));
  const gap = v.cal > 5 ? Math.round(((e.cal - v.cal) / v.cal) * 100) : e.cal - v.cal;
  return { ok: kcalOk && macroOk, gap, kcalOk, macroOk };
};
const compared = VERIFIED.map((v) => ({ v, e: dbOf(v.key) })).filter((x) => x.e).map((x) => ({ ...x, ...compare(x.e, x.v) }));
const matching = compared.filter((x) => x.ok);
const differing = compared.filter((x) => !x.ok);

// Household measures (data/portions.js) against the USDA portions of the same food.
// piece = any portion that is not a cup / spoon / package; a field is "checked" only when USDA has a portion of its kind.
const kindOf = (t) => (/cup/i.test(t) ? 'cup' : /tbsp|tablespoon/i.test(t) ? 'tbsp' : /tsp|teaspoon/i.test(t) ? 'tsp' : /slice/i.test(t) ? 'slice'
  : /oz|quart|liter|packet|package|container|serving|bar|stick|pat|yield|fl/i.test(t) ? 'other' : 'piece');
const near = (a, b) => Math.abs(a - b) / b <= 0.06;
function portionVerdict(spec) {
  const rec = VERIFIED.find((v) => spec.keys.includes(v.key));
  if (!rec) return { status: 'לא אומת', detail: 'אין רשומת USDA ממופה' };
  const us = rec.portions.map((x) => ({ kind: kindOf(x.text || x.unit), grams: x.grams / (x.amount || 1), text: x.text }));
  const checks = [];
  const test = (field, kinds, value) => {
    const pool = us.filter((x) => kinds.includes(x.kind));
    if (!pool.length || value === undefined) return;
    const hit = pool.find((x) => near(value, x.grams));
    checks.push({ field, value, hit, closest: pool.map((x) => x.grams).sort((a, b) => Math.abs(a - value) - Math.abs(b - value))[0] });
  };
  test('יחידה', ['piece'], spec.unit);
  test('פרוסה', ['slice'], spec.slice);
  test('כף', ['tbsp'], spec.tbsp);
  test('כוס', ['cup'], spec.cup);
  if (spec.tsp !== undefined) {
    const pool = us.filter((x) => x.kind === 'tsp' || x.kind === 'tbsp');
    if (pool.length) { const hit = pool.find((x) => near(spec.tsp, x.kind === 'tbsp' ? x.grams / 3 : x.grams)); checks.push({ field: 'כפית', value: spec.tsp, hit, closest: null }); }
  }
  if (!checks.length) return { status: 'לא אומת', detail: `FDC ${rec.fdc}: אין ב-USDA מידה מאותו סוג` };
  const bad = checks.filter((c) => !c.hit);
  if (!bad.length) return { status: 'אומת', detail: `FDC ${rec.fdc}` };
  return { status: 'פער', detail: `FDC ${rec.fdc}: ` + bad.map((c) => `${c.field} ${c.value} מול ${c.closest === null ? 'שליש כף' : Math.round(c.closest * 10) / 10}`).join(', ') };
}
const portionVerdicts = portions.map((p) => ({ p, ...portionVerdict(p) }));
const countStatus = (s) => portionVerdicts.filter((x) => x.status === s).length;

const L = [];
L.push('# ביקורת מאגר המזון');
L.push('');
L.push('נוצר על ידי `server/scripts/food-audit.js` מהקובץ `server/scripts/usda-verified.json` (שנוצר על ידי `server/scripts/usda-verify.js`). קריאה בלבד, חוץ מהתיקונים שאושרו (סעיף 2).');
L.push('');
L.push(`המאגר (\`FOOD_DB\`) מכיל ${FOOD_DB.length} רשומות, כל אחת ל-100 גרם. הדוח מפרט ${detailedList.length} מהן (כל מאכל שהתפריטים משתמשים בו, ועוד מאכלי יסוד נפוצים), ובודק את כולן בבדיקות פנימיות.`);
L.push('');
L.push('## מצב האימות מול מקור');
L.push('');
const detailedVerified = detailedList.filter((e) => verifiedKeys.has(e)).length;
L.push(`**אומתו מול USDA: ${compared.length} רשומות מתוך ${FOOD_DB.length}, ומהן ${detailedVerified} מבין ${detailedList.length} המאכלים בפירוט.** המקור: ${USDA.source}, כל מאכל ממופה ידנית לרשומה אחת לפי שמה המדויק (לא התאמה אוטומטית). השאר מסומנות **לא אומת**: אין להן רשומה מקבילה ב-SR Legacy (מנות ישראליות, מותגים, שמות כלליים כמו ״גבינה״ או ״עוף״, וחלק גדול מהפירות והירקות האקזוטיים שלא מופו), או שלא נבדקו. מאגר ״צמרת״ של משרד הבריאות לא נבדק (אין לו ממשק קבוע).`);
L.push('');
L.push('הקובץ של USDA אינו חלק מהפרויקט. להרצה מחדש יש להוריד אותו (`FoodData_Central_sr_legacy_food_csv_2018-04.zip` מ-`fdc.nal.usda.gov/download-datasets`), לפתוח אותו מחוץ לפרויקט, ולהריץ `node scripts/usda-verify.js <תיקייה>` ואז `node scripts/food-audit.js`.');
L.push('');

L.push('## סיכום הממצאים');
L.push('');
L.push('| ממצא | רשומות |');
L.push('|---|---|');
L.push(`| אומתו מול USDA | ${compared.length} |`);
L.push(`| מהן תואמות (קלוריות בטווח 10%, וכל מאקרו בטווח max(2 ג׳, 20%)) | ${matching.length} |`);
L.push(`| מהן עם פער | ${differing.length} |`);
L.push(`| תוקנו אחרי אישור: לפי רשומת USDA / לפי תווית יצרן | ${FIXED.length + Object.keys(FIBRE_FIXED).length + FIBRE_ONLY.length} / ${LABEL_FIXED.length} |`);
L.push('| עדיין חשודים כמנה ולא 100 גרם | 0 (שייק חלבון הוא ערך לשייק ומטופל נכון) |');
L.push(`| סיבים גדולים מהפחמימות | ${fibreOver.length} |`);
L.push(`| קלוריות שאינן תואמות את המאקרו גם כשסיבים נספרים כ-2 קק״ל לגרם (לא כולל אלכוהול, אחרי ההסברים בסעיף 4) | ${atwaterOff.length} |`);
if (atwaterBenign.length) L.push(`| קלוריות שאינן תואמות את המאקרו רק לפי 4/4/9, אך תואמות כשסיבים נספרים כ-2 | ${atwaterBenign.length} (לא שגיאה) |`);
L.push(`| רשומות אלכוהול (קלוריות האתנול לא במאקרו, לכן לא נבדקות באטווטר) | ${alcoholEntries.length} |`);
L.push(`| מאקרו (חלבון+פחמימה+שומן) מעל 100 גרם ל-100 גרם | ${macroOver.length} |`);
L.push(`| מידות ביתיות ב-\`portions.js\`: אומתו / עם פער / לא אומתו | ${countStatus('אומת')} / ${countStatus('פער')} / ${countStatus('לא אומת')} (מתוך ${portions.length}) |`);
L.push('');

L.push('## 1. ההשוואה מול USDA');
L.push('');
L.push('קודם הרשומות עם פער (אם נשארו), אחריהן התואמות. ״פער קלוריות״ = (מאגר − USDA) ÷ USDA. הרשומות שתוקנו מסומנות בהערה.');
L.push('');
L.push('| מאכל | רשומת USDA | במאגר: קק״ל/ח/פ/ש/סיבים | ב-USDA: קק״ל/ח/פ/ש/סיבים | פער קלוריות | הערה |');
L.push('|---|---|---|---|---|---|');
const row = (x) => {
  const { v, e, gap, ok } = x;
  const g = v.cal > 5 ? `${gap > 0 ? '+' : ''}${gap}%` : `${gap} קק״ל`;
  const fx = FIXED.find((f) => f.key === v.key);
  const note = [fx ? `תוקן: לפני ${fx.before}` : '', NOTES[v.key] || '', !ok && !fx && x.kcalOk ? 'הקלוריות קרובות אך מאקרו שונה' : ''].filter(Boolean).join(' · ');
  const now = `${e.cal}/${e.p}/${e.c}/${e.f}/${e.fb || 0}`;
  return `| ${esc(nameOf(e))} | FDC ${v.fdc} — ${esc(v.desc)} | ${now} | ${v.cal}/${r1(v.p)}/${r1(v.c)}/${r1(v.f)}/${r1(v.fb)} | ${g} | ${esc(note)} |`;
};
const sortByGap = (a, b) => Math.abs(b.gap) - Math.abs(a.gap);
for (const x of [...differing].sort(sortByGap)) L.push(row(x));
for (const x of [...matching].sort(sortByGap)) L.push(row(x));
L.push('');

L.push('## 2. תיקונים שבוצעו (אושרו), וחשודים שנשארו');
L.push('');
L.push('| מאכל | לפני (קק״ל/ח/פ/ש/סיבים ל-100 ג׳) | אחרי (במאגר עכשיו) | למה |');
L.push('|---|---|---|---|');
for (const f of FIXED) { const e = dbOf(f.key); L.push(`| ${esc(f.key)} | ${f.before} | ${e.cal} / ${e.p} / ${e.c} / ${e.f} / ${e.fb || 0} | ${esc(f.why)} |`); }
L.push('');
L.push('בעקבות התיקון, ״50 גרם טחינה״ נספר כ-296 קק״ל (היה 100) ו-״30 גרם אבקת חלבון״ כ-106 (היה 36). ״כף טחינה״ ו-״סקופ חלבון״ נקראים כעת במשקל הנכון, ו-״2 סקופ חלבון״ כבר לא נקרא כ-100 גרם.');
L.push('');
L.push('### תיקון סיבים וערכים לפי USDA (24 רשומות שבהן הסיבים היו גדולים מהפחמימות)');
L.push('');
L.push('סיבים גדולים מהפחמימות לא אפשרי (ב-USDA הפחמימות כוללות סיבים). ברוב הרשומות הסיבים היו שגויים בהרבה (28 גרם לקומקוואט מול 6.5 ב-USDA), ובשלוש (אגוזי מקדמיה, צנוברים, זרעי המפ) הפחמימות היו 0. כל אחת תוקנה לפי רשומת USDA.');
L.push('');
L.push('| מאכל | לפני | אחרי (במאגר עכשיו) | מקור |');
L.push('|---|---|---|---|');
for (const [k, before] of Object.entries(FIBRE_FIXED)) {
  const e = dbOf(k); const v = VERIFIED.find((r) => r.key === k);
  if (e && v) L.push(`| ${esc(k)} | ${before} | ${e.cal} / ${e.p} / ${e.c} / ${e.f} / ${e.fb || 0} | FDC ${v.fdc} — ${esc(v.desc)}${v.fb === 0 && /Horned|Jujube/.test(v.desc) ? ' (USDA לא מפרט סיבים; הוגדר 0)' : ''} |`);
}
for (const f of FIBRE_ONLY) { const e = dbOf(f.key); if (e) L.push(`| ${esc(f.key)} | סיבים ${f.before} | סיבים ${e.fb} (שאר הערכים ללא שינוי) | FDC ${f.fdc} — ${f.desc}; הרשומה היחידה ב-SR, זהה בקלוריות ובמאקרו |`); }
L.push('');
L.push('### תיקון לפי תווית יצרן (אין רשומה ב-SR Legacy)');
L.push('');
L.push('| מאכל | לפני | אחרי (במאגר עכשיו) | מקור והערה |');
L.push('|---|---|---|---|');
for (const f of LABEL_FIXED) { const e = dbOf(f.key); if (e) L.push(`| ${esc(f.key)} | ${f.before} | ${e.cal} / ${e.p} / ${e.c} / ${e.f} / ${e.fb || 0} | USDA Branded FDC ${f.fdc}. ${esc(f.why)} |`); }
L.push('');
L.push('**נשארו חשודים כמנה ולא 100 גרם** (לא תוקנו, אין להם רשומה להשוואה):');
L.push('');
L.push('| מאכל | במאגר | הערה |');
L.push('|---|---|---|');
for (const [k, note] of Object.entries(PER_PORTION)) {
  const e = dbOf(k);
  if (e) L.push(`| ${esc(k)} | ${e.cal}/${e.p}/${e.c}/${e.f} | ${esc(note)} |`);
}
L.push('');

L.push(`## 3. סיבים גדולים מהפחמימות (${fibreOver.length} רשומות)`);
L.push('');
L.push('ב-USDA, פחמימות כוללות סיבים, ולכן סיבים גדולים מהפחמימות לא אפשרי. כל 24 הרשומות תוקנו (סעיף 2): 22 לפי USDA SR Legacy ו-2 לפי תווית יצרן. הטבלה הבאה ריקה.');
L.push('');
L.push('| מאכל | קק״ל/ח/פ/ש | סיבים |');
L.push('|---|---|---|');
for (const e of fibreOver) L.push(`| ${esc(nameOf(e))} | ${e.cal}/${e.p}/${e.c}/${e.f} | ${e.fb} |`);
L.push('');

L.push(`## 4. קלוריות שלא תואמות את המאקרו (${atwaterAll.length} רשומות, ${atwaterOff.length} ללא הסבר)`);
L.push('');
L.push('בדיקה: |קלוריות − (4×חלבון + 4×פחמימה + 9×שומן)| מעל 25% וגם מעל 25 קק״ל, וגם אחרי ספירת סיבים כ-2 קק״ל לגרם. אלכוהול לא נכלל. ייתכן שחלק מהרשומות מוצדקות, ולכן אלה מועמדים לבדיקה ולא שגיאות מוכחות. **רשומה שאומתה מול USDA נושאת את הקלוריות של USDA עצמה** (סובין חיטה וספירולינה מתאימות בדיוק; ב-USDA הקלוריות מחושבות בגורמים ספציפיים, לא 4/4/9). סרטן היה שגוי ותוקן (סעיף 2). אורביט וטריידנט (מסטיק): פוליאולים נספרים בפחמימות בכ-2.4 קק״ל לגרם, הסבר סביר שלא אומת. הטבלה מציגה רק מה שנשאר ללא הסבר.');
L.push('');
L.push('| מאכל | קק״ל/ח/פ/ש/סיבים | קק״ל לפי המאקרו |');
L.push('|---|---|---|');
for (const e of atwaterOff) L.push(`| ${esc(nameOf(e))} | ${e.cal}/${e.p}/${e.c}/${e.f}/${e.fb || 0} | ${Math.round(atwater(e))} |`);
L.push('');
if (macroOver.length) {
  L.push('### מאקרו מעל 100 גרם ל-100 גרם');
  L.push('');
  L.push('| מאכל | קק״ל/ח/פ/ש | סכום |');
  L.push('|---|---|---|');
  for (const e of macroOver) L.push(`| ${esc(nameOf(e))} | ${e.cal}/${e.p}/${e.c}/${e.f} | ${r1(e.p + e.c + e.f)} |`);
  L.push('');
}

L.push('## 5. עיגול');
L.push('');
L.push('- המנוע מעגל את סכום הארוחה פעם אחת (קלוריות וכל מאקרו לשלם). הטעות המקסימלית מהעיגול היא חצי קלוריה וחצי גרם לארוחה, זניחה מול הפערים בדוח.');
L.push('- הבעיה בפועל היא דיוק הערכים עצמם: ערכים עגולים לעשרות (למשל חלבון `10` או פחמימות `20` לחומוס, מול 7.8 ו-15 ב-USDA) מוסיפים כמה קלוריות לכל 100 גרם.');
const roundTen = FOOD_DB.filter((e) => e.cal >= 100 && e.cal % 10 === 0).length;
L.push(`- ${roundTen} מתוך ${FOOD_DB.length} הרשומות (${Math.round((roundTen / FOOD_DB.length) * 100)}%) מעוגלות לעשר קלוריות, מה שמרמז על ערכים משוערים ולא על ערך מדוד.`);
L.push('');

L.push('## 6. מידות ביתיות (`data/portions.js`)');
L.push('');
L.push(`בטבלה ${portions.length} שורות. הושוו למידות של אותו מאכל ב-USDA (\`food_portion.csv\`, סטייה עד 6%): **${countStatus('אומת')} אומתו, ${countStatus('פער')} עם פער, ${countStatus('לא אומת')} לא אומתו** (אין ב-USDA רשומה ממופה או מידה מאותו סוג). שורות ״typical״ הן הנחות מוצהרות ומוצגות למשתמש כהערכה. לא שונה אף ערך.`);
L.push('');
L.push('| מאכל | יחידה | מנה | כף | כוס | בסיס | USDA | פירוט |');
L.push('|---|---|---|---|---|---|---|---|');
const order = ['פער', 'לא אומת', 'אומת'];
for (const x of [...portionVerdicts].sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status))) {
  const p = x.p;
  L.push(`| ${esc(p.keys[0])} | ${p.unit ?? ''} | ${p.serving ?? ''} | ${p.tbsp ?? ''} | ${p.cup ?? ''} | ${p.basis} | ${x.status} | ${esc(x.detail)} |`);
}
L.push('');

L.push('## 7. מאכלים חסרים או ממופים לא נכון');
L.push('');
L.push('| בעיה | פירוט |');
L.push('|---|---|');
L.push('| סוכר | אין רשומה לסוכר כמאכל בפני עצמו (כפית סוכר בקפה). |');
L.push('| ״גיינר״ | ״שייק גיינר: חלב״ נקרא כחלב בלבד, בלי האבקה; אין רשומה. |');
L.push('| ״סירופ״, ״מיץ״, ״רוטב״ | אין רשומה כללית. |');
L.push('| ״סלט״ | רשומה אחת (150 קק״ל ל-100 גרם) לכל סוגי הסלט; בפועל סלט ירקות הוא כ-20–60 והסלטים עם רוטב או גבינה גבוהים בהרבה. 24 מופעים בתפריטים, ולכן יש לה השפעה גדולה. לא אומת (אין רשומה מקבילה). |');
L.push('| ״ירקות״ | רשומה אחת (30 קק״ל ל-100 גרם) לכל הירקות; 36 מופעים בתפריטים. לא אומת. |');
L.push('');
L.push('**נקראים כעת נכון אחרי התיקונים האחרונים:** ״סקופ״ (יחידה), ״סנדוויץ׳ X״ (X + שתי פרוסות לחם שמסומנות כהנחה), ״סטייק בקר״, ״סטייק הודו״ (נקרא כחזה הודו, בלי ערכים נפרדים), ותיאורי הכנה וגודל (אפוי, רזה, grilled…) כבר לא מוצגים כ״לא זיהינו״.');
L.push('');

L.push('## 8. הערות מטעות בקוד');
L.push('');
L.push('- `server/utils/calculations.js` פותח בתיאור ״based on USDA FoodData Central 2024-2026״ ובמקטעים ״(USDA/FAO 2024-2026)״, ובשורה אחת ״Health Ministry (Tzameret) + USDA per-100g״. חלק מהערכים תואמים ל-USDA והרבה לא (סעיף 1), והערות אלה יוצרות רושם של מקור אחיד שלא קיים. המלצה: לנסח מחדש (לא בוצע).');
L.push('- הערות על ״AI fallback״ ועל תגית ״AI״ נשארו בקוד (בנתיב `/nutrition/search` ובקליינט `aiEstimate`); אין שירות AI באפליקציה. המלצה לניקוי, ממתינה לאישור.');
L.push('');

L.push(`## 9. ${detailedList.length} המאכלים בפירוט`);
L.push('');
L.push('״מופעים״ = כמה פעמים המאכל נבחר כרכיב עיקרי בשורות התפריט. ״אימות״: אומת = תואם לרשומת USDA, פער = שונה ממנה (ראו סעיף 1), לא אומת = אין רשומה מקבילה ב-SR Legacy. ״מנה״ = משקל יחידה/מנה מ-`portions.js`.');
L.push('');
L.push('| # | מאכל | English | קק״ל | ח | פ | ש | סיבים | מופעים | מנה | דגלים | אימות | המלצה |');
L.push('|---|---|---|---|---|---|---|---|---|---|---|---|---|');
detailedList.forEach((e, i) => {
  const v = recordOf(e);
  const c = v ? compare(e, v) : null;
  const pt = estimator.portionOf(e);
  const portion = pt ? [pt.serving ? `מנה ${pt.serving}` : '', pt.unit ? `יח׳ ${pt.unit}` : ''].filter(Boolean).join(', ') : '';
  const fl = flagsOf(e);
  const fixed = FIXED.some((f) => dbOf(f.key) === e);
  const label = LABEL_FIXED.find((f) => dbOf(f.key) === e);
  let status; let rec;
  if (v && fixed) { status = `אומת (תוקן) — FDC ${v.fdc}`; rec = 'תוקן לפי USDA'; }
  else if (v && c.ok) { status = `אומת — FDC ${v.fdc}`; rec = 'תואם למקור'; }
  else if (v) { status = `פער ${c.gap > 0 ? '+' : ''}${c.gap}${v.cal > 5 ? '%' : ''} — FDC ${v.fdc}`; rec = 'לבחון תיקון לפי USDA (ממתין לאישור)'; }
  else if (label) { status = `תוקן לפי תווית — FDC ${label.fdc} (Branded)`; rec = 'תוקן לפי תווית יצרן'; }
  else { status = 'לא אומת (אין רשומה מקבילה)'; rec = fl.length ? 'לבדוק מול מקור (דגל פנימי)' : 'אין ממצא פנימי'; }
  L.push(`| ${i + 1} | ${esc(nameOf(e))} | ${esc(enOf(e))} | ${e.cal} | ${e.p} | ${e.c} | ${e.f} | ${e.fb || 0} | ${usage.get(e) || 0} | ${portion} | ${esc(fl.join(' · '))} | ${status} | ${rec} |`);
});
L.push('');
L.push('## החלטות שנותרו');
L.push('');
L.push(`1. **רשומות עם פער מ-USDA:** ${differing.length === 0 ? 'אין, כולן תוקנו או תואמות' : differing.length + ' (בסעיף 1)'}.`);
L.push('2. **מידות ביתיות:** פיתה נשארה 90 ג׳ (הערכה מוצהרת, ״typical״), כי פיתה ישראלית גדולה מהפיתה האמריקאית של USDA (60 ג׳). כוס הפסטה תוקנה ל-124 ג׳ לפי USDA.');
L.push('3. **ערכים שאין להם מקור להשוואה** ונשארו ״לא אומת״: ״סלט״ ו-״ירקות״ (רשומה אחת לכל הסוגים), מנות ישראליות ומותגים. נדרש מקור (צמרת או תווית) כדי לתקן.');
L.push('');
fs.writeFileSync(OUT, L.join('\n'), 'utf8');
console.log(`wrote ${path.relative(process.cwd(), OUT)}: ${detailedList.length} foods detailed (${skipped} staples not in FOOD_DB); verified ${compared.length} (${matching.length} match, ${differing.length} differ); portions ${countStatus('אומת')}/${countStatus('פער')}/${countStatus('לא אומת')}; fibre>carbs ${fibreOver.length}; atwater-off ${atwaterOff.length}`);
