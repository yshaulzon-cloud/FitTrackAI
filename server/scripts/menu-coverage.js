// How many menus fit each calorie target (the ±200 kcal window of getRandomMenu).
// Read-only; writes docs/nutrition-menu-coverage.md.   cd server && node scripts/menu-coverage.js
const fs = require('fs');
const path = require('path');
const { mealPlans } = require('../data/mealPlans');

const OUT = path.join(__dirname, '..', '..', 'docs', 'nutrition-menu-coverage.md');
const WINDOW = 200;
const totals = Object.values(mealPlans).flat().map((p) => p.meals.reduce((a, m) => a + m.calories, 0));
const n = (x) => x.toLocaleString('en-US');

const L = [];
L.push('# כיסוי תפריטים לפי יעד קלוריות');
L.push('');
L.push(`נוצר על ידי \`server/scripts/menu-coverage.js\` מנתוני \`server/data/mealPlans.js\` (סכומים אמיתיים של הארוחות), חלון ההתאמה ±${WINDOW} קק״ל סביב יעד היום.`);
L.push('הדוח הוא תמונת מצב ולא מתעדכן לבד: אחרי שינוי בתפריטים יש להריץ מחדש.');
L.push('');
L.push(`סה״כ ${totals.length} תפריטים. סכום הקלוריות האמיתי בין ${n(Math.min(...totals))} ל-${n(Math.max(...totals))}.`);
L.push('');
L.push('## תפריטים לפי טווח בנתונים');
L.push('| טווח | תפריטים |');
L.push('|---|---|');
for (const [lo, hi] of [[1000, 1500], [1500, 2500], [2500, 3500], [3500, 4500], [4500, 6000]]) {
  L.push(`| ${lo}-${hi} | ${totals.filter((t) => t >= lo && t < hi).length} |`);
}
L.push('');
L.push('## כמה תפריטים מתאימים לכל יעד');
L.push(`| יעד היום (קק״ל) | תפריטים בחלון ±${WINDOW} | הפער לתפריט הקרוב ביותר | הערכה |`);
L.push('|---|---|---|---|');
const rows = [];
for (let target = 1000; target <= 6000; target += 250) {
  const inWindow = totals.filter((t) => Math.abs(t - target) <= WINDOW).length;
  const gap = Math.min(...totals.map((t) => Math.abs(t - target)));
  const verdict = inWindow >= 3 ? 'תקין' : inWindow >= 1 ? 'מגוון נמוך' : 'אין התאמה, התפריט מסומן "קירוב"';
  rows.push({ target, inWindow, gap, verdict });
  L.push(`| ${n(target)} | ${inWindow} | ${gap} | ${verdict} |`);
}
const firstUncovered = rows.find((r) => r.inWindow === 0);
const lowStart = rows.find((r) => r.target >= 3500 && r.inWindow <= 2);
L.push('');
L.push('## מה זה אומר');
L.push(`- יעדים מעל כ-${n(firstUncovered ? firstUncovered.target - 50 : Math.max(...totals) + 200)} קק״ל אינם מכוסים: התפריט שמוצג הוא הקרוב ביותר, והלקוח מציג הודעה "אין תפריט שמתאים בדיוק" עם הפער.`);
L.push(`- בין ${n(lowStart ? lowStart.target : 3500)} ל-${n(Math.max(...totals))} קק״ל יש בחלון תפריט אחד או שניים בלבד. בתפריט שבועי, כשיש תפריט אחד בחלון, היום שאחריו לא יכול לחזור עליו ומקבל את התפריט הקרוב ביותר שאינו בחלון, ומסומן "קירוב".`);
L.push('- הצעה, לא לממש בלי אישור: לבנות תפריט מרכיבים וכמויות לפי היעד, במקום בחירה מתוך 30 תפריטים קבועים.');
L.push('');
fs.writeFileSync(OUT, L.join('\n'), 'utf8');
console.log(`wrote ${path.relative(process.cwd(), OUT)}: ${totals.length} menus, ${Math.min(...totals)}–${Math.max(...totals)} kcal`);
