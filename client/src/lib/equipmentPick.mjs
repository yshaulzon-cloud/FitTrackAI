// Equipment picking rules for the onboarding "What equipment do you have?" step
// and Settings → Equipment.
// Pure (no JSX) so it can be unit-tested. Keep in step with
// server/utils/equipment.js (EQUIPMENT) and EQUIPMENT_OPTIONS in OnboardingFlow.jsx.
//
// The "Gym" chip is only a shortcut: it never becomes a value in the list (the
// server's legacy 'gym' value means something narrower and is not sent). Its
// on/off state is derived from the list via isGymKitOn().

// The chips, shared by the onboarding step and Settings → Equipment.
// Mirrors EQUIPMENT in server/utils/equipment.js - keep the two in step.
export const EQUIPMENT_OPTIONS = [
  { value: 'dumbbells',  he: 'משקולות יד',    en: 'Dumbbells' },
  { value: 'barbell',    he: 'מוט ומשקולות',  en: 'Barbell & plates' },
  { value: 'machines',   he: 'מכונות',        en: 'Machines' },
  { value: 'bands',      he: 'גומיות',        en: 'Resistance bands' },
  { value: 'trx',        he: 'TRX',           en: 'TRX' },
  { value: 'pullup_bar', he: 'מתח ומקבילים',  en: 'Pull-up & dip bars' },
  { value: 'kettlebell', he: 'קטלבל',         en: 'Kettlebell' },
  { value: 'none',       he: 'בלי ציוד',      en: 'No equipment' },
];

export const GYM_LABEL = { he: 'חדר כושר', en: 'Gym' };

// Everything a commercial gym has = every real equipment value except 'none'.
export const GYM_KIT = ['dumbbells', 'barbell', 'machines', 'bands', 'trx', 'pullup_bar', 'kettlebell'];

// A single chip. "No equipment" and an actual kit are contradictory, so they
// evict each other (same behaviour the step always had).
export function toggleEquipment(prev, value) {
  if (prev.includes(value)) return prev.filter((x) => x !== value);
  if (value === 'none') return ['none'];
  return [...prev.filter((x) => x !== 'none'), value];
}

// True only when the whole gym kit is selected.
export function isGymKitOn(list) {
  return GYM_KIT.every((x) => list.includes(x));
}

// The "Gym" chip. Off → select the whole kit (union with what is already picked,
// 'none' dropped). On → remove the whole kit, leaving anything else untouched.
export function toggleGymKit(prev) {
  if (isGymKitOn(prev)) return prev.filter((x) => !GYM_KIT.includes(x));
  return [...prev.filter((x) => x !== 'none'), ...GYM_KIT.filter((x) => !prev.includes(x))];
}
