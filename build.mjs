// Build d'Astra (D-535) : fabrique dist/, le site mis en ligne.
//
//   npm ci            (une fois : installe esbuild)
//   node build.mjs    (ou npm run build) → dist/
//   node build.mjs --out /tmp/astra-dist
//
// Les sources restent jouables telles quelles (modules ES natifs, sans build) : `python3 -m
// http.server`, tests/ui/server.mjs et les tests importent les fichiers de js/. dist/ n'est que
// la version assemblée pour les téléphones :
//   - chaque page charge UN fichier JS (js/index.js, js/replay.js, js/technologies.js), assemblé
//     depuis son point d'entrée et minifié (espaces, syntaxe, noms locaux), avec son source map ;
//   - style.css minifié ; manifest.json, icônes et bibliothèques chargées à la demande
//     (vendor/jsQR.js, vendor/trystero-nostr.mjs) copiés tels quels ;
//   - sw.js avec FILES = la liste réelle des fichiers de dist/ et VERSION = empreinte de leur
//     contenu (D-536) : plus personne ne touche FILES ni VERSION à la main.
// Importer ce fichier ne lance rien : `build({ out })` est exporté (les tests construisent
// chacun dans leur dossier temporaire).

import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, posix, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));

/** Les pages et le point d'entrée de chacune (ce que charge sa balise <script type="module">). */
export const PAGES = [
  { html: 'index.html', entry: 'js/interface/app/main.js', out: 'js/index.js' },
  { html: 'replay.html', entry: 'js/interface/replay-view/main.js', out: 'js/replay.js' },
  { html: 'technologies.html', entry: 'js/interface/techtree/main.js', out: 'js/technologies.js' },
];

/** Copiés tels quels (chargés à la demande, ou pas du JS). */
const COPY = ['manifest.json', 'icons', 'vendor/jsQR.js', 'vendor/jsQR.LICENSE', 'vendor/trystero-nostr.mjs', 'vendor/README.txt', '.nojekyll'];

/** Dans dist/ mais pas dans le cache hors ligne : utiles au débogage ou au dépôt, pas au jeu. */
const notCached = (f) => f === 'sw.js' || f.endsWith('.map') || f === '.nojekyll' || f.startsWith('vendor/') && !/\.(m?js)$/.test(f);

// Un chemin relatif vers vendor/ lu par le navigateur au moment voulu (`new URL('../../../vendor/jsQR.js',
// import.meta.url)`, `import('../../../vendor/trystero-nostr.mjs')`) est relatif au fichier source.
// Dans le fichier assemblé (dist/js/), il doit viser le même fichier : '../vendor/…'.
//   - dans `new URL('…', import.meta.url)` : seul le chemin change ;
//   - dans un import() dynamique : le chemin devient `new URL('../vendor/…', import.meta.url).href`,
//     qu'esbuild n'essaie pas d'assembler (le fichier reste à part, chargé au besoin, retenté avec
//     `?r=N`, D-510).
// Les `import … from` statiques (qrcode.mjs) ne sont pas touchés : esbuild les assemble.
const vendorPaths = {
  name: 'vendor-paths',
  setup(b) {
    b.onLoad({ filter: /[\\/]js[\\/].*\.js$/ }, async (args) => {
      const src = await readFile(args.path, 'utf8');
      const same = (up, rest) => resolve(dirname(args.path), up + rest) === join(root, rest);
      const code = src.replace(/(['"`])((?:\.\.?\/)+)(vendor\/[\w.-]+)(['"]?)/g, (m, q, up, rest, close, at) => {
        const before = src.slice(Math.max(0, at - 40), at);
        if (/\b(from|import)\s*$/.test(before) || !same(up, rest)) return m; // import statique, ou autre chose
        if (/new URL\(\s*$/.test(before)) return `${q}../${rest}${close}`;
        const url = `new URL('../${rest}', import.meta.url).href`;
        if (q === '`') return '`${' + url + '}';
        if (close !== q) throw new Error(`build : chemin vers vendor/ non reconnu dans ${args.path}`);
        return url;
      });
      return { contents: code, loader: 'js' };
    });
  },
};

async function listFiles(dir, base = dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await listFiles(p, base)));
    else out.push(relative(base, p).split(sep).join('/'));
  }
  return out.sort();
}

