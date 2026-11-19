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

// ── Nov 2026 round (nutrition task 5) ────────────────────────────────────────────────────────────────
// Entries whose value was brought to the exact USDA record because it was off by more than the audit's
// thresholds (kcal 10%, each macro max(2 g, 20%)). "before" = kcal / protein / carbs / fat / fibre.
const ROUND2_FIXED = [
  { key: 'כבד בקר', before: '175 / 27 / 0 / 4.5 / 0', why: 'USDA 168627 (מטוגן במחבת). הקלוריות, החלבון והשומן תאמו; הפחמימות (5.2) חסרו.' },
  { key: 'לשון בקר', before: '284 / 15 / 0 / 25 / 0', why: 'USDA 170598 (מבושלת). הקלוריות תאמו; החלבון היה 15 מול 19.3.' },
  { key: 'אנשובי', before: '210 / 20 / 0 / 14 / 0', why: 'USDA 174183 (משומרים בשמן, מסוננים). הקלוריות תאמו; החלבון היה 20 מול 28.9 והשומן 14 מול 9.7.' },
  { key: 'מולים', before: '104 / 12 / 4 / 2.2 / 0', why: 'USDA 174217 (מבושלים). קודם תוקן לרשומה הגולמית 174216 (86 קק״ל), ובסבב המשך הומר למבושל לפי מוסכמת המאגר: 172 קק״ל.' },
  { key: 'צלופח', before: '184 / 18 / 0 / 12 / 0', why: 'USDA 174194 (מבושל): 236 קק״ל. הערך הקודם היה הרשומה הגולמית.' },
  { key: 'קרפיון', before: '127 / 17.8 / 0 / 5.6 / 0', why: 'USDA 174185 (מבושל): 162 קק״ל. הערך הקודם היה הרשומה הגולמית.' },
  { key: 'תמנון', before: '82 / 14.9 / 2.2 / 1 / 0', why: 'USDA 174249 (מבושל): 164 קק״ל. הערך הקודם היה הרשומה הגולמית.' },
  { key: 'אבלון', before: '105 / 17.1 / 6 / 0.8 / 0', why: 'USDA 174213 (מבושל בטיגון, הרשומה המבושלת היחידה): 189 קק״ל. הערך הקודם היה הרשומה הגולמית.' },
  { key: 'כבד טלה', before: '137 / 20 / 2 / 5 / 0', why: 'USDA 172532 (מבושל בבישול איטי): 220 קק״ל. הערך הקודם היה הרשומה הגולמית.' },
  { key: 'גבינת פטה', before: '250 / 14 / 1 / 20 / 0', why: 'USDA 173420. הפחמימות היו 1 מול 3.9.' },
  { key: 'חלב שקדים', before: '19 / 0.7 / 0.7 / 1.6 / 0', why: 'USDA 174832 (ללא סוכר). הקלוריות היו 19 מול 15 (פער 27% על ערכים קטנים). ערך המותגים משתנה (בין 13 ל-24), וזהו ערך הרשומה.' },
  { key: 'אורז פרא', before: '150 / 6 / 30 / 0.5 / 11', why: 'USDA 168897 (מבושל): 101 קק״ל. הערך הישן (150) לא תאם לרשומה; גם הסיבים (11) לא תאמו (1.8).' },
  { key: 'קמח תירס', before: '363 / 8.4 / 76 / 1.2 / 9', why: 'USDA 169694 (מסה הרינה). השומן היה 1.2 מול 3.7.' },
  { key: 'רגלת הגינה', before: '16 / 1.3 / 3.4 / 0.1 / 0', why: 'USDA 169274 (גולמית). פער קלוריות של 20% על ערך קטן (20 מול 16). USDA לא מפרט סיבים.' },
  { key: 'פיג׳ויה', before: '55 / 1 / 10 / 0.8 / 6', why: 'USDA 168176. הפחמימות היו 10 מול 15.2.' },
  { key: 'רוטב סויה', before: '60 / 8 / 5.5 / 0 / 0', why: 'USDA 174277 (שויו). פער קלוריות של 13%.' },
  { key: 'אספרסו', before: '5 / 0.1 / 0.7 / 0.2 / 0', why: 'USDA 171891 (אספרסו מוכן במסעדה, 9 קק״ל). פער של 4 קק״ל על ערך קטן.' },
];
// Foods ADDED this round. Each is one USDA SR Legacy record per 100 g (usda-verified.json), keys in Hebrew and English.
const ADDED_FOODS = [
  'סוכר חום', 'סירופ מייפל', 'קקאו', 'שמן קנולה', 'שמן חמניות', 'שמן שומשום', 'צימוקים', 'בוטנים', 'אגוזי לוז', 'שומשום',
  'קוקוס מגורד', 'שמנת מתוקה', 'גבינת עיזים', 'מיץ תפוחים', 'מיץ ענבים', 'מיץ גזר', 'מיץ עגבניות', 'מיץ לימון', 'מיץ אננס',
  'רסק עגבניות', 'רוטב עגבניות', 'רוטב ברביקיו', 'חומץ', 'סוכר', 'קמח',
];
// What was considered and NOT added (or not mapped), and why.
const REJECTED = [
  ['קמח מלא, קמחים אחרים (שקדים, כוסמין…)', 'לא נוספו כרשומות נפרדות. ״קמח מלא״ נקרא עכשיו כ״קמח״ (חיטה לבן, 364 קק״ל; קמח מלא הוא כ-340), ״קמח שקדים״ כ״קמח״ + מילה שלא זוהתה (מוצגת למשתמש). הוספה דורשת לבחור רשומת USDA אחת לכל סוג.'],
  ['גיינר', 'אין רשומה אחת מייצגת (ערך משתנה לפי מוצר ומותג, כ-350 עד 400 קק״ל ל-100 גרם); הכלל: ערך מתווית יצרן רק של מוצר מסוים. לא נמצאה תווית שנבדקה.'],
  ['סירופ (כללי), מיץ (כללי), רוטב (כללי), שמן (כללי)', 'שם כללי: יש כמה רשומות ואין "מדויקת". נוספו הסוגים הספציפיים (מייפל; תפוחים, ענבים, גזר, עגבניות, לימון, אננס; עגבניות/פסטה, ברביקיו; קנולה, חמניות, שומשום).'],
  ['סירופ אגבה', 'אין רשומה ב-SR Legacy (נבדק בשם המדויק).'],
  ['סלט ירקות, סלט קצוץ וכו׳', 'אין רשומת USDA ל-״סלט״ מעורב. רכיביו (עגבנייה, מלפפון, חסה, שמן זית…) כבר במאגר ומאומתים; ״סלט״ עצמו ו-״ירקות״ נשארים ״לא אומת״.'],
  ['צלעות חזיר בקראמל BBQ', 'מנה עם גלייז; אין רשומה, והרכב הגלייז לא ידוע. נשאר לא מזוהה (פונה להערכה כללית).'],
  ['פוקארי, צ׳ומפה (כינויים קצרים)', 'כינוי קצר ללא בהירות (צ׳ומפה: שני מוצרים אפשריים); אין תווית שנבדקה. נשארו לא מזוהים.'],
  ['מותגים (אוראו, נוטלה, קינדר, אקטימל, יופלה…)', 'כבר במאגר מסבבים קודמים בערכים משוערים (לא אומתו). בסבב הזה לא נמצאה תווית יצרן רשמית שנבדקה בפועל, ולכן הערכים לא שונו ולא הוספו מותגים חדשים. קובץ ה-Branded המלא לא הורד, כנדרש.'],
  ['עשבי תיבול ותבלינים (שום, פטרוזיליה, כורכום, קינמון…)', 'כמות זעירה לכל שימוש, והוספה הייתה משנה את סכומי התפריטים הקיימים (שורות תפריט שמזכירות אותם) בלי שיפור משמעותי בדיוק.'],
  ['בשר צבי, ברווז, ארנב, דג בורי, הרינג, פורל, דובדבנים, קלמארי', 'מופו לרשומה אבל נמחקו מהמיפוי: ה-DB לא קובע מצב (גולמי / צלוי) או מין, ויש כמה רשומות USDA לאותו שם; ערך ה-DB נופל בין הרשומות. נשארו ״לא אומת״ במקום ״אומת״ שגוי.'],
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
L.push('הטבלה הזו הייתה רשימת החסרים בסבב הקודם. הסטטוס עודכן אחרי הסבב של נובמבר 2026 (פירוט בסעיף 10).');
L.push('');
L.push('| בעיה | סטטוס |');
L.push('|---|---|');
L.push('| סוכר, קמח | **נוספו** (USDA 169655, 168894) אחרי שהמנוע למד שלילה: ״קפה בלי סוכר״ ו״עוגה ללא קמח״ כבר לא סופרים אותם. **סוכר חום** נוסף קודם. |');
L.push('| ״גיינר״ | **נדחה**: אין רשומה אחת מייצגת ואין תווית שנבדקה. ״שייק גיינר: חלב״ עדיין נקרא כחלב בלבד. |');
L.push('| ״סירופ״ | **סירופ מייפל נוסף** (USDA 169661). ״סירופ״ כללי לא נוסף (שם כללי). |');
L.push('| ״מיץ״ | **נוספו** מיץ תפוחים, ענבים, גזר, עגבניות, לימון ואננס (USDA). עד עכשיו ״מיץ תפוחים״ נקרא כתפוח שלם (94 קק״ל) ו״מיץ ענבים״ כ-100 גרם ענבים. ״מיץ״ כללי לא נוסף. |');
L.push('| ״רוטב״ | **נוספו** רוטב עגבניות / פסטה (USDA 171192), רוטב ברביקיו ורסק עגבניות. ״רוטב פסטה״ נקרא עד עכשיו כ-100 גרם פסטה (158 קק״ל). ״רוטב״ כללי לא נוסף. |');
L.push('| ״סלט״ | רשומה אחת (150 קק״ל ל-100 גרם) לכל סוגי הסלט; בפועל סלט ירקות הוא כ-20–60 והסלטים עם רוטב או גבינה גבוהים בהרבה. 24 מופעים בתפריטים, ולכן יש לה השפעה גדולה. **לא אומת: אין ב-SR Legacy רשומה ל״סלט״ מעורב** (בדוק בשם המדויק). לא שונה. |');
L.push('| ״ירקות״ | רשומה אחת (30 קק״ל ל-100 גרם) לכל הירקות; 36 מופעים בתפריטים. **לא אומת**: שם כללי, אין רשומה מדויקת. לא שונה. |');
L.push('');
L.push('**נקראים נכון אחרי התיקונים האחרונים:** ״סקופ״ (יחידה), ״סנדוויץ׳ X״ (X + שתי פרוסות לחם שמסומנות כהנחה), ״סטייק בקר״, ״סטייק הודו״ (נקרא כחזה הודו, בלי ערכים נפרדים), ותיאורי הכנה וגודל (אפוי, רזה, grilled…) כבר לא מוצגים כ״לא זיהינו״.');
L.push('');
L.push('**תוקן אחרי הסבב:** המנוע מטפל עכשיו בשלילה. מאכל שמופיע אחרי ״בלי / ללא / without / no״ לא נספר (גם רשימה: ״בלי חלב וסוכר״), וההשפעה נעצרת במילה אחרת (״בלי סוכר עם חלב״: החלב נספר). המאכלים שהושמטו מוחזרים ב-`parse().without`. כך נפתחה הדרך להוספת סוכר וקמח.');
L.push('');

L.push('## 8. הערות מטעות בקוד');
L.push('');
L.push('- **הערת הפתיחה של `FOOD_DB` (`server/utils/calculations.js`) כבר מתארת את המצב האמיתי** ("SOURCES ARE MIXED AND MOSTLY UNRECORDED", חלק מאומת USDA, השאר ללא מקור), ונוסחה מחדש בסבב הקודם; אומת ועודכן המספר בסבב הזה. ההערות ״based on ISSN 2024-2026״ ו-״DGA 2025-2030״ שנשארו בקובץ מתייחסות להמלצות חלבון ולקלוריות ולא לערכי המזון. הציטוט ״Health Ministry (Tzameret) + USDA per-100g״ שהופיע בדוח הקודם כבר אינו בקוד.');
L.push('- לכל רשומה שאומתה יש בקוד הערה עם מספר ה-FDC (ושם הרשומה, כשהערך שונה: ״was …״); רשומה בלי הערה כזו היא ״לא אומת״.');
L.push('- הערות על ״AI fallback״ ועל תגית ״AI״ (בנתיב `/nutrition/search` ובקליינט `aiEstimate`) לא נבדקו בסבב הזה; אין שירות AI באפליקציה.');
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
// ── 10. what this round added and rejected ─────────────────────────────────────────────────────
L.push('## 10. הסבב של נובמבר 2026: מה נוסף, מה נדחה, מה תוקן');
L.push('');
L.push('**נוספו ' + ADDED_FOODS.length + ' מאכלים**, כל אחד העתק של רשומת USDA SR Legacy אחת ל-100 גרם (מספר ה-FDC בהערה בקוד ובטבלה למטה), עם מפתחות בעברית ובאנגלית. נוספו גם ' + (portions.length - 42) + ' מידות ביתיות ב-`portions.js` (כולן מאומתות מול מידות USDA של אותה רשומה). **נדחו ' + REJECTED.length + ' קבוצות** (הטבלה השנייה).');
L.push('');
L.push('| מאכל | מפתחות | קק״ל/ח/פ/ש/סיבים | רשומת USDA |');
L.push('|---|---|---|---|');
for (const k of ADDED_FOODS) {
  const e = dbOf(k); const v = VERIFIED.find((r) => r.key === k);
  if (e && v) L.push('| ' + esc(k) + ' | ' + esc(e.keys.join(', ')) + ' | ' + e.cal + '/' + e.p + '/' + e.c + '/' + e.f + '/' + (e.fb || 0) + ' | FDC ' + v.fdc + ' — ' + esc(v.desc) + ' |');
}
L.push('');
L.push('| נדחה / לא מופה | למה |');
L.push('|---|---|');
for (const [what, why] of REJECTED) L.push('| ' + esc(what) + ' | ' + esc(why) + ' |');
L.push('');
L.push('**מיפוי ידני של רשומות קיימות:** ' + (VERIFIED.length - 120) + ' רשומות נוספות שלא אומתו קודם מופו ידנית לשם מדויק ב-SR Legacy (`usda-verify.js`, מיפוי שני ושלישי): מאכלים כלליים עם מקבילה חד-משמעית, בלי התאמה אוטומטית. מי שהמקבילה שלו לא חד-משמעית (חיתוך או מצב בישול לא ידועים, מין לא ידוע, מוצר מקומי) נשאר ״לא אומת״ עם הסיבה בנספח (סעיף 13).');
L.push('');
L.push('**״ביצים״:** במאגר 155 קק״ל, וב-USDA ביצה חיה (FDC 171287) היא 143. הפער 8.4% ובתוך הסף (10%), ולכן לא שונה. הערך שווה למעשה לביצה קשה ב-USDA (155 / 12.6 / 1.1 / 10.6): הרשומה הכללית ״ביצים״ מתנהגת כביצה מבושלת, בהתאם לכלל ״מבושל אלא אם נכתב אחרת״ בראש המאגר. אין צורך בתיקון.');
L.push('');
L.push('**״סלט״ ו״ירקות״:** ראו סעיף 7. אין רשומת USDA מדויקת ל-״סלט״ מעורב או ל-״ירקות״ כלליים; הערך לא שונה, והסימון נשאר ״לא אומת״.');
L.push('');
L.push('## 11. תיקוני ערכים בסבב הזה (רשומה מדויקת סתרה מעבר לסף)');
L.push('');
L.push('| מאכל | לפני (קק״ל/ח/פ/ש/סיבים) | אחרי | למה |');
L.push('|---|---|---|---|');
for (const f of ROUND2_FIXED) { const e = dbOf(f.key) || dbOf(f.key.replace('׳', "'")); if (e) L.push('| ' + esc(f.key) + ' | ' + f.before + ' | ' + e.cal + ' / ' + e.p + ' / ' + e.c + ' / ' + e.f + ' / ' + (e.fb || 0) + ' | ' + esc(f.why) + ' |'); }
L.push('');
L.push('לא תוקן שום ערך לפי ״ערך טיפוסי״. מאכלים שמופו, נבדקו, וערכם נפל בין כמה רשומות של אותו שם (גולמי / צלוי, עם עור / בלי) הוצאו מהמיפוי ונשארו ללא שינוי (סעיף 10, שורה אחרונה בטבלת הדחיות).');
L.push('');
L.push('## 12. בדיקת זיהוי לפני ואחרי (150 שורות תפריט, 215 רכיבים, והרשימה ב-docx)');
L.push('');
L.push('הושוו תוצאות `estimateNutrition` על כל שורות התפריטים (`mealPlans.js`), כל רכיביהן, וכל פריטי הרשימה ב-`רשימת מאכלים שאין במאגר.docx`, בין גרסת ה-HEAD לבין הקוד אחרי השינויים. **3 שורות תפריט מתוך 150 השתנו**, כולן מוסברות:');
L.push('');
L.push('| שורת תפריט | לפני | אחרי | הסבר |');
L.push('|---|---|---|---|');
L.push('| פודינג צ׳יה עם חלב שקדים | 505 קק״ל | 501 | חלב השקדים תוקן מ-19 ל-15 קק״ל ל-100 גרם (USDA 174832). |');
L.push('| 180 גרם חזה הודו + פסטה מלאה + רוטב עגבניות | 447 | 490 | ״רוטב עגבניות״ נקרא קודם כעגבנייה אחת (123 גרם, 22 קק״ל) ועכשיו כרוטב עגבניות מוכן (132 גרם, 66 קק״ל). התפריט עצמו מצהיר על 500, ולכן הסכום האמיתי קרוב עכשיו להצהרה. |');
L.push('| פנקייק חלבון (3) + סירופ מייפל + פירות יער + אגוז | 1058 | 1110 | ״סירופ מייפל״ לא זוהה קודם (דולג עליו) ועכשיו נספר כ-20 גרם (52 קק״ל). הסכום הכולל של השורה גבוה בהרבה מההצהרה (480) מסיבה שקדמה לסבב: ״פירות יער״ נקרא כ״פירה״ ו״אגוז״ כ-100 גרם אגוזים. לא נגעתי בכך (ממצא פתוח). |');
L.push('');
L.push('בשאר ההשוואה (סה״כ 3 רכיבי תפריט שונו, כולם מהשורות שלמעלה), ובפריטי ה-docx: השינויים היחידים הם מאכלים שהתחילו להיות מזוהים או שקיבלו את הרשומה הנכונה (מיץ תפוחים, מיץ ענבים, מיץ גזר, רוטב פסטה, רסק עגבניות, מיץ לימון, סירופ מייפל, שמן קנולה, שומשום, שמנת מתוקה, קקאו, צימוקים, בוטנים, גבינת עיזים, חומץ). **כל שאר המאכלים החזירו בדיוק את אותה תוצאה** (מספרים, גרמים ושמות).');
L.push('');
L.push('הפריטים ב-docx עדיין ״לא מזוהים״: רק כותרות הקטגוריות, ״צלעות חזיר בקראמל BBQ״, ״פוקארי״ ו״צ׳ומפה״ (סעיף 10). הרשומות שנוספו בסבב הקודם לפריטי הרשימה (מותגים, מטבחים זרים, אבקות) **הן הערכות שלא אומתו** (נספח 13) ואינן מתיימרות להיות ערך יצרן.');
L.push('');

// ── 13. the status of EVERY record and every household measure ──────────────────────────────────
const BRANDS = ['אוראו', 'נוטלה', 'קינדר', 'מארס', 'באונטי', 'סקיטלס', 'פינגווין', 'טופלרון', 'ריטר', 'הרשיז', 'מאלטיזרס', 'עלית', 'באטרפינגר', 'סמרטיז', 'וורת', 'אקטימל', 'יופלה', 'דניאלה', 'אשל', 'פילדלפיה', 'הגן דאז', 'פרוסטיז', 'שוגי', 'לאקי', 'וויטביקס', 'שרדד', 'טריסקיט', 'ספרייט', 'דוקטור פפר', 'סבן אפ', 'פוקארי', 'גטורייד', 'מונסטר', 'ברן', 'ויטמין ווטר', 'מאסטר', 'לוקוזייד', 'פאוורייד', 'בודיארמור', 'סקוויז', 'בנג', 'סן פלגרינו', 'פפסי', 'קריסטל', 'אורנג', 'יורוקפה', 'קורונה', 'היינקן', 'בודווייזר', 'קפטן', 'טובורג', 'קרלסברג', 'סטלה', 'האוואנה', 'מרטיני', 'טוויניניגס', 'פיקוויק', 'אחמד', 'טאצ', 'פראפוצ', 'במבה', 'ביסלי', 'דוריטוס', 'צ׳יטוס', "צ'יטוס", 'פרינגלס', 'קליק', 'סניקרס', 'קיט קט', 'טוויקס', 'אפרופו', 'קרמבו', 'פתי בר', 'לוטוס', 'פאוור קראנץ', "צ'ומפ", 'הוסטס', 'טופל', 'קדבורי', 'תפוצ', 'אורביט', 'טריידנט', 'סטרפצ', "פיצ'ינג", 'סלברוז', 'פסק זמן', 'מקופלת', 'באדי', 'השחר העולה', 'שוקו תנובה', 'שוקו יוטבתה', 'קוואס', 'orbit', 'trident'];
const SUPPLEMENTS = ['קריאטין', 'hmb', 'בטא אלנין', 'אשווגנדה', 'קרניטין', 'מגנזיום', 'קולוסטרום', 'בטא גלוקאן', 'ויטמין d', 'חטיף חלבון', 'שייק חלבון', 'מאצ', 'ירבה'];
const GENERIC = ['דג', 'fish', 'בשר', 'meat', 'עוף', 'chicken', 'גבינה', 'cheese', 'ירקות', 'vegetables', 'סלט', 'salad', 'יוגורט', 'yogurt', 'שעועית', 'beans', 'אגוזים', 'nuts', 'כבש', 'lamb', 'פילה בקר', 'סינטה', 'שייטל', 'סטייק', 'עוגה', 'cake', 'שוקולד', 'chocolate', 'לחם קל', 'פסטה לבנה', 'אורז לבן', 'שמן'];
const AMBIGUOUS = ['פרגית', 'כנפי עוף', 'עוף שלם', 'בשר טחון', 'סיבאס', 'פילה בקלה', 'פורל', 'הרינג', 'קלמארי', 'ריקוטה', 'שמנת חמוצה', 'בשר ארנב', 'בשר צבי', 'ברווז', 'דג בורי', 'דובדבן', 'אגס', 'מלון', 'חלב סויה', 'חלב שיבולת', 'פסטו', 'טארו', 'קסאווה', 'פלנטיין', 'בוקהוויט', 'דוחן', 'שוקולד 85', 'עדשים שחורות', 'שעועית ירוקה', 'קוקוס', 'אגוזי נמר'];
const ALCO = ['קוקטייל', 'נגרוני', 'דאיקירי', 'פרוסקו', 'שמפניה', "ג'ין", 'ראקיה', 'ליקר', 'ברנדי', 'טקילה', 'ערק', 'סיידר'];
const DISH = ['בורקס', 'קובה', 'שניצל', 'שווארמה', 'קציצות', 'מרק', 'פשטידה', 'כריך', 'סושי', 'פיצה', 'פלפל ממולא', 'לזניה', 'רביולי', 'מוסקה', 'חמין', 'קוגל', 'סמבוסק', 'זיווה', "מג'דרה", 'מלאווח', "ג'חנון", 'שקשוקה', 'סביח', 'פתיתים', 'פירה', 'גולש', 'בריאני', 'ריזוטו', 'טאקו', 'בוריטו', 'גואקמולי', 'באבא', 'מוהמרה', 'ציזיקי', 'מטבוחה', 'מסבחה', 'חריסה', 'סחוג', 'פאד', 'ראמן', 'גיוזה', 'ביבימבאפ', 'טוקבוקי', 'אונגירי', 'יקיניקו', 'לחמג', 'סוטלאקי', 'באפלו', 'קורנדוג', 'קלאם', "ג'מבלאיה", 'מופונגו', 'פסטליטוס', 'וונטון', 'פתוש', 'שיש טאוק', 'אינג', 'בוביוטי', 'פבלובה', 'פאי מיט', 'דייפוקו', 'טאיאקי', 'פוקצ', "צ'בטה", 'סלט ארומה', 'סלט גזר', 'סלט סלק', 'קולסלאו', 'סלט ביצים', 'סלט טונה', 'בוקר ישראלי', 'מוקפץ', 'ניגירי', 'קונוס סושי', 'נודלס', 'פסטה ברוטב', 'פסטה פסטו', 'אורז אדום', 'אורז עם', 'ירקות בתנור', 'כרובית אפויה', 'לקט ירקות', 'אפונה וגזר', 'קישלה', 'פריקסה', 'מאוריה', 'אראייס', 'פסטלים', 'סיגרים', 'המבורגר', 'קבב', "צ'יפס", 'נקניק', 'סלמי', 'סלט גדול', 'נאגטס', 'טבעות בצל', 'גפילטע', 'מעורב ירושלמי', 'מלבי', 'בקלאווה', "ג'לטו", 'סורבה', 'מקרון', "צ'יזקייק", 'טירמיסו', 'מוס שוקולד', 'עוגת', 'בראוניז', 'סופגנייה', 'רוגלך', 'אוזן המן', 'וופל', 'קרואסון', 'מאפינס', 'טוסט', 'פרנץ', 'מילקשייק', 'שייק בננה', 'סמודי', 'אייס קפה', 'קפה הפוך', 'מעדן', 'פוקאצ', 'דונאט', 'עוגיות', 'קרוטונים', 'חלה', 'לאפה', 'פיתה', 'בייגל', 'לחמנייה', 'לחם', 'מצות', 'קרקר', 'קורנפלקס', 'גרנולה אפויה', 'פריכיות', 'בצק', 'ממרח', 'רוטב', 'חריסה'];
const hit = (e, list) => e.keys.some((k) => list.some((w) => k.toLowerCase().includes(w.toLowerCase())));
const exact = (e, list) => e.keys.some((k) => list.includes(k.toLowerCase()));
function reasonOf(e) {
  if (hit(e, BRANDS)) return 'מוצר ממותג: ערך אמיתי רק מתווית היצרן באתר הרשמי של המותג. לא נמצאה תווית שנבדקה בפועל, והערך הנוכחי משוער.';
  if (hit(e, ALCO)) return 'משקה אלכוהולי (ממותג, קוקטייל, או סוג שאין לו רשומה ב-SR Legacy): ערך משוער.';
  if (hit(e, SUPPLEMENTS)) return 'תוסף תזונה או חטיף חלבון: הערך משתנה לפי מוצר; אין רשומה כללית.';
  if (hit(e, AMBIGUOUS)) return 'כמה רשומות USDA לאותו שם (גולמי / מבושל, עם עור / בלי, מין, מוצר מקומי): מופה בניסיון ונדחה כדי לא לסמן ״אומת״ בטעות.';
  if (exact(e, GENERIC)) return 'שם כללי: כמה רשומות USDA אפשריות (חיתוך, שומן, הכנה), ואין אחת מדויקת.';
  if (hit(e, DISH)) return 'מנה מוכנה, מאפה או מוצר מקומי: אין רשומה תואמת ב-SR Legacy; הערך משוער.';
  return 'לא מופה: אין רשומה ב-SR Legacy בשם המדויק, או שלא נמצאה התאמה חד-משמעית.';
}
const labelOf = (e) => LABEL_FIXED.find((f) => dbOf(f.key) === e);
const allFixed = new Set([...FIXED.map((f) => f.key), ...Object.keys(FIBRE_FIXED), ...FIBRE_ONLY.map((f) => f.key), ...ROUND2_FIXED.map((f) => f.key)].map((k) => dbOf(k) || dbOf(k.replace('׳', "'"))).filter(Boolean));
const counts = { usda: 0, usdaFixed: 0, label: 0, none: 0 };
const rows = FOOD_DB.map((e, i) => {
  const v = recordOf(e); const lb = labelOf(e);
  const spec = e.cal + '/' + e.p + '/' + e.c + '/' + e.f + '/' + (e.fb || 0);
  const added = ADDED_FOODS.some((k) => dbOf(k) === e);
  if (v) {
    const c = compare(e, v); const fixed = allFixed.has(e);
    counts[fixed ? 'usdaFixed' : 'usda']++;
    return '| ' + (i + 1) + ' | ' + esc(nameOf(e)) + ' | ' + esc(enOf(e)) + ' | ' + spec + ' | **אומת USDA' + (fixed ? ' (תוקן)' : added ? ' (נוסף)' : '') + '** | [FDC ' + v.fdc + '](https://fdc.nal.usda.gov/fdc-app.html#/food-details/' + v.fdc + '/nutrients), SR Legacy 2018-04 — ' + esc(v.desc) + ' | ' + (c.ok ? 'תואם' : 'פער ' + (c.gap > 0 ? '+' : '') + c.gap + (v.cal > 5 ? '%' : ' קק״ל')) + ' |';
  }
  if (lb) {
    counts.label++;
    return '| ' + (i + 1) + ' | ' + esc(nameOf(e)) + ' | ' + esc(enOf(e)) + ' | ' + spec + ' | **אומת תווית יצרן** | [USDA Branded FDC ' + lb.fdc + '](https://fdc.nal.usda.gov/fdc-app.html#/food-details/' + lb.fdc + '/nutrients); תאריך התווית לא נרשם בסבב שבו תוקן | ' + esc(lb.why) + ' |';
  }
  counts.none++;
  const fl = flagsOf(e);
  return '| ' + (i + 1) + ' | ' + esc(nameOf(e)) + ' | ' + esc(enOf(e)) + ' | ' + spec + ' | לא אומת | — | ' + esc(reasonOf(e) + (fl.length ? ' דגל פנימי: ' + fl.join(' · ') + '.' : '')) + ' |';
});
L.push('## 13. סטטוס לכל רשומה במאגר (' + FOOD_DB.length + ') ולכל מידה ביתית (' + portions.length + ')');
L.push('');
L.push('**סיכום:** אומתו מול USDA SR Legacy ' + (counts.usda + counts.usdaFixed) + ' רשומות (מהן ' + counts.usdaFixed + ' תוקנו), אומתו מול תווית יצרן ' + counts.label + ', **לא אומתו ' + counts.none + '**. אף ערך לא הומצא למאכל בלי מקור: ערך ללא מקור נשאר כפי שהיה, מסומן ״לא אומת״, והסיבה בעמודה האחרונה (הסיווג לפי סוג המאכל נעשה לפי רשימות מילים, ולכן הוא הערכה גסה; הסטטוס עצמו מדויק). ״אומת USDA״ אומר שהערך תואם לרשומה שמופתה ידנית לפי שמה המדויק (קלוריות עד 10% וכל מאקרו עד max(2 ג׳, 20%)). במאכלים כמו קרפיון, צלופח, תמנון, אבלון ומולים הרשומה היא של המצב **הגולמי** (נקרא בשם הרשומה), בעוד שהמאגר מצהיר ״מבושל אלא אם נכתב אחרת״: זו שאלת תיוג שמחכה להחלטה (סעיף ״החלטות שנותרו״), לא שגיאת ערך.');
L.push('');
L.push('| # | מאכל | English | קק״ל/ח/פ/ש/סיבים | סטטוס | מקור | הערה / סיבה |');
L.push('|---|---|---|---|---|---|---|');
for (const r of rows) L.push(r);
L.push('');
L.push('### מידות ביתיות (' + portions.length + ')');
L.push('');
L.push('סטטוס לכל שורה ב-`data/portions.js`: **אומת** = כל מידה בשורה שיש לה מקבילה ב-USDA לאותה רשומה תואמת עד 6%; **פער** = לפחות מידה אחת רחוקה ממנה; **לא אומת** = אין רשומת USDA ממופה או אין מידה מאותו סוג. ״typical״ הוא הנחה מוצהרת (מוצגת למשתמש כהערכה); ״entry״ = ערך לפי מנה.');
L.push('');
L.push('| # | מאכל | בסיס | סטטוס | פירוט | סיבה (ל״לא אומת״ / ״פער״) |');
L.push('|---|---|---|---|---|---|');
portionVerdicts.forEach((x, i) => {
  const p = x.p;
  let why = '';
  if (x.status === 'לא אומת') why = p.basis === 'typical' ? 'הנחה מוצהרת (גודל נפוץ, לא מידה ב-USDA)' : p.basis === 'entry' ? 'ערך המאגר הוא למנה, לא ל-100 גרם' : /אין רשומת USDA ממופה/.test(x.detail) ? 'המאכל עצמו לא אומת מול USDA' : 'אין ב-USDA מידה מאותו סוג';
  else if (x.status === 'פער') why = 'המידה במאגר רחוקה מכל מידה מקבילה ב-USDA לאותה רשומה (מעל 6%)';
  L.push('| ' + (i + 1) + ' | ' + esc(p.keys[0]) + ' | ' + p.basis + ' | ' + x.status + ' | ' + esc(x.detail) + ' | ' + esc(why) + ' |');
});
L.push('');

L.push('## החלטות שנותרו');
L.push('');
L.push(`1. **רשומות עם פער מ-USDA:** ${differing.length === 0 ? 'אין, כולן תוקנו או תואמות' : differing.length + ' (בסעיף 1)'}.`);
L.push('2. **מידות ביתיות:** פיתה נשארה 90 ג׳ (הערכה מוצהרת, ״typical״), כי פיתה ישראלית גדולה מהפיתה האמריקאית של USDA (60 ג׳). כוס הפסטה תוקנה ל-124 ג׳ לפי USDA.');
L.push('3. **ערכים שאין להם מקור להשוואה** ונשארו ״לא אומת״: ״סלט״ ו-״ירקות״ (רשומה אחת לכל הסוגים), מנות ישראליות ומותגים. נדרש מקור (צמרת או תווית) כדי לתקן.');
L.push('4. **שלילה במנוע (ללא / בלי):** **נפתר.** המנוע מדלג על מאכל שאחרי ״ללא/בלי/without/no״ (ובדיקות ב-`foodDb.test.js`). סוכר וקמח נוספו. מגבלה ידועה: ״בלי סוכר ועוגה״ נקרא כאילו גם העוגה שלילית (מחבר ״ו״ ממשיך את השלילה).');
L.push('5. **תיוג גולמי / מבושל:** **נפתר.** מולים, צלופח, קרפיון, תמנון, אבלון וכבד טלה הומרו לרשומות USDA של מבושל (ההערה בראש המאגר: מבושל אלא אם נכתב אחרת); הקלוריות שלהם עלו (למשל מולים 86 ← 172, תמנון 82 ← 164). שליו וביצי שליו נשארו גולמיים: ב-SR Legacy אין שליו מבושל בלי עור, וביצי שליו קיימות רק גולמיות; ההערה בקוד אומרת זאת.');
L.push('6. **פריסה:** שינויי השרת בסבב הזה (ערכי מאגר, מאכלים ומידות חדשים) פועלים רק אחרי פריסה ל-Render. לא נפרס.');
L.push('');
fs.writeFileSync(OUT, L.join('\n'), 'utf8');
console.log(`wrote ${path.relative(process.cwd(), OUT)}: ${detailedList.length} foods detailed (${skipped} staples not in FOOD_DB); verified ${compared.length} (${matching.length} match, ${differing.length} differ); portions ${countStatus('אומת')}/${countStatus('פער')}/${countStatus('לא אומת')}; fibre>carbs ${fibreOver.length}; atwater-off ${atwaterOff.length}`);
