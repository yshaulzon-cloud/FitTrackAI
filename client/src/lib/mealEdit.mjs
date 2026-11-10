// Pure helpers for editing one meal of the suggested menu at food level.
//
// A meal = { type, he, en, calories, protein, carbs, fat, items?: Item[] }
// An item = { name: { he, en }, grams, calories, protein, carbs, fat, estimated? }
// (the server attaches `items`; see server/utils/mealItems.js). A food coming
// from the food search is { name, cal, p, c, f, fb } per 100 g.

const KEYS = ['calories', 'protein', 'carbs', 'fat'];
const round = (n) => Math.round(n);
const clampGrams = (g) => Math.min(2000, Math.max(5, Math.round(Number(g) || 0)));

// Menus cached before `items` existed have none: treat the whole meal as one
// item, so it can still be scaled or replaced.
export function ensureItems(meal) {
  if (Array.isArray(meal?.items) && meal.items.length > 0) return meal.items;
  return [{
    name: { he: meal?.he || '', en: meal?.en || meal?.he || '' },
    grams: 100,
    calories: meal?.calories || 0, protein: meal?.protein || 0, carbs: meal?.carbs || 0, fat: meal?.fat || 0,
    estimated: true,
  }];
}

export function totalsOf(items) {
  const t = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  for (const it of items || []) for (const k of KEYS) t[k] += it[k] || 0;
  return t;
}

// Change one item's weight; its nutrition scales in proportion.
export function scaleItem(item, grams) {
  const g = clampGrams(grams);
  const base = item.grams > 0 ? item.grams : 100;
  const f = g / base;
  return { ...item, grams: g, calories: round(item.calories * f), protein: round(item.protein * f), carbs: round(item.carbs * f), fat: round(item.fat * f) };
}

// A food from search at a given weight.
export function itemFromFood(food, grams = 100) {
  const g = clampGrams(grams);
  const f = g / 100;
  return {
    name: { he: food.name, en: food.name },
    grams: g,
    calories: round(food.cal * f), protein: round(food.p * f), carbs: round(food.c * f), fat: round(food.f * f),
    estimated: false,
  };
}

export const setItemGrams = (items, idx, grams) => items.map((it, i) => (i === idx ? scaleItem(it, grams) : it));
export const removeItem = (items, idx) => items.filter((_, i) => i !== idx);
export const addFood = (items, food, grams = 100) => [...items, itemFromFood(food, grams)];
// Replace keeps the original weight, so "swap the rice for quinoa" stays one portion.
export const replaceWithFood = (items, idx, food) => items.map((it, i) => (i === idx ? itemFromFood(food, it.grams || 100) : it));

// The meal rebuilt from edited items: totals recomputed, text regenerated from the item names.
export function rebuildMeal(meal, items) {
  const t = totalsOf(items);
  return {
    ...meal,
    items,
    he: items.map((i) => i.name.he).join(' + '),
    en: items.map((i) => i.name.en).join(' + '),
    ...t,
    edited: true,
  };
}

// Replace meal `idx` in a menu and recompute the menu's totals.
export function applyMealToMenu(menu, idx, meal) {
  const meals = menu.meals.map((m, i) => (i === idx ? meal : m));
  const sum = (k) => meals.reduce((a, m) => a + (m[k] || 0), 0);
  return { ...menu, meals, totalCalories: sum('calories'), totalProtein: sum('protein'), totalCarbs: sum('carbs'), totalFat: sum('fat') };
}

// What to send to /nutrition/log so the saved entry matches the meal as shown.
export function logValuesOf(meal) {
  return { calories: meal.calories || 0, protein: meal.protein || 0, carbs: meal.carbs || 0, fat: meal.fat || 0 };
}

// "150 g" / "150 ג׳"
export const gramsLabel = (g, isHe) => `${Math.round(g)} ${isHe ? 'ג׳' : 'g'}`;

// Should a freshly changed target replace today's menu? Not when the user has
// already eaten from it today or edited any of its meals: that menu is theirs,
// and the new targets apply from the next menu they open.
export function menuHasUserState(menu, menuLogged, todayKey) {
  const eatenToday = !!menuLogged && menuLogged.date === todayKey && (menuLogged.idxs || []).length > 0;
  const edited = !!menu && Array.isArray(menu.meals) && menu.meals.some((m) => m.edited);
  return eatenToday || edited;
}
