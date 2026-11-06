// Échap ferme la fenêtre du dessus, et seulement elle (issue #72, D-192).
//
// js/app.js tourne dans le navigateur (il touche le DOM dès son chargement) : on ne peut pas
// l'importer dans Node. Ce test vérifie donc, sur les vrais fichiers, les trois choses dont la
// règle a besoin :
//   1. toutes les fenêtres (`.sheet`) ont le même z-index, sans autre réglage : celle qui se voit
//      devant est la dernière visible dans l'ordre du HTML ;
//   2. chaque fenêtre a sa croix (`.close-btn`), que Échap clique ;
//   3. le gestionnaire d'Échap de js/app.js prend la dernière visible (`findLast`), pas la première.
// Puis il rejoue la règle sur l'ordre réel des fenêtres d'index.html (fiche de planète puis
// journal, l'exemple de l'issue). La preuve dans le vrai jeu est dans la PR.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const html = read('index.html');
const css = read('style.css').replace(/\/\*[\s\S]*?\*\//g, ''); // sans les commentaires
const app = read('js/app.js');

// Les fenêtres, dans l'ordre du HTML, chacune avec son bout de HTML (jusqu'à la suivante).
const ids = [...html.matchAll(/<div id="(sheet-[\w-]+)" class="sheet\b/g)].map((m) => ({ id: m[1], at: m.index }));
const sheets = ids.map((s, i) => ({ id: s.id, src: html.slice(s.at, ids[i + 1]?.at ?? html.length) }));

test('toutes les fenêtres ont le même z-index : la dernière ouverte dans le HTML est devant', () => {
  assert.ok(sheets.length >= 9, `fenêtres trouvées : ${sheets.length}`);
  const rules = [...css.matchAll(/([^{}]*\.sheet\b[^{}]*)\{([^}]*)\}/g)].filter((m) => /z-index/.test(m[2]));
  assert.deepEqual(rules.map((m) => m[1].trim()), ['.sheet'], 'un seul z-index pour les fenêtres, sur `.sheet`');
});

test('chaque fenêtre a sa croix, que Échap clique', () => {
  for (const s of sheets) assert.match(s.src, /class="[^"]*\bclose-btn\b/, `${s.id} sans croix`);
});

test('Échap prend la dernière fenêtre visible, pas la première', () => {
  const handler = app.match(/addEventListener\('keydown', \(e\) => \{\s*if \(e\.key !== 'Escape'\) return;[\s\S]*?\n\}\);/);
  assert.ok(handler, 'gestionnaire d’Échap trouvé dans js/app.js');
  assert.match(handler[0], /querySelectorAll\('\.sheet'\)\]\.findLast\(\(s\) => !s\.hidden\)/);
  assert.doesNotMatch(handler[0], /\.find\(/);
});

test('fiche de planète puis journal : un Échap ferme le journal, un deuxième la fiche', () => {
  // La même règle que js/app.js, sur l'ordre réel des fenêtres.
  const open = new Set(['sheet-planet', 'sheet-journal']);
  const escape = () => {
    const top = sheets.findLast((s) => open.has(s.id));
    if (top) open.delete(top.id);
    return top?.id;
  };
  assert.equal(escape(), 'sheet-journal', '1er Échap : le journal, au-dessus');
  assert.deepEqual([...open], ['sheet-planet'], 'la fiche reste');
  assert.equal(escape(), 'sheet-planet', '2e Échap : la fiche');
  assert.equal(escape(), undefined, '3e Échap : plus rien à fermer');
});
