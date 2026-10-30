# Documentation d'Astra

Astra est un jeu de conquête spatiale entre téléphones, en pair à pair : pas de serveur de jeu,
le site est un dossier de fichiers statiques (HTML, CSS, JS sans framework ni build). Chaque
téléphone garde une copie complète de la partie ; chaque joueur est le seul à écrire sa propre
fiche.

Cette doc décrit le code au commit `1eeb2c1` (2026-10-28 23:14:27 UTC), plus le rythme des
parties (tempo, froid, conquête, défenses, déconstruction) ajouté le 2026-10-29 sur la branche
`claude/swarm-it-game-pacing-1d4502` : [regles.md](architecture/regles.md) §4.1, §5.5, §9.2,
§19 et [interface.md](architecture/interface.md) §12. **Toutes les heures sont en UTC.**

## Comment lire

| Je veux… | Lire |
|---|---|
| Comprendre le projet en 2 minutes | [README.md](../README.md) (racine) |
| Jouer, connaître les races | [GUIDE.md](../GUIDE.md) |
| Comprendre le réseau, les invitations, la sauvegarde, le service worker | [architecture/reseau.md](architecture/reseau.md) |
| Comprendre les règles : temps, économie, races, technologies, flottes, combat, échanges, rejeu, tests | [architecture/regles.md](architecture/regles.md) |
| Comprendre les écrans, `js/app.js`, la carte, le style, les icônes, le fond | [architecture/interface.md](architecture/interface.md) |
| Lancer le jeu en local et le tester à deux | [architecture/interface.md](architecture/interface.md) §2 |
| Lancer les tests | [architecture/reseau.md](architecture/reseau.md) §9 et [architecture/regles.md](architecture/regles.md) (tests) |
| Savoir **ce que Vincent a demandé**, quand, et ce qui en est sorti | [historique/journal.md](historique/journal.md) |
| Savoir **pourquoi** une chose est faite ainsi | [decisions.md](decisions.md) (D-001…) |
| Comment finit une partie (froid, conquête, défenses, élimination) | [architecture/regles.md](architecture/regles.md) §19 |
| L'analyse du rythme par les robots (moments morts, mesures) | [RAPPORT-RYTHME.md](../RAPPORT-RYTHME.md) |
| Le plan du voyage spatial (flottes, carburant, échanges) | [PLAN-VOYAGE.md](../PLAN-VOYAGE.md) (§ Bilan en partie périmé, voir D-039) |
| Les règles de travail pour Claude | [CLAUDE.md](../CLAUDE.md) |

Ordre conseillé pour arriver sur le projet : README racine → `reseau.md` §1-2 → `regles.md` §1-4
→ `interface.md` §1-4 → `decisions.md` en diagonale.

## Carte du projet

