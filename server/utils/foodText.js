'use strict';
// Reads a free-text meal ("200 גרם חזה עוף + 2 פרוסות לחם", "קפה עם חלב", "3 eggs"):
// WHICH foods it names and HOW MUCH of each. One engine for the meal log
// (calculations.estimateNutrition) and for the suggested menus (mealItems), so
// the same words always mean the same grams.
//
// What it does, in order:
//   1. normalise the text and cut it into words (punctuation, quotes, "מ-3", "200g");
//   2. find foods: whole words only, longest food name first, with Hebrew prefixes
//      (ה ו ב ל מ ש כ) and plural/singular forms — never a piece of a longer word;
//   3. find quantities ("200 גרם", "3", "חצי", "כף", "2 כוסות") and attach each to
//      the food it sits next to;
//   4. turn every quantity into grams: written weight, or a household measure /
//      piece weight FOR THAT FOOD (data/portions.js), or — when nothing is written —
//      the food's usual serving. When none of that is known the answer is 100 g and
//      it says so (`quantityAssumed`), it is never passed off as a measurement.
// Nothing is guessed from a food's spelling: a word that is not a food is not food
// (no fuzzy match under 6 letters, no partial-word match).

const NIQQUD = /[֑-ׇ]/g;
const HEBREW = /[א-ת]/;

