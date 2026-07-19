// Device bridge — a tiny localhost server that exposes a connected Android
// device over HTTP for the preview harness's "device mode". Pure adb: it
// streams live screen frames and forwards taps/keys/launches to the real phone.
// Dev-only, binds to 127.0.0.1. Start it with: npm run device-bridge
//
// Endpoints:
//   GET  /device/info    → { serial, model, size:{w,h} }
//   GET  /device/frame   → image/png of the current screen (adb screencap)
//   POST /device/tap     { x, y }               → input tap (device pixels)
//   POST /device/swipe   { x1, y1, x2, y2, ms } → input swipe
//   POST /device/key     { key }                → keyevent (back|home|…)
//   POST /device/launch  { pkg? }               → start the app
import { createServer } from 'node:http';
import { spawn, execFileSync } from 'node:child_process';

const PORT = process.env.DEVICE_BRIDGE_PORT || 8787;
const ADB = process.env.ANDROID_ADB || 'C:/android-sdk/platform-tools/adb.exe';
const DEFAULT_PKG = 'com.areto.app';

const KEYS = { back: 4, home: 3, recents: 187, power: 26, volup: 24, voldown: 25, enter: 66 };

// Run adb and return stdout as a Buffer (used for the binary PNG frame).
function adbBuffer(args) {
  return new Promise((resolve, reject) => {
    const p = spawn(ADB, args);
    const out = [];
    const err = [];
    p.stdout.on('data', (d) => out.push(d));
    p.stderr.on('data', (d) => err.push(d));
    p.on('error', reject);
    p.on('close', (code) => (code === 0 ? resolve(Buffer.concat(out)) : reject(new Error(Buffer.concat(err).toString() || `adb exit ${code}`))));
  });
}

function adbText(args) {
  try { return execFileSync(ADB, args, { encoding: 'utf8' }).trim(); }
  catch (e) { return ''; }
}

function deviceInfo() {
  const serial = adbText(['get-serialno']);
  const model = adbText(['shell', 'getprop', 'ro.product.model']);
  const sizeRaw = adbText(['shell', 'wm', 'size']); // "Physical size: 1220x2712"
  const m = sizeRaw.match(/(\d+)x(\d+)/);
  return { serial, model, size: m ? { w: +m[1], h: +m[2] } : null };
}

function send(res, status, body, type = 'application/json') {
  res.writeHead(status, {
    'Content-Type': type,
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Cache-Control': 'no-store',
  });
  res.end(type === 'application/json' ? JSON.stringify(body) : body);
}

function readJson(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString() || '{}')); } catch { resolve({}); } });
  });
}

const server = createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204, '');
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (url.pathname === '/device/info') return send(res, 200, deviceInfo());

    if (url.pathname === '/device/frame') {
      const png = await adbBuffer(['exec-out', 'screencap', '-p']);
      return send(res, 200, png, 'image/png');
    }

    if (req.method === 'POST' && url.pathname === '/device/tap') {
      const { x, y } = await readJson(req);
      await adbBuffer(['shell', 'input', 'tap', String(Math.round(x)), String(Math.round(y))]);
      return send(res, 200, { ok: true });
    }

    if (req.method === 'POST' && url.pathname === '/device/swipe') {
      const { x1, y1, x2, y2, ms = 200 } = await readJson(req);
      await adbBuffer(['shell', 'input', 'swipe', ...[x1, y1, x2, y2].map((n) => String(Math.round(n))), String(ms)]);
      return send(res, 200, { ok: true });
    }

    if (req.method === 'POST' && url.pathname === '/device/key') {
      const { key } = await readJson(req);
      const code = KEYS[key] ?? Number(key);
      await adbBuffer(['shell', 'input', 'keyevent', String(code)]);
      return send(res, 200, { ok: true });
    }

    if (req.method === 'POST' && url.pathname === '/device/launch') {
      const { pkg = DEFAULT_PKG } = await readJson(req);
      await adbBuffer(['shell', 'monkey', '-p', pkg, '-c', 'android.intent.category.LAUNCHER', '1']);
      return send(res, 200, { ok: true, pkg });
    }

    return send(res, 404, { error: 'not found' });
  } catch (e) {
    return send(res, 500, { error: String(e.message || e) });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  const info = deviceInfo();
  if (!info.serial) {
    console.log('[device-bridge] WARNING: no device detected. Connect a phone with USB debugging.');
  } else {
    console.log(`[device-bridge] ${info.model} (${info.serial}) ${info.size ? `${info.size.w}x${info.size.h}` : ''}`);
  }
  console.log(`[device-bridge] listening on http://127.0.0.1:${PORT}`);
});
