// Stable, clearly-namespaced test personas. Emails are fixed so switching to a
// persona reuses the same account across runs (register-or-login), rather than
// littering the dev DB with throwaways. Delete them from the sidebar when done.
export const PASSWORD = 'Preview123!';

const baseProfile = {
  age: 30, height: 172, weight: 74, gender: 'male',
  goal: 'cut', workoutsPerWeek: 4, experience: 'intermediate',
  equipment: ['dumbbells', 'barbell', 'machines'],
  timezone: 'Asia/Jerusalem',
};

export const PERSONAS = [
  {
    id: 'fresh',
    label: 'משתמש טרי',
    hint: 'חשבון חדש, אחרי onboarding, בלי פעילות — למצבי ריק',
    email: 'preview-fresh@areto.local',
    name: 'טל טרי',
    profile: { ...baseProfile, goal: 'maintain', experience: 'beginner' },
    seed: false,
    // This persona's whole point is "day one" — the account is reused across
    // runs (see the file header), but the app's own first-time-home-screen
    // flag is a one-time localStorage marker that never resets on its own.
    // Without this, the intro shows once ever and then silently stops.
    resetIntro: true,
  },
  {
    id: 'active',
    label: 'משתמש פעיל',
    hint: 'אימון, ארוחות ושינה כבר רשומים — לדשבורד מלא',
    email: 'preview-active@areto.local',
    name: 'דנה כהן',
    profile: { ...baseProfile },
    seed: true,
  },
  {
    id: 'female-bulk',
    label: 'עלייה במסה',
    hint: 'פרופיל נשי, מטרת מסה — לגיוון',
    email: 'preview-bulk@areto.local',
    name: 'מאיה לוי',
    profile: { ...baseProfile, gender: 'female', goal: 'bulk', weight: 60, height: 165 },
    seed: false,
  },
];
