// Build (D-535, D-536) : `node build.mjs` fabrique dist/, le site mis en ligne. Chaque page y
// charge un seul fichier JS assemblé et minifié ; sw.js y est rempli (FILES, VERSION).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { build, PAGES } from '../build.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const tmp = () => mkdtempSync(join(tmpdir(), 'astra-build-'));
const filesOf = (dir) => {
  const ctx = { self: { addEventListener() {} } };
  vm.runInNewContext(readFileSync(join(dir, 'sw.js'), 'utf8') + ';globalThis.F = FILES; globalThis.V = VERSION;', ctx);
  return { files: [...ctx.F], version: ctx.V };
};

test('`node build.mjs --out …` réussit et fabrique les trois pages', () => {
  const out = tmp();
  try {
    execFileSync(process.execPath, [join(root, 'build.mjs'), '--out', out], { cwd: root, stdio: 'pipe' });
    for (const p of PAGES) {
      assert.ok(existsSync(join(out, p.html)), p.html);
      assert.ok(existsSync(join(out, p.out)), p.out);
      assert.ok(existsSync(join(out, p.out + '.map')), `${p.out}.map`);
    }
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});

test('chaque page charge son seul fichier assemblé, minifié, sans import relatif restant', async () => {
  const { out } = await build({ out: tmp(), quiet: true });
  for (const p of PAGES) {
    const html = readFileSync(join(out, p.html), 'utf8');
    const scripts = [...html.matchAll(/<script[^>]*\bsrc="([^"]+)"/g)].map((m) => m[1]);
    assert.deepEqual(scripts, [p.out], `${p.html} : un seul script, le fichier assemblé`);
    const code = readFileSync(join(out, p.out), 'utf8');
    assert.doesNotMatch(code, /\bfrom\s*['"]\.{1,2}\//, `${p.out} : plus d'import relatif`);
    // Minifié : plus aucun commentaire de code (les sources en sont pleines), et bien plus petit.
    assert.doesNotMatch(code, /^\s*\/\/ /m, `${p.out} : commentaire // restant`);
    assert.doesNotMatch(code, /\/\*\*/, `${p.out} : commentaire /** restant`);
  }
  rmSync(out, { recursive: true, force: true });
});

test('sw.js de dist/ : FILES = les fichiers de dist/ (sans source maps), VERSION = empreinte stable', async () => {
  const a = await build({ out: tmp(), quiet: true });
  const b = await build({ out: tmp(), quiet: true });
  const sa = filesOf(a.out);
  const sb = filesOf(b.out);
  assert.match(sa.version, /^astra-[0-9a-f]{12}$/);
  assert.equal(sa.version, sb.version, 'deux builds des mêmes sources : même VERSION');
  assert.ok(sa.files.includes('./'));
  for (const f of sa.files.slice(1)) assert.ok(existsSync(join(a.out, f)), `${f} existe dans dist/`);
  assert.ok(!sa.files.some((f) => f.endsWith('.map') || f === 'sw.js'), 'ni source map ni sw.js dans FILES');
  assert.deepEqual(sa.files.slice(1).sort(), a.cached.slice(1).sort());
  for (const f of ['index.html', 'replay.html', 'technologies.html', 'style.css', 'manifest.json', 'js/index.js', 'js/replay.js', 'js/technologies.js', 'vendor/jsQR.js', 'vendor/trystero-nostr.mjs', 'icons/icon.svg']) assert.ok(sa.files.includes(f), f);
  rmSync(a.out, { recursive: true, force: true });
  rmSync(b.out, { recursive: true, force: true });
});

test('le sw.js des sources garde ses marqueurs (le build les remplace une seule fois)', () => {
  const sw = readFileSync(join(root, 'sw.js'), 'utf8');
  assert.equal(sw.split("const VERSION = 'astra-sources';").length, 2);
  assert.equal(sw.split('const FILES = [];').length, 2);
});
