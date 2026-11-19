// How much does "one egg", "a slice", "a tablespoon" weigh — FOR EACH FOOD.
//
// FOOD_DB holds nutrition per 100 g. To turn "3 ביצים", "כף טחינה" or "חצי כוס אורז"
// into grams the engine (utils/foodText.js) needs the weight of that household measure
// for that food: a cup of cooked rice and a cup of milk are not the same mass. A food
// that is not listed here has no measure data, and the engine then says the amount is
// assumed (100 g) instead of pretending to know it.
//
//   keys     any name of the food as it appears in FOOD_DB (all its names share one record)
//   unit     grams of one piece   ("an egg", "a pita", "an apple")
//   serving  grams taken when the text names no amount — only where one piece / one
//            portion is the natural reading ("פיתה", "תפוח", "כוס חלב")
//   slice · tbsp · tsp · cup · cube    grams of that household measure of this food
//   basis    'usda'     the USDA FoodData Central household measure (named in `note`)
//            'typical'  a common size, an assumption — shown to the user as an estimate
//            'entry'    the FOOD_DB value is per portion, not per 100 g (see note)
//
// The USDA figures below are the household-measure weights as I know them; record
// numbers are not copied here and every line is to be confirmed in the nutrition
// audit (docs/nutrition-audit.md) before it is relied on for anything but a first
// estimate.
module.exports = [
  // ── pieces ────────────────────────────────────────────────────────────
  { keys: ['ביצים'], unit: 50, serving: 50, basis: 'usda', note: 'egg, whole, large = 50 g' },
  { keys: ['ביצה קשה'], unit: 50, serving: 50, basis: 'usda', note: 'egg, hard-boiled, large = 50 g' },
  { keys: ['ביצת עין'], unit: 46, serving: 46, basis: 'usda', note: 'egg, fried, large = 46 g' },
  { keys: ['חלבון ביצה'], unit: 33, serving: 33, basis: 'usda', note: 'egg white, large = 33 g' },
  { keys: ['פיתה'], unit: 90, serving: 90, basis: 'typical', note: 'a common Israeli pita is 80–100 g (USDA 6.5" pita is 60 g)' },
  { keys: ['תפוח עץ'], unit: 180, serving: 180, basis: 'usda', note: 'apple, medium ≈ 182 g' },
  { keys: ['בננה'], unit: 120, serving: 120, basis: 'usda', note: 'banana, medium, peeled ≈ 118 g' },
  { keys: ['אגס'], unit: 178, serving: 178, basis: 'usda', note: 'pear, medium ≈ 178 g' },
  { keys: ['תפוז'], unit: 131, serving: 131, basis: 'usda', note: 'orange, medium ≈ 131 g' },
  { keys: ['עגבנייה'], unit: 123, serving: 123, basis: 'usda', note: 'tomato, medium ≈ 123 g' },
  { keys: ['אבוקדו'], unit: 150, serving: 150, basis: 'typical', note: 'one avocado, flesh ≈ 136–170 g' },
  { keys: ['שקדים'], unit: 1.2, basis: 'usda', note: 'almonds: 23 kernels = 28.35 g' },
  { keys: ['זיתים'], unit: 4.4, basis: 'usda', note: 'olives, ripe, large = 4.4 g' },

  // ── bread: a slice ────────────────────────────────────────────────────
  { keys: ['לחם', 'לחם מלא', 'לחם לבן', 'לחם שיפון', 'לחם כהה', 'לחם מחמצת', 'לחם אחיד'], slice: 30, unit: 30, serving: 30, basis: 'usda', note: 'bread, 1 slice ≈ 28–32 g' },
  { keys: ['לחם קל'], slice: 23, unit: 23, serving: 23, basis: 'usda', note: 'bread, reduced-calorie, 1 slice ≈ 23 g' },

  // ── dairy and drinks ──────────────────────────────────────────────────
  { keys: ['גבינה צהובה', 'גבינה צהובה 28%', 'גבינה צהובה 9%'], slice: 28, serving: 28, basis: 'usda', note: 'cheddar, 1 slice (1 oz) = 28 g' },
  { keys: ['חלב', 'חלב 3%', 'חלב 1%'], cup: 244, serving: 244, basis: 'usda', note: 'milk, 1 cup = 244 g' },
  { keys: ['מים', 'סודה'], cup: 237, serving: 237, basis: 'usda', note: 'water, 1 cup = 237 g' },
  { keys: ['מיץ תפוזים'], cup: 248, serving: 248, basis: 'usda', note: 'orange juice, 1 cup = 248 g' },
  { keys: ['קולה', 'קולה זירו'], unit: 330, serving: 330, basis: 'typical', note: 'a 330 ml can' },
  { keys: ['יוגורט', 'יוגורט 3%', 'יוגורט יווני'], cup: 245, basis: 'usda', note: 'yogurt, plain, 1 cup = 245 g' },
  { keys: ["קוטג'"], cup: 226, basis: 'usda', note: 'cottage cheese, 1 cup = 226 g' },
  { keys: ['גבינת שמנת'], tbsp: 14.5, basis: 'usda', note: 'cream cheese, 1 tbsp = 14.5 g' },

  // ── cooked grains and legumes: a cup ──────────────────────────────────
  { keys: ['אורז', 'אורז לבן'], cup: 158, basis: 'usda', note: 'white rice, cooked, 1 cup = 158 g' },
  { keys: ['אורז מלא'], cup: 195, basis: 'usda', note: 'brown rice, cooked, 1 cup = 195 g' },
  { keys: ['פסטה', 'פסטה לבנה'], cup: 124, basis: 'usda', note: 'spaghetti, cooked, 1 cup not packed = 124 g (USDA 169737; 151 g packed, 107–132 g for short shapes)' },
  { keys: ['קינואה'], cup: 185, basis: 'usda', note: 'quinoa, cooked, 1 cup = 185 g' },
  { keys: ['עדשים'], cup: 198, basis: 'usda', note: 'lentils, cooked, 1 cup = 198 g' },
  { keys: ['חומוס גרגירים'], cup: 164, basis: 'usda', note: 'chickpeas, cooked, 1 cup = 164 g' },
  { keys: ['שיבולת שועל'], cup: 81, basis: 'usda', note: 'rolled oats, dry, 1 cup = 81 g (the FOOD_DB value is dry)' },

  // ── fats and spreads: a tablespoon ────────────────────────────────────
  // With no amount written, a spoonful of oil / tahini / honey is one tablespoon (serving), not 100 g
  // — 100 g of olive oil would be 884 kcal. The amount is still flagged as assumed.
  { keys: ['שמן זית'], serving: 13.5, tbsp: 13.5, tsp: 4.5, basis: 'usda', note: 'olive oil, 1 tbsp = 13.5 g' },
  { keys: ['חמאה'], serving: 14.2, tbsp: 14.2, tsp: 4.7, basis: 'usda', note: 'butter, 1 tbsp = 14.2 g' },
  { keys: ['דבש'], serving: 21, tbsp: 21, tsp: 7, basis: 'usda', note: 'honey, 1 tbsp = 21 g' },
  { keys: ['טחינה', 'טחינה גולמית'], serving: 15, tbsp: 15, tsp: 5, basis: 'usda', note: 'tahini, 1 tbsp = 15 g (USDA 168604, confirmed)' },
  { keys: ['חלבון'], scoop: 30, serving: 30, basis: 'typical', note: 'protein powder: one scoop ≈ 30 g, depends on the brand (USDA 173180 lists 1/3 cup = 32 g)' },
  { keys: ['קזאין'], scoop: 35, serving: 35, basis: 'typical', note: 'casein powder: the label serving is 35 g (USDA Branded 2412810); depends on the brand' },
  { keys: ['גרנולה'], cup: 122, serving: 40, basis: 'usda', note: 'granola, 1 cup = 122 g (USDA 171646); the 40 g serving is an assumption (the size of the former entry, 200 kcal)' },
  { keys: ['חמאת בוטנים'], serving: 16, tbsp: 16, tsp: 5.3, basis: 'usda', note: 'peanut butter, 1 tbsp = 16 g' },
  { keys: ['חומוס'], tbsp: 15, tsp: 5, basis: 'usda', note: 'hummus, 1 tbsp ≈ 15 g' },
  { keys: ['מיונז'], serving: 13.8, tbsp: 13.8, tsp: 4.6, basis: 'usda', note: 'mayonnaise, 1 tbsp = 13.8 g' },

  // ── sweets ────────────────────────────────────────────────────────────
  { keys: ['שוקולד', 'שוקולד חלב', 'שוקולד מריר'], cube: 5, basis: 'typical', note: 'a 100 g bar is ~20 squares' },

  // ── added Nov 2026 with their USDA SR Legacy household measures (each note names the FDC record) ──
  { keys: ['סוכר'], serving: 4.2, tsp: 4.2, tbsp: 12.6, cup: 200, basis: 'usda', note: 'granulated sugar: 1 tsp = 4.2 g, 1 cup = 200 g (FDC 169655); 1 tbsp = 3 tsp (derived)' },
  { keys: ['קמח'], serving: 7.8, tbsp: 7.8, tsp: 2.6, cup: 125, basis: 'usda', note: 'all-purpose flour: 1 cup = 125 g (FDC 168894); tbsp and tsp are derived from the cup (1/16, 1/48)' },
  { keys: ['סוכר חום'], serving: 4.6, tsp: 4.6, cup: 220, basis: 'usda', note: 'brown sugar, packed: 1 tsp = 4.6 g, 1 cup = 220 g (FDC 168833)' },
  { keys: ['סירופ מייפל'], serving: 20, tbsp: 20, cup: 315, basis: 'usda', note: 'maple syrup, 1 tbsp = 20 g, 1 cup = 315 g (FDC 169661)' },
  { keys: ['קקאו'], serving: 5.4, tbsp: 5.4, cup: 86, basis: 'usda', note: 'cocoa powder, 1 tbsp = 5.4 g, 1 cup = 86 g (FDC 169593)' },
  { keys: ['שמן קנולה'], serving: 14, tbsp: 14, tsp: 4.5, cup: 218, basis: 'usda', note: 'canola oil, 1 tbsp = 14 g (FDC 172336)' },
  { keys: ['שמן חמניות'], serving: 13.6, tbsp: 13.6, tsp: 4.5, cup: 218, basis: 'usda', note: 'sunflower oil, 1 tbsp = 13.6 g (FDC 171025)' },
  { keys: ['שמן שומשום'], serving: 4.5, tsp: 4.5, cup: 218, basis: 'usda', note: 'sesame oil, 1 tsp = 4.5 g, 1 cup = 218 g (FDC 171016)' },
  { keys: ['צימוקים'], cup: 145, basis: 'usda', note: 'raisins, 1 cup (not packed) = 145 g (FDC 168165)' },
  { keys: ['בוטנים'], cup: 146, basis: 'usda', note: 'peanuts, 1 cup = 146 g (FDC 172430)' },
  { keys: ['אגוזי לוז'], cup: 135, basis: 'usda', note: 'hazelnuts, 1 cup whole = 135 g (FDC 170581)' },
  { keys: ['שומשום'], serving: 9, tbsp: 9, cup: 144, basis: 'usda', note: 'sesame seeds, 1 tbsp = 9 g, 1 cup = 144 g (FDC 170150)' },
  { keys: ['שמנת מתוקה'], serving: 15, tbsp: 15, cup: 238, basis: 'usda', note: 'heavy cream, 1 tbsp = 15 g, 1 cup fluid = 238 g (FDC 170859)' },
  { keys: ['מיץ תפוחים'], cup: 248, serving: 248, basis: 'usda', note: 'apple juice, 1 cup = 248 g (FDC 173933)' },
  { keys: ['מיץ ענבים'], cup: 253, serving: 253, basis: 'usda', note: 'grape juice, 1 cup = 253 g (FDC 173042)' },
  { keys: ['מיץ גזר'], cup: 236, serving: 236, basis: 'usda', note: 'carrot juice, 1 cup = 236 g (FDC 170491)' },
  { keys: ['מיץ עגבניות'], cup: 243, serving: 243, basis: 'usda', note: 'tomato juice, 1 cup = 243 g (FDC 170545)' },
  { keys: ['מיץ לימון'], cup: 244, basis: 'usda', note: 'lemon juice, 1 cup = 244 g (FDC 167747)' },
  { keys: ['מיץ אננס'], cup: 250, serving: 250, basis: 'usda', note: 'pineapple juice, 1 cup = 250 g (FDC 169947)' },
  { keys: ['רסק עגבניות'], serving: 16, tbsp: 16, cup: 262, basis: 'usda', note: 'tomato paste, 1 tbsp = 16 g, 1 cup = 262 g (FDC 170459)' },
  { keys: ['רוטב עגבניות'], serving: 132, basis: 'usda', note: 'pasta sauce, 1 serving (1/2 cup) = 132 g (FDC 171192)' },
  { keys: ['רוטב ברביקיו'], serving: 17, tbsp: 17, cup: 279, basis: 'usda', note: 'barbecue sauce, 1 tbsp = 17 g, 1 cup = 279 g (FDC 174523)' },
  { keys: ['חומץ'], serving: 14.9, tbsp: 14.9, tsp: 5, cup: 238, basis: 'usda', note: 'distilled vinegar, 1 tbsp = 14.9 g (FDC 172237)' },

  // ── the FOOD_DB value is per portion, not per 100 g ───────────────────
  // Kept as they are (values are for the nutrition audit, docs/nutrition-audit.md):
  // "שייק חלבון" 120 kcal / 25 g protein is one shake. Treating one shake as 100 g makes
  // a shake count as 120 kcal and two shakes as 240, which is what the entry means.
  { keys: ['שייק חלבון'], unit: 100, serving: 100, basis: 'entry', note: 'FOOD_DB value is for one shake' },
];
