// Compares FOOD_DB with the USDA FoodData Central "SR Legacy" dataset and writes the result to
// scripts/usda-verified.json, which scripts/food-audit.js turns into docs/nutrition-audit.md.
//
//   node scripts/usda-verify.js <folder with the unzipped FoodData_Central_sr_legacy_food_csv_2018-04>
//
// The dataset is NOT in the repo (6 MB zip from https://fdc.nal.usda.gov/download-datasets):
// download it, unzip it somewhere outside the project and pass that folder.
//
// Each food is mapped to its SR Legacy record BY EXACT DESCRIPTION, by hand (MAP below), never by
// fuzzy matching. A food with `null` has no suitable record (an Israeli dish, a brand, a generic
// "cheese"): it stays "לא אומת". A wrong mapping would turn into a false "verified", so the script
// fails loudly when a description is not found or is ambiguous.
const fs = require('fs');
const path = require('path');
const { FOOD_DB } = require('../utils/calculations');

const DIR = process.argv[2];
if (!DIR) { console.error('usage: node scripts/usda-verify.js <sr_legacy csv folder>'); process.exit(1); }

// DB key → exact SR Legacy description (or null = no suitable record). `why` explains a non-obvious pick.
const MAP = {
  'בננה': 'Bananas, raw',
  'ביצים': 'Egg, whole, raw, fresh',
  'ביצה קשה': 'Egg, whole, cooked, hard-boiled',
  'ביצת עין': 'Egg, whole, cooked, fried',
  'חביתה': 'Egg, whole, cooked, omelet',
  'שיבולת שועל': 'Cereals, oats, regular and quick, not fortified, dry',
  'אורז': 'Rice, white, long-grain, regular, enriched, cooked',
  'אורז מלא': 'Rice, brown, long-grain, cooked',
  'אבוקדו': 'Avocados, raw, all commercial varieties',
  'חומוס': 'Hummus, commercial',
  'חלב': 'Milk, whole, 3.25% milkfat, with added vitamin D',
  'שמן זית': 'Oil, olive, salad or cooking',
  'חמאת בוטנים': 'Peanut butter, smooth style, with salt',
  'טחינה': 'Seeds, sesame butter, tahini, type of kernels unspecified',
  'לחם': 'Bread, white, commercially prepared',
  'לחם מלא': 'Bread, whole-wheat, commercially prepared',
  'לחם שיפון': 'Bread, rye',
  'חזה עוף': 'Chicken, broilers or fryers, breast, meat only, cooked, roasted',
  'סלמון': 'Fish, salmon, Atlantic, farmed, raw',
  'בטטה': 'Sweet potato, cooked, baked in skin, flesh, without salt',
  "קוטג'": 'Cheese, cottage, creamed, large or small curd',
  'דבש': 'Honey',
  'חלבון': 'Beverages, Protein powder whey based',
  'שקדים': 'Nuts, almonds',
  'חמאת שקדים': 'Nuts, almond butter, plain, without salt added',
  'פסטה': 'Pasta, cooked, enriched, without added salt',
  'פסטה מלאה': 'Pasta, whole-wheat, cooked',
  'יוגורט יווני': 'Yogurt, Greek, plain, nonfat',
  'יוגורט יווני 0%': 'Yogurt, Greek, plain, nonfat',
  'טונה': 'Fish, tuna, light, canned in water, without salt, drained solids',
  'טונה בשמן': 'Fish, tuna, light, canned in oil, drained solids',
  'פנקייק': 'Pancakes, plain, prepared from recipe',
  'פול': 'Broadbeans (fava beans), mature seeds, cooked, boiled, without salt',
  'עגבנייה': 'Tomatoes, red, ripe, raw, year round average',
  'תמר': 'Dates, medjool',
  'קינואה': 'Quinoa, cooked',
  'ברוקולי': 'Broccoli, raw',
  'תפוח עץ': 'Apples, raw, with skin',
  'מלפפון': 'Cucumber, with peel, raw',
  'לימון': 'Lemons, raw, without peel',
  'אגוזי מלך': 'Nuts, walnuts, english',
  'פיתה': 'Bread, pita, white, enriched',
  'תפוח אדמה': 'Potatoes, baked, flesh, without salt',
  'אספרגוס': 'Asparagus, raw',
  'גזר': 'Carrots, raw',
  'קישוא': 'Squash, summer, zucchini, includes skin, raw',
  'דג אמנון': 'Fish, tilapia, cooked, dry heat',
  'בורגול': 'Bulgur, cooked',
  'זיתים': 'Olives, ripe, canned (small-extra large)',
  'שוקולד חלב': 'Candies, milk chocolate',
  'שוקולד מריר': 'Chocolate, dark, 70-85% cacao solids',
  'פלאפל': 'Falafel, home-prepared',
  'תפוז': 'Oranges, raw, all commercial varieties',
  'אבטיח': 'Watermelon, raw',
  'ענבים': 'Grapes, red or green (European type, such as Thompson seedless), raw',
  'חציל': 'Eggplant, cooked, boiled, drained, without salt',
  'גמבה': 'Peppers, sweet, red, raw',
  'בצל': 'Onions, raw',
  'כרובית': 'Cauliflower, raw',
  'חסה': 'Lettuce, green leaf, raw',
  'כרוב': 'Cabbage, raw',
  'פטריות': 'Mushrooms, white, raw',
  'תירס': 'Corn, sweet, yellow, raw',
  'עדשים': 'Lentils, mature seeds, cooked, boiled, without salt',
  'קוסקוס': 'Couscous, cooked',
  'גלידה': 'Ice creams, vanilla',
  'חמאה': 'Butter, salted',
  'מיונז': 'Salad dressing, mayonnaise, regular',
  'קטשופ': 'Catsup',
  'ריבה': 'Jams and preserves',
  'סרדינים': 'Fish, sardine, Atlantic, canned in oil, drained solids with bone',
  'קפה שחור': 'Beverages, coffee, brewed, prepared with tap water',
  'תה': 'Beverages, tea, black, brewed, prepared with tap water',
  'מים': 'Beverages, water, tap, drinking',
  'סודה': 'Beverages, carbonated, club soda',
  'בירה': 'Alcoholic beverage, beer, regular, all',
  'יין': 'Alcoholic beverage, wine, table, red',
  'דלעת': 'Pumpkin, raw',
  'פיסטוק': 'Nuts, pistachio nuts, raw',
  'קשיו': 'Nuts, cashew nuts, raw',
  'חלווה': 'Candies, halavah, plain',
  'חרדל': 'Mustard, prepared, yellow',
  'גבינת שמנת': 'Cheese, cream',
  'מוצרלה': 'Cheese, mozzarella, whole milk',
  'אפונה': 'Peas, green, raw',
  'אדממה': 'Edamame, frozen, prepared',
  'כוסמת': 'Buckwheat groats, roasted, cooked',
  'כבד עוף': 'Chicken, liver, all classes, cooked, simmered',
  'שרימפס': 'Crustaceans, shrimp, mixed species, cooked, moist heat (may contain additives to retain moisture)',
  'קלמנטינה': 'Clementines, raw',
  'אשכולית': 'Grapefruit, raw, pink and red, all areas',
  'אפרסק': 'Peaches, yellow, raw',
  'נקטרינה': 'Nectarines, raw',
  'שזיף': 'Plums, raw',
  'משמש': 'Apricots, raw',
  'מיץ תפוזים': 'Orange juice, raw (Includes foods for USDA\'s Food Distribution Program)',
  // The 24 entries whose fibre was larger than their carbohydrate (impossible). Not mapped, for lack of any SR record:
  // פרי הדרקון (dragon fruit), אסאי (acai); רמבוטן and מנגוסטין exist in SR only canned in syrup (see calculations.js).
  'אגוזי מקדמיה': 'Nuts, macadamia nuts, raw',
  'צנוברים': 'Nuts, pine nuts, dried',
  'זרעי המפ': 'Seeds, hemp seed, hulled',
  "ג'יקמה": 'Yambean (jicama), raw',
  'קרמבולה': 'Carambola, (starfruit), raw',
  'גויאבה': 'Guavas, common, raw',
  'קיוואנו': 'Horned melon (Kiwano)',
  "ג'וג'ובה": 'Jujube, raw',
  'אצת נורי': 'Seaweed, laver, raw',
  'אצת וואקאמה': 'Seaweed, wakame, raw',
  "בוק צ'וי": 'Cabbage, chinese (pak-choi), raw',
  'נבטי שעועית': 'Mung beans, mature seeds, sprouted, raw',
  'קייל': 'Kale, raw',
  'קומקוואט': 'Kumquats, raw',
  'סמבוק': 'Elderberries, raw',
  'דוריאן': 'Durian, raw or frozen',
  'סברס': 'Prickly pears, raw',
  'שומר': 'Fennel, bulb, raw',
  'לפת': 'Turnips, raw',
  'דלעת ערמונים': 'Squash, winter, butternut, cooked, baked, without salt',
  'גרנולה': 'Cereals ready-to-eat, granola, homemade',
  // Entries whose kcal does not equal 4P+4C+9F: USDA's own kcal uses specific factors (fibre, etc.), so the record is the judge.
  'סובין חיטה': 'Wheat bran, crude',
  'ספירולינה': 'Seaweed, spirulina, dried',
  'סרטן': 'Crustaceans, crab, alaska king, cooked, moist heat',
};

