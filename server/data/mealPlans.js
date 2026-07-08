// Daily meal plans organized by calorie ranges
// Based on Israeli nutrition research with 300 meal plans
// Each plan has: breakfast, snack1, lunch, snack2, dinner

const mealPlans = {
  // 1000-1500 kcal range (cut/deficit)
  '1000-1500': [
    {
      id: 1, totalCalories: 1200, totalProtein: 95, totalCarbs: 110, totalFat: 40,
      meals: [
        { type: 'breakfast', he: '2 ביצים קשות + ירקות חתוכים + פרוסת לחם מלא', en: '2 hard-boiled eggs + chopped vegetables + whole wheat bread slice', calories: 280, protein: 18, carbs: 22, fat: 14 },
        { type: 'snack', he: 'קוטג׳ 5% + 10 שקדים', en: 'Cottage cheese 5% + 10 almonds', calories: 180, protein: 20, carbs: 8, fat: 8 },
        { type: 'lunch', he: '150 גרם חזה עוף על הגריל + סלט ירקות עם כף שמן זית', en: '150g grilled chicken breast + vegetable salad with olive oil', calories: 320, protein: 35, carbs: 10, fat: 12 },
        { type: 'snack', he: 'שייק חלבון עם מים', en: 'Protein shake with water', calories: 120, protein: 24, carbs: 2, fat: 1 },
        { type: 'dinner', he: '150 גרם דג טילפיה + ברוקולי מאודה', en: '150g tilapia fish + steamed broccoli', calories: 300, protein: 35, carbs: 12, fat: 10 },
      ],
    },
    {
      id: 2, totalCalories: 1300, totalProtein: 100, totalCarbs: 120, totalFat: 42,
      meals: [
        { type: 'breakfast', he: 'שקשוקה (2 ביצים) + פרוסת לחם מלא', en: 'Shakshuka (2 eggs) + whole wheat bread slice', calories: 310, protein: 18, carbs: 28, fat: 14 },
        { type: 'snack', he: 'יוגורט יווני + כף דבש', en: 'Greek yogurt + honey', calories: 160, protein: 15, carbs: 18, fat: 4 },
        { type: 'lunch', he: '150 גרם טונה בקופסה + אורז מלא (חצי כוס) + סלט', en: '150g canned tuna + brown rice (half cup) + salad', calories: 350, protein: 32, carbs: 35, fat: 8 },
        { type: 'snack', he: 'חטיף חלבון', en: 'Protein bar', calories: 180, protein: 20, carbs: 18, fat: 6 },
        { type: 'dinner', he: '120 גרם סטייק הודו + ירקות מוקפצים', en: '120g turkey steak + stir-fried vegetables', calories: 300, protein: 30, carbs: 15, fat: 12 },
      ],
    },
    {
      id: 3, totalCalories: 1100, totalProtein: 90, totalCarbs: 95, totalFat: 38,
      meals: [
        { type: 'breakfast', he: 'אומלט 3 חלבונים + 1 ביצה שלמה + ירקות', en: '3 egg whites + 1 whole egg omelette + vegetables', calories: 200, protein: 22, carbs: 5, fat: 10 },
        { type: 'snack', he: 'תפוח + 2 כפות חמאת בוטנים', en: 'Apple + 2 tbsp peanut butter', calories: 250, protein: 8, carbs: 28, fat: 14 },
        { type: 'lunch', he: '130 גרם חזה עוף + קינואה (חצי כוס)', en: '130g chicken breast + quinoa (half cup)', calories: 300, protein: 32, carbs: 28, fat: 6 },
        { type: 'snack', he: 'גבינת שמנת 5% על מלפפון', en: 'Cream cheese 5% on cucumber', calories: 80, protein: 6, carbs: 4, fat: 4 },
        { type: 'dinner', he: '120 גרם סלמון + אספרגוס צלוי', en: '120g salmon + roasted asparagus', calories: 270, protein: 28, carbs: 8, fat: 14 },
      ],
    },
    {
      id: 4, totalCalories: 1400, totalProtein: 105, totalCarbs: 130, totalFat: 45,
      meals: [
        { type: 'breakfast', he: 'שיבולת שועל + חלבון + בננה + קינמון', en: 'Oatmeal + protein powder + banana + cinnamon', calories: 350, protein: 28, carbs: 48, fat: 6 },
        { type: 'snack', he: 'גזר + חומוס (3 כפות)', en: 'Carrots + hummus (3 tbsp)', calories: 150, protein: 5, carbs: 18, fat: 7 },
        { type: 'lunch', he: 'שווארמה עוף (150 גרם) בפיתה + סלט', en: 'Chicken shawarma (150g) in pita + salad', calories: 420, protein: 35, carbs: 38, fat: 14 },
        { type: 'snack', he: 'קוטג׳ 5% עם עגבנייה', en: 'Cottage cheese 5% with tomato', calories: 130, protein: 18, carbs: 6, fat: 4 },
        { type: 'dinner', he: '130 גרם דג ברמונדי + סלט ירוק', en: '130g barramundi fish + green salad', calories: 250, protein: 28, carbs: 8, fat: 10 },
      ],
    },
    {
      id: 5, totalCalories: 1250, totalProtein: 98, totalCarbs: 105, totalFat: 40,
      meals: [
        { type: 'breakfast', he: 'טוסט גבינה צהובה 5% + עגבנייה + מלפפון', en: 'Low-fat cheese toast + tomato + cucumber', calories: 240, protein: 16, carbs: 24, fat: 8 },
        { type: 'snack', he: 'שייק חלבון + כף שיבולת שועל', en: 'Protein shake + tbsp oats', calories: 170, protein: 26, carbs: 12, fat: 2 },
        { type: 'lunch', he: '150 גרם חזה הודו + בטטה אפויה קטנה + ירקות', en: '150g turkey breast + small baked sweet potato + vegetables', calories: 370, protein: 34, carbs: 38, fat: 8 },
        { type: 'snack', he: '15 שקדים + מלפפון', en: '15 almonds + cucumber', calories: 120, protein: 4, carbs: 5, fat: 10 },
        { type: 'dinner', he: 'סלט טונה עם ירקות ושמן זית', en: 'Tuna salad with vegetables and olive oil', calories: 280, protein: 30, carbs: 10, fat: 14 },
      ],
    },
    {
      id: 6, totalCalories: 1350, totalProtein: 102, totalCarbs: 118, totalFat: 42,
      meals: [
        { type: 'breakfast', he: 'לביבות קישואים (2) + ביצה + לבן', en: 'Zucchini fritters (2) + egg + labneh', calories: 280, protein: 16, carbs: 20, fat: 14 },
        { type: 'snack', he: 'פודינג צ׳יה עם חלב שקדים', en: 'Chia pudding with almond milk', calories: 160, protein: 6, carbs: 16, fat: 8 },
        { type: 'lunch', he: 'קציצות עוף (3) + אורז מלא + סלט', en: 'Chicken patties (3) + brown rice + salad', calories: 400, protein: 35, carbs: 40, fat: 10 },
        { type: 'snack', he: 'גבינה לבנה 5% + ירקות', en: 'White cheese 5% + vegetables', calories: 120, protein: 15, carbs: 6, fat: 4 },
        { type: 'dinner', he: '130 גרם דג אמנון + ירקות צלויים', en: '130g tilapia + roasted vegetables', calories: 280, protein: 30, carbs: 18, fat: 10 },
      ],
    },
    {
      id: 7, totalCalories: 1150, totalProtein: 92, totalCarbs: 90, totalFat: 40,
      meals: [
        { type: 'breakfast', he: 'גבינה לבנה 5% + ירקות + פרוסת לחם שיפון', en: 'White cheese 5% + vegetables + rye bread slice', calories: 220, protein: 16, carbs: 22, fat: 6 },
        { type: 'snack', he: 'חצי אבוקדו + לימון ומלח', en: 'Half avocado + lemon and salt', calories: 120, protein: 2, carbs: 6, fat: 10 },
        { type: 'lunch', he: 'סטיר פריי עוף (130 גרם) עם ירקות + אטריות אורז', en: 'Chicken stir-fry (130g) with vegetables + rice noodles', calories: 340, protein: 28, carbs: 32, fat: 10 },
        { type: 'snack', he: 'קוטג׳ 5% + קורט מלח', en: 'Cottage cheese 5% + pinch of salt', calories: 130, protein: 18, carbs: 4, fat: 4 },
        { type: 'dinner', he: 'מרק עוף עם ירקות + חזה עוף מפורק', en: 'Chicken soup with vegetables + shredded chicken breast', calories: 260, protein: 30, carbs: 18, fat: 8 },
      ],
    },
    {
      id: 8, totalCalories: 1450, totalProtein: 108, totalCarbs: 125, totalFat: 48,
      meals: [
        { type: 'breakfast', he: 'פנקייק חלבון (2) + פירות יער', en: 'Protein pancakes (2) + berries', calories: 300, protein: 24, carbs: 32, fat: 8 },
        { type: 'snack', he: 'יוגורט יווני 0% + גרנולה (2 כפות)', en: 'Greek yogurt 0% + granola (2 tbsp)', calories: 180, protein: 16, carbs: 20, fat: 4 },
        { type: 'lunch', he: 'המבורגר עוף ביתי + לחמנייה מלאה + סלט', en: 'Homemade chicken burger + whole wheat bun + salad', calories: 420, protein: 34, carbs: 36, fat: 14 },
        { type: 'snack', he: '30 גרם אגוזי מלך', en: '30g walnuts', calories: 200, protein: 5, carbs: 4, fat: 18 },
        { type: 'dinner', he: '150 גרם סלמון צלוי + ברוקולי + לימון', en: '150g baked salmon + broccoli + lemon', calories: 320, protein: 34, carbs: 8, fat: 16 },
      ],
    },
  ],

  // 1500-2500 kcal range (balanced/maintenance)
  '1500-2500': [
    {
      id: 71, totalCalories: 2000, totalProtein: 150, totalCarbs: 200, totalFat: 65,
      meals: [
        { type: 'breakfast', he: '3 ביצים + 2 פרוסות לחם מלא + אבוקדו + ירקות', en: '3 eggs + 2 whole wheat bread slices + avocado + vegetables', calories: 480, protein: 24, carbs: 38, fat: 26 },
        { type: 'snack', he: 'שייק חלבון + בננה + כף חמאת בוטנים', en: 'Protein shake + banana + tbsp peanut butter', calories: 320, protein: 30, carbs: 35, fat: 10 },
        { type: 'lunch', he: '200 גרם חזה עוף + אורז מלא (כוס) + סלט ירקות', en: '200g chicken breast + brown rice (1 cup) + vegetable salad', calories: 520, protein: 42, carbs: 55, fat: 10 },
        { type: 'snack', he: 'קוטג׳ 5% + פירות + 10 שקדים', en: 'Cottage cheese 5% + fruit + 10 almonds', calories: 250, protein: 22, carbs: 22, fat: 8 },
        { type: 'dinner', he: '180 גרם סלמון + קינואה + ירקות צלויים', en: '180g salmon + quinoa + roasted vegetables', calories: 480, protein: 38, carbs: 35, fat: 20 },
      ],
    },
    {
      id: 72, totalCalories: 1800, totalProtein: 140, totalCarbs: 185, totalFat: 55,
      meals: [
        { type: 'breakfast', he: 'שיבולת שועל + חלבון + בננה + אגוזים', en: 'Oatmeal + protein + banana + nuts', calories: 400, protein: 30, carbs: 50, fat: 10 },
        { type: 'snack', he: 'לחם מלא + חומוס + ירקות', en: 'Whole wheat bread + hummus + vegetables', calories: 250, protein: 10, carbs: 32, fat: 10 },
        { type: 'lunch', he: '180 גרם שווארמה הודו + פיתה + סלט טחינה', en: '180g turkey shawarma + pita + tahini salad', calories: 480, protein: 38, carbs: 42, fat: 16 },
        { type: 'snack', he: 'יוגורט יווני + גרנולה', en: 'Greek yogurt + granola', calories: 220, protein: 18, carbs: 26, fat: 6 },
        { type: 'dinner', he: '150 גרם סטייק בקר רזה + בטטה + סלט', en: '150g lean beef steak + sweet potato + salad', calories: 450, protein: 38, carbs: 40, fat: 14 },
      ],
    },
    {
      id: 73, totalCalories: 2200, totalProtein: 165, totalCarbs: 220, totalFat: 70,
      meals: [
        { type: 'breakfast', he: 'טוסט אבוקדו + 2 ביצים + גבינה צהובה', en: 'Avocado toast + 2 eggs + cheese', calories: 450, protein: 24, carbs: 32, fat: 24 },
        { type: 'snack', he: 'שייק חלבון + שיבולת שועל + חמאת שקדים', en: 'Protein shake + oats + almond butter', calories: 380, protein: 32, carbs: 38, fat: 12 },
        { type: 'lunch', he: 'שניצל עוף אפוי (200 גרם) + אורז + סלט ישראלי', en: 'Baked chicken schnitzel (200g) + rice + Israeli salad', calories: 580, protein: 42, carbs: 58, fat: 14 },
        { type: 'snack', he: 'קוטג׳ + פירות + אגוזים', en: 'Cottage cheese + fruit + nuts', calories: 280, protein: 22, carbs: 28, fat: 10 },
        { type: 'dinner', he: '200 גרם דג דניס + תפוח אדמה אפוי + ירקות', en: '200g sea bream + baked potato + vegetables', calories: 480, protein: 40, carbs: 42, fat: 12 },
      ],
    },
    {
      id: 74, totalCalories: 1600, totalProtein: 125, totalCarbs: 160, totalFat: 48,
      meals: [
        { type: 'breakfast', he: 'שקשוקה (3 ביצים) + לחם מלא', en: 'Shakshuka (3 eggs) + whole wheat bread', calories: 380, protein: 22, carbs: 30, fat: 18 },
        { type: 'snack', he: 'חטיף חלבון + תפוח', en: 'Protein bar + apple', calories: 260, protein: 22, carbs: 32, fat: 6 },
        { type: 'lunch', he: '170 גרם חזה עוף + בורגול + סלט', en: '170g chicken breast + bulgur + salad', calories: 420, protein: 38, carbs: 42, fat: 8 },
        { type: 'snack', he: 'גבינה לבנה 5% + ירקות + זית', en: 'White cheese 5% + vegetables + olives', calories: 160, protein: 14, carbs: 8, fat: 8 },
        { type: 'dinner', he: '150 גרם טונה טרייה + ירקות מוקפצים', en: '150g fresh tuna + stir-fried vegetables', calories: 350, protein: 35, carbs: 15, fat: 16 },
      ],
    },
    {
      id: 75, totalCalories: 1900, totalProtein: 145, totalCarbs: 195, totalFat: 58,
      meals: [
        { type: 'breakfast', he: 'גרנולה + יוגורט יווני + פירות + דבש', en: 'Granola + Greek yogurt + fruits + honey', calories: 380, protein: 22, carbs: 48, fat: 12 },
        { type: 'snack', he: 'טונה בקופסה + קרקרים מלאים', en: 'Canned tuna + whole grain crackers', calories: 240, protein: 24, carbs: 20, fat: 8 },
        { type: 'lunch', he: 'קדירת עוף (200 גרם) + כוסכוס + ירקות', en: 'Chicken stew (200g) + couscous + vegetables', calories: 520, protein: 40, carbs: 52, fat: 14 },
        { type: 'snack', he: 'שייק חלבון + בננה', en: 'Protein shake + banana', calories: 260, protein: 28, carbs: 32, fat: 4 },
        { type: 'dinner', he: '170 גרם סלמון + אורז + סלט', en: '170g salmon + rice + salad', calories: 480, protein: 36, carbs: 38, fat: 20 },
      ],
    },
    {
      id: 76, totalCalories: 2100, totalProtein: 155, totalCarbs: 210, totalFat: 65,
      meals: [
        { type: 'breakfast', he: 'חביתה (3 ביצים) + גבינה + ירקות + 2 פרוסות לחם', en: 'Omelette (3 eggs) + cheese + vegetables + 2 bread slices', calories: 450, protein: 28, carbs: 34, fat: 22 },
        { type: 'snack', he: 'קוטג׳ 5% + גרנולה + דבש', en: 'Cottage cheese 5% + granola + honey', calories: 280, protein: 22, carbs: 34, fat: 6 },
        { type: 'lunch', he: 'המבורגר בקר (180 גרם) + לחמנייה + תפוח אדמה אפוי', en: 'Beef burger (180g) + bun + baked potato', calories: 580, protein: 40, carbs: 52, fat: 20 },
        { type: 'snack', he: '30 גרם שקדים + פרי', en: '30g almonds + fruit', calories: 250, protein: 8, carbs: 22, fat: 14 },
        { type: 'dinner', he: '180 גרם חזה הודו + פסטה מלאה + רוטב עגבניות', en: '180g turkey breast + whole wheat pasta + tomato sauce', calories: 500, protein: 42, carbs: 55, fat: 10 },
      ],
    },
    {
      id: 77, totalCalories: 2400, totalProtein: 170, totalCarbs: 245, totalFat: 72,
      meals: [
        { type: 'breakfast', he: 'פנקייק חלבון (3) + סירופ מייפל + פירות יער + אגוז', en: 'Protein pancakes (3) + maple syrup + berries + nuts', calories: 480, protein: 32, carbs: 55, fat: 14 },
        { type: 'snack', he: 'לחם מלא + חמאת בוטנים + בננה', en: 'Whole wheat bread + peanut butter + banana', calories: 380, protein: 14, carbs: 48, fat: 16 },
        { type: 'lunch', he: '200 גרם עוף צלוי + אורז + ירקות + חומוס', en: '200g roasted chicken + rice + vegetables + hummus', calories: 620, protein: 45, carbs: 62, fat: 16 },
        { type: 'snack', he: 'שייק חלבון + בננה + שיבולת שועל', en: 'Protein shake + banana + oats', calories: 350, protein: 32, carbs: 42, fat: 6 },
        { type: 'dinner', he: '200 גרם סטייק בקר + בטטה + סלט + שמן זית', en: '200g beef steak + sweet potato + salad + olive oil', calories: 560, protein: 42, carbs: 45, fat: 22 },
      ],
    },
    {
      id: 78, totalCalories: 2300, totalProtein: 160, totalCarbs: 235, totalFat: 70,
      meals: [
        { type: 'breakfast', he: 'שיבולת שועל + חלב + חלבון + תמרים + שקדים', en: 'Oatmeal + milk + protein + dates + almonds', calories: 450, protein: 30, carbs: 55, fat: 12 },
        { type: 'snack', he: 'סנדוויץ׳ טונה + ירקות', en: 'Tuna sandwich + vegetables', calories: 350, protein: 28, carbs: 32, fat: 12 },
        { type: 'lunch', he: 'שניצל הודו (200 גרם) + פירה בטטה + סלט', en: 'Turkey schnitzel (200g) + sweet potato mash + salad', calories: 580, protein: 42, carbs: 56, fat: 16 },
        { type: 'snack', he: 'יוגורט יווני + פירות + אגוזי מלך', en: 'Greek yogurt + fruits + walnuts', calories: 300, protein: 20, carbs: 30, fat: 12 },
        { type: 'dinner', he: '180 גרם דג סלמון + קינואה + ירקות', en: '180g salmon + quinoa + vegetables', calories: 520, protein: 40, carbs: 42, fat: 20 },
      ],
    },
  ],

  // 2500-3500 kcal range (active/lean bulk)
  '2500-3500': [
    {
      id: 141, totalCalories: 2800, totalProtein: 190, totalCarbs: 300, totalFat: 85,
      meals: [
        { type: 'breakfast', he: '4 ביצים + 3 פרוסות לחם מלא + אבוקדו + גבינה', en: '4 eggs + 3 whole wheat bread slices + avocado + cheese', calories: 620, protein: 34, carbs: 48, fat: 32 },
        { type: 'snack', he: 'שייק חלבון + בננה + שיבולת שועל + חמאת בוטנים', en: 'Protein shake + banana + oats + peanut butter', calories: 450, protein: 36, carbs: 50, fat: 14 },
        { type: 'lunch', he: '250 גרם חזה עוף + אורז (כוס וחצי) + סלט + חומוס', en: '250g chicken breast + rice (1.5 cups) + salad + hummus', calories: 700, protein: 50, carbs: 75, fat: 16 },
        { type: 'snack', he: 'קוטג׳ 5% + גרנולה + בננה + אגוזים', en: 'Cottage cheese 5% + granola + banana + nuts', calories: 400, protein: 28, carbs: 48, fat: 12 },
        { type: 'dinner', he: '200 גרם סלמון + פסטה מלאה + שמן זית + ירקות', en: '200g salmon + whole wheat pasta + olive oil + vegetables', calories: 620, protein: 40, carbs: 58, fat: 22 },
      ],
    },
    {
      id: 142, totalCalories: 3000, totalProtein: 200, totalCarbs: 320, totalFat: 90,
      meals: [
        { type: 'breakfast', he: 'שיבולת שועל + 2 ביצים + חלב + בננה + חמאת שקדים + דבש', en: 'Oatmeal + 2 eggs + milk + banana + almond butter + honey', calories: 580, protein: 32, carbs: 68, fat: 20 },
        { type: 'snack', he: 'סנדוויץ׳ חזה עוף + גבינה + ירקות', en: 'Chicken breast sandwich + cheese + vegetables', calories: 450, protein: 36, carbs: 38, fat: 16 },
        { type: 'lunch', he: '250 גרם סטייק בקר + בטטה גדולה + סלט + שמן זית', en: '250g beef steak + large sweet potato + salad + olive oil', calories: 700, protein: 48, carbs: 65, fat: 22 },
        { type: 'snack', he: 'שייק חלבון + שיבולת שועל + חמאת בוטנים + חלב', en: 'Protein shake + oats + peanut butter + milk', calories: 500, protein: 40, carbs: 50, fat: 16 },
        { type: 'dinner', he: '200 גרם עוף + אורז + ירקות מוקפצים + טחינה', en: '200g chicken + rice + stir-fried vegetables + tahini', calories: 580, protein: 42, carbs: 55, fat: 16 },
      ],
    },
    {
      id: 143, totalCalories: 2600, totalProtein: 180, totalCarbs: 275, totalFat: 78,
      meals: [
        { type: 'breakfast', he: 'פנקייק חלבון (3) + פירות + סירופ + אגוזים', en: 'Protein pancakes (3) + fruits + syrup + nuts', calories: 500, protein: 32, carbs: 58, fat: 16 },
        { type: 'snack', he: 'יוגורט יווני + גרנולה + דבש + שקדים', en: 'Greek yogurt + granola + honey + almonds', calories: 350, protein: 24, carbs: 40, fat: 12 },
        { type: 'lunch', he: 'שווארמה עוף (220 גרם) + פיתה + חומוס + סלט + טחינה', en: 'Chicken shawarma (220g) + pita + hummus + salad + tahini', calories: 650, protein: 45, carbs: 58, fat: 22 },
        { type: 'snack', he: 'שייק חלבון + בננה + חמאת בוטנים', en: 'Protein shake + banana + peanut butter', calories: 380, protein: 32, carbs: 38, fat: 12 },
        { type: 'dinner', he: '200 גרם דג סול + אורז + ירקות צלויים', en: '200g sole fish + rice + roasted vegetables', calories: 450, protein: 38, carbs: 48, fat: 10 },
      ],
    },
    {
      id: 144, totalCalories: 3200, totalProtein: 210, totalCarbs: 340, totalFat: 95,
      meals: [
        { type: 'breakfast', he: 'חביתה 4 ביצים + אבוקדו + 3 פרוסות לחם + גבינה צהובה', en: '4 egg omelette + avocado + 3 bread slices + yellow cheese', calories: 680, protein: 36, carbs: 48, fat: 36 },
        { type: 'snack', he: 'שייק: חלב + חלבון + בננה + שיבולת שועל + חמאת שקדים', en: 'Shake: milk + protein + banana + oats + almond butter', calories: 520, protein: 38, carbs: 58, fat: 16 },
        { type: 'lunch', he: '280 גרם חזה עוף + אורז (2 כוסות) + סלט + חומוס', en: '280g chicken breast + rice (2 cups) + salad + hummus', calories: 780, protein: 55, carbs: 82, fat: 16 },
        { type: 'snack', he: 'סנדוויץ׳ טונה + אבוקדו + גבינה', en: 'Tuna sandwich + avocado + cheese', calories: 480, protein: 32, carbs: 34, fat: 22 },
        { type: 'dinner', he: '220 גרם סטייק בקר + פסטה + ירקות + שמן זית', en: '220g beef steak + pasta + vegetables + olive oil', calories: 650, protein: 45, carbs: 58, fat: 22 },
      ],
    },
    {
      id: 145, totalCalories: 3400, totalProtein: 220, totalCarbs: 360, totalFat: 100,
      meals: [
        { type: 'breakfast', he: 'שיבולת שועל גדולה + 3 ביצים + חלב + בננה + תמרים', en: 'Large oatmeal + 3 eggs + milk + banana + dates', calories: 650, protein: 36, carbs: 75, fat: 20 },
        { type: 'snack', he: 'סנדוויץ׳ חזה הודו + אבוקדו + גבינה + ירקות', en: 'Turkey breast sandwich + avocado + cheese + vegetables', calories: 520, protein: 38, carbs: 42, fat: 22 },
        { type: 'lunch', he: '300 גרם עוף + אורז (2 כוסות) + חומוס + סלט גדול', en: '300g chicken + rice (2 cups) + hummus + large salad', calories: 820, protein: 58, carbs: 85, fat: 20 },
        { type: 'snack', he: 'שייק חלבון כפול + בננה + שיבולת שועל + חמאת בוטנים', en: 'Double protein shake + banana + oats + peanut butter', calories: 560, protein: 50, carbs: 55, fat: 16 },
        { type: 'dinner', he: '250 גרם סלמון + בטטה גדולה + ירקות + טחינה', en: '250g salmon + large sweet potato + vegetables + tahini', calories: 680, protein: 45, carbs: 60, fat: 26 },
      ],
    },
    {
      id: 146, totalCalories: 2700, totalProtein: 185, totalCarbs: 285, totalFat: 80,
      meals: [
        { type: 'breakfast', he: 'טוסט כפול + 3 ביצים + אבוקדו + עגבנייה', en: 'Double toast + 3 eggs + avocado + tomato', calories: 520, protein: 26, carbs: 42, fat: 28 },
        { type: 'snack', he: 'קוטג׳ 5% + פירות + גרנולה + אגוזים', en: 'Cottage cheese 5% + fruits + granola + nuts', calories: 380, protein: 26, carbs: 42, fat: 12 },
        { type: 'lunch', he: 'קציצות בקר (3) + אורז + סלט + טחינה', en: 'Beef patties (3) + rice + salad + tahini', calories: 650, protein: 45, carbs: 58, fat: 22 },
        { type: 'snack', he: 'שייק חלבון + בננה + חמאת שקדים', en: 'Protein shake + banana + almond butter', calories: 400, protein: 34, carbs: 40, fat: 12 },
        { type: 'dinner', he: '200 גרם חזה הודו + פסטה מלאה + ירקות + שמן זית', en: '200g turkey breast + whole wheat pasta + vegetables + olive oil', calories: 520, protein: 42, carbs: 55, fat: 12 },
      ],
    },
  ],

  // 3500-4500 kcal range (mass gaining)
  '3500-4500': [
    {
      id: 211, totalCalories: 3800, totalProtein: 240, totalCarbs: 420, totalFat: 110,
      meals: [
        { type: 'breakfast', he: '5 ביצים + 4 פרוסות לחם + אבוקדו + גבינה + חלב', en: '5 eggs + 4 bread slices + avocado + cheese + milk', calories: 820, protein: 44, carbs: 62, fat: 42 },
        { type: 'snack', he: 'שייק: חלב + 2 סקופ חלבון + בננה + שיבולת שועל + חמאת בוטנים', en: 'Shake: milk + 2 scoops protein + banana + oats + peanut butter', calories: 620, protein: 50, carbs: 65, fat: 18 },
        { type: 'lunch', he: '300 גרם חזה עוף + אורז (2.5 כוסות) + חומוס + סלט + שמן זית', en: '300g chicken breast + rice (2.5 cups) + hummus + salad + olive oil', calories: 900, protein: 58, carbs: 100, fat: 22 },
        { type: 'snack', he: 'סנדוויץ׳ כפול טונה + אבוקדו + ביצה', en: 'Double tuna sandwich + avocado + egg', calories: 580, protein: 42, carbs: 42, fat: 24 },
        { type: 'dinner', he: '250 גרם סטייק בקר + פסטה גדולה + ירקות + טחינה', en: '250g beef steak + large pasta + vegetables + tahini', calories: 750, protein: 48, carbs: 72, fat: 26 },
      ],
    },
    {
      id: 212, totalCalories: 4000, totalProtein: 250, totalCarbs: 440, totalFat: 115,
      meals: [
        { type: 'breakfast', he: 'שיבולת שועל גדולה + 4 ביצים + חלב + בננה + תמרים + שקדים', en: 'Large oatmeal + 4 eggs + milk + banana + dates + almonds', calories: 780, protein: 42, carbs: 85, fat: 28 },
        { type: 'snack', he: 'סנדוויץ׳ חזה עוף כפול + גבינה + אבוקדו', en: 'Double chicken breast sandwich + cheese + avocado', calories: 650, protein: 48, carbs: 48, fat: 28 },
        { type: 'lunch', he: '300 גרם שניצל עוף אפוי + אורז (3 כוסות) + סלט + חומוס', en: '300g baked chicken schnitzel + rice (3 cups) + salad + hummus', calories: 950, protein: 58, carbs: 110, fat: 22 },
        { type: 'snack', he: 'שייק חלבון כפול + בננה + שיבולת שועל + חמאת שקדים + חלב', en: 'Double protein shake + banana + oats + almond butter + milk', calories: 650, protein: 52, carbs: 68, fat: 18 },
        { type: 'dinner', he: '280 גרם סלמון + בטטה גדולה + ירקות + טחינה + לחם', en: '280g salmon + large sweet potato + vegetables + tahini + bread', calories: 780, protein: 48, carbs: 72, fat: 28 },
      ],
    },
    {
      id: 213, totalCalories: 3600, totalProtein: 230, totalCarbs: 395, totalFat: 105,
      meals: [
        { type: 'breakfast', he: 'חביתה 4 ביצים + 3 פרוסות לחם + אבוקדו + גבינה + מיץ', en: '4 egg omelette + 3 bread slices + avocado + cheese + juice', calories: 720, protein: 36, carbs: 58, fat: 36 },
        { type: 'snack', he: 'קוטג׳ + גרנולה + פירות + אגוזים + דבש', en: 'Cottage cheese + granola + fruits + nuts + honey', calories: 450, protein: 28, carbs: 52, fat: 16 },
        { type: 'lunch', he: '280 גרם עוף צלוי + פסטה (2 כוסות) + רוטב + סלט', en: '280g roasted chicken + pasta (2 cups) + sauce + salad', calories: 750, protein: 52, carbs: 78, fat: 18 },
        { type: 'snack', he: 'שייק חלבון + בננה + חמאת בוטנים + שיבולת שועל', en: 'Protein shake + banana + peanut butter + oats', calories: 480, protein: 38, carbs: 52, fat: 14 },
        { type: 'dinner', he: '250 גרם בקר טחון + אורז + שעועית + ירקות + שמן זית', en: '250g ground beef + rice + beans + vegetables + olive oil', calories: 700, protein: 48, carbs: 68, fat: 24 },
      ],
    },
    {
      id: 214, totalCalories: 4200, totalProtein: 260, totalCarbs: 460, totalFat: 120,
      meals: [
        { type: 'breakfast', he: 'פנקייק חלבון (4) + בננה + סירופ + ביצים (3) בצד', en: 'Protein pancakes (4) + banana + syrup + 3 eggs on the side', calories: 780, protein: 48, carbs: 78, fat: 24 },
        { type: 'snack', he: 'שייק גיינר: חלב + 2 סקופ חלבון + שיבולת שועל + בננה + חמאת בוטנים', en: 'Gainer shake: milk + 2 scoops protein + oats + banana + peanut butter', calories: 700, protein: 52, carbs: 75, fat: 22 },
        { type: 'lunch', he: '350 גרם עוף + אורז (3 כוסות) + חומוס + סלט + טחינה', en: '350g chicken + rice (3 cups) + hummus + salad + tahini', calories: 1000, protein: 65, carbs: 105, fat: 26 },
        { type: 'snack', he: 'סנדוויץ׳ כפול + ביצים + אבוקדו + גבינה', en: 'Double sandwich + eggs + avocado + cheese', calories: 680, protein: 40, carbs: 52, fat: 34 },
        { type: 'dinner', he: '300 גרם סטייק + בטטה + אורז + ירקות + שמן זית', en: '300g steak + sweet potato + rice + vegetables + olive oil', calories: 850, protein: 55, carbs: 85, fat: 28 },
      ],
    },
    {
      id: 215, totalCalories: 4400, totalProtein: 270, totalCarbs: 480, totalFat: 125,
      meals: [
        { type: 'breakfast', he: 'שיבולת שועל ענקית + 4 ביצים + חלב + בננה + תמרים + אגוזים + דבש', en: 'Giant oatmeal + 4 eggs + milk + banana + dates + nuts + honey', calories: 880, protein: 46, carbs: 95, fat: 32 },
        { type: 'snack', he: 'סנדוויץ׳ חזה הודו כפול + גבינה + אבוקדו + חומוס', en: 'Double turkey breast sandwich + cheese + avocado + hummus', calories: 720, protein: 52, carbs: 58, fat: 30 },
        { type: 'lunch', he: '350 גרם שניצל אפוי + אורז (3 כוסות) + סלט + חומוס + טחינה', en: '350g baked schnitzel + rice (3 cups) + salad + hummus + tahini', calories: 1050, protein: 68, carbs: 115, fat: 26 },
        { type: 'snack', he: 'שייק גיינר כפול + בננה + חמאת שקדים + שיבולת שועל', en: 'Double gainer shake + banana + almond butter + oats', calories: 750, protein: 56, carbs: 72, fat: 22 },
        { type: 'dinner', he: '300 גרם סלמון + פסטה גדולה + ירקות צלויים + שמן זית', en: '300g salmon + large pasta + roasted vegetables + olive oil', calories: 800, protein: 50, carbs: 75, fat: 28 },
      ],
    },
  ],

  // 4500-6000 kcal range (elite athletes)
  '4500-6000': [
    {
      id: 281, totalCalories: 5000, totalProtein: 300, totalCarbs: 560, totalFat: 140,
      meals: [
        { type: 'breakfast', he: '6 ביצים + 4 פרוסות לחם + אבוקדו + גבינה + חלב + מיץ', en: '6 eggs + 4 bread slices + avocado + cheese + milk + juice', calories: 1050, protein: 54, carbs: 85, fat: 50 },
        { type: 'snack', he: 'שייק גיינר: חלב + 3 סקופ חלבון + 2 בננות + שיבולת שועל + חמאת בוטנים', en: 'Gainer shake: milk + 3 scoops protein + 2 bananas + oats + peanut butter', calories: 900, protein: 70, carbs: 95, fat: 24 },
        { type: 'lunch', he: '400 גרם עוף + אורז (3 כוסות) + חומוס + סלט + שמן זית + לחם', en: '400g chicken + rice (3 cups) + hummus + salad + olive oil + bread', calories: 1200, protein: 72, carbs: 130, fat: 30 },
        { type: 'snack', he: 'סנדוויץ׳ כפול טונה + ביצים + אבוקדו + גבינה + שייק חלבון', en: 'Double tuna sandwich + eggs + avocado + cheese + protein shake', calories: 900, protein: 68, carbs: 60, fat: 38 },
        { type: 'dinner', he: '350 גרם סטייק + בטטה גדולה + אורז + ירקות + טחינה + לחם', en: '350g steak + large sweet potato + rice + vegetables + tahini + bread', calories: 1000, protein: 58, carbs: 100, fat: 32 },
      ],
    },
    {
      id: 282, totalCalories: 4800, totalProtein: 290, totalCarbs: 530, totalFat: 135,
      meals: [
        { type: 'breakfast', he: 'שיבולת שועל ענקית + 5 ביצים + חלב + 2 בננות + אגוזים + דבש', en: 'Giant oatmeal + 5 eggs + milk + 2 bananas + nuts + honey', calories: 980, protein: 50, carbs: 105, fat: 36 },
        { type: 'snack', he: 'סנדוויץ׳ כפול חזה עוף + גבינה + אבוקדו + חומוס', en: 'Double chicken breast sandwich + cheese + avocado + hummus', calories: 780, protein: 56, carbs: 62, fat: 32 },
        { type: 'lunch', he: '350 גרם שניצל + פסטה (3 כוסות) + רוטב + סלט + לחם שום', en: '350g schnitzel + pasta (3 cups) + sauce + salad + garlic bread', calories: 1100, protein: 65, carbs: 120, fat: 28 },
        { type: 'snack', he: 'שייק גיינר + חטיף חלבון + פירות', en: 'Gainer shake + protein bar + fruits', calories: 800, protein: 60, carbs: 85, fat: 20 },
        { type: 'dinner', he: '300 גרם סלמון + אורז (2 כוסות) + בטטה + ירקות + טחינה + לחם', en: '300g salmon + rice (2 cups) + sweet potato + vegetables + tahini + bread', calories: 950, protein: 55, carbs: 95, fat: 30 },
      ],
    },
    {
      id: 283, totalCalories: 5500, totalProtein: 320, totalCarbs: 600, totalFat: 155,
      meals: [
        { type: 'breakfast', he: 'פנקייק חלבון (5) + 4 ביצים + סירופ + בננה + חלב + מיץ', en: 'Protein pancakes (5) + 4 eggs + syrup + banana + milk + juice', calories: 1100, protein: 62, carbs: 110, fat: 38 },
        { type: 'snack', he: 'שייק גיינר ענק + סנדוויץ׳ חמאת בוטנים + בננה', en: 'Giant gainer shake + peanut butter sandwich + banana', calories: 950, protein: 60, carbs: 105, fat: 30 },
        { type: 'lunch', he: '450 גרם עוף + אורז (4 כוסות) + חומוס + סלט + שמן זית + לחם + טחינה', en: '450g chicken + rice (4 cups) + hummus + salad + olive oil + bread + tahini', calories: 1400, protein: 80, carbs: 150, fat: 36 },
        { type: 'snack', he: 'סנדוויץ׳ כפול + ביצים + גבינה + אבוקדו + שייק חלבון', en: 'Double sandwich + eggs + cheese + avocado + protein shake', calories: 1000, protein: 70, carbs: 72, fat: 40 },
        { type: 'dinner', he: '400 גרם בקר + פסטה גדולה + ירקות + שמן זית + לחם', en: '400g beef + large pasta + vegetables + olive oil + bread', calories: 1050, protein: 60, carbs: 100, fat: 32 },
      ],
    },
  ],
};