// ── text → words ──────────────────────────────────────────────────────────
function normalizeText(input) {
  let t = String(input == null ? '' : input).toLowerCase().replace(NIQQUD, '');
  // unit abbreviations that carry quotes, only right after a number: 250 מ"ל, 2 ק"ג, 150 ג'
  t = t.replace(/(\d)\s*(?:מ["״'׳]ל|מל)(?![א-ת])/g, '$1 ml ');
  t = t.replace(/(\d)\s*(?:ק["״'׳]ג|קג)(?![א-ת])/g, '$1 kg ');
  t = t.replace(/(\d)\s*(?:גר["״'׳]|ג["״'׳]|גר(?![א-ת]))/g, '$1 g ');
  // keep 1.5 / 1,5 and 1/2 as single numbers
  t = t.replace(/(\d)[.,](\d)/g, '$1\u0001$2').replace(/(\d)\s*\/\s*(\d)/g, '$1\u0002$2');
  t = t.replace(/["״“”'׳’`]/g, ''); // קוטג' → קוטג
  t = t.replace(/[-–—־_]/g, ' ');
  t = t.replace(/[^\p{L}\p{N}%\u0001\u0002\s]/gu, ' ');
  t = t.replace(/(\d)(?=[א-ת])/g, '$1 ');                                   // 3ביצים → 3 ביצים
  t = t.replace(/(\d)(?=(?:g|gr|gram|grams|kg|ml|l|tbsp|tsp|cup|cups)(?![a-z]))/g, '$1 '); // 200g → 200 g
  t = t.replace(/(\d)\s+%/g, '$1%');
  return t.replace(/\s+/g, ' ').trim();
}
const tokenize = (s) => normalizeText(s).split(' ').filter(Boolean);

// ── plural / singular and Hebrew prefixes ─────────────────────────────────
const FINAL = { נ: 'ן', מ: 'ם', כ: 'ך', פ: 'ף', צ: 'ץ' };
const NON_FINAL = { ן: 'נ', ם: 'מ', ך: 'כ', ף: 'פ', ץ: 'צ' };
const fin = (s) => (s ? s.slice(0, -1) + (FINAL[s[s.length - 1]] || s[s.length - 1]) : s);
const unfin = (s) => (s ? s.slice(0, -1) + (NON_FINAL[s[s.length - 1]] || s[s.length - 1]) : s);

// The word itself first, then its plural/singular relatives (ביצים ↔ ביצה, פיתות ↔ פיתה,
// מלפפונים ↔ מלפפון, eggs ↔ egg).
function morphVariants(t) {
  const out = [t];
  const add = (x) => { if (x && x.length >= 2 && !out.includes(x)) out.push(x); };
  if (HEBREW.test(t)) {
    if (t.endsWith('ים') && t.length > 3) { const s = t.slice(0, -2); add(fin(s)); add(s + 'ה'); }
    if (t.endsWith('ות') && t.length > 3) { const s = t.slice(0, -2); add(s + 'ה'); add(fin(s)); add(s + 'ת'); }
    if (t.endsWith('ה') && t.length > 2) { const s = t.slice(0, -1); add(s + 'ות'); add(s + 'ים'); }
    if (t.length > 2) { add(unfin(t) + 'ים'); add(unfin(t) + 'ות'); }
  } else if (/^[a-z]+$/.test(t)) {
    if (t.endsWith('ies') && t.length > 4) add(t.slice(0, -3) + 'y');
    if (t.endsWith('es') && t.length > 3) add(t.slice(0, -2));
    if (t.endsWith('s') && t.length > 3) add(t.slice(0, -1));
    if (t.length > 2) { add(t + 's'); add(t + 'es'); }
  }
  return out;
}

// One-letter and two-letter prefixes of a Hebrew word: the, and, in, to, from, that, as.
const PREFIXES = ['וה', 'וב', 'ול', 'ומ', 'וש', 'וכ', 'שה', 'שב', 'של', 'מה', 'לה', 'בה', 'ו', 'ה', 'ב', 'ל', 'מ', 'ש', 'כ'];
function strippedForms(t) {
  const out = [];
  for (const p of PREFIXES) {
    if (p === 'של' && t === 'של') continue;
    if (t.startsWith(p) && t.length - p.length >= 2) out.push(t.slice(p.length));
  }
  return out;
}

// ── numbers, units ────────────────────────────────────────────────────────
const NUMBER_WORDS = {
  אחד: 1, אחת: 1, one: 1, a: 1, an: 1,
  שניים: 2, שתיים: 2, שני: 2, שתי: 2, two: 2,
  שלוש: 3, שלושה: 3, three: 3, ארבע: 4, ארבעה: 4, four: 4, חמש: 5, חמישה: 5, five: 5,
  שש: 6, שישה: 6, six: 6, שבע: 7, שבעה: 7, seven: 7, שמונה: 8, eight: 8, תשע: 9, תשעה: 9, nine: 9,
  עשר: 10, עשרה: 10, ten: 10,
  חצי: 0.5, half: 0.5, רבע: 0.25, quarter: 0.25, שליש: 1 / 3,
};
// "a"/"an" are only numbers in front of a measure ("a cup of milk"), not "a" in front of a food.
const WEAK_NUMBER_WORDS = new Set(['a', 'an']);

const UNIT_WORDS = {
  g: ['גרם', 'גרמים', 'g', 'gr', 'gram', 'grams'],
  kg: ['kg', 'קילו', 'קילוגרם', 'kilo'],
  ml: ['ml', 'מיליליטר'],
  l: ['ליטר', 'l', 'liter', 'litre'],
  tbsp: ['כף', 'כפות', 'tbsp', 'tablespoon', 'tablespoons'],
  tsp: ['כפית', 'כפיות', 'tsp', 'teaspoon', 'teaspoons'],
  cup: ['כוס', 'כוסות', 'cup', 'cups'],
  slice: ['פרוסה', 'פרוסת', 'פרוסות', 'slice', 'slices'],
  cube: ['קוביה', 'קוביות', 'cube', 'cubes', 'square', 'squares'],
  handful: ['חופן', 'חופנים', 'handful'],
  scoop: ['סקופ', 'סקופים', 'scoop', 'scoops'],
  piece: ['יחידה', 'יחידות', 'יח', 'piece', 'pieces', 'pcs', 'חתיכה', 'חתיכות', 'פיסה'],
};
const UNIT_OF = new Map();
for (const [u, words] of Object.entries(UNIT_WORDS)) for (const w of words) UNIT_OF.set(w, u);
// Units that need a number in front of them (a bare "גרם" or "l" is not a quantity)…
const NEEDS_NUMBER = new Set(['g', 'kg', 'ml', 'l']);
// …the rest can stand alone and mean one of them: "כף טחינה", "כוס חלב", "פרוסת לחם".
const STANDS_ALONE = new Set(['tbsp', 'tsp', 'cup', 'slice', 'cube', 'handful', 'scoop']);

const SANDWICH_WORDS = new Set(['סנדוויץ', 'sandwich', 'כריך']);
// How a food is cooked, cut or sized — not another food. Left out of the "words not understood"
// list, so "סטייק בקר רזה" or "grilled chicken" does not end with a false "לא זיהינו: רזה".
const DESCRIPTOR_WORDS = new Set([
  'אפוי', 'אפויה', 'אפויים', 'צלוי', 'צלויה', 'צלויים', 'מוקפץ', 'מוקפצים', 'מאודה', 'מאודים', 'חתוך', 'חתוכים', 'הגריל',
  'בקופסה', 'מפורק', 'גדולה', 'גדול', 'קטנה', 'קטן', 'ענקית', 'מלאה', 'מלאים', 'מלא', 'רזה', 'שלמה', 'טרייה', 'טרי',
  'ירוק', 'ישראלי', 'ביתי', 'בצד', 'שייק',
  'baked', 'grilled', 'roasted', 'steamed', 'boiled', 'fried', 'raw', 'fresh', 'large', 'small', 'medium', 'lean', 'whole',
  'sliced', 'chopped', 'cooked', 'plain', 'homemade',
]);
const FILLER = new Set(['של', 'of', 'מ', 'מן', 'ה']); // between a quantity and its food: "2 כוסות של חלב"
const STOPWORDS = new Set(['עם', 'של', 'על', 'את', 'או', 'גם', 'ללא', 'בלי', 'ובלי', 'וללא', 'with', 'and', 'or', 'of', 'the', 'in', 'on', 'without', 'plus']);
// Negation: a food named right after one of these is NOT in the meal ("קפה בלי סוכר", "tea with no sugar").
// It covers the foods that follow joined by a connector ("בלי חלב וסוכר", "no milk or sugar") and stops at the
// first other word ("בלי סוכר עם חלב" → the milk counts). The negated words are consumed, so they are not
// counted, not reported as "not understood" and do not take a quantity.
const NEGATORS = new Set(['בלי', 'ללא', 'ובלי', 'וללא', 'without', 'no']);
const NEG_CONNECTORS = new Set(['ו', 'או', 'גם', 'ולא', 'and', 'or', 'nor']);

function numberOf(tok) {
  if (/^\d+(\u0001\d+)?$/.test(tok)) return parseFloat(tok.replace('\u0001', '.'));
  if (/^\d+\u0002\d+$/.test(tok)) { const [a, b] = tok.split('\u0002').map(Number); return b ? a / b : null; }
  return null;
}

// ── the engine ────────────────────────────────────────────────────────────
function createEstimator(db, portions = []) {
  // Index: first word of every food name → [{ ei, words }]
  const index = new Map();
  const nameToEntry = new Map(); // full normalised name → entry index
  db.forEach((entry, ei) => {
    for (const key of entry.keys) {
      const words = tokenize(key);
      if (!words.length) continue;
      nameToEntry.set(words.join(' '), ei);
      if (!index.has(words[0])) index.set(words[0], []);
      index.get(words[0]).push({ ei, words });
    }
  });

  // Household measures / piece weights per food (data/portions.js)
  const portionOf = new Array(db.length).fill(null);
  for (const spec of portions) {
    for (const name of spec.keys) {
      const ei = nameToEntry.get(tokenize(name).join(' '));
      if (ei === undefined) throw new Error(`portions: no food named "${name}" in FOOD_DB`);
      portionOf[ei] = spec;
    }
  }

  const singleWordKeys = [...index.entries()]
    .filter(([w, list]) => w.length >= 6 && list.some((c) => c.words.length === 1))
    .map(([w]) => w);

  const breadEi = nameToEntry.get('לחם');
  const breadEntries = new Set(['לחם', 'לחם מלא', 'לחם לבן', 'לחם שיפון', 'לחם כהה', 'פיתה', 'לחמנייה', 'טוסט', 'חלה', 'bread'].map((n) => nameToEntry.get(n)).filter((x) => x !== undefined));
  const eggEntry = nameToEntry.get('ביצים');
  const omeletteEntries = new Set(['חביתה', 'omelette', 'omelet'].map((n) => nameToEntry.get(n)).filter((x) => x !== undefined));

  function matchAt(tokens, i) {
    const first = tokens[i];
    if (numberOf(first) !== null || STOPWORDS.has(first)) return null;
    const attempt = (forms) => {
      let best = null;
      for (const form of forms) {
        const bucket = index.get(form);
        if (!bucket) continue;
        for (const cand of bucket) {
          const n = cand.words.length;
          if (i + n > tokens.length) continue;
          let ok = true;
          for (let j = 1; j < n && ok; j++) ok = morphVariants(tokens[i + j]).includes(cand.words[j]);
          if (!ok) continue;
          if (!best || n > best.len || (n === best.len && cand.ei < best.ei)) best = { len: n, ei: cand.ei };
        }
      }
      return best;
    };
    let found = attempt(morphVariants(first));
    if (!found && HEBREW.test(first)) {
      const forms = [];
      for (const s of strippedForms(first)) for (const v of morphVariants(s)) if (!forms.includes(v)) forms.push(v);
      found = attempt(forms);
    }
    return found;
  }

  // Foods, left to right, longest name first. Words that are not foods are skipped.
  function findFoods(tokens) {
    const foods = [];
    const negated = [];
    const taken = new Array(tokens.length).fill(false);
    let negating = false;
    let i = 0;
    while (i < tokens.length) {
      if (NEGATORS.has(tokens[i])) { negating = true; i++; continue; }
      const m = matchAt(tokens, i);
      if (m) {
        for (let k = i; k < i + m.len; k++) taken[k] = true;
        if (negating) negated.push({ start: i, end: i + m.len, ei: m.ei });
        else foods.push({ start: i, end: i + m.len, ei: m.ei, fuzzy: false });
        i += m.len;
      } else {
        if (negating && !NEG_CONNECTORS.has(tokens[i])) negating = false;
        i++;
      }
    }
    // A conservative typo catch: one wrong letter in a long single word, same first letter,
    // and only one food it could be. Anything shorter or more ambiguous stays "not found".
    if (!foods.length) {
      for (let k = 0; k < tokens.length; k++) {
        const w = tokens[k];
        if (taken[k] || w.length < 6 || !HEBREW.test(w) || numberOf(w) !== null || STOPWORDS.has(w) || UNIT_OF.has(w)) continue;
        const near = singleWordKeys.filter((key) => key[0] === w[0] && Math.abs(key.length - w.length) <= 1 && levenshtein(w, key) === 1);
        if (near.length === 1) {
          const cand = index.get(near[0]).find((c) => c.words.length === 1);
          foods.push({ start: k, end: k + 1, ei: cand.ei, fuzzy: true });
          break;
        }
      }
    }
    return { foods, taken, negated };
  }

  // Quantity groups from the words that are not part of a food name.
  function findQuantities(tokens, taken) {
    const groups = [];
    let i = 0;
    while (i < tokens.length) {
      if (taken[i]) { i++; continue; }
      const tok = tokens[i];
      let value = numberOf(tok);
      let isWord = false;
      if (value === null && NUMBER_WORDS[tok] !== undefined && !WEAK_NUMBER_WORDS.has(tok)) { value = NUMBER_WORDS[tok]; isWord = true; }
      let p = i;
      if (value !== null) {
        p = i + 1;
        // 1 1/2 · 2 וחצי · 1 ו חצי
        if (!isWord && tokens[p] !== undefined && !taken[p] && /^\d+\u0002\d+$/.test(tokens[p]) && Number.isInteger(value)) { value += numberOf(tokens[p]); p++; }
        if (tokens[p] === 'וחצי' && !taken[p]) { value += 0.5; p++; }
        else if (tokens[p] === 'ו' && tokens[p + 1] === 'חצי' && !taken[p] && !taken[p + 1]) { value += 0.5; p += 2; }
        let unit = null;
        const u = tokens[p] !== undefined && !taken[p] ? UNIT_OF.get(tokens[p]) : undefined;
        if (u) { unit = u; p++; }
        groups.push({ start: i, end: p, value, unit });
        i = p;
        continue;
      }
      const u = UNIT_OF.get(tok);
      if (u && STANDS_ALONE.has(u)) {
        // "כף טחינה", "כוס חלב", "פרוסת לחם", "a cup of milk" = one of them;
        // "כוס וחצי" / "כף וחצי" = one and a half.
        let end = i + 1;
        let value = 1;
        if (tokens[end] === 'וחצי' && !taken[end]) { value = 1.5; end++; }
        else if (tokens[end] === 'ו' && tokens[end + 1] === 'חצי' && !taken[end] && !taken[end + 1]) { value = 1.5; end += 2; }
        groups.push({ start: i, end, value, unit: u });
        i = end;
        continue;
      }
      if (u && !NEEDS_NUMBER.has(u) && u === 'piece') { i++; continue; }
      i++;
    }
    return groups;
  }

  // Each quantity belongs to at most one food: the one right after it ("200 גרם חזה עוף");
  // a food with nothing in front takes the quantity right behind it ("אורז 150 גרם").
  //   Most people put the amount first ("200 גרם חזה עוף + 150 גרם אורז"); a list written
  //   food-first ("אורז 150 גרם עוף 200 גרם") puts it behind. When EVERY food has a quantity
  //   right behind it the text is food-first and those are used; otherwise a quantity
  //   between two foods ("קפה 2 כפות סוכר") belongs to the one after it.
  function attach(foods, groups, tokens) {
    const used = new Set();
    const gapOk = (from, to) => to - from <= 1 && (to === from || FILLER.has(tokens[from]));
    const beforeOf = (f) => groups.findIndex((x, gi) => !used.has(gi) && x.end <= f.start && gapOk(x.end, f.start));
    const afterOf = (f) => groups.findIndex((x, gi) => !used.has(gi) && x.start >= f.end && gapOk(f.end, x.start));
    const take = (f, gi) => { if (gi >= 0) { used.add(gi); f.qty = groups[gi]; } };

    const behind = foods.map((f) => groups.findIndex((x) => x.start >= f.end && gapOk(f.end, x.start)));
    const foodFirst = foods.length > 1 && behind.every((gi) => gi >= 0) && new Set(behind).size === behind.length;

    for (const f of foods) if (foodFirst) take(f, afterOf(f)); else take(f, beforeOf(f));
    for (const f of foods) if (!f.qty) { if (foodFirst) take(f, beforeOf(f)); else take(f, afterOf(f)); }
  }

  // quantity + the food's household measures → grams
  //   assumed  the amount was not written (a serving or a placeholder was used)
  //   basis    'written' · 'unit' · 'measure' · 'serving' · 'default' · 'count-ignored'
  function toGrams(qty, portion) {
    const P = portion || {};
    if (!qty) {
      if (P.serving) return { grams: P.serving, assumed: true, basis: 'serving' };
      return { grams: 100, assumed: true, basis: 'default' };
    }
    const v = qty.value;
    switch (qty.unit) {
      case 'g': return { grams: v, assumed: false, basis: 'written' };
      case 'kg': return { grams: v * 1000, assumed: false, basis: 'written' };
      case 'ml': return { grams: v, assumed: false, basis: 'written' }; // 1 ml ≈ 1 g
      case 'l': return { grams: v * 1000, assumed: false, basis: 'written' };
      case 'tbsp': return P.tbsp ? { grams: v * P.tbsp, assumed: false, basis: 'measure' } : { grams: v * 15, assumed: true, basis: 'measure' };
      case 'tsp': return P.tsp || P.tbsp ? { grams: v * (P.tsp || P.tbsp / 3), assumed: false, basis: 'measure' } : { grams: v * 5, assumed: true, basis: 'measure' };
      case 'cup': return P.cup ? { grams: v * P.cup, assumed: false, basis: 'measure' } : { grams: v * 240, assumed: true, basis: 'measure' };
      case 'slice': return P.slice ? { grams: v * P.slice, assumed: false, basis: 'measure' } : { grams: v * (P.unit || 30), assumed: true, basis: 'measure' };
      case 'cube': return P.cube ? { grams: v * P.cube, assumed: false, basis: 'measure' } : { grams: v * 5, assumed: true, basis: 'measure' };
      case 'handful': return { grams: v * 30, assumed: true, basis: 'measure' };
      // A scoop only means something for a powder that has one in data/portions.js; for any
      // other food it is a count we cannot turn into a weight (the serving is used and flagged).
      case 'scoop': return P.scoop ? { grams: v * P.scoop, assumed: false, basis: 'measure' } : { ...toGrams(null, portion), basis: 'count-ignored' };
      default: // a bare count, or "יחידה"
        if (P.unit) return { grams: v * P.unit, assumed: false, basis: 'unit' };
        // A number we can't turn into a weight (a fat percentage typed without %, "3 קציצות"):
        // never multiply 100 g by it. Fall back to the serving and say the count was not used.
        return { ...toGrams(null, portion), basis: 'count-ignored' };
    }
  }

  function parse(text) {
    const tokens = tokenize(text);
    if (!tokens.length) return { foods: [], unmatched: [], without: [] };
    const { foods, taken, negated } = findFoods(tokens);
    // Foods the text says are NOT in the meal ("בלי סוכר"): named here so a screen can say so, never counted.
    const without = negated.map((f) => tokens.slice(f.start, f.end).join(' '));
    if (!foods.length) return { foods: [], unmatched: [], without };
    const groups = findQuantities(tokens, taken);
    attach(foods, groups, tokens);

    // Words of the text that are neither a food, a quantity nor a connector — e.g. "דגני בוקר"
    // when cereal is not in the database. They are not counted; callers can show them
    // ("לא זיהינו: …") instead of letting the total look complete.
    const inGroup = new Set();
    for (const g of groups) for (let k = g.start; k < g.end; k++) inGroup.add(k);
    const unmatched = tokens.filter((w, k) => !taken[k] && !inGroup.has(k) && w.length >= 3
      && numberOf(w) === null && !/^\d/.test(w) && !UNIT_OF.has(w) && !STOPWORDS.has(w) && !FILLER.has(w)
      && !SANDWICH_WORDS.has(w) && !DESCRIPTOR_WORDS.has(w));

    // "חביתה מ-3 ביצים": the omelette is made of those eggs — count the eggs, not the dish too.
    let kept = foods;
    if (eggEntry !== undefined && foods.some((f) => f.ei === eggEntry)) {
      kept = foods.filter((f) => !omeletteEntries.has(f.ei));
    }

    const out = kept.map((f) => {
      const entry = db[f.ei];
      const g = toGrams(f.qty, portionOf[f.ei]);
      return {
        entry,
        grams: Math.round(g.grams * 10) / 10,
        quantityAssumed: g.assumed,
        basis: g.basis,
        fuzzy: f.fuzzy,
        name: tokens.slice(f.start, f.end).join(' '),
      };
    });

    // "סנדוויץ׳ טונה" is the filling between bread. The bread is not written, so it is added —
    // two slices, flagged as assumed — unless the text already names a bread. (Its name is empty so
    // a menu line, which keeps the longest-named food of a component, still keeps the filling.)
    if (breadEi !== undefined && tokens.some((t) => SANDWICH_WORDS.has(t)) && !kept.some((f) => breadEntries.has(f.ei))) {
      const slice = (portionOf[breadEi] && portionOf[breadEi].slice) || 30;
      out.push({ entry: db[breadEi], grams: 2 * slice, quantityAssumed: true, basis: 'default', fuzzy: false, name: '' });
    }

    return { unmatched, foods: out, without };
  }

  const englishNameOf = (entry) => entry.keys.find((k) => /^[a-zA-Z0-9 %'\-\/().]+$/.test(k)) || null;

  // → { calories, protein, carbs, fat, fiber, source, englishName, items, quantityAssumed } | null
  function estimate(text) {
    const { foods, unmatched } = parse(text);
    if (!foods.length) return null;
    const total = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
    for (const f of foods) {
      const k = f.grams / 100;
      total.calories += f.entry.cal * k;
      total.protein += f.entry.p * k;
      total.carbs += f.entry.c * k;
      total.fat += f.entry.f * k;
      total.fiber += (f.entry.fb || 0) * k;
    }
    return {
      calories: Math.round(total.calories),
      protein: Math.round(total.protein),
      carbs: Math.round(total.carbs),
      fat: Math.round(total.fat),
      fiber: Math.round(total.fiber),
      source: 'database',
      englishName: foods.map((f) => englishNameOf(f.entry)).filter(Boolean).join(' + ') || null,
      // What was counted, so a screen can show "~150 g" and flag a guessed amount.
      items: foods.map((f) => ({ name: englishNameOf(f.entry) || f.entry.keys[0], nameHe: f.entry.keys[0], grams: f.grams, quantityAssumed: f.quantityAssumed, basis: f.basis })),
      quantityAssumed: foods.some((f) => f.quantityAssumed),
      unmatched: [...new Set(unmatched)],
    };
  }

  return { parse, estimate, tokenize, portionOf: (entry) => portionOf[db.indexOf(entry)] || null };
}

function levenshtein(a, b) {
  const m = a.length; const n = b.length;
  if (!m) return n;
  if (!n) return m;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

module.exports = { createEstimator, normalizeText, tokenize, morphVariants, DESCRIPTOR_WORDS };
