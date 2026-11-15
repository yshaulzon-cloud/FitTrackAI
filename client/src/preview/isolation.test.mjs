// Parity / isolation guarantee: the preview harness must never ship.
//
// This builds the production bundle and asserts no harness artifact survives —
// so a future refactor that accidentally statically imports preview code (which
// would break the tree-shaking guard in main.jsx) fails here instead of in an
// APK. Run with the rest: `npm test`.
import { test } from 'node:test';
import assert from 'node:assert';
import { execSync } from 'node:child_process';
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const clientDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const distDir = join(clientDir, 'dist');

// Strings that only the harness contains — none may appear in the shipped build.
const FORBIDDEN = [
  'ARETO_PREVIEW_HARNESS_SENTINEL',
  'PreviewBridge',
  'PreviewApp',
  'harness-root',
  'useHarnessBridge',
];

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

test('production build excludes the preview harness', () => {
  execSync('npx vite build', { cwd: clientDir, stdio: 'ignore' });
  assert.ok(existsSync(distDir), 'dist/ should exist after build');

  // preview.html is a dev-only entry — it must not be emitted.
  assert.ok(!existsSync(join(distDir, 'preview.html')), 'preview.html must not be in dist');

  const contents = walk(distDir)
    .filter((f) => /\.(js|css|html|map)$/.test(f))
    .map((f) => readFileSync(f, 'utf8'))
    .join('\n');

  for (const needle of FORBIDDEN) {
    assert.ok(!contents.includes(needle), `built bundle must not contain "${needle}"`);
  }
});