// Find the right calorie range for a target
function getCalorieRange(target) {
  if (target <= 1500) return '1000-1500';
  if (target <= 2500) return '1500-2500';
  if (target <= 3500) return '2500-3500';
  if (target <= 4500) return '3500-4500';
  return '4500-6000';
}

// Get a menu within ±200 kcal of the user's target, ranked by protein closeness.
// proteinTarget is optional — if omitted, picks randomly within the calorie window.
const CALORIE_WINDOW = 200;

function getRandomMenu(calorieTarget, excludeId = null, proteinTarget = null) {
  const allPlans = Object.values(mealPlans).flat();
  const pool = excludeId ? allPlans.filter(p => p.id !== excludeId) : allPlans;
  if (pool.length === 0) return null;

  // Hard constraint: only menus within ±200 kcal of the target.
  let candidates = pool.filter(p =>
    Math.abs(p.totalCalories - calorieTarget) <= CALORIE_WINDOW
  );

  // Fallback: if no menu fits the strict window (e.g. target sits in a gap
  // between buckets), pick the closest one by calories so the user still gets
  // a suggestion instead of an error.
  if (candidates.length === 0) {
    const closest = pool
      .map(p => ({ plan: p, calDiff: Math.abs(p.totalCalories - calorieTarget) }))
      .sort((a, b) => a.calDiff - b.calDiff)[0];
    return { ...closest.plan, range: getCalorieRange(closest.plan.totalCalories) };
  }

  // Within the calorie window, prefer menus closest to the protein target.
  // Pick randomly among the top 5 to keep variety day-to-day.
  const ranked = candidates.map(plan => {
    const protDiff = proteinTarget
      ? Math.abs(plan.totalProtein - proteinTarget) / proteinTarget
      : 0;
    return { plan, score: protDiff };
  });
  ranked.sort((a, b) => a.score - b.score);

  const topN = Math.min(5, ranked.length);
  const idx = Math.floor(Math.random() * topN);
  const winner = ranked[idx].plan;
  return { ...winner, range: getCalorieRange(winner.totalCalories) };
}