| Fichier | Rôle | Documenté dans |
|---|---|---|
| `index.html` | Page du jeu : tous les écrans et fenêtres | interface |
| `replay.html` | Page « revoir une partie » | interface (écran), regles (moteur) |
| `technologies.html` | Page à part : graphe des technologies par race (aucun lien depuis le jeu) | interface (rendu), regles (données) |
| `style.css` | Tout le style (thème sombre, angles droits) | interface |
| `manifest.json` | Application installable (nom, icônes, portrait) | reseau |
| `sw.js` | Service worker : cache hors ligne, réseau d'abord | reseau |
| `.nojekyll` | Fichier vide : dit à GitHub Pages de servir les fichiers tels quels, sans Jekyll (D-008) | ici |
| `.gitignore` | Ignore seulement `.DS_Store` (fichiers du Finder macOS) | ici |
| `README.md`, `GUIDE.md`, `PLAN-VOYAGE.md` | Présentation, guide des races, plan du voyage spatial | — |
| `RAPPORT-RYTHME.md` | Analyse du rythme des parties par 4 agents et des robots (D-077), puis changements faits | — |
| `CLAUDE.md` | Règles pour Claude : tenir le journal et les décisions | — |
| `docs/` | Cette documentation | — |
| `icons/` | Icônes de l'application (`icon.svg`, 192 et 512 px) | interface |
| `vendor/` | Bibliothèques incluses : `qrcode.mjs` (QR), `jsQR.js` (lecture QR), `trystero-nostr.mjs` (rendez-vous Nostr) ; licences dans `vendor/README.txt` | reseau |
| `js/config.js` | Réglages réseau (serveurs ICE, relais, identifiant d'application) | reseau |
| `js/peer.js` | Lien WebRTC, découpage des gros messages | reseau |
| `js/invite.js` | Codes d'invitation et de réponse (le « double scan ») | reseau |
| `js/scanner.js` | Lecture de QR par la caméra | reseau |
| `js/rendezvous.js` | Reconnexion par relais Nostr (Trystero) | reseau |
| `js/save.js` | Sauvegarde locale, historique des 10 parties, identités | reseau |
| `js/session.js` | Cœur d'une partie : messages, synchro des fiches (reseau) et ordres du joueur (regles) | reseau + regles |
| `js/game.js` | Règles : temps, économie, races, carte, climat, score | regles |
| `js/tech.js` | Technologies, vaisseaux, coûts et durées | regles |
| `js/fleet.js` | Flottes, trajets, carburant, combat | regles |
| `js/trade.js` | Échanges entre joueurs | regles |
| `js/replay.js` | Moteur de rejeu depuis le journal des ordres | regles |
| `js/techtree.js` | Construit le graphe des technologies (données : regles ; dessin : interface) | regles + interface |
| `js/app.js` | Toute l'interface du jeu (≈ 1 970 lignes) | interface |
| `js/replay-view.js` | Écran de `replay.html` | interface |
| `js/sky.js` | Soleil central de la carte | interface (et regles pour la carte) |
| `js/galaxy.js` | Fond de galaxie en parallaxe | interface |
| `js/icons.js` | Icônes SVG (35 tracés) | interface |
| `tests/` | 15 fichiers `*.test.mjs` (153 tests, dont `alerts.test.mjs` : famine et panne d'énergie, dont `plan.test.mjs` : fil de construction, dont `end.test.mjs` : fin de partie, dont `journal.test.mjs` : carnet de combats) + `harness.mjs` | regles (règles), reseau (`peer`, `hostile`, `harness`), [tests-decisions](architecture/tests-decisions.md) (`decisions-*.test.mjs`) |

Lancer les tests : `node --test tests/*.test.mjs` (153/153 réussis le 2026-10-30 avec le fil de construction, D-105, le chantier sur la carte, D-106, les rencontres hors ligne, D-109, le carnet de combats, D-110, et les alertes de famine, D-111). Quel test
protège quelle décision : [architecture/tests-decisions.md](architecture/tests-decisions.md). Attention :
`node --test tests/` échoue (voir reseau.md §9).

## Problèmes connus (au 2026-10-29)

Relevés pendant l'écriture de cette doc. **Rien n'a été corrigé** : ni le code, ni `README.md`.

1. **`sw.js` ne pré-cache pas `technologies.html` ni `js/techtree.js`** (`sw.js:5-34`). Hors
   ligne, la page ne marche que si elle a déjà été ouverte en ligne. Signalé une première fois le
   2026-10-28 à 15:12. Voir [reseau.md](architecture/reseau.md) §8.
2. **Le pas à pas « Tester sur ordinateur » de `README.md:11-20` est périmé** : boutons renommés
   (« Créer », boutons-icônes pour copier, « Coller une réponse »), invitation par le compteur de
   joueurs ; `cd astra-p2p` alors que le dépôt s'appelle `astra` ; deux onglets de la même
   origine partagent le `localStorage`. Le parcours à jour (testé) est dans
   [interface.md](architecture/interface.md) §2.
3. **`PLAN-VOYAGE.md` § Bilan** dit encore « ouvert » le carburant par défaut, tranché le
   2026-10-27 (D-039).
4. **Commentaires faux dans le code** (rien de cassé) : 6 écarts listés dans
   [regles.md](architecture/regles.md) §18, dont « de 12 à 22 places » (`js/game.js:969`) et
   « 30 cases (machines) » (`js/tech.js:217`).
5. **Petits écarts d'interface** listés dans [interface.md](architecture/interface.md) §11 :
   exemple d'invitation `o1.` au lieu de `o2.`, note « Rejoindre une partie » au lieu de
   « Rejoindre », `.topbar` cachée mais encore remplie, `technologies.html` au style d'avant.
6. **Nom et race du joueur plus affichés en jeu** depuis le retrait de la barre du haut (D-075) ;
   question restée sans réponse.

## Travaux en cours

- **Rythme des parties** (D-078, D-083 à D-097) : commité sur la branche
  `claude/swarm-it-game-pacing-1d4502`, **pas encore fusionné dans `main`**. Décrit dans
  `architecture/`. Non confirmé : l'activité des dernières minutes (les robots ne se battent
  pas) et l'équilibre des défenses.

## Comment cette doc a été faite

Le 2026-10-29, sur demande de Vincent (D-079), une équipe de 8 sessions Claude (D-080) : trois ont
relu les transcripts des sessions Claude Code et `git log`, trois ont lu le code, une a cherché à
réfuter les brouillons (48 vérifications ; 7 affirmations fausses corrigées, 5 par la
vérification et 2 entre auteurs : voir [decisions.md](decisions.md) annexe A), une a assemblé. Les trous (prototype du 25 oct sans
transcript, etc.) sont listés dans [journal.md](historique/journal.md#trous-connus).
