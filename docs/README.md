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
| Bien jouer chaque race (meilleur départ, investissements, défense, attaque), avec des chiffres mesurés | [guides/](guides/README.md) : [humains](guides/humains.md), [machines](guides/machines.md), [aliens](guides/aliens.md) |
| Les limites du jeu : durée, froid, place, défense d'une planète, plafonds | [guides/limites.md](guides/limites.md) |
| Comprendre le réseau, les invitations, la sauvegarde, le service worker | [architecture/reseau.md](architecture/reseau.md) |
| Comprendre les règles : temps, économie, races, technologies, flottes, combat, échanges, rejeu, tests | [architecture/regles.md](architecture/regles.md) |
| Comprendre les écrans, `js/app.js`, la carte, le style, les icônes, le fond | [architecture/interface.md](architecture/interface.md) |
| Lancer le jeu en local et le tester à deux | [architecture/interface.md](architecture/interface.md) §2 |
| Lancer les tests | [architecture/reseau.md](architecture/reseau.md) §9 et [architecture/regles.md](architecture/regles.md) (tests) |
| Savoir **ce que Vincent a demandé**, quand, et ce qui en est sorti | [historique/journal.md](historique/journal.md) |
| Savoir **pourquoi** une chose est faite ainsi | [decisions.md](decisions.md) (D-001…) |
| Comment finit une partie (froid, conquête, défenses, élimination) | [architecture/regles.md](architecture/regles.md) §19 |
| Comment joue l'IA, et comment elle tourne sur le téléphone de l'hôte | [architecture/regles.md](architecture/regles.md) §20, [architecture/reseau.md](architecture/reseau.md) §6.7 |
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
| `sw.js` | Service worker : cache hors ligne, réseau d'abord, cache si le réseau ne répond pas en 3 s (D-230) | reseau |
| `.nojekyll` | Fichier vide : dit à GitHub Pages de servir les fichiers tels quels, sans Jekyll (D-008) | ici |
| `.gitignore` | Ignore seulement `.DS_Store` (fichiers du Finder macOS) | ici |
| `README.md`, `GUIDE.md`, `PLAN-VOYAGE.md` | Présentation, guide des races, plan du voyage spatial | — |
| `RAPPORT-RYTHME.md` | Analyse du rythme des parties par 4 agents et des robots (D-077), puis changements faits | — |
| `CLAUDE.md` | Règles pour Claude : tenir le journal et les décisions | — |
| `docs/` | Cette documentation | — |
| `docs/guides/` | Guides de jeu par race et limites du jeu, chiffres mesurés au commit `15ca511` (D-162) : `README.md` (index), `humains.md`, `machines.md`, `aliens.md`, `limites.md`, `questions.md` (24 questions de joueurs) | ici |
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
| `js/bot.js` | Joueurs IA (D-151) : le cerveau (`think`), le lien en mémoire, ajouter une IA (`addBot`) et la réveiller à la reprise (`wakeBots`) | regles §20 (cerveau), reseau §6.7 (lien, sauvegarde), interface §19 (boutons) |
| `js/report.js` | Rapport de combat détaillé : explique le déroulé de `battle` (pourquoi on gagne ou perd, passe par passe), D-122 | regles (et interface pour l'affichage) |
| `js/replay.js` | Moteur de rejeu depuis le journal des ordres | regles |
| `js/techtree.js` | Construit le graphe des technologies (données : regles ; dessin : interface) | regles + interface |
| `js/app.js` | Toute l'interface du jeu (≈ 2 960 lignes) | interface |
| `js/aim.js` | Visée sur la carte : ce que le doigt touche (aimant, objets à égalité, place du menu au doigt), sans DOM, D-126 | interface |
| `js/finish.js` | Écran « Fin de partie » : classement final et médailles, sans DOM (D-143) | interface (et regles §19.4) |
| `js/back.js` | « Retour » pendant une partie en cours : demander, fermer la fenêtre ou laisser faire, sans DOM (D-417) | interface §20 |
| `js/replay-view.js` | Écran de `replay.html` | interface |
| `js/sky.js` | Soleil central de la carte | interface (et regles pour la carte) |
| `js/spark.js` | Historique des mini-graphes des tuiles, par planète | interface |
| `js/galaxy.js` | Fond de galaxie, une image immobile ; réglage « Fond » (étoiles, aucun) ; plus de parallaxe (D-137) | interface |
| `js/icons.js` | Icônes SVG (40 tracés) | interface |
| `tests/` | 35 fichiers `*.test.mjs` (318 tests, dont `back.test.mjs` : « retour » pendant une partie en cours (D-417), dont le scénario D-370 de `bot.test.mjs` : IA du même téléphone, même partie et moins de copies, dont `rapport-case.test.mjs` : un rapport de combat vise une case, pas une clé de planète (D-360), dont `escape.test.mjs` : Échap ferme la fenêtre du dessus (D-192), dont `invitation.test.mjs` : retour dans une partie par invitation, sans le secret d'une autre (D-260), dont `scanner.test.mjs` : Annuler le scan à tout moment, caméra simulée (D-250), dont `bot-lobby.test.mjs` : retirer, renommer, changer la race d’une IA du lobby (D-399, D-400), dont `invite-open.test.mjs` : invitation fermée pendant sa préparation (D-398), dont `sw.test.mjs` : service worker sur réseau muet (D-230), dont `clock.test.mjs` : heure commune et changement d'heure (D-165, D-166), dont `frost-fleet.test.mjs` : le froid détruit les flottes (D-163), dont `bot.test.mjs` : joueurs IA (D-151 à D-155), dont `finish.test.mjs` : écran de fin de partie (D-143), dont `planet-button.test.mjs` : bouton « Voir la planète », dont `threat.test.mjs` : alerte de flotte ennemie, tous en scénarios filmés (D-141), dont `vision.test.mjs` : flottes ennemies cachées hors de ma portée, en scénarios, dont `aim.test.mjs` : visée sur la carte, dont `report.test.mjs` : rapport de combat détaillé, dont `start.test.mjs` : départ commun et colonisateur, dont `alerts.test.mjs` : famine et panne d'énergie, dont `plan.test.mjs` : fil de construction, dont `end.test.mjs` : fin de partie, dont `journal.test.mjs` : carnet de combats) + `sw-browser.mjs` (même parcours dans Chromium, hors `node --test`) + `back-browser.mjs` (« retour » en partie dans Chrome, hors `node --test`, D-417) + `harness.mjs` + `scenario.mjs` (scénarios et rapport HTML, D-129) + `ui/` (interface de test, D-130) | regles (règles), reseau (`peer`, `hostile`, `harness`), [tests-decisions](architecture/tests-decisions.md) (`decisions-*.test.mjs`) |

Interface de test : `node tests/ui/server.mjs`, puis http://localhost:5199 (D-130). Lancer les tests : `node --test tests/*.test.mjs` (313/313 réussis le 2026-11-07 avec les IA du même téléphone sans copies inutiles, D-370 ; 312/312 réussis le 2026-11-07 avec l'heure de mort d'un joueur pris hors ligne au classement, D-416 ; 310/310 réussis le 2026-11-07 avec les textes des pouvoirs aliens calculés depuis POWERS, D-390 ; 309/309 réussis le 2026-11-07 avec les rapports de combat visés par leur case, D-360 ; 298/298 réussis le 2026-11-07 avec les stocks abîmés d'une fiche reçue ramenés à 0, D-380 ; 297/297 réussis le 2026-11-07 avec l'IA qui ne lance pas deux conquêtes vers la même planète, D-280 ; 295/295 réussis le 2026-11-07 avec la fenêtre Scinder / Donner qui suit sa flotte, D-350 ; 294/294 réussis le 2026-11-07 avec un élément du fil qu'on ne pourra pas payer qui ne bloque plus les autres, D-270 ; 289/289 réussis le 2026-11-07 avec Échap qui ferme la fenêtre du dessus, D-192 ; 285/285 réussis le 2026-11-07 avec un historique de mini-graphe par planète, D-340 ; 280/280 réussis le 2026-11-07 avec le retour par invitation sans le secret d'une autre partie, D-260 ; 274/274 réussis le 2026-11-07 avec une clé par partie et la mémoire pleine, D-415 ; 269/269 réussis le 2026-11-07 avec l'annulation du scan, D-250 ; sans carte avant le départ, D-240 et D-241 ; 256/256 réussis le 2026-11-06 avec le service worker sur réseau muet, D-230 ; 245/245 réussis le 2026-11-06 avec la flotte qui vise le propriétaire actuel d'une planète, D-200 ; 238/238 avec l’heure commune, D-165 et D-166 ; 218/218 réussis le 2026-11-06 avec le froid qui détruit les flottes et la flotte de départ d'un joueur déconnecté, D-163 ; 198/198 réussis le 2026-11-02 avec les joueurs IA, D-151 à D-155 ; 194/194 réussis le 2026-11-01 avec l'écran de fin, D-142 et D-143 ; 191/191 tous en scénarios, D-141 ; avec le bouton « Voir la planète », D-139, et le vrai jeu dans les rapports, D-140 ; 190/190 sans la parallaxe, D-137 ; 192/192 avec l'alerte de flotte ennemie, D-133 ; 189/189 avec les scénarios, D-129 ; 187/187 le 2026-10-31 avec la vision des flottes, D-128 ; 183/183 avec la visée sur la carte, D-126 ; 172/172 avec le rapport de combat détaillé, D-122 ; 165/165 avec le départ commun, D-120 ; 154/154 le 2026-10-30 avec le fil de construction, D-105, le chantier sur la carte, D-106, les rencontres hors ligne, D-109, le carnet de combats, D-110, les alertes de famine, D-111, et le réglage « Fond », D-112). Quel test
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
