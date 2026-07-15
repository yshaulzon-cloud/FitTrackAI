// Small, dependency-free ranking for short LOCAL lists (e.g. the settings
// search — a dozen static items). Deliberately NOT a network/fuzzy-index
// engine: the dataset is tiny, so we keep everything pure, synchronous and
// instant. All functions are side-effect free and unit-tested.

// Hebrew niqqud / cantillation marks — stripped so "שָׁפָה" matches "שפה".
const NIQQUD = /[֑-ׇ]/g;
// Punctuation we treat as insignificant (turned into spaces, then collapsed).
const PUNCT = /[.,/#!$%^&*;:{}=\-_`~()'"?׳״״’]/g;

// Lowercase, strip niqqud, drop punctuation, collapse whitespace, trim.
export function normalize(s) {
  return String(s ?? '')
    .toLowerCase()
    .replace(NIQQUD, '')
    .replace(PUNCT, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Levenshtein edit distance with an early-exit cap. Returns a number that is
// > max when the true distance exceeds max (callers only care about "<= max").
export function editDistance(a, b, max = 2) {
  if (a === b) return 0;
  const al = a.length, bl = b.length;
  if (Math.abs(al - bl) > max) return max + 1;
  if (al === 0) return bl;
  if (bl === 0) return al;

  let prev = new Array(bl + 1);
  let curr = new Array(bl + 1);
  for (let j = 0; j <= bl; j++) prev[j] = j;

  for (let i = 1; i <= al; i++) {
    curr[0] = i;
    let rowMin = curr[0];
    const ac = a.charCodeAt(i - 1);
    for (let j = 1; j <= bl; j++) {
      const cost = ac === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,        // deletion
        curr[j - 1] + 1,    // insertion
        prev[j - 1] + cost, // substitution
      );
      if (curr[j] < rowMin) rowMin = curr[j];
    }
    // Whole row already worse than the cap — no point continuing.
    if (rowMin > max) return max + 1;
    [prev, curr] = [curr, prev];
  }
  return prev[bl];
}

// Score one already-normalized query `q` against a raw `field`.
// Higher is better; -1 means "no match". Tiers, from best to worst:
//   exact (100) > whole-string prefix (85) > word-start prefix (75) >
//   substring (55) > fuzzy word / singular-plural / typo (30–40).
export function scoreField(q, field) {
  if (!q) return -1;
  const f = normalize(field);
  if (!f) return -1;

  if (f === q) return 100;
  if (f.startsWith(q)) return 85;

  const words = f.split(' ');
  if (words.some(w => w.startsWith(q))) return 75;
  if (f.includes(q)) return 55;

  // Typo / singular-plural tolerance, per word. Short queries get a tighter
  // budget so we don't turn 3-letter words into everything.
  const budget = q.length <= 4 ? 1 : 2;
  let best = -1;
  for (const w of words) {
    if (Math.abs(w.length - q.length) > budget) continue;
    const d = editDistance(q, w, budget);
    if (d <= budget) best = Math.max(best, 40 - d * 8);
  }
  return best;
}

// Rank `items` against `query`. `getFields(item)` returns { title, body }.
// Title matches outrank body matches. Returns [{ item, score }] sorted best
// first; the input order breaks ties so results stay stable. Callers dedupe
// and slice as needed.
export function rankItems(query, items, getFields) {
  const q = normalize(query);
  if (!q) return [];
  const scored = [];
  for (let idx = 0; idx < items.length; idx++) {
    const item = items[idx];
    const { title = '', body = '' } = getFields(item) || {};
    const ts = scoreField(q, title);
    const bs = scoreField(q, body);
    // Body is worth ~60% of a title match at the same tier.
    const score = Math.max(ts, bs * 0.6);
    if (score > 0) scored.push({ item, score, idx });
  }
  scored.sort((a, b) => (b.score - a.score) || (a.idx - b.idx));
  return scored.map(({ item, score }) => ({ item, score }));
}

// Per-character normalization mirroring normalize()'s rules, used to map
// normalized offsets back to ORIGINAL string positions.
const PUNCT_ONE = /[.,/#!$%^&*;:{}=\-_`~()'"?׳״’]/;
const NIQQUD_ONE = /[֑-ׇ]/; // non-global: .test() must be stateless here
function normChar(ch) {
  const c = ch.toLowerCase();
  if (NIQQUD_ONE.test(c)) return '';
  if (PUNCT_ONE.test(c) || /\s/.test(c)) return ' ';
  return c;
}

// Build the normalized string plus, for each normalized char, the raw index it
// came from — so a match found in normalized space maps back exactly.
function buildMap(raw) {
  const out = [];
  const rawIndex = [];
  let prevSpace = true; // collapse leading whitespace like normalize()'s trim
  for (let i = 0; i < raw.length; i++) {
    const nc = normChar(raw[i]);
    if (nc === '') continue;
    if (nc === ' ') {
      if (prevSpace) continue;
      out.push(' '); rawIndex.push(i); prevSpace = true;
    } else {
      out.push(nc); rawIndex.push(i); prevSpace = false;
    }
  }
  while (out.length && out[out.length - 1] === ' ') { out.pop(); rawIndex.pop(); }
  return { norm: out.join(''), rawIndex };
}

// Split `text` into [{ text, hit }] segments for gentle highlighting of the
// first case/niqqud-insensitive occurrence of `query`. Returns a single
// non-hit segment when there's no literal substring (e.g. fuzzy-only match),
// so highlighting never lies about where the match is.
export function highlightParts(text, query) {
  const raw = String(text ?? '');
  const q = normalize(query);
  if (!q) return [{ text: raw, hit: false }];

  const { norm, rawIndex } = buildMap(raw);
  const at = norm.indexOf(q);
  if (at < 0) return [{ text: raw, hit: false }];

  const rawStart = rawIndex[at];
  const rawEnd = rawIndex[at + q.length - 1] + 1; // end of the last matched char

  const parts = [];
  if (rawStart > 0) parts.push({ text: raw.slice(0, rawStart), hit: false });
  parts.push({ text: raw.slice(rawStart, rawEnd), hit: true });
  if (rawEnd < raw.length) parts.push({ text: raw.slice(rawEnd), hit: false });
  return parts;
}