/** Remplace exactement une occurrence, sinon échoue (un remplacement raté ne doit pas passer inaperçu). */
function replaceOnce(text, from, to, where) {
  const n = text.split(from).length - 1;
  if (n !== 1) throw new Error(`build : « ${from} » trouvé ${n} fois dans ${where} (1 attendu)`);
  return text.replace(from, () => to);
}

export async function build({ out = join(root, 'dist'), quiet = false } = {}) {
  const esbuild = await import('esbuild');
  out = resolve(out);
  await rm(out, { recursive: true, force: true });
  await mkdir(out, { recursive: true });

  // 1. Un fichier JS par page, minifié, avec source map.
  await esbuild.build({
    absWorkingDir: root,
    entryPoints: Object.fromEntries(PAGES.map((p) => [p.out.replace(/\.js$/, ''), p.entry])),
    outdir: out,
    bundle: true,
    format: 'esm',
    minify: true,
    sourcemap: 'linked',
    target: 'es2022',
    charset: 'utf8',
    legalComments: 'eof',
    logLevel: quiet ? 'error' : 'warning',
    plugins: [vendorPaths],
  });

  // 2. Le style, minifié.
  await esbuild.build({ absWorkingDir: root, entryPoints: ['style.css'], outfile: join(out, 'style.css'), bundle: true, minify: true, charset: 'utf8', logLevel: quiet ? 'error' : 'warning' });

  // 3. Les pages : leur <script type="module"> pointe vers le fichier assemblé.
  for (const p of PAGES) {
    const html = await readFile(join(root, p.html), 'utf8');
    await writeFile(join(out, p.html), replaceOnce(html, `src="${p.entry}"`, `src="${p.out}"`, p.html));
  }

  // 4. Fichiers copiés tels quels.
  for (const f of COPY) await cp(join(root, f), join(out, f), { recursive: true });

  // 5. Chaque chemin vers vendor/ écrit dans un fichier assemblé doit tomber sur un fichier de dist/.
  const files = await listFiles(out);
  for (const p of PAGES) {
    const code = await readFile(join(out, p.out), 'utf8');
    for (const m of code.matchAll(/['"`]((?:\.\.?\/)+vendor\/[\w.-]+)/g)) {
      const target = posix.normalize(posix.join(posix.dirname(p.out), m[1]));
      if (!files.includes(target)) throw new Error(`build : ${p.out} demande ${m[1]} (→ ${target}), absent de dist/`);
    }
    if (/\bfrom\s*['"]\.{1,2}\//.test(code)) throw new Error(`build : ${p.out} contient encore un import relatif non assemblé`);
  }

  // 6. Le service worker : FILES = fichiers de dist/ (sans les source maps), VERSION = empreinte.
  const cached = ['./', ...files.filter((f) => !notCached(f))];
  const sw = await readFile(join(root, 'sw.js'), 'utf8');
  const hash = createHash('sha256');
  hash.update(sw);
  for (const f of cached.slice(1)) hash.update(`\0${f}\0`).update(await readFile(join(out, f)));
  const version = `astra-${hash.digest('hex').slice(0, 12)}`;
  let built = replaceOnce(sw, "const VERSION = 'astra-sources';", `const VERSION = '${version}';`, 'sw.js');
  built = replaceOnce(built, 'const FILES = [];', `const FILES = [\n${cached.map((f) => `  '${f}',`).join('\n')}\n];`, 'sw.js');
  await writeFile(join(out, 'sw.js'), built);

  if (!quiet) console.log(`dist/ : ${files.length + 1} fichiers, ${cached.length} dans le cache hors ligne, ${version}`);
  return { out, version, files: [...files, 'sw.js'].sort(), cached };
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const i = process.argv.indexOf('--out');
  await build(i > 0 ? { out: process.argv[i + 1] } : {});
}
