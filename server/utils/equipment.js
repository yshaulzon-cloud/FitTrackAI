// Equipment vocabulary.
//
// Onboarding used to ask one coarse question ("home / gym / none"); it now asks
// which specific kit the user actually has. Profiles written before that change
// still hold the coarse values, so everything that reads equipment goes through
// normalizeEquipment() rather than trusting the stored strings.

const EQUIPMENT = ['dumbbells', 'barbell', 'machines', 'bands', 'trx', 'pullup_bar', 'kettlebell', 'none'];

// What the old coarse answers most likely meant.
const LEGACY_MAP = {
  gym: ['barbell', 'machines', 'dumbbells'],
  home: ['dumbbells', 'bands'],
  none: ['none'],
};

const LEGACY_VALUES = Object.keys(LEGACY_MAP);

// Expand legacy values, drop unknowns, de-dupe, preserve EQUIPMENT order.
// 'none' only survives alone — "no equipment" plus a dumbbell is a contradiction,
// and the kit wins.
function normalizeEquipment(list) {
  if (!Array.isArray(list)) return [];
  const out = new Set();
  for (const raw of list) {
    const v = typeof raw === 'string' ? raw.trim() : '';
    if (LEGACY_MAP[v]) { LEGACY_MAP[v].forEach((x) => out.add(x)); continue; }
    if (EQUIPMENT.includes(v)) out.add(v);
  }
  if (out.size > 1) out.delete('none');
  return EQUIPMENT.filter((v) => out.has(v));
}

module.exports = { EQUIPMENT, LEGACY_MAP, LEGACY_VALUES, normalizeEquipment };
