/**
 * Mifflin-St Jeor formula for REE (Resting Energy Expenditure)
 * Most accurate for general population and overweight individuals (ISSN 2024)
 */
function calculateREE(weight, height, age, gender) {
  if (gender === 'male') {
    return 10 * weight + 6.25 * height - 5 * age + 5;
  }
  return 10 * weight + 6.25 * height - 5 * age - 161;
}

/**
 * Katch-McArdle formula (when body fat % is known)
 * Preferred for athletes and people with high muscle mass (±5% deviation)
 * Essential for strength athletes and bodybuilders
 */
function calculateREE_KatchMcArdle(weight, bodyFatPercentage) {
  const ffm = weight * (1 - bodyFatPercentage / 100);
  return 370 + 21.6 * ffm;
}

/**
 * Calculate Fat-Free Mass (LBM/FFM) from weight and body fat %
 */
function calculateFFM(weight, bodyFatPercentage) {
  if (!bodyFatPercentage) return null;
  return weight * (1 - bodyFatPercentage / 100);
}

/**
 * Activity multiplier based on workouts per week
 */
function getActivityMultiplier(workoutsPerWeek) {
  if (workoutsPerWeek <= 1) return 1.2;
  if (workoutsPerWeek <= 2) return 1.375;
  if (workoutsPerWeek <= 4) return 1.55;
  if (workoutsPerWeek <= 5) return 1.725;
  return 1.9;
}

/**
 * Calculate TDEE (Total Daily Energy Expenditure)
 */
function calculateTDEE(profile) {
  const { weight, height, age, gender, workoutsPerWeek, bodyFatPercentage } = profile;

  let ree;
  let formulaUsed;
  if (bodyFatPercentage) {
    ree = calculateREE_KatchMcArdle(weight, bodyFatPercentage);
    formulaUsed = 'Katch-McArdle';
  } else {
    ree = calculateREE(weight, height, age, gender);
    formulaUsed = 'Mifflin-St Jeor';
  }

  const activityMultiplier = getActivityMultiplier(workoutsPerWeek);
  return { tdee: Math.round(ree * activityMultiplier), ree: Math.round(ree), formulaUsed };
}

/**
 * Calculate daily calorie target based on goal
 * Based on ISSN 2024-2026 recommendations:
 * - Cut: 20% deficit (0.5-1% body weight loss per week)
 * - Recomp: small deficit of 200-300 kcal (enables MPS while using fat stores)
 * - Bulk: 10% surplus (5-20% range, 10% ideal for lean gains)
 * - Maintain: TDEE (±100-200 buffer considered maintenance)
 */
function calculateCalorieTarget(tdee, goal, weight, bodyFatPercentage) {
  switch (goal) {
    case 'bulk':
      // 10% surplus - optimal for lean bulk (ISSN)
      return Math.round(tdee * 1.10);
    case 'cut': {
      // 20% deficit as per the document example
      const deficit = Math.round(tdee * 0.20);
      const target = tdee - deficit;
      // Safety: don't go below 30 kcal/kg FFM if body fat is known
      if (bodyFatPercentage) {
        const ffm = weight * (1 - bodyFatPercentage / 100);
        const minimumCal = Math.round(ffm * 30);
        return Math.max(target, minimumCal);
      }
      return target;
    }
    case 'recomp':
      // Small deficit of 200-300 kcal for body recomposition
      return Math.round(tdee - 250);
    case 'maintain':
    default:
      return tdee;
  }
}

/**
 * Calculate macronutrient targets
 * Based on ISSN 2024-2026 and DGA 2025-2030 recommendations:
 *
 * Protein (per kg body weight):
 * - General population: 1.2-1.6 g/kg (DGA 2025)
 * - Resistance training + cut: 1.6-2.4 g/kg (ISSN)
 * - Lean athletes in aggressive deficit: 2.3-3.1 g/kg FFM
 * - Recomp: minimum 2.0 g/kg
 *
 * Fat: 20-30% of calories (minimum 20% to maintain testosterone)
 * Carbs: 2-5 g/kg for strength athletes, remainder of calories
 * Fiber: 25-35 g/day target
 */
function calculateMacros(weight, calorieTarget, goal, experience, bodyFatPercentage) {
  // Protein calculation based on goal and experience
  let proteinPerKg;
  switch (goal) {
    case 'bulk':
      // 1.6-2.2 g/kg for lean bulk (ISSN)
      proteinPerKg = experience === 'advanced' ? 2.2 : experience === 'intermediate' ? 2.0 : 1.8;
      break;
    case 'cut':
      // 1.8-2.4 g/kg in deficit to preserve muscle
      if (experience === 'advanced') {
        proteinPerKg = 2.4;
      } else if (experience === 'intermediate') {
        proteinPerKg = 2.2;
      } else {
        proteinPerKg = 1.8;
      }
      break;
    case 'recomp':
      // Minimum 2.0 g/kg for recomposition success
      proteinPerKg = experience === 'advanced' ? 2.4 : 2.0;
      break;
    case 'maintain':
    default:
      // 1.6-2.2 g/kg for maintenance (ISSN)
      proteinPerKg = experience === 'advanced' ? 2.2 : experience === 'intermediate' ? 1.8 : 1.6;
  }

  const protein = Math.round(weight * proteinPerKg);
  const proteinCalories = protein * 4;

  // Fat: 20-35% of calories depending on goal
  // Minimum 20% to protect hormonal function (testosterone)
  // Maintain: 20-35% (0.5-1.5 g/kg), Bulk: ~25-30%, Cut/Recomp: ~25%
  let fatPercent;
  if (goal === 'maintain') {
    fatPercent = 0.28; // Middle of 20-35% range
  } else if (goal === 'bulk') {
    fatPercent = 0.25; // Lower fat to leave room for carbs for training fuel
  } else {
    fatPercent = 0.25;
  }
  const fatCalories = Math.round(calorieTarget * fatPercent);
  const fat = Math.round(fatCalories / 9);

  // Ensure minimum 20% fat threshold
  const minFatCalories = Math.round(calorieTarget * 0.20);
  const minFat = Math.round(minFatCalories / 9);
  const actualFat = Math.max(fat, minFat);
  const actualFatCalories = actualFat * 9;

  // Carbs: remaining calories
  // Maintain: 3-5 g/kg (45-60%), Bulk: 3-5 g/kg, Cut: remainder after protein+fat
  const carbCalories = Math.max(0, calorieTarget - proteinCalories - actualFatCalories);
  const carbs = Math.round(carbCalories / 4);

  // Protein per meal (0.4-0.55 g/kg per meal, 3-6 meals)
  // Bulk/Maintain: 4 meals, Cut/Recomp: 5 meals for better satiety
  const mealsPerDay = goal === 'cut' || goal === 'recomp' ? 5 : 4;
  const proteinPerMeal = Math.round(protein / mealsPerDay);

  // Fiber target: 25-35 g/day
  const fiberTarget = weight > 80 ? 35 : 25;

  return {
    protein,
    carbs,
    fat: actualFat,
    proteinPerKg,
    proteinPerMeal,
    mealsPerDay,
    fiberTarget,
    macroPercent: {
      protein: Math.round((proteinCalories / calorieTarget) * 100),
      carbs: Math.round((carbCalories / calorieTarget) * 100),
      fat: Math.round((actualFatCalories / calorieTarget) * 100),
    },
  };
}

/**
 * Calculate weekly weight change target
 * Cut: ISSN recommends 0.5-1.0% loss per week for muscle preservation
 * Bulk: Weight gain rate by experience level (per month):
 *   - Beginner: 1-1.5% body weight/month
 *   - Intermediate: 0.5-1% body weight/month
 *   - Advanced: <0.5% body weight/month
 * Maintain: weight should stay stable (±0.5 kg/week fluctuation is normal)
 */
function calculateWeeklyWeightTarget(weight, goal, experience) {
  if (goal === 'cut') {
    return {
      direction: 'loss',
      min: Math.round(weight * 0.005 * 100) / 100, // 0.5%/week
      max: Math.round(weight * 0.010 * 100) / 100, // 1.0%/week
    };
  }
  if (goal === 'recomp') {
    return {
      direction: 'loss',
      min: 0,
      max: Math.round(weight * 0.003 * 100) / 100,
    };
  }
  if (goal === 'bulk') {
    // Monthly rates converted to weekly (÷ 4.33)
    let minMonthly, maxMonthly;
    if (experience === 'advanced') {
      minMonthly = 0.002; // ~0.2%
      maxMonthly = 0.005; // 0.5%
    } else if (experience === 'intermediate') {
      minMonthly = 0.005; // 0.5%
      maxMonthly = 0.010; // 1.0%
    } else {
      minMonthly = 0.010; // 1.0%
      maxMonthly = 0.015; // 1.5%
    }
    return {
      direction: 'gain',
      min: Math.round((weight * minMonthly / 4.33) * 100) / 100,
      max: Math.round((weight * maxMonthly / 4.33) * 100) / 100,
      monthlyMin: Math.round(weight * minMonthly * 100) / 100,
      monthlyMax: Math.round(weight * maxMonthly * 100) / 100,
    };
  }
  if (goal === 'maintain') {
    return {
      direction: 'stable',
      min: 0,
      max: 0.5, // Normal daily fluctuation
    };
  }
  return null;
}

