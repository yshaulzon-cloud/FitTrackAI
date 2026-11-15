// Copies the exercise demo clips into the app, byte for byte.
//
//   node scripts/export-exercise-videos.mjs          (from client/)
//
// Source: the 1080 masters in "../פרויקט סרטוני תרגילים/NN-<slug>/<slug>.mp4".
// Output: public/exercise-videos/<slug>.mp4
//         src/lib/exerciseVideoEdges.json
//
// The files are copied unchanged, never re-encoded: the owner's rule is that
// demo quality must not drop. They ship inside the app (about 130 MB) so they
// start instantly and work offline. Re-run this after changing any master.
//
// The clips are square but the demo strip is wider, so the strip's sides are
// painted with the clip's own edge colours (white backdrop, grey floor band)
// and the clip blends in. Those colours come from the first frame's left
// column, read with ffmpeg ($FFMPEG, else the copy bundled with CapCut).
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(here, '../../פרויקט סרטוני תרגילים');
const OUT = path.resolve(here, '../public/exercise-videos');
const EDGES = path.resolve(here, '../src/lib/exerciseVideoEdges.json');
const FF = process.env.FFMPEG || path.join(process.env.LOCALAPPDATA || '', 'CapCut/Apps/9.3.0.3970/ffmpeg.exe');

// Vertical gradient that repeats the clip's left edge, rows of equal colour merged.
function edgeGradient(file) {
  const H = 270; // sample height; enough for a smooth band edge
  const r = spawnSync(FF, ['-v', 'error', '-i', file, '-frames:v', '1', '-vf', `crop=4:ih:2:0,scale=1:${H}:flags=area,format=rgb24`, '-f', 'rawvideo', '-'], { maxBuffer: 1 << 20 });
  if (r.status !== 0 || !r.stdout || r.stdout.length < H * 3) return null;
  const hex = (i) => '#' + [0, 1, 2].map(k => r.stdout[i * 3 + k].toString(16).padStart(2, '0')).join('');
  const close = (a, b) => [0, 1, 2].every(k => Math.abs(r.stdout[a * 3 + k] - r.stdout[b * 3 + k]) <= 3);
  const stops = [];
  let start = 0;
  for (let y = 1; y <= H; y++) {
    if (y < H && close(start, y)) continue;
    const c = hex(start);
    stops.push(`${c} ${((start / H) * 100).toFixed(1)}%`, `${c} ${((y / H) * 100).toFixed(1)}%`);
    start = y;
  }
  return `linear-gradient(to bottom, ${stops.join(', ')})`;
}

fs.mkdirSync(OUT, { recursive: true });
const edges = {};
let total = 0, n = 0;
for (const dir of fs.readdirSync(SRC).filter(d => /^\d\d-/.test(d)).sort()) {
  const slug = dir.slice(3);
  const src = path.join(SRC, dir, `${slug}.mp4`);
  if (!fs.existsSync(src)) { console.warn(`skip ${dir}: no ${slug}.mp4`); continue; }
  const out = path.join(OUT, `${slug}.mp4`);
  fs.copyFileSync(src, out);
  const g = edgeGradient(out);
  if (g) edges[slug] = g;
  const size = fs.statSync(out).size; total += size; n++;
  console.log(`${slug.padEnd(24)} ${(size / 1024 / 1024).toFixed(1).padStart(5)} MB  ${g ? g.split('%,').length + ' edge stops' : 'no edge colours'}`);
}
fs.writeFileSync(EDGES, JSON.stringify(edges, null, 1) + '\n');
console.log(`${n} clips, ${(total / 1024 / 1024).toFixed(1)} MB → ${OUT}`);