function csv(file) {
  const text = fs.readFileSync(path.join(DIR, file), 'utf8');
  const rows = []; let row = []; let field = ''; let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQ) { if (ch === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false; } else field += ch; }
    else if (ch === '"') inQ = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n') { row.push(field.replace(/\r$/, '')); rows.push(row); row = []; field = ''; }
    else field += ch;
  }
  const head = rows.shift();
  return rows.map((r) => Object.fromEntries(head.map((h, k) => [h, r[k]])));
}

const byDesc = new Map();
for (const r of csv('food.csv')) {
  const k = r.description.toLowerCase();
  byDesc.set(k, [...(byDesc.get(k) || []), r.fdc_id]);
}
const wanted = { 1008: 'cal', 1003: 'p', 1005: 'c', 1004: 'f', 1079: 'fb' }; // kcal, protein, carbs, fat, fibre
const nut = new Map();
for (const r of csv('food_nutrient.csv')) {
  const k = wanted[r.nutrient_id];
  if (!k) continue;
  if (!nut.has(r.fdc_id)) nut.set(r.fdc_id, {});
  nut.get(r.fdc_id)[k] = parseFloat(r.amount);
}
const units = new Map(csv('measure_unit.csv').map((r) => [r.id, r.name]));
const portionsByFood = new Map();
for (const r of csv('food_portion.csv')) {
  if (!portionsByFood.has(r.fdc_id)) portionsByFood.set(r.fdc_id, []);
  portionsByFood.get(r.fdc_id).push({
    amount: parseFloat(r.amount), unit: units.get(r.measure_unit_id) || '', text: [r.portion_description, r.modifier].filter(Boolean).join(' '), grams: parseFloat(r.gram_weight),
  });
}