/**
 * MET-based calorie burn calculation (2024 Compendium)
 * Energy Expenditure (kcal) = MET * 3.5 * weight(kg) / 200 * duration(min)
 */
function calculateExerciseCalories(met, weightKg, durationMinutes) {
  return Math.round((met * 3.5 * weightKg) / 200 * durationMinutes);
}

/**
 * Comprehensive food database based on USDA FoodData Central 2024-2026
 * Values per 100g (cooked/prepared unless noted otherwise)
 * Format: { cal, p (protein), c (carbs), f (fat), fb (fiber) }
 *
 * Search order: longer/more specific Hebrew terms first, then English,
 * then shorter/generic terms last to avoid false matches.
 */
const FOOD_DB = [
  // === Animal Protein (Table 1) ===
  // Poultry
  { keys: ['חזה עוף', 'chicken breast'], cal: 165, p: 31, c: 0, f: 3.6, fb: 0 },
  { keys: ['חזה הודו', 'turkey breast'], cal: 153, p: 34, c: 0, f: 1.5, fb: 0 },
  { keys: ['פרגית', 'ירך עוף', 'chicken thigh'], cal: 209, p: 24, c: 0, f: 12, fb: 0 },
  { keys: ['כנפי עוף', 'chicken wings'], cal: 290, p: 18, c: 0, f: 22, fb: 0 },
  { keys: ['עוף שלם', 'whole chicken'], cal: 215, p: 24, c: 0, f: 13, fb: 0 },
  { keys: ['כבד עוף', 'chicken liver'], cal: 167, p: 24, c: 0.9, f: 6.5, fb: 0 },
  { keys: ['נקניקיית עוף', 'chicken sausage'], cal: 220, p: 12, c: 4, f: 18, fb: 0 },
  { keys: ['פסטרמה הודו', 'turkey pastrami'], cal: 90, p: 16, c: 2, f: 1, fb: 0 },
  { keys: ['שניצל', 'schnitzel'], cal: 280, p: 18, c: 15, f: 15, fb: 0 },
  // Beef
  { keys: ['פילה בקר', 'beef fillet'], cal: 210, p: 28, c: 0, f: 10, fb: 0 },
  { keys: ['סינטה בקר', 'סינטה', 'sirloin'], cal: 240, p: 25, c: 0, f: 15, fb: 0 },
  { keys: ['שייטל בקר', 'שייטל'], cal: 160, p: 27, c: 0, f: 5, fb: 0 },
  { keys: ['בשר טחון', 'ground beef'], cal: 185, p: 24, c: 0, f: 10, fb: 0 },
  { keys: ['לשון בקר', 'beef tongue'], cal: 284, p: 15, c: 0, f: 25, fb: 0 },
  { keys: ['כבד בקר', 'beef liver'], cal: 175, p: 27, c: 0, f: 4.5, fb: 0 },
  { keys: ['קבב', 'kebab'], cal: 250, p: 18, c: 2, f: 20, fb: 0 },
  { keys: ['המבורגר', 'hamburger', 'burger'], cal: 230, p: 22, c: 1, f: 15, fb: 0 },
  { keys: ['סטייק', 'steak'], cal: 210, p: 28, c: 0, f: 10, fb: 0 },
  { keys: ['בייקון', 'bacon'], cal: 540, p: 37, c: 1.4, f: 42, fb: 0 },
  { keys: ['כבש', 'lamb'], cal: 300, p: 22, c: 0, f: 24, fb: 0 },
  // Fish & Seafood
  { keys: ['סלמון', 'salmon'], cal: 208, p: 22, c: 0, f: 13, fb: 0 },
  { keys: ['טונה במים', 'canned tuna'], cal: 116, p: 26, c: 0, f: 1, fb: 0 },
  { keys: ['טונה', 'tuna'], cal: 116, p: 26, c: 0, f: 1, fb: 0 },
  { keys: ['דג אמנון', 'tilapia'], cal: 128, p: 26, c: 0, f: 2.7, fb: 0 },
  { keys: ['סיבאס', 'לברק', 'sea bass'], cal: 161, p: 23, c: 0, f: 7, fb: 0 },
  { keys: ['פילה בקלה', 'קוד', 'cod'], cal: 82, p: 18, c: 0, f: 0.7, fb: 0 },
  { keys: ['שרימפס', 'shrimp'], cal: 99, p: 24, c: 0.2, f: 0.3, fb: 0 },
  { keys: ['סרדינים', 'sardines'], cal: 208, p: 25, c: 0, f: 11, fb: 0 },
  { keys: ['מקרל', 'mackerel'], cal: 260, p: 20, c: 0, f: 20, fb: 0 },
  { keys: ['לוקוס', 'grouper'], cal: 120, p: 24, c: 0, f: 2, fb: 0 },
  { keys: ['פורל', 'trout'], cal: 150, p: 22, c: 0, f: 6, fb: 0 },
  { keys: ['קלמארי', 'calamari'], cal: 90, p: 18, c: 0, f: 1.5, fb: 0 },
  { keys: ['דג', 'fish'], cal: 150, p: 24, c: 0, f: 5, fb: 0 },
  // Eggs
  { keys: ['חלבון ביצה', 'egg white'], cal: 52, p: 11, c: 0.7, f: 0.2, fb: 0 },
  { keys: ['ביצים', 'eggs'], cal: 155, p: 13, c: 1.1, f: 11, fb: 0 },
  { keys: ['ביצה', 'egg'], cal: 78, p: 6.5, c: 0.6, f: 5.5, fb: 0 },
  { keys: ['חביתה', 'omelette', 'omelet'], cal: 154, p: 11, c: 1.6, f: 12, fb: 0 },
  // Dairy
  { keys: ['יוגורט יווני 0%', 'greek yogurt 0'], cal: 59, p: 10, c: 3.6, f: 0.4, fb: 0 },
  { keys: ['יוגורט יווני', 'greek yogurt'], cal: 59, p: 10, c: 3.6, f: 0.4, fb: 0 },
  { keys: ['יוגורט חלבון', 'protein yogurt'], cal: 59, p: 10, c: 3.6, f: 0.4, fb: 0 },
  { keys: ['יוגורט 3%', 'yogurt 3%'], cal: 60, p: 4, c: 5, f: 3, fb: 0 },
  { keys: ['יוגורט', 'yogurt'], cal: 60, p: 5, c: 4, f: 3, fb: 0 },
  { keys: ['גבינה לבנה 5%'], cal: 95, p: 9, c: 4, f: 5, fb: 0 },
  { keys: ['גבינה לבנה', 'white cheese'], cal: 95, p: 9, c: 4, f: 5, fb: 0 },
  { keys: ['קוטג\'', 'קוטג', 'cottage'], cal: 98, p: 11, c: 4.3, f: 5, fb: 0 },
  { keys: ['ריקוטה', 'ricotta'], cal: 102, p: 11, c: 3, f: 5, fb: 0 },
  { keys: ['גבינה צהובה 9%'], cal: 200, p: 30, c: 0, f: 9, fb: 0 },
  { keys: ['גבינה צהובה 28%', 'cheddar'], cal: 350, p: 25, c: 0, f: 28, fb: 0 },
  { keys: ['גבינה צהובה', 'yellow cheese'], cal: 350, p: 25, c: 0, f: 28, fb: 0 },
  { keys: ['צפתית', 'tzfatit'], cal: 90, p: 12, c: 1.5, f: 5, fb: 0 },
  { keys: ['בולגרית', 'bulgarian'], cal: 105, p: 12, c: 2.5, f: 5, fb: 0 },
  { keys: ['לאבנה', 'labneh'], cal: 93, p: 8.5, c: 4, f: 5, fb: 0 },
  { keys: ['פרמזן', 'parmesan'], cal: 430, p: 38, c: 4, f: 28, fb: 0 },
  { keys: ['צ\'דר'], cal: 400, p: 25, c: 1.3, f: 33, fb: 0 },
  { keys: ['מוצרלה', 'mozzarella'], cal: 280, p: 22, c: 0, f: 20, fb: 0 },
  { keys: ['גבינת שמנת 30%', 'cream cheese 30'], cal: 340, p: 6, c: 0, f: 34, fb: 0 },
  { keys: ['גבינת שמנת 5%', 'cream cheese 5'], cal: 105, p: 10, c: 0, f: 5, fb: 0 },
  { keys: ['גבינת שמנת', 'cream cheese'], cal: 340, p: 6, c: 0, f: 34, fb: 0 },
  { keys: ['חלב 3%', 'milk 3%'], cal: 60, p: 3.2, c: 4.7, f: 3, fb: 0 },
  { keys: ['חלב 1%', 'milk 1%'], cal: 42, p: 3.4, c: 5, f: 1, fb: 0 },
  { keys: ['חלב', 'milk'], cal: 60, p: 3.2, c: 4.7, f: 3, fb: 0 },
  { keys: ['קוויאר', 'caviar'], cal: 264, p: 25, c: 4, f: 18, fb: 0 },
  // Protein supplements
  { keys: ['שייק חלבון', 'protein shake'], cal: 120, p: 25, c: 3, f: 1, fb: 0 },
  { keys: ['חלבון מי גבינה', 'whey'], cal: 120, p: 25, c: 3, f: 1, fb: 0 },
  { keys: ['קזאין', 'casein'], cal: 120, p: 24, c: 3, f: 1, fb: 0 },

  // === Plant Protein, Legumes & Grains (Table 2) ===
  { keys: ['סייטן', 'seitan'], cal: 370, p: 75, c: 14, f: 1.9, fb: 0 },
  { keys: ['טופו', 'tofu'], cal: 100, p: 10, c: 2, f: 5, fb: 1 },
  { keys: ['טמפה', 'tempeh'], cal: 193, p: 19, c: 9, f: 11, fb: 0 },
  { keys: ['עדשים', 'lentils'], cal: 116, p: 9, c: 20, f: 0.4, fb: 8 },
  { keys: ['חומוס גרגירים', 'chickpeas'], cal: 164, p: 9, c: 27, f: 2.6, fb: 7 },
  { keys: ['שעועית שחורה', 'black beans'], cal: 132, p: 9, c: 24, f: 0.5, fb: 8 },
  { keys: ['שעועית', 'beans'], cal: 132, p: 9, c: 24, f: 0.5, fb: 7 },
  { keys: ['פול', 'fava beans'], cal: 110, p: 8, c: 20, f: 0.4, fb: 5 },
  { keys: ['אפונה', 'peas'], cal: 81, p: 5.4, c: 14, f: 0.4, fb: 5 },
  { keys: ['אדממה', 'edamame'], cal: 122, p: 11, c: 10, f: 5, fb: 5 },
  { keys: ['קינואה', 'quinoa'], cal: 120, p: 4.4, c: 21, f: 1.9, fb: 3 },
  { keys: ['אורז מלא', 'brown rice'], cal: 111, p: 2.6, c: 23, f: 0.9, fb: 2 },
  { keys: ['אורז לבן', 'white rice'], cal: 130, p: 2.7, c: 28, f: 0.3, fb: 0.4 },
  { keys: ['אורז', 'rice'], cal: 130, p: 2.7, c: 28, f: 0.3, fb: 0.4 },
  { keys: ['בורגול', 'bulgur'], cal: 83, p: 3, c: 18.5, f: 0.2, fb: 4 },
  { keys: ['כוסמת', 'buckwheat'], cal: 92, p: 3.4, c: 20, f: 0.6, fb: 3 },
  { keys: ['פסטה עדשים', 'lentil pasta'], cal: 340, p: 25, c: 50, f: 2, fb: 8 },
  { keys: ['פסטה מלאה', 'whole wheat pasta'], cal: 124, p: 5.3, c: 25, f: 0.5, fb: 4 },
  { keys: ['פסטה לבנה', 'white pasta'], cal: 158, p: 5.8, c: 31, f: 0.9, fb: 2 },
  { keys: ['פסטה', 'pasta'], cal: 158, p: 5.8, c: 31, f: 0.9, fb: 2 },
  { keys: ['קוסקוס', 'couscous'], cal: 112, p: 3.8, c: 23, f: 0.2, fb: 1 },
  { keys: ['תפוח אדמה', 'potato'], cal: 93, p: 2.5, c: 21, f: 0.1, fb: 2 },
  { keys: ['בטטה', 'sweet potato'], cal: 90, p: 2, c: 21, f: 0.1, fb: 3 },
  { keys: ['שיבולת שועל', 'oatmeal', 'oats'], cal: 380, p: 13, c: 67, f: 7, fb: 10 },
  { keys: ['פיתה', 'pita'], cal: 275, p: 9, c: 56, f: 1.2, fb: 2 },
  { keys: ['לחם מלא', 'whole wheat bread'], cal: 240, p: 10, c: 45, f: 4, fb: 6 },
  { keys: ['לחם קל', 'light bread'], cal: 160, p: 10, c: 28, f: 1.5, fb: 6 },
  { keys: ['לחם לבן', 'white bread'], cal: 265, p: 8, c: 50, f: 3, fb: 2 },
  { keys: ['לחם', 'bread'], cal: 240, p: 10, c: 45, f: 4, fb: 4 },
  { keys: ['אטריות אורז', 'rice noodles'], cal: 108, p: 1.8, c: 24, f: 0.2, fb: 1 },
  { keys: ['ניוקי', 'gnocchi'], cal: 175, p: 3.5, c: 38, f: 0.5, fb: 2 },
  { keys: ['גריסי פנינה', 'pearl barley'], cal: 123, p: 2.3, c: 28, f: 0.4, fb: 3 },
  { keys: ['תירס', 'corn'], cal: 86, p: 3.2, c: 19, f: 1.2, fb: 2 },
  { keys: ['סובין חיטה', 'wheat bran'], cal: 216, p: 16, c: 65, f: 4, fb: 42 },

  // === Fats, Nuts & Seeds (Table 3) ===
  { keys: ['שמן זית', 'olive oil'], cal: 884, p: 0, c: 0, f: 100, fb: 0 },
  { keys: ['שמן קוקוס', 'coconut oil'], cal: 862, p: 0, c: 0, f: 100, fb: 0 },
  { keys: ['חמאה', 'butter'], cal: 717, p: 0.8, c: 0, f: 81, fb: 0 },
  { keys: ['מיונז', 'mayo', 'mayonnaise'], cal: 680, p: 1, c: 0.6, f: 75, fb: 0 },
  { keys: ['אבוקדו', 'avocado'], cal: 160, p: 2, c: 8.5, f: 15, fb: 7 },
  { keys: ['טחינה גולמית', 'raw tahini'], cal: 650, p: 18, c: 12, f: 60, fb: 9 },
  { keys: ['טחינה', 'tahini'], cal: 200, p: 5, c: 0, f: 18, fb: 2 },
  { keys: ['חמאת בוטנים', 'peanut butter'], cal: 588, p: 25, c: 20, f: 50, fb: 6 },
  { keys: ['חמאת שקדים', 'almond butter'], cal: 614, p: 21, c: 19, f: 55, fb: 10 },
  { keys: ['שקדים', 'almonds'], cal: 580, p: 21, c: 22, f: 50, fb: 12 },
  { keys: ['אגוזי מלך', 'walnuts'], cal: 654, p: 15, c: 14, f: 65, fb: 7 },
  { keys: ['קשיו', 'cashew'], cal: 553, p: 18, c: 30, f: 44, fb: 3 },
  { keys: ['פקאן', 'pecan'], cal: 691, p: 9, c: 14, f: 72, fb: 10 },
  { keys: ['פיסטוק', 'pistachio'], cal: 562, p: 20, c: 27, f: 45, fb: 10 },
  { keys: ['אגוזי מקדמיה', 'macadamia'], cal: 718, p: 8, c: 0, f: 76, fb: 9 },
  { keys: ['צנוברים', 'pine nuts'], cal: 673, p: 14, c: 0, f: 68, fb: 4 },
  { keys: ['אגוזים', 'nuts'], cal: 600, p: 18, c: 18, f: 52, fb: 8 },
  { keys: ['גרעיני דלעת', 'pumpkin seeds'], cal: 559, p: 30, c: 11, f: 49, fb: 6 },
  { keys: ['גרעיני חמנייה', 'sunflower seeds'], cal: 584, p: 21, c: 20, f: 51, fb: 9 },
  { keys: ['זרעי צ\'יה', 'chia seeds', 'צ\'יה'], cal: 486, p: 17, c: 42, f: 31, fb: 34 },
  { keys: ['זרעי פשתן', 'flax seeds', 'פשתן'], cal: 534, p: 18, c: 29, f: 42, fb: 27 },
  { keys: ['זרעי המפ', 'hemp seeds'], cal: 550, p: 31, c: 0, f: 48, fb: 4 },
  { keys: ['זיתים', 'olives'], cal: 115, p: 0.8, c: 6, f: 11, fb: 3 },
  { keys: ['פסטו', 'pesto'], cal: 450, p: 5, c: 8, f: 45, fb: 2 },

  // === Vegetables (Table 4) ===
  { keys: ['מלפפון', 'cucumber'], cal: 15, p: 0.7, c: 3.6, f: 0.1, fb: 0.5 },
  { keys: ['עגבנייה', 'עגבניה', 'tomato'], cal: 18, p: 0.9, c: 3.9, f: 0.2, fb: 1 },
  { keys: ['ברוקולי', 'broccoli'], cal: 35, p: 2.4, c: 7, f: 0.4, fb: 3 },
  { keys: ['חסה', 'lettuce'], cal: 15, p: 1.2, c: 2.9, f: 0.2, fb: 1 },
  { keys: ['גמבה', 'פלפל', 'bell pepper'], cal: 31, p: 1, c: 6, f: 0.3, fb: 2 },
  { keys: ['גזר', 'carrot'], cal: 41, p: 0.9, c: 9.6, f: 0.2, fb: 3 },
  { keys: ['קישוא', 'zucchini'], cal: 17, p: 1.2, c: 3.1, f: 0.3, fb: 1 },
  { keys: ['כרובית', 'cauliflower'], cal: 25, p: 1.9, c: 5, f: 0.3, fb: 2 },
  { keys: ['פטריות', 'mushrooms'], cal: 22, p: 3, c: 3.3, f: 0.3, fb: 1 },
  { keys: ['בצל', 'onion'], cal: 40, p: 1.1, c: 9.3, f: 0.1, fb: 2 },
  { keys: ['כרוב', 'cabbage'], cal: 25, p: 1.3, c: 5.8, f: 0.1, fb: 2 },
  { keys: ['תרד', 'spinach'], cal: 23, p: 3, c: 3.6, f: 0.3, fb: 2 },
  { keys: ['חציל', 'eggplant'], cal: 35, p: 0.8, c: 8, f: 0.2, fb: 3 },
  { keys: ['דלעת', 'pumpkin'], cal: 26, p: 1, c: 6.5, f: 0.1, fb: 1 },
  { keys: ['צנונית', 'radish'], cal: 16, p: 0.7, c: 3.4, f: 0.1, fb: 2 },
  { keys: ['אספרגוס', 'asparagus'], cal: 20, p: 2.2, c: 4, f: 0, fb: 2 },
  { keys: ['סלק', 'beet'], cal: 43, p: 1.6, c: 10, f: 0, fb: 3 },
  { keys: ['ירקות בתנור', 'roasted vegetables'], cal: 80, p: 3, c: 14, f: 2, fb: 5 },
  { keys: ['ירקות', 'vegetables'], cal: 30, p: 2, c: 6, f: 0.3, fb: 3 },
  { keys: ['סלט גדול', 'large salad'], cal: 200, p: 6, c: 20, f: 10, fb: 7 },
  { keys: ['סלט', 'salad'], cal: 150, p: 5, c: 15, f: 8, fb: 5 },

  // === Fruits (Table 4) ===
  { keys: ['תפוח עץ', 'תפוח', 'apple'], cal: 52, p: 0.3, c: 14, f: 0.2, fb: 2 },
  { keys: ['בננה', 'banana'], cal: 89, p: 1.1, c: 23, f: 0.3, fb: 3 },
  { keys: ['תות שדה', 'strawberry', 'strawberries'], cal: 32, p: 0.7, c: 7.7, f: 0.3, fb: 2 },
  { keys: ['ענבים', 'grapes'], cal: 69, p: 0.7, c: 18, f: 0.2, fb: 1 },
  { keys: ['אגס', 'pear'], cal: 57, p: 0.4, c: 15, f: 0.1, fb: 3 },
  { keys: ['תפוז', 'orange'], cal: 47, p: 0.9, c: 12, f: 0.1, fb: 2 },
  { keys: ['אפרסק', 'peach'], cal: 39, p: 0.9, c: 9.5, f: 0.2, fb: 2 },
  { keys: ['אבטיח', 'watermelon'], cal: 30, p: 0.6, c: 7.5, f: 0.1, fb: 0.4 },
  { keys: ['מלון', 'melon'], cal: 34, p: 0.8, c: 8, f: 0.2, fb: 1 },
  { keys: ['אוכמניות', 'blueberries'], cal: 57, p: 0.7, c: 14, f: 0.3, fb: 2 },
  { keys: ['מנגו', 'mango'], cal: 60, p: 0.8, c: 15, f: 0.4, fb: 2 },
  { keys: ['אננס', 'pineapple'], cal: 50, p: 0.5, c: 13, f: 0.1, fb: 1 },
  { keys: ['קיווי', 'kiwi'], cal: 61, p: 1.1, c: 15, f: 0.5, fb: 3 },
  { keys: ['אשכולית', 'grapefruit'], cal: 42, p: 0.8, c: 11, f: 0.1, fb: 2 },
  { keys: ['תמר', 'תמרים', 'dates', 'medjool'], cal: 277, p: 1.8, c: 75, f: 0.2, fb: 7 },
  { keys: ['רימון', 'pomegranate'], cal: 83, p: 1.7, c: 18.7, f: 0, fb: 4 },
  { keys: ['פאפאיה', 'papaya'], cal: 43, p: 0.5, c: 11, f: 0, fb: 2 },

  // === Israeli Street Food & Snacks (Table 5) ===
  { keys: ['פלאפל', 'falafel'], cal: 333, p: 13, c: 32, f: 18, fb: 5 },
  { keys: ['חומוס מסעדה', 'restaurant hummus'], cal: 313, p: 11.5, c: 10.5, f: 25, fb: 5 },
  { keys: ['חומוס', 'hummus'], cal: 170, p: 10, c: 20, f: 6, fb: 6 },
  { keys: ['צ\'יפס', 'chips', 'french fries'], cal: 312, p: 3.4, c: 41, f: 15, fb: 3 },
  { keys: ['בורקס', 'burekas'], cal: 315, p: 6, c: 35, f: 19, fb: 1 },
  { keys: ['ג\'חנון', 'jachnun'], cal: 308, p: 6, c: 38, f: 15, fb: 1 },
  { keys: ['מלאווח', 'malawach'], cal: 307, p: 5, c: 35, f: 16, fb: 1 },
  { keys: ['שקשוקה', 'shakshuka'], cal: 107, p: 5.2, c: 4.4, f: 7.6, fb: 1 },
  { keys: ['פיצה', 'pizza'], cal: 266, p: 11, c: 33, f: 10, fb: 2 },
  { keys: ['שווארמה', 'shawarma'], cal: 230, p: 22, c: 1, f: 15, fb: 0 },
  { keys: ['במבה', 'bamba'], cal: 534, p: 17.7, c: 51, f: 31, fb: 3 },
  { keys: ['ביסלי', 'bisli'], cal: 504, p: 10, c: 60, f: 25, fb: 2 },
  { keys: ['דוריטוס', 'doritos'], cal: 516, p: 7, c: 58, f: 30, fb: 2 },
  { keys: ['פופקורן', 'popcorn'], cal: 387, p: 13, c: 78, f: 5, fb: 15 },

  // === Sweets & Desserts ===
  { keys: ['שוקולד מריר', 'dark chocolate'], cal: 598, p: 8, c: 45, f: 42, fb: 11 },
  { keys: ['שוקולד', 'chocolate'], cal: 535, p: 7, c: 60, f: 30, fb: 7 },
  { keys: ['עוגיית שוקולד', 'chocolate cookie'], cal: 451, p: 4, c: 61, f: 21, fb: 2 },
  { keys: ['סופגנייה', 'doughnut', 'donut'], cal: 380, p: 6, c: 50, f: 18, fb: 1 },
  { keys: ['רוגלך', 'rugelach'], cal: 390, p: 5, c: 50, f: 20, fb: 1 },
  { keys: ['גלידה', 'ice cream'], cal: 207, p: 3.5, c: 24, f: 11, fb: 0 },
  { keys: ['עוגה', 'cake'], cal: 350, p: 5, c: 50, f: 15, fb: 1 },

  // === Condiments & Drinks ===
  { keys: ['קטשופ', 'ketchup'], cal: 112, p: 1.3, c: 27, f: 0.1, fb: 0 },
  { keys: ['חרדל', 'mustard'], cal: 66, p: 4, c: 6, f: 4, fb: 3 },
  { keys: ['דבש', 'honey'], cal: 304, p: 0.3, c: 82, f: 0, fb: 0 },
  { keys: ['סילאן', 'date syrup', 'silan'], cal: 280, p: 1, c: 68, f: 0, fb: 0 },
  { keys: ['קולה זירו', 'coke zero', 'cola zero'], cal: 0, p: 0, c: 0, f: 0, fb: 0 },
  { keys: ['קולה', 'קוקה קולה', 'cola', 'coke'], cal: 42, p: 0, c: 10.6, f: 0, fb: 0 },
  { keys: ['בירה', 'beer'], cal: 43, p: 0.5, c: 3.5, f: 0, fb: 0 },
  { keys: ['יין', 'wine'], cal: 85, p: 0, c: 2.6, f: 0, fb: 0 },

  // === Plant Milks ===
  { keys: ['חלב סויה', 'soy milk'], cal: 38, p: 3.5, c: 1.3, f: 2.1, fb: 0 },
  { keys: ['חלב שקדים', 'almond milk'], cal: 19, p: 0.7, c: 0.7, f: 1.6, fb: 0 },
  { keys: ['חלב שיבולת שועל', 'oat milk'], cal: 48, p: 0.8, c: 5.1, f: 2.7, fb: 0 },
  { keys: ['חלב קוקוס', 'coconut milk'], cal: 25, p: 0.2, c: 1, f: 2, fb: 0 },

  // === Ancient Grains, Roots & Starches (USDA/FAO 2024-2026) ===
  { keys: ['פוניו', 'fonio'], cal: 338, p: 8, c: 70, f: 3, fb: 9 },
  { keys: ['טף', 'teff'], cal: 367, p: 13, c: 73, f: 2, fb: 9 },
  { keys: ['אמרנט', 'amaranth'], cal: 359, p: 14, c: 65, f: 7, fb: 11 },
  { keys: ['דוחן', 'millet'], cal: 340, p: 10, c: 73, f: 3, fb: 9 },
  { keys: ['כוסמת ירוקה', 'green buckwheat'], cal: 330, p: 11, c: 70, f: 2, fb: 9 },
  { keys: ['פארו', 'farro'], cal: 340, p: 13, c: 68, f: 2.5, fb: 0 },
  { keys: ['פריקה', 'freekeh'], cal: 350, p: 12, c: 65, f: 2.5, fb: 0 },
  { keys: ['קסאווה', 'cassava'], cal: 109, p: 0.9, c: 27, f: 0.2, fb: 9 },
  { keys: ['יאם', 'yam'], cal: 114, p: 1.5, c: 27, f: 0.2, fb: 11 },
  { keys: ['טארו', 'taro'], cal: 86, p: 1.5, c: 21, f: 0.2, fb: 9 },
  { keys: ['פלנטיין ירוק', 'green plantain'], cal: 122, p: 1.3, c: 32, f: 0.4, fb: 12 },
  { keys: ['פלנטיין', 'plantain'], cal: 120, p: 1.3, c: 31, f: 0.4, fb: 12 },
  { keys: ['אטריות סובה', 'soba'], cal: 99, p: 5, c: 21, f: 0.1, fb: 13 },
  { keys: ['אטריות זכוכית', 'glass noodles'], cal: 120, p: 0, c: 30, f: 0, fb: 0 },
  { keys: ['אורז פרא', 'wild rice'], cal: 150, p: 6, c: 30, f: 0.5, fb: 11 },
  { keys: ['כוסמין', 'spelt'], cal: 128, p: 5.5, c: 26, f: 0.8, fb: 0 },
  { keys: ['ג\'יקמה', 'jicama'], cal: 38, p: 0.7, c: 9, f: 0.1, fb: 14 },
  { keys: ['לחם שיפון', 'rye bread'], cal: 250, p: 9, c: 48, f: 3, fb: 9 },
  { keys: ['טפיוקה', 'tapioca'], cal: 360, p: 0.5, c: 88, f: 0.3, fb: 9 },
  { keys: ['קמח תירס', 'masa'], cal: 363, p: 8.4, c: 76, f: 1.2, fb: 9 },
  { keys: ['שעועית אדזו', 'adzuki'], cal: 146, p: 9, c: 28, f: 0.5, fb: 11 },
  { keys: ['שעועית מונג', 'mung beans'], cal: 105, p: 7, c: 19, f: 0.4, fb: 0 },
  { keys: ['עדשים שחורות', 'black lentils'], cal: 94, p: 9, c: 15, f: 0.4, fb: 11 },
  { keys: ['בטטה סגולה', 'purple sweet potato'], cal: 90, p: 1.5, c: 21, f: 0.1, fb: 0 },
  { keys: ['בוקהוויט', 'kasha'], cal: 344, p: 6, c: 75, f: 1.2, fb: 9 },
  { keys: ['סורגום', 'sorghum'], cal: 343, p: 10, c: 71, f: 3.3, fb: 9 },
  { keys: ['פנקו', 'panko'], cal: 370, p: 12, c: 75, f: 1.5, fb: 0 },
  { keys: ['פירורי לחם', 'breadcrumbs'], cal: 370, p: 12, c: 75, f: 1.5, fb: 0 },

  // === Expanded Proteins (USDA/FAO 2024-2026) ===
  { keys: ['סקייר', 'skyr'], cal: 65, p: 11, c: 4, f: 0.2, fb: 0 },
  { keys: ['בשר צבי', 'venison'], cal: 103, p: 22, c: 0, f: 2.4, fb: 0 },
  { keys: ['חזה ברווז', 'duck breast'], cal: 165, p: 19, c: 0, f: 9, fb: 0 },
  { keys: ['ברווז', 'duck'], cal: 165, p: 19, c: 0, f: 9, fb: 0 },
  { keys: ['ביצי שליו', 'quail eggs'], cal: 158, p: 13, c: 0.4, f: 11, fb: 0 },
  { keys: ['שבלולים', 'escargots', 'escargot'], cal: 90, p: 16, c: 2, f: 1.4, fb: 0 },
  { keys: ['בשר ארנב', 'rabbit'], cal: 170, p: 23, c: 0, f: 8, fb: 0 },
  { keys: ['פניר', 'paneer'], cal: 350, p: 16, c: 2, f: 22, fb: 0 },
  { keys: ['חלומי', 'halloumi'], cal: 320, p: 21, c: 2, f: 25, fb: 0 },
  { keys: ['אנשובי', 'anchovies'], cal: 210, p: 20, c: 0, f: 14, fb: 0 },
  { keys: ['הרינג', 'herring'], cal: 200, p: 18, c: 0, f: 14, fb: 0 },
  { keys: ['מולים', 'mussels'], cal: 104, p: 12, c: 4, f: 2.2, fb: 0 },
  { keys: ['בילטונג', 'biltong'], cal: 270, p: 50, c: 2, f: 6, fb: 0 },
  { keys: ['סויה קלויה', 'roasted soy'], cal: 440, p: 38, c: 30, f: 20, fb: 0 },
  { keys: ['כבד טלה', 'lamb liver'], cal: 137, p: 20, c: 2, f: 5, fb: 0 },
  { keys: ['דג הליבוט', 'halibut'], cal: 110, p: 21, c: 0, f: 2.3, fb: 0 },
  { keys: ['שליו', 'quail'], cal: 134, p: 22, c: 0, f: 4.5, fb: 0 },
  { keys: ['טופו מעושן', 'smoked tofu'], cal: 140, p: 13, c: 2, f: 9, fb: 0 },
  { keys: ['דג סול', 'sole'], cal: 91, p: 18, c: 0, f: 1.2, fb: 0 },
  { keys: ['צלופח', 'eel'], cal: 184, p: 18, c: 0, f: 12, fb: 0 },
  { keys: ['סרטן', 'crab'], cal: 155, p: 18, c: 0, f: 1.5, fb: 0 },

  // === Expanded Fruits & Vegetables (USDA/FAO 2024-2026) ===
  { keys: ['פרי הדרקון', 'dragon fruit', 'פיטאיה'], cal: 60, p: 1.2, c: 13, f: 0, fb: 20 },
  { keys: ['רמבוטן', 'rambutan'], cal: 82, p: 1, c: 21, f: 0.2, fb: 25 },
  { keys: ['מנגוסטין', 'mangosteen'], cal: 73, p: 0.4, c: 18, f: 0.6, fb: 21 },
  { keys: ['קרמבולה', 'star fruit', 'carambola'], cal: 31, p: 1, c: 7, f: 0.3, fb: 14 },
  { keys: ['גויאבה', 'guava'], cal: 68, p: 2.6, c: 14, f: 1, fb: 27 },
  { keys: ['קיוואנו', 'kiwano'], cal: 44, p: 1.8, c: 8, f: 1.3, fb: 27 },
  { keys: ['ג\'וג\'ובה', 'jujube'], cal: 79, p: 1.2, c: 20, f: 0.2, fb: 27 },
  { keys: ['אפרסמון', 'persimmon'], cal: 70, p: 0.6, c: 18, f: 0.2, fb: 0 },
  { keys: ['אצת נורי', 'nori'], cal: 35, p: 6, c: 5, f: 0.3, fb: 23 },
  { keys: ['אצת וואקאמה', 'wakame'], cal: 45, p: 3, c: 9, f: 0.6, fb: 24 },
  { keys: ['בוק צ\'וי', 'bok choy'], cal: 13, p: 1.5, c: 2, f: 0.2, fb: 10 },
  { keys: ['דייקון', 'daikon'], cal: 18, p: 0.6, c: 4, f: 0.1, fb: 0 },
  { keys: ['ביטר מלון', 'bitter melon'], cal: 17, p: 1, c: 3.7, f: 0.2, fb: 0 },
  { keys: ['במיה', 'okra'], cal: 33, p: 2, c: 7, f: 0.2, fb: 0 },
  { keys: ['שורש לוטוס', 'lotus root'], cal: 74, p: 2.6, c: 17, f: 0.1, fb: 0 },
  { keys: ['נבטי שעועית', 'bean sprouts'], cal: 31, p: 3, c: 6, f: 0.2, fb: 11 },
  { keys: ['לבבות דקל', 'hearts of palm'], cal: 28, p: 2.5, c: 4.6, f: 0.6, fb: 0 },
  { keys: ['ארטישוק ירושלמי', 'jerusalem artichoke'], cal: 73, p: 2, c: 17, f: 0, fb: 0 },
  { keys: ['קולרבי', 'kohlrabi'], cal: 27, p: 1.7, c: 6, f: 0.1, fb: 0 },
  { keys: ['רגלת הגינה', 'purslane'], cal: 16, p: 1.3, c: 3.4, f: 0.1, fb: 0 },
  { keys: ['קייל', 'kale'], cal: 39, p: 2.6, c: 6, f: 1, fb: 11 },
  { keys: ['תאנים טריות', 'fresh figs'], cal: 74, p: 0.8, c: 19, f: 0.3, fb: 11 },
  { keys: ['תאנה', 'תאנים', 'fig', 'figs'], cal: 74, p: 0.8, c: 19, f: 0.3, fb: 11 },
  { keys: ['קומקוואט', 'kumquat'], cal: 71, p: 1.9, c: 16, f: 0.9, fb: 28 },
  { keys: ['פסיפלורה', 'passion fruit'], cal: 97, p: 2.2, c: 23, f: 0.7, fb: 0 },
  { keys: ['סמבוק', 'elderberry'], cal: 73, p: 0.7, c: 18, f: 0.5, fb: 28 },
  { keys: ['אסאי', 'acai'], cal: 70, p: 2, c: 4, f: 5, fb: 28 },
  { keys: ['דוריאן', 'durian'], cal: 147, p: 1.5, c: 27, f: 5, fb: 28 },
  { keys: ['לוקוואט', 'שסק', 'loquat'], cal: 47, p: 0.4, c: 12, f: 0.2, fb: 0 },
  { keys: ['סברס', 'צבר', 'prickly pear'], cal: 41, p: 0.7, c: 10, f: 0.5, fb: 28 },
  { keys: ['ליצ\'י', 'lychee'], cal: 66, p: 0.8, c: 16, f: 0.4, fb: 0 },
  { keys: ['מנגולד', 'chard'], cal: 19, p: 1.8, c: 3.7, f: 0.2, fb: 0 },
  { keys: ['שומר', 'fennel'], cal: 31, p: 1.2, c: 7, f: 0.2, fb: 10 },
  { keys: ['לפת', 'turnip'], cal: 23, p: 0.7, c: 5, f: 0.1, fb: 11 },
  { keys: ['שורש פטרוזיליה', 'parsley root'], cal: 55, p: 2.3, c: 12, f: 0.6, fb: 0 },
  { keys: ['דלעת ערמונים', 'butternut squash'], cal: 40, p: 1, c: 10, f: 0.1, fb: 11 },
  { keys: ['צלפים', 'capers'], cal: 23, p: 2.4, c: 5, f: 0.9, fb: 0 },
  { keys: ['שום שחור', 'black garlic'], cal: 150, p: 6, c: 30, f: 0, fb: 0 },

  // === Expanded Snacks & Desserts (USDA/FAO 2024-2026) ===
  { keys: ['בקלאווה', 'baklava'], cal: 434, p: 6, c: 62, f: 17, fb: 0 },
  { keys: ['חלווה', 'halva'], cal: 469, p: 12, c: 60, f: 22, fb: 0 },
  { keys: ['רחת לוקום', 'turkish delight'], cal: 389, p: 0, c: 100, f: 0, fb: 0 },
  { keys: ['פוקי', 'pocky'], cal: 480, p: 7, c: 68, f: 20, fb: 0 },
  { keys: ['פריכיות', 'rice cakes'], cal: 380, p: 8, c: 80, f: 3, fb: 0 },
  { keys: ['חטיף אצות', 'seaweed snack'], cal: 500, p: 30, c: 10, f: 40, fb: 0 },
  { keys: ['ג\'לטו', 'gelato'], cal: 180, p: 4, c: 25, f: 8, fb: 0 },
  { keys: ['סורבה', 'sorbet'], cal: 120, p: 0, c: 30, f: 0, fb: 0 },
  { keys: ['שוקולד 85%', 'dark chocolate 85'], cal: 600, p: 9, c: 20, f: 50, fb: 0 },
  { keys: ['גרנולה אפויה', 'baked granola'], cal: 450, p: 10, c: 60, f: 20, fb: 0 },
  { keys: ['קרקר שיפון', 'rye cracker'], cal: 360, p: 12, c: 65, f: 3, fb: 0 },
  { keys: ['אגוזי נמר', 'tiger nuts'], cal: 400, p: 5, c: 45, f: 25, fb: 0 },
  { keys: ['ג\'רקי בקר', 'beef jerky', 'ג\'רקי'], cal: 410, p: 33, c: 11, f: 25, fb: 0 },
  { keys: ['בננה צ\'יפס', 'banana chips'], cal: 520, p: 2, c: 60, f: 30, fb: 0 },
  { keys: ['ערמונים קלויים', 'roasted chestnuts'], cal: 245, p: 3, c: 53, f: 2, fb: 0 },
  { keys: ['ערמונים', 'chestnuts'], cal: 245, p: 3, c: 53, f: 2, fb: 0 },
  { keys: ['ממרח לוטוס', 'lotus spread'], cal: 580, p: 2, c: 57, f: 38, fb: 0 },
  { keys: ['פתי בר', 'petit beurre'], cal: 430, p: 7, c: 75, f: 11, fb: 0 },
  { keys: ['חטיף חלבון', 'protein bar'], cal: 380, p: 33, c: 35, f: 12, fb: 0 },
  { keys: ['וופל בלגי', 'belgian waffle'], cal: 450, p: 6, c: 55, f: 22, fb: 0 },
  { keys: ['מרשמלו', 'marshmallow'], cal: 320, p: 2, c: 80, f: 0, fb: 0 },
  { keys: ['בייגלה', 'pretzel'], cal: 380, p: 10, c: 75, f: 3, fb: 0 },
  { keys: ['חטיף טורטייה', 'tortilla chips'], cal: 500, p: 7, c: 65, f: 24, fb: 0 },
  { keys: ['טופי', 'toffee'], cal: 450, p: 1, c: 85, f: 12, fb: 0 },
  { keys: ['חטיף דגנים', 'cereal bar'], cal: 400, p: 6, c: 70, f: 10, fb: 0 },

  // === Sauces, Spreads & Drinks (USDA/FAO 2024-2026) ===
  { keys: ['סריראצ\'ה', 'sriracha'], cal: 93, p: 2, c: 19, f: 1, fb: 0 },
  { keys: ['מיסו', 'miso'], cal: 200, p: 12, c: 25, f: 6, fb: 0 },
  { keys: ['צ\'ימיצ\'ורי', 'chimichurri'], cal: 270, p: 1.5, c: 7, f: 27, fb: 0 },
  { keys: ['באבא גנוש', 'baba ganoush'], cal: 179, p: 3, c: 10, f: 14, fb: 0 },
  { keys: ['מוהמרה', 'muhammara'], cal: 365, p: 6, c: 13, f: 32, fb: 0 },
  { keys: ['ציזיקי', 'tzatziki'], cal: 61, p: 5, c: 4, f: 3, fb: 0 },
  { keys: ['גוצ\'וג\'אנג', 'gochujang'], cal: 210, p: 4, c: 45, f: 1, fb: 0 },
  { keys: ['חריסה', 'harissa'], cal: 150, p: 3, c: 10, f: 12, fb: 0 },
  { keys: ['חומץ אורז', 'rice vinegar'], cal: 18, p: 0, c: 0, f: 0, fb: 0 },
  { keys: ['שמן כמהין', 'truffle oil'], cal: 884, p: 0, c: 0, f: 100, fb: 0 },
  { keys: ['גהי', 'ghee'], cal: 880, p: 0, c: 0, f: 100, fb: 0 },
  { keys: ['סירופ אגבה', 'agave syrup', 'אגבה'], cal: 310, p: 0, c: 76, f: 0, fb: 0 },
  { keys: ['ממרח אבוקדו', 'avocado spread'], cal: 160, p: 2, c: 9, f: 15, fb: 0 },
  { keys: ['רוטב דגים', 'fish sauce'], cal: 35, p: 5, c: 4, f: 0, fb: 0 },
  { keys: ['מאצ\'ה', 'matcha'], cal: 2, p: 0.3, c: 0.2, f: 0, fb: 0 },
  { keys: ['קומבוצ\'ה', 'kombucha'], cal: 20, p: 0.5, c: 5, f: 0.1, fb: 0 },
  { keys: ['מי קוקוס', 'coconut water'], cal: 19, p: 0.7, c: 4.8, f: 0, fb: 0 },
  { keys: ['קפיר', 'kefir'], cal: 55, p: 3.5, c: 4.5, f: 1.5, fb: 0 },
  { keys: ['ירבה מאטה', 'yerba mate'], cal: 2, p: 0, c: 0.5, f: 0, fb: 0 },
  { keys: ['קוואס', 'kvass'], cal: 25, p: 0.2, c: 6, f: 0, fb: 0 },
  { keys: ['מיץ רימונים', 'pomegranate juice'], cal: 54, p: 0.2, c: 13, f: 0, fb: 0 },
  { keys: ['חלב זהב', 'golden milk'], cal: 50, p: 1, c: 6, f: 2.5, fb: 0 },

  // === Generic / catch-all (last resort) ===
  { keys: ['עוף', 'chicken'], cal: 200, p: 25, c: 0, f: 10, fb: 0 },
  { keys: ['בשר', 'meat', 'beef'], cal: 250, p: 26, c: 0, f: 15, fb: 0 },
  { keys: ['גבינה', 'cheese'], cal: 300, p: 20, c: 2, f: 24, fb: 0 },
  { keys: ['חלבון', 'protein'], cal: 120, p: 25, c: 3, f: 1, fb: 0 },
  { keys: ['גרנולה', 'granola'], cal: 200, p: 5, c: 30, f: 8, fb: 3 },
];

