// Liste du cache hors ligne (FILES de sw.js, D-500) : tout fichier dont une page a
// besoin doit y être, sinon la page ne s'ouvre pas hors ligne si elle n'a jamais été
// ouverte en ligne (#84 : technologies.html et js/techtree.js manquaient).
// On part des trois pages (index.html, replay.html, technologies.html) et de
// manifest.json, puis on suit les liens : src/href des balises, `import … from`,
// `import()` (chargement à la demande), `new URL('…', import.meta.url)`,
// `location.href = '…'`, `.src = '…'` et `fetch('…')`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, posix } from 'node:path';
import vm from 'node:vm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PAGES = ['index.html', 'replay.html', 'technologies.html'];

// FILES, lu dans le vrai sw.js.
function swFiles() {
  const self = { addEventListener() {} };
  const ctx = { self };
  vm.runInNewContext(readFileSync(join(root, 'sw.js'), 'utf8') + '\n;globalThis.__FILES = FILES;', ctx);
  return [...ctx.__FILES].map((f) => (f === './' ? 'index.html' : f)); // tableau de ce contexte-ci
}

// Chemin local relatif à la racine, ou null (lien externe, ancre, data:, mailto:…).
function resolve(from, ref) {
  if (/^[a-z]+:|^\/\/|^#/i.test(ref)) return null;
  const clean = ref.split(/[?#]/)[0];
  if (!clean) return null;
  const p = posix.normalize(posix.join(posix.dirname(from), clean));
  return p === '.' || p.endsWith('/') ? posix.join(p, 'index.html').replace(/^\.\//, '') : p;
}

function refsOf(file, text) {
  const out = [];
  // `page` : chemin relatif à la page (toutes à la racine), pas au fichier JS.
  const grab = (re, page = false) => {
    for (const m of text.matchAll(re)) out.push([m[1], page]);
  };
  if (file.endsWith('.html')) grab(/\s(?:src|href)=["']([^"']+)["']/g);
  if (file.endsWith('.json')) grab(/"src"\s*:\s*"([^"]+)"/g);
  if (/\.(m?js|html)$/.test(file)) {
    grab(/\bimport\s[^'"`;]*?from\s*['"]([^'"]+)['"]/g);
    grab(/\bimport\s*['"]([^'"]+)['"]/g);
    grab(/\bimport\(\s*['"]([^'"]+)['"]\s*\)/g);
    grab(/new URL\(\s*['"]([^'"]+)['"]\s*,\s*import\.meta\.url/g);
    grab(/\b(?:location\.href|\.src)\s*=\s*['"]([^'"]+)['"]/g, true); // ex. location.href = 'replay.html'
    grab(/\bfetch\(\s*['"]([^'"]+)['"]/g, true);
  }
  return out;
}

// Tous les fichiers atteints depuis les pages, avec qui les demande.
function reached() {
  const seen = new Map(); // fichier → fichier qui le demande
  const todo = [...PAGES, 'manifest.json'].map((f) => [f, '(départ)']);
  while (todo.length) {
    const [file, by] = todo.pop();
    if (seen.has(file)) continue;
    seen.set(file, by);
    if (!/\.(html|m?js|json)$/.test(file) || !existsSync(join(root, file))) continue;
    for (const [ref, page] of refsOf(file, readFileSync(join(root, file), 'utf8'))) {
      const p = resolve(page ? 'index.html' : file, ref);
      if (p) todo.push([p, file]);
    }
  }
  return seen;
}

test('FILES contient chaque fichier demandé par index.html, replay.html et technologies.html', () => {
  const files = new Set(swFiles());
  const missing = [...reached()].filter(([f]) => !files.has(f)).map(([f, by]) => `${f} (demandé par ${by})`);
  assert.deepEqual(missing, [], 'fichiers absents du cache hors ligne');
});

test('technologies.html et son module techtree.js sont dans FILES (#84)', () => {
  const files = swFiles();
  assert.ok(files.includes('technologies.html'));
  assert.ok(files.includes('js/techtree.js'));
});

test('chaque fichier de FILES existe (sinon l’installation du cache échoue)', () => {
  const absent = swFiles().filter((f) => !existsSync(join(root, f)));
  assert.deepEqual(absent, []);
});