const out = [];
const problems = [];
for (const [key, desc] of Object.entries(MAP)) {
  const entry = FOOD_DB.find((e) => e.keys.includes(key));
  if (!entry) { problems.push(`DB has no entry for "${key}"`); continue; }
  let ids = byDesc.get(desc.toLowerCase());
  if (!ids) {
    const pre = [...byDesc.entries()].filter(([d]) => d.startsWith(desc.toLowerCase() + ' ('));
    if (pre.length === 1) ids = pre[0][1];
  }
  if (!ids || ids.length !== 1) { problems.push(`"${key}": ${ids ? 'ambiguous' : 'no SR record'} for "${desc}"`); continue; }
  const v = nut.get(ids[0]);
  if (!v || v.cal === undefined) { problems.push(`"${key}": SR ${ids[0]} has no kcal`); continue; }
  const atw = 4 * (v.p || 0) + 4 * (v.c || 0) + 9 * (v.f || 0);
  // kilojoules listed as kcal are about 4.2x the macros; alcohol calories are not in the macros at all
  if (v.cal > 20 && atw > 0 && v.cal / atw > 3 && !/^alcoholic/i.test(desc)) { problems.push(`"${key}": SR ${ids[0]} kcal ${v.cal} disagrees with its macros (${Math.round(atw)})`); continue; }
  out.push({ key, fdc: Number(ids[0]), desc, cal: v.cal, p: v.p ?? 0, c: v.c ?? 0, f: v.f ?? 0, fb: v.fb ?? 0, portions: portionsByFood.get(ids[0]) || [] });
}
if (problems.length) { console.error('PROBLEMS:\n' + problems.join('\n')); }
fs.writeFileSync(path.join(__dirname, 'usda-verified.json'), JSON.stringify({ source: 'USDA FoodData Central, SR Legacy (April 2018 release)', records: out }, null, 1), 'utf8');
console.log(`wrote scripts/usda-verified.json: ${out.length} verified of ${Object.keys(MAP).length} mapped; ${problems.length} problems`);