/**
 * Estimate nutrition from food description using comprehensive USDA 2024-2026 database
 * Searches for the most specific match first (longer Hebrew terms before shorter ones)
 */
function estimateNutrition(description) {
  const text = description.toLowerCase();

  for (const item of FOOD_DB) {
    const matched = item.keys.some((key) => text.includes(key));
    if (matched) {
      // Find English key (non-Hebrew) for translation
      const englishKey = item.keys.find((key) => /^[a-zA-Z0-9 %'\-\/().]+$/.test(key));
      return {
        calories: Math.round(item.cal),
        protein: Math.round(item.p),
        carbs: Math.round(item.c),
        fat: Math.round(item.f),
        fiber: Math.round(item.fb || 0),
        source: 'database',
        englishName: englishKey || null,
      };
    }
  }

  // No match found — return null so the caller can try AI
  return null;
}

/**
 * AI-powered nutrition estimation using Claude API
 * Used as a fallback when no match is found in FOOD_DB
 */
async function estimateNutritionAI(description) {
  const Anthropic = require('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 256,
    messages: [
      {
        role: 'user',
        content: `אתה מומחה תזונה. עבור המאכל הבא, החזר **רק** JSON עם הערכים התזונתיים ל-100 גרם וגם שם באנגלית.
אל תוסיף שום טקסט מלבד ה-JSON.

מאכל: "${description}"

פורמט:
{"calories":0,"protein":0,"carbs":0,"fat":0,"fiber":0,"englishName":"English Name"}`,
      },
    ],
  });

  const text = message.content[0].text.trim();
  // Extract JSON from response (handle possible markdown code blocks)
  const jsonMatch = text.match(/\{[\s\S]*?\}/);
  if (!jsonMatch) {
    throw new Error('AI did not return valid JSON');
  }

  const parsed = JSON.parse(jsonMatch[0]);
  return {
    calories: Math.round(parsed.calories || 0),
    protein: Math.round(parsed.protein || 0),
    carbs: Math.round(parsed.carbs || 0),
    fat: Math.round(parsed.fat || 0),
    fiber: Math.round(parsed.fiber || 0),
    source: 'ai',
    englishName: parsed.englishName || null,
  };
}

/**
 * Generate a weekly workout plan based on user profile
 * Based on ACSM 2026 guidelines:
 * - Consistency over complexity
 * - Each muscle group at least 2x/week
 * - Minimum 10 weekly sets per muscle group for hypertrophy
 * - For strength: 80%+ 1RM; for hypertrophy: 30-80% 1RM to near failure
 *
 * Uses Upper/Lower split model as recommended in the body recomp document
 */
function generateWorkoutPlan(profile) {
  const { goal, workoutsPerWeek, experience } = profile;

  // Rep ranges based on goal
  const strengthReps = '5-8';
  const hypertrophyReps = '10-15';
  const enduranceReps = '12-20';

  // For cut/recomp: prioritize maintaining strength (heavier loads)
  // For bulk: mix strength and hypertrophy
  const isDeficit = goal === 'cut' || goal === 'recomp';

  const exercises = {
    // Upper body - strength focus
    upperStrength: [
      { name: 'לחיצת חזה שטוח (Bench Press)', sets: 4, reps: strengthReps, muscleGroup: 'חזה' },
      { name: 'חתירה במוט (Barbell Row)', sets: 4, reps: strengthReps, muscleGroup: 'גב' },
      { name: 'לחיצת כתפיים (Overhead Press)', sets: 3, reps: strengthReps, muscleGroup: 'כתפיים' },
      { name: 'מתח (Pull Ups)', sets: 3, reps: '6-10', muscleGroup: 'גב' },
      { name: 'כפיפת מרפק (Bicep Curl)', sets: 3, reps: '10-12', muscleGroup: 'זרועות' },
      { name: 'פשיטת מרפק בכבל (Tricep Pushdown)', sets: 3, reps: '10-12', muscleGroup: 'זרועות' },
    ],
    // Upper body - hypertrophy focus
    upperHypertrophy: [
      { name: 'מתח (Pull Ups)', sets: 3, reps: hypertrophyReps, muscleGroup: 'גב' },
      { name: 'לחיצת חזה משופע דמבלים (Incline DB Press)', sets: 3, reps: hypertrophyReps, muscleGroup: 'חזה' },
      { name: 'הרמה צדדית (Lateral Raise)', sets: 4, reps: '12-15', muscleGroup: 'כתפיים' },
      { name: 'חתירה בכבל (Cable Row)', sets: 3, reps: hypertrophyReps, muscleGroup: 'גב' },
      { name: 'פרפר מכונה (Pec Fly)', sets: 3, reps: '12-15', muscleGroup: 'חזה' },
      { name: 'הרמה אחורית (Rear Delt Fly)', sets: 3, reps: '15-20', muscleGroup: 'כתפיים' },
      { name: 'כפיפה בפטיש (Hammer Curl)', sets: 3, reps: '10-12', muscleGroup: 'זרועות' },
    ],
    // Lower body - strength focus
    lowerStrength: [
      { name: 'סקוואט (Squat)', sets: 4, reps: '6-10', muscleGroup: 'רגליים' },
      { name: 'דדליפט רומני (Romanian Deadlift)', sets: 4, reps: '6-10', muscleGroup: 'רגליים' },
      { name: 'לחיצת רגליים (Leg Press)', sets: 3, reps: '8-10', muscleGroup: 'רגליים' },
      { name: 'מכפוף רגל (Leg Curl)', sets: 3, reps: '10-12', muscleGroup: 'רגליים' },
      { name: 'הרמות עקב (Calf Raise)', sets: 4, reps: '12-15', muscleGroup: 'תאומים' },
    ],
    // Lower body - hypertrophy focus
    lowerHypertrophy: [
      { name: 'לאנג\'ים (Lunges)', sets: 3, reps: enduranceReps, muscleGroup: 'רגליים' },
      { name: 'יישור רגל (Leg Extension)', sets: 3, reps: enduranceReps, muscleGroup: 'רגליים' },
      { name: 'מכפוף רגל (Leg Curl)', sets: 3, reps: enduranceReps, muscleGroup: 'רגליים' },
      { name: 'לחיצת רגליים (Leg Press)', sets: 3, reps: '12-15', muscleGroup: 'רגליים' },
      { name: 'הרמות עקב (Calf Raise)', sets: 4, reps: '15-20', muscleGroup: 'תאומים' },
      { name: 'פלאנק (Plank)', sets: 3, reps: '45-60 שניות', muscleGroup: 'ליבה' },
    ],
    // Full body
    fullBody: [
      { name: 'סקוואט (Squat)', sets: 3, reps: '8-12', muscleGroup: 'רגליים' },
      { name: 'לחיצת חזה שטוח (Bench Press)', sets: 3, reps: '8-12', muscleGroup: 'חזה' },
      { name: 'חתירה במוט (Barbell Row)', sets: 3, reps: '8-12', muscleGroup: 'גב' },
      { name: 'לחיצת כתפיים (Overhead Press)', sets: 3, reps: '8-12', muscleGroup: 'כתפיים' },
      { name: 'דדליפט רומני (Romanian Deadlift)', sets: 3, reps: '10-12', muscleGroup: 'רגליים' },
      { name: 'כפיפת מרפק (Bicep Curl)', sets: 2, reps: '10-12', muscleGroup: 'זרועות' },
      { name: 'פשיטת מרפק בכבל (Tricep Pushdown)', sets: 2, reps: '10-12', muscleGroup: 'זרועות' },
    ],
    core: [
      { name: 'פלאנק (Plank)', sets: 3, reps: '45-60 שניות', muscleGroup: 'ליבה' },
      { name: 'כפיפות בטן (Crunches)', sets: 3, reps: '15-20', muscleGroup: 'ליבה' },
      { name: 'הרמת רגליים (Leg Raise)', sets: 3, reps: '12-15', muscleGroup: 'ליבה' },
    ],
  };

  // Adjust sets for beginners (fewer) and advanced (more)
  const setModifier = experience === 'beginner' ? -1 : experience === 'advanced' ? 1 : 0;

  function adjustSets(exerciseList) {
    return exerciseList.map((ex) => ({
      ...ex,
      sets: Math.max(2, ex.sets + setModifier),
    }));
  }

  // ===== MAINTENANCE PLAN =====
  // Full Body 3x/week, minimal volume (4-6 sets/muscle/week), high intensity RPE 8-9
  // Based on maintenance guide: reduce volume to MV, maintain intensity
  const maintenanceExercises = {
    fullBodyA: [
      { name: 'סקוואט (Squat)', sets: 3, reps: '6-8', muscleGroup: 'רגליים' },
      { name: 'לחיצת חזה שטוח (Bench Press)', sets: 3, reps: '6-8', muscleGroup: 'חזה' },
      { name: 'חתירה במוט (Barbell Row)', sets: 3, reps: '6-8', muscleGroup: 'גב' },
      { name: 'הרמה צדדית (Lateral Raise)', sets: 2, reps: '12-15', muscleGroup: 'כתפיים' },
      { name: 'כפיפת מרפק (Bicep Curl)', sets: 2, reps: '10-12', muscleGroup: 'זרועות' },
    ],
    fullBodyB: [
      { name: 'דדליפט (Deadlift)', sets: 3, reps: '5-8', muscleGroup: 'רגליים' },
      { name: 'לחיצת כתפיים (Overhead Press)', sets: 3, reps: '6-8', muscleGroup: 'כתפיים' },
      { name: 'מתח (Pull Ups)', sets: 3, reps: '6-10', muscleGroup: 'גב' },
      { name: 'לחיצת חזה משופע דמבלים (Incline DB Press)', sets: 2, reps: '8-10', muscleGroup: 'חזה' },
      { name: 'פשיטת מרפק בכבל (Tricep Pushdown)', sets: 2, reps: '10-12', muscleGroup: 'זרועות' },
    ],
    fullBodyC: [
      { name: 'לחיצת רגליים (Leg Press)', sets: 3, reps: '8-10', muscleGroup: 'רגליים' },
      { name: 'לחיצת חזה שטוח דמבלים (DB Bench Press)', sets: 3, reps: '8-10', muscleGroup: 'חזה' },
      { name: 'חתירה בכבל (Cable Row)', sets: 3, reps: '8-10', muscleGroup: 'גב' },
      { name: 'הרמה צדדית (Lateral Raise)', sets: 2, reps: '12-15', muscleGroup: 'כתפיים' },
      { name: 'הרמות עקב (Calf Raise)', sets: 3, reps: '12-15', muscleGroup: 'תאומים' },
    ],
  };

  // Maintenance plans - Full Body focus, 3x/week regardless of user preference
  // If user selected more days, cap at 3 strength + optional light cardio
  const maintenancePlans = {
    3: [
      { day: 'יום א\' - Full Body A (RPE 8-9)', type: 'strength', exercises: maintenanceExercises.fullBodyA },
      { day: 'יום ב\' - Full Body B (RPE 8-9)', type: 'strength', exercises: maintenanceExercises.fullBodyB },
      { day: 'יום ג\' - Full Body C (RPE 8-9)', type: 'strength', exercises: maintenanceExercises.fullBodyC },
    ],
    4: [
      { day: 'יום א\' - Full Body A (RPE 8-9)', type: 'strength', exercises: maintenanceExercises.fullBodyA },
      { day: 'יום ב\' - Full Body B (RPE 8-9)', type: 'strength', exercises: maintenanceExercises.fullBodyB },
      { day: 'יום ג\' - אירובי קל (Zone 2)', type: 'cardio', exercises: [
        { name: 'הליכה מהירה / אופניים (Zone 2)', sets: 1, reps: '30-45 דקות', muscleGroup: 'אירובי' },
        ...exercises.core,
      ]},
      { day: 'יום ד\' - Full Body C (RPE 8-9)', type: 'strength', exercises: maintenanceExercises.fullBodyC },
    ],
    5: [
      { day: 'יום א\' - Full Body A (RPE 8-9)', type: 'strength', exercises: maintenanceExercises.fullBodyA },
      { day: 'יום ב\' - אירובי קל (Zone 2)', type: 'cardio', exercises: [
        { name: 'הליכה מהירה / אופניים (Zone 2)', sets: 1, reps: '30-45 דקות', muscleGroup: 'אירובי' },
      ]},
      { day: 'יום ג\' - Full Body B (RPE 8-9)', type: 'strength', exercises: maintenanceExercises.fullBodyB },
      { day: 'יום ד\' - אירובי קל + ליבה', type: 'cardio', exercises: [
        { name: 'הליכה מהירה / אופניים (Zone 2)', sets: 1, reps: '30-45 דקות', muscleGroup: 'אירובי' },
        ...exercises.core,
      ]},
      { day: 'יום ה\' - Full Body C (RPE 8-9)', type: 'strength', exercises: maintenanceExercises.fullBodyC },
    ],
  };

  // ===== BULK / CUT / RECOMP PLANS =====
  // Upper/Lower split, 10-20 sets/muscle/week for hypertrophy
  const plans = {
    3: [
      {
        day: 'יום א\' - פלג גוף עליון (כוח)',
        type: 'strength',
        exercises: adjustSets(exercises.upperStrength),
      },
      {
        day: 'יום ב\' - פלג גוף תחתון (כוח)',
        type: 'strength',
        exercises: adjustSets(exercises.lowerStrength),
      },
      {
        day: 'יום ג\' - Full Body + ליבה',
        type: 'hypertrophy',
        exercises: adjustSets(exercises.fullBody),
      },
    ],
    4: [
      {
        day: 'יום א\' - פלג גוף עליון (כוח)',
        type: 'strength',
        exercises: adjustSets(exercises.upperStrength),
      },
      {
        day: 'יום ב\' - פלג גוף תחתון (כוח)',
        type: 'strength',
        exercises: adjustSets(exercises.lowerStrength),
      },
      {
        day: 'יום ג\' - פלג גוף עליון (היפרטרופיה)',
        type: 'hypertrophy',
        exercises: adjustSets(exercises.upperHypertrophy),
      },
      {
        day: 'יום ד\' - פלג גוף תחתון (היפרטרופיה)',
        type: 'hypertrophy',
        exercises: adjustSets(exercises.lowerHypertrophy),
      },
    ],
    5: [
      {
        day: 'יום א\' - פלג גוף עליון (כוח)',
        type: 'strength',
        exercises: adjustSets(exercises.upperStrength),
      },
      {
        day: 'יום ב\' - פלג גוף תחתון (כוח)',
        type: 'strength',
        exercises: adjustSets(exercises.lowerStrength),
      },
      {
        day: 'יום ג\' - אירובי קל + ליבה',
        type: 'cardio',
        exercises: [
          { name: 'הליכה מהירה / אופניים (Zone 2)', sets: 1, reps: '45 דקות', muscleGroup: 'אירובי' },
          ...adjustSets(exercises.core),
        ],
      },
      {
        day: 'יום ד\' - פלג גוף עליון (היפרטרופיה)',
        type: 'hypertrophy',
        exercises: adjustSets(exercises.upperHypertrophy),
      },
      {
        day: 'יום ה\' - פלג גוף תחתון (היפרטרופיה)',
        type: 'hypertrophy',
        exercises: adjustSets(exercises.lowerHypertrophy),
      },
    ],
    6: [
      {
        day: 'יום א\' - פלג גוף עליון (כוח)',
        type: 'strength',
        exercises: adjustSets(exercises.upperStrength),
      },
      {
        day: 'יום ב\' - פלג גוף תחתון (כוח)',
        type: 'strength',
        exercises: adjustSets(exercises.lowerStrength),
      },
      {
        day: 'יום ג\' - אירובי קל + ליבה',
        type: 'cardio',
        exercises: [
          { name: 'הליכה מהירה / אופניים (Zone 2)', sets: 1, reps: '45 דקות', muscleGroup: 'אירובי' },
          ...adjustSets(exercises.core),
        ],
      },
      {
        day: 'יום ד\' - פלג גוף עליון (היפרטרופיה)',
        type: 'hypertrophy',
        exercises: adjustSets(exercises.upperHypertrophy),
      },
      {
        day: 'יום ה\' - פלג גוף תחתון (היפרטרופיה)',
        type: 'hypertrophy',
        exercises: adjustSets(exercises.lowerHypertrophy),
      },
      {
        day: 'יום ו\' - Full Body קל / אירובי',
        type: 'cardio',
        exercises: [
          { name: 'אימון Full Body קל או אירובי בינוני', sets: 1, reps: '40-50 דקות', muscleGroup: 'כללי' },
          { name: '10,000 צעדים', sets: 1, reps: 'לאורך היום', muscleGroup: 'NEAT' },
        ],
      },
    ],
  };

  let plan;

  if (goal === 'maintain') {
    // Maintenance: Full Body 3x/week, minimal volume, high intensity
    let planKey = workoutsPerWeek;
    if (planKey <= 3) planKey = 3;
    else if (planKey <= 4) planKey = 4;
    else planKey = 5;
    plan = maintenancePlans[planKey];
  } else {
    // Bulk / Cut / Recomp: Upper/Lower split
    let planKey = workoutsPerWeek;
    if (planKey <= 3) planKey = 3;
    else if (planKey <= 4) planKey = 4;
    else if (planKey <= 5) planKey = 5;
    else planKey = 6;
    plan = plans[planKey];
  }

  // Add notes based on goal (using keys for i18n)
  const notes = [];
  if (isDeficit) {
    notes.push('note_keep_weights');
    notes.push('note_strength_before_cardio');
    notes.push('note_prefer_cycling');
  }
  if (goal === 'maintain') {
    notes.push('note_minimum_volume');
    notes.push('note_high_intensity');
    notes.push('note_no_need_increase');
    notes.push('note_zone2_cardio');
  }
  if (goal === 'bulk') {
    notes.push('note_progressive_overload');
    notes.push('note_sets_per_muscle');
    notes.push('note_track_weight_gain');
    notes.push('note_too_fast_gain');
  }

  return { days: plan, notes };
}

module.exports = {
  calculateREE,
  calculateREE_KatchMcArdle,
  calculateFFM,
  calculateTDEE,
  calculateCalorieTarget,
  calculateMacros,
  calculateWeeklyWeightTarget,
  calculateExerciseCalories,
  estimateNutrition,
  estimateNutritionAI,
  generateWorkoutPlan,
};
