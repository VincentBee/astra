// Échap ferme la fenêtre du dessus, et seulement elle (issue #72, D-192).
//
// L'interface (js/interface/app/) tourne dans le navigateur (elle touche le DOM dès son
// chargement) : on ne peut pas l'importer dans Node. Ce test vérifie donc, sur les vrais fichiers, les trois choses dont la
// règle a besoin :
//   1. toutes les fenêtres (`.sheet`) ont le même z-index, sans autre réglage : celle qui se voit
//      devant est la dernière visible dans l'ordre du HTML ;
//   2. chaque fenêtre a sa croix (`.close-btn`), que Échap clique ;
//   3. le gestionnaire d'Échap (js/interface/app/fenetres/branchements/echap.js) prend la dernière
//      visible (`topSheet`, js/interface/app/outils/top-sheet.js : `findLast`), pas la première.
// Puis il rejoue la règle sur l'ordre réel des fenêtres d'index.html (fiche de planète puis
// journal, l'exemple de l'issue). La preuve dans le vrai jeu est dans la PR.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const html = read('index.html');
const css = read('style.css').replace(/\/\*[\s\S]*?\*\//g, ''); // sans les commentaires
const echap = read('js/interface/app/fenetres/branchements/echap.js'); // gestionnaire d'Échap des fenêtres
const topSheetSrc = read('js/interface/app/outils/top-sheet.js'); // la fenêtre du dessus (D-417)

// Les fenêtres, dans l'ordre du HTML, chacune avec son bout de HTML (jusqu'à la suivante).
const ids = [...html.matchAll(/<div id="(sheet-[\w-]+)" class="sheet\b/g)].map((m) => ({ id: m[1], at: m.index }));
const sheets = ids.map((s, i) => ({ id: s.id, src: html.slice(s.at, ids[i + 1]?.at ?? html.length) }));

test('toutes les fenêtres ont le même z-index : la dernière ouverte dans le HTML est devant', () => {
  assert.ok(sheets.length >= 9, `fenêtres trouvées : ${sheets.length}`);
  // `.sheet` seule, pas `.sheet-head` ni `.sheet-panel` (leur z-index joue à l'intérieur de la fenêtre, D-302).
  const rules = [...css.matchAll(/([^{}]*\.sheet(?![\w-])[^{}]*)\{([^}]*)\}/g)].filter((m) => /z-index/.test(m[2]));
  assert.deepEqual(rules.map((m) => m[1].trim()), ['.sheet'], 'un seul z-index pour les fenêtres, sur `.sheet`');
});

test('chaque fenêtre a sa croix, que Échap clique', () => {
  for (const s of sheets) assert.match(s.src, /class="[^"]*\bclose-btn\b/, `${s.id} sans croix`);
});

test('Échap prend la dernière fenêtre visible, pas la première', () => {
  const handler = echap.match(/addEventListener\('keydown', \(e\) => \{\s*if \(e\.key !== 'Escape'\) return;[\s\S]*?\n\}\);/);
  assert.ok(handler, 'gestionnaire d’Échap trouvé dans js/interface/app/fenetres/branchements/echap.js');
  // La fenêtre du dessus vient de `topSheet`, partagée avec le « retour » en partie (D-417).
  assert.match(handler[0], /topSheet\(\)\?\.querySelector\('\.close-btn'\)/);
  assert.doesNotMatch(handler[0], /\.find\(/);
  assert.match(topSheetSrc, /const topSheet = \(\) => \[\.\.\.document\.querySelectorAll\('\.sheet'\)\]\.findLast\(\(s\) => !s\.hidden\);/);
});

test('fiche de planète puis journal : un Échap ferme le journal, un deuxième la fiche', () => {
  // La même règle que le gestionnaire d'Échap, sur l'ordre réel des fenêtres.
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
