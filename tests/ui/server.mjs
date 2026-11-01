// Interface de test (D-130) : un petit serveur local, sans dépendance, qui
// liste les tests, en lance un (ou un fichier, ou tous) et montre la
// simulation des scénarios (tests/scenario.mjs, D-129).
//
//   node tests/ui/server.mjs        puis ouvrir http://localhost:5199
//
// Les tests tournent comme d'habitude (`node --test`, un processus par
// fichier, en parallèle) ; seul le reporter change (tests/ui/reporter.mjs).
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const tests = join(root, 'tests');
const PORT = Number(process.env.PORT) || 5199;

/**
 * Les tests de chaque fichier, lus dans le source (node:test ne sait pas les
 * lister sans les lancer) : le premier argument texte de chaque test(…) ou scenario(…).
 */
function list() {
  return readdirSync(tests)
    .filter((f) => f.endsWith('.test.mjs'))
    .sort()
    .map((f) => {
      const src = readFileSync(join(tests, f), 'utf8');
      const out = [];
      for (const m of src.matchAll(/^[ \t]*(test|scenario)\(\s*(['"])((?:\\.|(?!\2)[^\\])*)\2/gm)) {
        const line = src.slice(0, m.index).split('\n').length + (m[0].match(/\n/g)?.length || 0);
        out.push({ name: m[3].replace(/\\(.)/g, '$1'), line, scenario: m[1] === 'scenario' });
      }
      return { file: `tests/${f}`, tests: out };
    });
}

const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

let current = null; // le lancement en cours : un nouveau l'arrête

/** Lance `files` (et seulement le test `name` s'il est donné) ; chaque résultat part en une ligne JSON. */
function run(res, files, name) {
  current?.kill();
  const known = list();
  const owner = (n) => known.find((k) => files.includes(k.file) && k.tests.some((t) => t.name === n))?.file;
  const args = ['--test', `--test-reporter=${join(here, 'reporter.mjs')}`];
  if (name) args.push(`--test-name-pattern=^${escRe(name)}$`);
  const child = spawn(process.execPath, [...args, ...files], { cwd: root, env: { ...process.env, ASTRA_REPORT: '1' } });
  current = child;
  res.writeHead(200, { 'content-type': 'application/x-ndjson; charset=utf-8', 'cache-control': 'no-store' });
  const t0 = Date.now();
  let buf = '';
  let count = 0;
  let stderr = '';
  child.stdout.on('data', (d) => {
    buf += d;
    let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i);
      buf = buf.slice(i + 1);
      if (!line.startsWith('{')) continue;
      const r = JSON.parse(line);
      r.file = owner(r.name) || r.file; // un scénario est déclaré dans tests/scenario.mjs : on le rend à son fichier
      count++;
      res.write(`${JSON.stringify({ type: 'result', ...r })}\n`);
    }
  });
  child.stderr.on('data', (d) => (stderr += d));
  child.on('close', (code, signal) => {
    if (current === child) current = null;
    res.end(`${JSON.stringify({ type: 'end', code, stopped: !!signal, count, ms: Date.now() - t0, stderr: count ? '' : stderr.slice(-4000) })}\n`);
  });
}

function send(res, status, type, body) {
  res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store' });
  res.end(body);
}

const server = createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (req.method === 'GET' && url.pathname === '/') return send(res, 200, 'text/html; charset=utf-8', readFileSync(join(here, 'index.html')));
  if (req.method === 'GET' && url.pathname === '/api/tests') return send(res, 200, 'application/json', JSON.stringify(list()));
  const report = url.pathname.match(/^\/reports\/([\w.-]+\.html)$/);
  if (req.method === 'GET' && report) {
    const p = join(tests, 'reports', report[1]);
    return existsSync(p) ? send(res, 200, 'text/html; charset=utf-8', readFileSync(p)) : send(res, 404, 'text/plain; charset=utf-8', 'Pas de rapport.');
  }
  if (req.method === 'POST' && url.pathname === '/api/run') {
    let body = '';
    req.on('data', (d) => (body += d));
    req.on('end', () => {
      let q;
      try {
        q = JSON.parse(body || '{}');
      } catch {
        return send(res, 400, 'text/plain; charset=utf-8', 'JSON invalide.');
      }
      const known = list();
      // Seulement des fichiers et des noms qui existent : rien d'autre n'arrive jusqu'à la ligne de commande.
      const files = q.file ? known.filter((k) => k.file === q.file).map((k) => k.file) : known.map((k) => k.file);
      if (!files.length) return send(res, 404, 'text/plain; charset=utf-8', 'Fichier inconnu.');
      if (q.name && !known.some((k) => k.file === q.file && k.tests.some((t) => t.name === q.name))) return send(res, 404, 'text/plain; charset=utf-8', 'Test inconnu.');
      run(res, files, q.name || null);
    });
    return;
  }
  if (req.method === 'POST' && url.pathname === '/api/stop') {
    current?.kill();
    return send(res, 204, 'text/plain', '');
  }
  send(res, 404, 'text/plain; charset=utf-8', 'Introuvable.');
});

server.listen(PORT, '127.0.0.1', () => console.log(`Interface de test : http://localhost:${PORT}`));
