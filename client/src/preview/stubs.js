// Fake-data presets. Each stubs one endpoint with a realistic (shape-correct)
// synthetic response so the app renders the target state without the server or
// any production change. Shapes mirror the real endpoints (see
// server/routes/nutrition.js and workout.js).
export const STUB_PRESETS = [
  {
    id: 'empty-nutrition',
    label: 'ריק · אין ארוחות היום',
    match: { url: '/nutrition/today', method: 'GET' },
    status: 200,
    body: { meals: [], totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0, totalFiber: 0 },
  },
  {
    id: 'empty-workouts',
    label: 'ריק · אין היסטוריית אימונים',
    match: { url: '/workout/history', method: 'GET' },
    status: 200,
    body: { workouts: [], streak: 0, todayHasWorkout: false },
  },
  {
    id: 'extreme-nutrition',
    label: 'קיצון · צריכה ענקית',
    match: { url: '/nutrition/today', method: 'GET' },
    status: 200,
    body: { meals: [], totalCalories: 99999, totalProtein: 9999, totalCarbs: 9999, totalFat: 9999, totalFiber: 999 },
  },
  {
    id: 'error-profile',
    label: 'שגיאה · פרופיל 500',
    match: { url: '/user/profile', method: 'GET' },
    status: 500,
    body: { message: 'stubbed server error' },
  },
];
