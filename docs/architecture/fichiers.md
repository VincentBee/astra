# Où est le code : l'arborescence de `js/`

> Depuis le 2026-11-16 (D-540 à D-544), le code du jeu n'est plus dans 25 gros fichiers
> `js/x.js`. Chaque fonction, classe ou constante est dans son propre fichier. Les fichiers sont
> rangés par domaine, puis par module, et par thème quand un module a plus de ~15 fichiers.
> Le but : deux sessions qui travaillent en parallèle ne touchent presque jamais le même fichier.
> Le comportement n'a pas changé : les fichiers ont été déplacés tels quels, sans réécriture
> (vérifié par un inventaire avant/après, D-541).

## 1. Trouver une fonction

- Le fichier porte le nom de l'identifiant en kebab-case : `fleetPos` → `fleet-pos.js`,
  `TECHS` → `techs.js`, `MAX_FLEETS` → `max-fleets.js`, `Session` → `session.js`.
- Chercher par le nom de fichier (`find js -name fleet-pos.js`) ou par la déclaration
  (`grep -rn "function fleetPos" js`).
- Chaque module a un `index.js` qui ré-exporte exactement son API publique d'avant (mêmes noms).
  On importe un module **par son `index.js`** : `import { fleetPos } from '../regles/fleet/index.js'`.
  À l'intérieur d'un module, les fichiers s'importent de fichier à fichier.
- Une fonction qui était privée (non exportée) est exportée par son fichier, mais pas par `index.js`.
- L'en-tête d'un ancien fichier (son commentaire de tête) et ses bandeaux de section
  (`// ----- … -----`) sont dans le `index.js` du module.

**Références anciennes.** Les docs et les commentaires du code disent souvent `js/fleet.js`
ou `js/game.js:969`. `js/fleet.js` veut dire « le module fleet », c'est-à-dire
`js/regles/fleet/`. Les numéros de ligne valent pour le commit `6e2f7cf` (dernier avant le
découpage) : `git show 6e2f7cf:js/game.js | sed -n 969p`. Exception : les références ajoutées
par l'achat automatique (D-530 à D-534, PR #207, fusionnée pendant le découpage) valent pour
`851a3d4` (`js/app.js`, `js/game.js`, `js/session.js`). Les commentaires du code n'ont pas été
corrigés, pour garder les fichiers identiques octet pour octet (D-544).

## 2. Les domaines

| Dossier | Ancien fichier | Fichiers | Sous-dossiers par thème | Doc |
|---|---|---|---|---|
| `js/reseau/config/` | `js/config.js` | 4 | — | reseau |
| `js/reseau/peer/` | `js/peer.js` | 14 | — | reseau |
| `js/reseau/invite/` | `js/invite.js` | 26 | base64, binaire, lien, qr, sdp | reseau |
| `js/reseau/scanner/` | `js/scanner.js` | 4 | — (état : `etat.js`) | reseau |
| `js/reseau/rendezvous/` | `js/rendezvous.js` | 8 | — (état : `etat.js`) | reseau |
| `js/reseau/save/` | `js/save.js` | 40 | alerte, historique, identite, partie, stockage | reseau |
| `js/reseau/tablock/` | `js/tablock.js` | 4 | — | reseau |
| `js/session/` | `js/session.js` | 237 | constantes, fiches, horloge, methodes (19 thèmes, dont `navette`, D-550), outils, textes | reseau + regles |
| `js/regles/game/` | `js/game.js` | 100 | carte, climat, construction, economie, outils, plan, planete, pouvoirs, races, ressources, score, temps | regles |
| `js/regles/tech/` | `js/tech.js` | 16 | — | regles |
| `js/regles/fleet/` | `js/fleet.js` | 39 | caracteristiques, combat, deplacement, entre-flottes, navette, ordres | regles |
| `js/regles/trade/` | `js/trade.js` | 15 | — | regles |
| `js/regles/report/` | `js/report.js` | 17 | — | regles |
| `js/regles/replay/` | `js/replay.js` | 10 | — | regles |
| `js/ia/bot/` | `js/bot.js` | 47 | cerveau, colonisation, donnees, flottes, hote, lien, planetes | regles §20 |
| `js/interface/app/` | `js/app.js` | 301 (dont `carte/bassin/`, la carte en 3D, D-559) | accueil, alertes, carte, depart, echanges, fenetres, flotte, invitation, journal, lecture, outils, partie, planete, race, rejoindre, retour (état : `etat.js`, 36 clés) | interface |
| `js/interface/aim/` | `js/aim.js` | 9 | — | interface |
| `js/interface/back/` | `js/back.js` | 3 | — | interface |
| `js/interface/finish/` | `js/finish.js` | 3 | — | interface |
| `js/interface/sky/` | `js/sky.js` | 2 | — | interface |
| `js/interface/spark/` | `js/spark.js` | 8 | — | interface |
| `js/interface/galaxy/` | `js/galaxy.js` | 13 | — | interface |
| `js/interface/icons/` | `js/icons.js` | 4 | — | interface |
| `js/interface/replay-view/` | `js/replay-view.js` | 26 | constantes, dessin, film, lecture, outils | interface |
| `js/interface/techtree/` | `js/techtree.js` | 27 | donnees, graphe, outils, panneau | interface |

