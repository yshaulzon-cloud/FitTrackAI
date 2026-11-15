// usage:
//   node render.mjs <exercise> stills <t1,t2,...> <outDir>
//   node render.mjs <exercise> video <out.mp4> [fps]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { chromium } from 'playwright-core';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const FFMPEG = path.join(process.env.LOCALAPPDATA, 'CapCut/Apps/9.3.0.3970/ffmpeg.exe');
const [ex, mode, arg, extra, camArg] = process.argv.slice(2);

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  fs.readFile(p, (err, data) => {
    if (err) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
    res.end(data);
  });
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

const browser = await chromium.launch({
  executablePath: EDGE, headless: true,
  args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 600, height: 600 } });
page.on('console', m => console.log('[page]', m.text()));
page.on('pageerror', e => console.log('[pageerror]', e.message));
await page.goto(`http://127.0.0.1:${port}/index.html?ex=${ex}${camArg ? `&cam=${camArg}` : ''}${process.env.Q ? `&${process.env.Q}` : ''}${process.env.SIZE ? `&size=${process.env.SIZE}` : ''}`);
await page.waitForFunction(() => window.READY === true, null, { timeout: 60000 });
console.log('GPU:', await page.evaluate(() => window.GPU));
console.log('INFO:', JSON.stringify(await page.evaluate(() => window.INFO)));
const duration = await page.evaluate(() => window.DURATION);

async function grab(t, file) {
  const r = await page.evaluate(tt => window.frameAt(tt), t);
  fs.writeFileSync(file, Buffer.from(r.png.split(',')[1], 'base64'));
  return r.debug;
}

if (mode === 'stills') {
  fs.mkdirSync(extra, { recursive: true });
  for (const t of arg.split(',').map(Number)) {
    const d = await grab(t, path.join(extra, `t${t.toFixed(2)}.png`));
    const f = x => x.toFixed(1);
    console.log(`t=${t} p=${(d.p ?? 0).toFixed(2)} breath=${(d.breath ?? 0).toFixed(2)} effort=${(d.effort ?? 0).toFixed(2)}`, d.arms.map(a => `elbowFlex=${f(a.flex)} wristExt=${f(a.wristExt)} E=(${a.E.x.toFixed(3)},${a.E.y.toFixed(3)},${a.E.z.toFixed(3)})`).join(' | '),
      '||', d.legs.map(l => `kneeFlex=${f(l.flex)}`).join(' '));
  }
} else if (mode === 'trace') {
  const fps = 60, n = Math.round(duration * fps);
  const rows = await page.evaluate(([n, fps]) => { const out = []; for (let i = 0; i <= n; i++) { const r = window.renderAt(i / fps); out.push([r.bar.x, r.bar.y, r.debug.arms[0].flex, r.debug.arms[0].wristExt]); } return out; }, [n, fps]);
  fs.writeFileSync(arg, JSON.stringify(rows));
  console.log('trace rows', rows.length);
} else if (mode === 'video') {
  const fps = +(extra || 60);
  const dir = path.join(ROOT, 'frames', ex);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const n = Math.round(duration * fps);
  const t0 = Date.now();
  for (let i = 0; i < n; i++) {
    await grab(i / fps, path.join(dir, `f${String(i).padStart(4, '0')}.png`));
    if (i % 30 === 0) console.log(`frame ${i}/${n}  ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  }
  await browser.close();
  server.close();
  const out = path.resolve(arg);
  const enc = (codecArgs) => spawnSync(FFMPEG, [
    '-y', '-hide_banner', '-loglevel', 'error', '-framerate', String(fps), '-i', path.join(dir, 'f%04d.png'),
    '-vf', 'scale=1080:1080:flags=lanczos,format=yuv420p', ...codecArgs,
    '-movflags', '+faststart', '-r', String(fps), out,
  ], { stdio: 'inherit' });
  let r = enc(['-c:v', 'h264_qsv', '-global_quality', '15', '-profile:v', 'high', '-preset', 'veryslow']);
  if (r.status !== 0) { console.log('qsv failed, trying MF'); r = enc(['-c:v', 'h264_mf', '-b:v', '6M']); }
  console.log(r.status === 0 ? `wrote ${out} (${(fs.statSync(out).size / 1024).toFixed(0)} KB)` : 'encode failed');
  process.exit(0);
}
await browser.close();
server.close();