// Find an alternative meal of the same type with similar calories.
// Tolerance is ±15% of current calories (with a 50 kcal floor for tiny snacks).
function swapMeal(type, currentCalories, excludeText = null) {
  const allOfType = [];
  for (const range of Object.values(mealPlans)) {
    for (const plan of range) {
      for (const meal of plan.meals) {
        if (meal.type === type) allOfType.push(meal);
      }
    }
  }
  if (allOfType.length === 0) return null;

  const tolerance = Math.max(50, currentCalories * 0.15);
  let pool = allOfType.filter(m =>
    Math.abs(m.calories - currentCalories) <= tolerance &&
    m.he !== excludeText
  );

  // If the window is too tight, fall back to the 5 closest by calories.
  if (pool.length === 0) {
    pool = allOfType
      .filter(m => m.he !== excludeText)
      .sort((a, b) => Math.abs(a.calories - currentCalories) - Math.abs(b.calories - currentCalories))
      .slice(0, 5);
  }
  if (pool.length === 0) return null;

  return pool[Math.floor(Math.random() * pool.length)];
}

// Build a 7-day menu by picking a fresh daily menu for each day, excluding
// the previous day's plan id so two consecutive days don't repeat.
function getWeeklyMenu(calorieTarget, proteinTarget = null) {
  const days = [];
  let prevId = null;
  for (let i = 0; i < 7; i++) {
    const dayMenu = getRandomMenu(calorieTarget, prevId, proteinTarget);
    if (!dayMenu) continue;
    days.push(dayMenu);
    prevId = dayMenu.id;
  }
  return days;
}

module.exports = { mealPlans, getRandomMenu, getWeeklyMenu, getCalorieRange, swapMeal };