## 3. Points d'entrée des pages

Chaque page charge un seul module, qui importe le reste.

| Page | Module chargé |
|---|---|
| `index.html` | `js/interface/app/main.js` |
| `replay.html` | `js/interface/replay-view/main.js` |
| `technologies.html` | `js/interface/techtree/main.js` |

Un `main.js` contient les effets de bord du module d'origine (écouteurs, lancement, `await` de
tête), dans le même ordre qu'avant (D-541). Pour l'interface du jeu, `js/interface/app/main.js`
ne contient que des imports : chaque effet (un écouteur, une initialisation) est dans son propre
fichier, souvent dans un dossier `branchements/`, et **l'ordre des imports de `main.js` est l'ordre
d'exécution** (un module d'effet n'importe jamais un autre module d'effet). Exemple : Échap ferme
la fenêtre du dessus dans `js/interface/app/fenetres/branchements/echap.js`. Un module qui a un `main.js` et un `index.js` :
`index.js` ne fait qu'exporter, `main.js` lance.

## 4. Règles du découpage (à suivre pour tout nouveau code)

1. **Un identifiant top-level par fichier**, nommé comme lui en kebab-case.
2. **`index.js`** : ré-exports nommés, un par ligne (`export { x } from './…/x.js'`), jamais
   `export *` (une fonction privée fuirait).
3. **Un `let` partagé** entre plusieurs fichiers devient une clé d'un objet d'état unique du
   module : `export const etat = { … }` dans `etat.js`, et les usages deviennent `etat.x`
   (un binding importé ne se réassigne pas).
4. **Méthodes de classe** (`Session`) : chaque méthode dans `js/session/methodes/<thème>/<nom>.js`
   (`export function nom(…) { … }`, même corps, `this` inchangé), posée sur le prototype par
   `Object.defineProperties(Session.prototype, { nom: { value: nom, writable: true, configurable: true } })`,
   donc non énumérable comme avant. Ce qui utilise un champ `#` ou `super` reste dans la classe,
   comme le constructeur et les champs. **Importer `Session` par `js/session/index.js`** :
   c'est lui qui charge `main.js`, qui pose l'enveloppe du journal d'ordres.
5. **Effets de bord** : dans le `main.js` du module, dans l'ordre d'avant.
6. **Nouveau fichier** : l'ajouter à `FILES` de `sw.js` et changer `VERSION` ; sinon
   `tests/sw-files.test.mjs` échoue (D-500, D-543).

## 5. Le build : `dist/`, ce qui part en ligne (D-545, D-546)

Les sources ci-dessus se jouent telles quelles (modules ES natifs, ~900 fichiers). Pour les
téléphones, `node build.mjs` (esbuild, seule dépendance, en devDependency) fabrique `dist/` :

| Dans `dist/` | Vient de |
|---|---|
| `index.html`, `replay.html`, `technologies.html` | les pages, leur `<script>` pointé vers le fichier assemblé |
| `js/index.js`, `js/replay.js`, `js/technologies.js` (+ `.map`) | un fichier par page, assemblé depuis son point d'entrée (§3) et minifié |
| `style.css` | minifié |
| `vendor/jsQR.js`, `vendor/trystero-nostr.mjs` | copiés : chargés à la demande (`qrcode.mjs` est assemblé) |
| `manifest.json`, `icons/` | copiés |
| `sw.js` | le `sw.js` des sources, avec `FILES` (les fichiers de `dist/`) et `VERSION` (empreinte) |

Les chemins vers `vendor/` lus au moment voulu (`new URL('…', import.meta.url)`, `import()`)
sont réécrits pour viser le même fichier depuis `dist/js/`, et le build échoue si l'un d'eux ne
tombe pas sur un fichier de `dist/`. Mise en ligne : `.github/workflows/deploy.yml` (tests, build,
publication sur GitHub Pages à chaque push sur `main` ; tests et build seuls sur une pull request).
