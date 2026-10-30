# Interface d'Astra

> Décrit le code de l'interface : pages, écrans,
> `js/app.js`, rendu de la carte, style, icônes, fond étoilé. Les règles du jeu sont dans
> `regles.md`, le réseau et la sauvegarde dans `reseau.md`. Pour jouer : [GUIDE.md](../../GUIDE.md).
> Pour la présentation générale et la liste des fichiers : [README.md](../../README.md).
>
> Les références `fichier:ligne` valent pour le commit `1eeb2c1`. Dates et heures en UTC.

## 1. Vue d'ensemble

- HTML/CSS/JS sans framework ni build. Chaque page charge **un seul** module ES qui importe le reste.
- Tout le texte de l'interface est en français, tutoiement.
- Pensé pour un téléphone en portrait (`manifest.json` : `"orientation": "portrait"`), colonne de 560 px max (`style.css:41-47`).
- Thème sombre unique (« nuit spatiale », `style.css:1-2`), angles droits, icônes au trait.

| Page | Module chargé | Rôle |
|---|---|---|
| `index.html` | `js/app.js` | Le jeu : accueil, invitation, race, carte, planète, fenêtres. |
| `replay.html` | `js/replay-view.js` | Revoir comme un film la partie sauvegardée sur ce téléphone. Ouverte depuis l'historique de l'accueil (`js/app.js:184`). |
| `technologies.html` | `js/techtree.js` | Page autonome : le graphe bâtiments → technologies → vaisseaux → pouvoirs de chaque race. Aucun lien vers elle depuis le jeu (seul `README.md:37` la cite) ; elle renvoie au jeu par « Retour au jeu » (`technologies.html:153`). |

Fichiers d'interface partagés :

| Fichier | Contenu |
|---|---|
| `style.css` | Tout le style de `index.html` et `replay.html`. `technologies.html` a son propre `<style>` (§7.5). |
| `js/icons.js` | Icônes d'interface (`ic`, `fillIcons`). |
| `js/game.js:31-52` | Icônes des ressources (`resIcon`) et des races (`raceIcon`), à côté des données qu'elles illustrent. |
| `js/sky.js` | `drawSun` : le soleil, dessiné par la carte du jeu et celle du replay. |
| `js/galaxy.js` | `startGalaxy` : fond étoilé en parallaxe, derrière toutes les vues du jeu. |
| `icons/` | `icon.svg` (favicon), `icon-192.png`, `icon-512.png` (icônes PWA, `manifest.json`). |

## 2. Lancer le jeu en local et le tester à deux

Commande du README (`README.md:11-20`), depuis la racine du dépôt :

```sh
python3 -m http.server 8080
```

Puis ouvrir `http://localhost:8080`. Le service worker ne s'enregistre qu'en `https:` ou sur `localhost` (`js/app.js:1964-1966`) ; la caméra et l'installation sur l'écran d'accueil demandent du https (`README.md:23`).

**Deux joueurs sur un ordinateur.** Les deux joueurs doivent avoir un `localStorage` séparé (nom, identité, sauvegarde). Deux onglets de la même origine le partagent. Il faut donc :
- soit deux fenêtres séparées (normale + privée), comme le dit le README ;
- soit deux origines : un onglet sur `http://localhost:8080`, l'autre sur `http://127.0.0.1:8080` (vérifié le 2026-10-29, voir §9).

Parcours qui marche avec l'interface actuelle (vérifié) :
1. Onglet A : un nom → **Créer** → choisir la race → **Commencer la partie** → toucher une planète → **S'installer**.
2. Onglet A : bouton du compteur de joueurs (icône « users » + nombre) → **Inviter un joueur** → bouton **copier** (icône) sous le QR. Le lien a la forme `http://…/#o2.…`.
3. Onglet B : ouvrir ce lien. L'accueil dit « Invitation reçue… ». Un nom → **Rejoindre**. L'écran « Montre ta réponse » apparaît → bouton **copier** (code `a2.…`).
4. Onglet A : dans la fenêtre d'invitation, « Coller une réponse » → coller → **Valider**. Toast « Joueur connecté. ».
5. Onglet B passe à l'écran de race (bouton « Rejoindre la partie », la race de A affichée dessous).

> Le pas à pas de `README.md:16-20` ne correspond plus aux libellés : « Créer une partie » est devenu « Créer », « Copier le lien » / « Copier la réponse » sont des boutons-icônes, « Il est à distance ? Colle la réponse reçue » est devenu « Coller une réponse », et l'invitation passe par le compteur de joueurs, pas par une icône « en haut à droite ».

**Déboguer.** `window.astra.session` donne la session en cours dans la console (`js/app.js:45`). Le journal de la partie n'est pas affiché dans le jeu : chaque entrée est écrite une fois dans la console, `[Astra hh:mm:ss] texte` (`printLog`, `js/app.js:789-798`).

Les tests automatiques (`tests/*.test.mjs`) portent sur les règles et le réseau, pas sur l'interface : voir `regles.md` / `reseau.md`.

## 3. Écrans et fenêtres de `index.html`

Quatre **écrans** (`<section class="screen">`), un seul visible à la fois via `show(nom)` (`js/app.js:54-57`, met `hidden` sur les autres). Par-dessus, des **fenêtres** (`.sheet`, panneau collé en bas, fond sombre) et quelques couches fixes.

### 3.1 Écrans

| Élément (`index.html`) | Ce qu'on y voit | Fonctions de `js/app.js` |
|---|---|---|
| `#screen-home` (19-38) | Titre, historique des parties (`#saved`/`#games`), champ Nom, **Créer**, **Rejoindre**, note `#home-note`. | `showSaved` 153-172 (liste), clic sur la liste 174-190 (Reprendre → `Session.resume` ; Revoir → `replay.html` ; Oublier → `forgetGame`), `btn-create` 194-201, `btn-join` 203-206, `playerName` 89-100, `boot` 1935-1957. |
| `#screen-join` (41-67) | Étape 1 : scanner ou coller l'invitation. Étape 2 : QR de la réponse, copier/partager, statut. `#join-error`. | `startJoin` 212-219, `useOffer` 236-258, `onSessionChange` 263-283, scanner 226-232. |
| `#screen-race` (70-80) | 3 boutons de race (radiogroup), fiche de la race choisie, bouton Commencer/Rejoindre, ce qu'ont choisi les autres. | `showRace` 385-395, `updateRacePick` 398-410, `renderRaceOthers` 413-419, `btn-race` 428-432. |
| `#screen-game` (83-200) | La partie. Deux **vues** : la carte (`#view-universe`) ou une planète (`#view-planet`). | `startGame` 436-447, `stopGame` 449-455, `showView` 1217-1229. |

Détail de `#screen-game` :

| Élément | Rôle | Rendu |
|---|---|---|
| `.topbar` (84-95) | Ancienne barre du haut (nom, race). **Masquée** par `style.css:671` (`display: none`) ; ses champs sont encore remplis par `renderState` 753-762. | — |
| `#net` (91-93) | Compteur de joueurs en ligne (vert, orange si un lien > 250 ms). `showView` le **déplace** dans la première ligne de la vue affichée (`js/app.js:1223`). Ouvre `#sheet-players`. | `renderLive` 811-821, clic 319-322. |
| `#lost` (97-100) | Bandeau « Seul en ligne » + **Rejoindre** (rejoindre les autres par une nouvelle invitation). | `renderState` 762 (`session.alone`), `btn-rejoin` 286-289. |
| `#view-universe` (102-148) | Vue carte : `#pick` (bandeau « Choisis ta planète »), `#trades` (offres d'échange), `.map-head` (coordonnées, aide `?`), `canvas#map`. | `drawMap` 1349-1538, `renderPick` 1876-1913, `renderTrades` 1777-1800. |
| `#sheet-planet` (114-127) | Fiche de la planète touchée : nom, coordonnées, propriétaire, places, climat, gisements, **S'installer** ou **Bâtiments**. | `renderPick` 1876-1913, `btn-claim` 1922-1929, `btn-open-planet` 1275-1279, `closePlanetSheet` 1916-1920. |
| `#fleet-info` (129-145) | Fiche de la flotte sélectionnée : vaisseaux, statut (avec la vitesse et, si la flotte mêle plusieurs types, le nom du plus lent : `speedText`), carburant, choix d'ordres (`#fi-choice`), mes flottes à côté (`#fi-beside`), joueurs à côté (`#fi-partners`), boutons Arrêter / Rentrer / Se poser / Plein / Scinder / Fermer. | `renderFleetInfo` 1643-1687, handlers 1689-1714. |
| `#view-planet` (150-199) | Vue planète : en-tête (retour, nom, climat), gisements `#soil-zone`, stocks `#resources`, onglets, puis les panneaux `data-pane`. | `renderPlanet` 869-988. |
| `.tabs` (163-168) | Onglets Bâtiments / Pouvoirs (aliens seulement) / Recherche (toute planète ; « 🔒 Il faut un labo » sans labo, technologie grisée si elle est en recherche sur une autre planète) / Flottes. | `showTab` 1241-1252, flèches clavier 1255-1262. |
| `[data-pane=power]` `#powers-zone` (170-173) | Pouvoirs aliens. | `buildStatic` 526-540, `renderPlanet` 966-982. |
| `[data-pane=build]` (175-178) | Bâtiments + compteur de places `#places`. | `buildStatic` 488-498, `renderPlanet` 942-964. |
| `[data-pane=research]` `#research-zone` (180-184) | Technologies. | `buildStatic` 500-510, `renderResearch` 1000-1036. |
| `[data-pane=fleet]` `#yard-zone` (186-190) | Chantier naval (×1, ×5). | `buildStatic` 512-524, `renderYard` 1043-1072. |
| `[data-pane=fleet]` `#fleet-zone` (192-198) | Vaisseaux à quai, **Décoller**, liste de mes flottes, joueurs sur la même case. | `renderFleets` 1075-1091, `renderPartners` 1727-1742. |

Les panneaux sont filtrés en CSS selon `#view-planet[data-tab]` (`style.css:463-466`), pas en JS.

### 3.2 Fenêtres (`.sheet`)

Toutes se ferment par leur croix (`.close-btn`), un toucher sur le fond sombre ou Échap (`js/app.js:689-698` : ces deux gestes cliquent la croix).

| Fenêtre | Ouverte par | Contenu / action | Code |
|---|---|---|---|
| `#sheet-players` (`index.html:203-216`) | `#net` | Détail réseau, **Inviter un joueur**, classement (`#players`). | 319-327 ; liste `renderState` 765-779 ; lignes `renderLive` 835-865 (score, `style.order` pour trier sans redessiner, 864). |
| `#sheet-invite` (219-248) | **Inviter un joueur** | QR de l'invitation + copier/partager ; scanner ou coller la réponse. | `openInviteSheet` 297-312, `useAnswer` 341-363, fermeture → `session.cancelInvite()` 328-331. |
| `#sheet-fleet` (251-275) | **Décoller** (onglet Flottes) | Nombre de vaisseaux, cargaison, carburant ; calcule soutes, vitesse (et le vaisseau le plus lent, qui la fixe), réservoir, portée. | `openFleetSheet` 1147-1165, `updateFleetSheet` 1167-1180, `btn-fleet-go` 1185-1196. |
| `#sheet-move` (278-295) | « Donner » (`#fi-beside`) ou **Scinder** | Vaisseaux, cargaison, carburant à passer à une autre flotte ou à une nouvelle. | `openMoveSheet` 1838-1860, `btn-move-go` 1864-1873. |
| `#sheet-trade` (298-315) | Bouton échange d'un joueur sur la même case | « Je donne » / « Je demande ». | `openTradeSheet` 1746-1757, `btn-trade-go` 1768-1774. |

### 3.3 Couches fixes

- `#scanner` (318-323) : caméra plein écran, `scan()` (`js/app.js:116-126`) appelle `scanQr` de `js/scanner.js` (voir `reseau.md`), **Annuler** abandonne via `AbortController`.
- `#toast` (325) : message de 3,2 s, `toast()` (`js/app.js:60-66`). La session y écrit aussi via `session.ontoast`.
- Fond de galaxie : un `div.galaxy` inséré en tête de `<body>` par `startGalaxy()` (§7.4).

## 4. Le cycle de vie dans `app.js`

### 4.1 Démarrage (fin du fichier)

1. Au chargement du module : `fillIcons()` puis `startGalaxy()` (`js/app.js:16-17`), mise en place du collage des en-têtes (`stackSticky`, 22-36), restauration du nom (`astra.name`, 132-134) et de l'onglet (`astra.tab`, 1263-1266).
2. `showSaved()` puis `boot()` (1959-1960). `boot` lit `location.hash`, l'efface de l'adresse, et le décode avec `decode` (`js/invite.js`) :
   - invitation (`kind === 'o'`) : si un nom est déjà connu → `startJoin(hash)` ; sinon note sur l'accueil et **Rejoindre** est rebranché sur ce lien (1941-1947) ;
   - réponse : note qui dit de la coller sur le téléphone qui invite (1948-1950).
3. Un lien d'invitation ouvert dans l'onglet déjà affiché relance `boot` si aucune session n'est ouverte (`hashchange`, 1962).
4. Enregistrement du service worker (1964-1966).

### 4.2 Entrer dans une partie

| Chemin | Appels |
|---|---|
| Créer | `Session.create(name)` (async) → `ontoast`/`onchange` branchés → `startGame()` (194-201). |
| Reprendre (historique) | `selectGame(gid)` → `Session.resume(saved)` → `startGame()` (182-189). |
| Rejoindre | `useOffer(text)` : nouvelle `new Session(name)` si besoin (240-247), `session.answer(text)` → QR de la réponse (250-254). La suite arrive par `onSessionChange` : `waiting` → statut, `failed`/`refused` → erreur, `playing` → `startGame()` (263-283). |

`startGame` (436-447) : sans race → `showRace()`. Sinon écran de jeu, `buildStatic()`, vue carte, `setInterval(renderLive, 200)`, `renderState()`, `keepAwake()` (verrou d'écran allumé, 102-111).

`stopGame` (449-455) arrête la carte, le minuteur et le verrou d'écran (appelé par **Rejoindre** du bandeau « Seul en ligne »). Les boutons `[data-go]` (retour) terminent la session et reviennent à l'accueil (136-143). À la fermeture de la page, `pagehide` sauve la partie (192).

### 4.3 Trois rythmes de rendu

| Rythme | Fonction | Ce qu'elle fait |
|---|---|---|
| Une fois par race | `buildStatic` (460-541) | Construit le HTML qui dépend de la race : tuiles de stocks, gisements, cartes de bâtiments, technologies, vaisseaux, pouvoirs. Refait si la race change (`builtFor`, 458 et 824). |
| À chaque changement d'état (`session.onchange`) | `renderState` (753-783) | Identité, bandeau « Seul en ligne », liste des joueurs, journal en console, puis `renderLive`. |
| 5 fois par seconde | `renderLive` (805-866) | Réseau, planète ouverte (`renderPlanet`), bandeau de choix (`renderPick`), fiche de flotte, échanges, avertissement de version (`session.outdated`, 830-833), lignes du classement. |
| Chaque image (`requestAnimationFrame`) | `drawMap` (1349-1538) | La carte, seulement quand la vue carte est affichée (`showView` 1225-1227, `stopMap` 1231-1234). |

Conventions de rendu, à respecter pour ne pas casser le toucher :
- **Ne réécrire le HTML que s'il a changé** : `setHtml` (726-731) et le même motif avec `dataset.html` (`renderFleets` 1087-1090, `renderFleetInfo` 1683-1686, `renderPartners` 1738-1741, `renderTrades` 1792-1795, `renderBeside` 1821-1824). Commentaire explicite en 1788-1789 : redessiner sous le doigt ferait rater le toucher sur « Accepter ».
- **Éléments repérés par `data-*`** (`data-res`, `data-cost`, `data-build`, `data-tlevel`…), créés par `buildStatic` et mis à jour par les `render*`.
- **Délégation d'événements** : un seul écouteur par conteneur (`#buildings` 747-750, `#techs`, `#ships`, `#powers` 604-615, `#games`, `#races`, `#trades`, `#fi-choice`, `#fi-beside`…), qui lit le `data-*` du bouton touché.
- Carte de bâtiment : le nom est un bouton qui déplie la description (`cardHead` 547-548, écouteur global 551-556, CSS `.building.open` `style.css:512`). Barre de progression en bas de la carte pendant un chantier (`cardProgress` 991-997).
- Mini-graphes (« sparklines ») dans les tuiles : un relevé toutes les 5 s, 10 min gardées dans `localStorage['astra.hist']`, par partie, joueur et planète (`sampleHistory` 632-655, `drawSparks` 658-680).

### 4.4 Formats d'affichage (helpers)

`fmt` (de `game.js`) pour les nombres, `compact` « 118 k » (686), `withCap` « 220 / 1 000 » (683), `rateText` « +12 / min » (734-738), `clock` « 2:05 » (1199-1202), `costText` quantités + icônes (701-706), `climateHtml`/`showClimate` (709-723), `statText` attaque · coque · soute · vitesse (1039-1040), `de()` « de Beta / d'Alpha » (1302), `esc` échappement HTML (41), `whenText` date de l'historique (146-151).

## 5. Du toucher à l'ordre : où l'interface appelle la session

L'interface ne modifie jamais l'état du jeu elle-même. Elle appelle une méthode de `Session` (`js/session.js`) et se redessine ensuite. Schéma commun, sur l'exemple d'un bâtiment :

1. Toucher le bouton `[data-build="mine"]` → écouteur de `#buildings` (`js/app.js:747-750`) → `session.build('mine', openKey)`.
2. `Session.build` (`js/session.js:899-915`) vérifie (`status`, race, planète, places), applique l'ordre à **ma** fiche (`startBuild`), ou renvoie l'erreur par `ontoast`.
3. `touch(addLog(…))` (`js/session.js:584-594`) date ma fiche, ajoute l'ordre à mon journal d'ordres et la diffuse à mes pairs (`spread`, 576-581). Détails : `reseau.md`.
4. `changed()` (`js/session.js:1793-1796`) sauve tout de suite et appelle `onchange` → `onSessionChange` → `renderState` → `renderLive`.
5. Le minuteur de 200 ms fait ensuite avancer les barres et les comptes à rebours ; `session.tick` tourne de son côté toutes les 250 ms (`js/session.js:300-303`).

Vérifié dans le navigateur : toucher « Mine » écrit en console `[Astra 07:43:20] DocUI lance Mine niv. 2 sur Lyra.` et le bouton passe en compte à rebours.

Table des appels de l'interface vers la session :

| Geste | Code UI | Méthode de session |
|---|---|---|
| Créer / reprendre / rejoindre | 197, 185, 244-250 | `Session.create`, `Session.resume`, `new Session` + `answer` |
| Inviter / accepter / annuler | 304, 346, 329 | `openInvite`, `acceptAnswer`, `cancelInvite` |
| Choisir sa race | 430 | `chooseRace` |
| S'installer sur une planète | 1924 | `claimPlanet` |
| Bâtiment / recherche / vaisseaux / pouvoir | 749, 610, 614, 606 | `build`, `research`, `buildShips`, `power` |
| Décoller | 1187 | `takeOff` (renvoie l'id de la flotte, sélectionnée ensuite) |
| Envoyer une flotte sur une case | 1619-1623, 1697 | `ordersAt` (ordres possibles) puis `moveFleet` |
| Poursuivre une flotte ennemie | 1691 | `chaseFleet` |
| Arrêter / plein / rentrer / se poser | 1701-1708 | `stopFleet`, `refuelFleet`, `returnFleet`, `moveFleet(…, 'dock')` |
| Donner / fusionner / scinder | 1869, 1832 | `transferFleet`, `mergeFleets`, `splitFleet` |
| Proposer / accepter / refuser un échange | 1770, 1806 | `proposeTrade`, `answerTrade` |

Lectures seules utilisées pour le rendu : `now`, `planets`, `planetsOf`, `planetOf`, `planetsAt`, `ownerAt`, `myFleet`, `fleetsBeside`, `eyes`, `sees`, `linkInfo`, `tradePartners`, `tradeHoldings`, `incomingOffers`, et les propriétés `state`, `me`, `status`, `myRace`, `links`, `peerCount`, `alone`, `outdated`, `failure`, `refusal`.

Retour de la session vers l'interface : seulement deux rappels, `session.onchange` et `session.ontoast` (`js/session.js:206-207`), branchés à chaque création de session (`js/app.js:186-187`, 198-199, 245-246).

## 6. La carte (`canvas#map`)

### 6.1 Dessin (`drawMap`, `js/app.js:1349-1538`)

- Canvas carré (`aspect-ratio: 1`, `style.css:356`), redimensionné à `largeur CSS × devicePixelRatio` (max 3). Une case = `largeur / UNIVERSE.w` pixels.
- L'image suivante est demandée **avant** de dessiner : une erreur ne fige pas la carte (1352-1353).
- Ordre des couches :
  1. fond `#05070f`, étoiles fixes tirées de `noise(x, y)` (bruit déterministe : mêmes étoiles partout, 1305-1308) et quadrillage très pâle (1365-1387) ;
  2. soleil : `drawSun(ctx, sunFor(gid), cell)` (`js/sky.js`) ;
  3. halo de détection de ma couleur, en un seul tracé pour que les zones superposées ne foncent pas (1394-1405) ;
  4. planètes (`mapPlanets()`, 1286-1299) : disque + anneau incliné ; libre = gris `#8d95b3` et anneau en pointillés, et pulsation pendant le choix de planète ; à moi ou touchée = cercle blanc ; nom du propriétaire au-dessus (tronqué à 8 caractères) ; joueur hors ligne = transparence. Astéroïdes (polygone irrégulier) et comètes (tête + queue opposée au soleil) : `drawSmallBody` (1314-1347) ;
  5. flottes (`fleetSpots`, 1546-1566) : triangle orienté ; en route, pointillés jusqu'à la destination ; à l'arrêt, posées en couronne autour du centre de la case ; rouge `#ff7a93` si attaque ou poursuite ; cercle blanc = ma flotte sélectionnée, cercle rouge = proie visée ; croix rouge au point de panne ; jauge de carburant sous mes flottes ; flotte à sec grisée ;
  6. case visée en attente d'un choix : carré blanc qui pulse (1528-1535).
- Seules les flottes que je vois (`session.sees`, portée de détection) sont dessinées (1552).
- Coordonnées de ma planète mère dans `#my-coords`, ou « à choisir » (1537).

### 6.2 Toucher (`js/app.js:1573-1640`)

Le point touché est converti en cases (pixels CSS / taille d'une case). Puis, dans l'ordre :
1. **Une de mes flottes sous le doigt** (< 0,7 case, plus proche qu'une planète) → la sélectionner ; plusieurs flottes empilées : chaque toucher passe à la suivante (1592-1604). Si une flotte est déjà sélectionnée, seules celles de la case touchée comptent.
2. **Une flotte sélectionnée** :
   - une flotte ennemie sous le doigt → `prey`, la fiche propose « Attaquer » (1607-1615) ;
   - sinon la case touchée : `session.ordersAt` ; un seul ordre possible sans panne → `moveFleet` direct ; sinon `pending` = la case, et la fiche affiche un bouton par ordre (1617-1625, rendu 1674-1681).
3. **Sinon** : ma planète → vue planète (1633-1637) ; une autre planète → sa fiche (`selected`, 1638-1639) ; le vide → ferme la fiche.

État de la carte, variables de module (1208-1214) : `currentView`, `openKey` (« home » ou id d'une colonie), `mapFrame`, `selected`, `selFleet`, `pending`, `prey`.

### 6.3 Carte du replay

`js/replay-view.js:115-198` redessine une carte plus simple sur le même principe (fond, quadrillage, `drawSun`, planètes `planetsFor(gid)`, nom sous les planètes possédées, flottes en **losange**, décalées quand elles sont arrêtées).

## 7. Style

### 7.1 Variables CSS (`style.css:3-23`, retouchées en 546)

| Variable | Valeur | Usage |
|---|---|---|
| `--bg` | `#070a14` | fond (aussi `theme-color` des pages et du manifest) |
| `--panel`, `--panel-2` | `#0d1222`, `#131a2e` (après `style.css:546`) | cartes, boutons |
| `--line` | `rgba(150,170,230,0.12)` (après 546) | filets |
| `--text`, `--muted` | `#e8ebf7`, `#8d95b3` | texte, texte secondaire |
| `--accent`, `--accent-ink` | `#7aa2ff`, `#0a1024` | bouton principal, niveaux |
| `--minerals`, `--food`, `--energy`, `--pop` | `#b9c2d6`, `#7cf0b4`, `#ffd166`, `#ff9f6b` | couleur de chaque ressource (tuiles, chips, icônes) |
| `--ok`, `--warn`, `--danger` | `#7cf0b4`, `#ffb36b`, `#ff6b7a` | états |
| `--radius` | `0` | angles droits |
| `--mono`, `--sans` | polices système | les chiffres en chasse fixe (`.mono`) |
| `--race`, `--c` | posées en ligne par le JS | couleur de la race / de la ressource d'un élément |

Les couleurs du canvas sont écrites en dur dans le JS (`#05070f`, `#8d95b3`, `#ff7a93`, `#f5c96a`…), pas lues dans les variables.

### 7.2 Organisation de `style.css`

Le fichier est **en couches** : les sections de la fin redéfinissent celles du début, sans les supprimer. Pour savoir la règle finale, lire jusqu'au bout.
- 1-466 : base (boutons, champs, écrans, tuiles, cartes, fenêtres, scanner, toast, replay, onglets).
- 468-541 « Interface condensée » : une ligne par bâtiment, description repliée, tuiles serrées.
- 543-585 « Design épuré » : angles droits, aplats, filets fins, boutons transparents, icônes `.ic`, historique de l'accueil.
- 587-599 fond de galaxie ; 601-624 choix de la race en 3 icônes ; 626-680 en-tête de la planète, compteur de joueurs, marges réduites, en-têtes collants, barre de progression des cartes, suppression de la barre du haut.

### 7.3 Conventions

- **Angles droits partout** : `--radius: 0` et `border-radius: 0` sur chaque composant (`style.css:19, 54, 81, 133…`). Seuls les cercles du canvas restent ronds.
- **Une icône plutôt qu'un mot** : boutons `icon-only`, avec le sens dans `title` et `aria-label` (`js/icons.js:2`, ex. `index.html:59-60`).
- **Pas d'ombres** (`style.css:552-554`), boutons secondaires transparents, filet bleu au survol (547-550).
- `[hidden] { display: none !important; }` (26) : tout l'affichage/masquage passe par l'attribut `hidden`.
- Zones sûres des téléphones : `env(safe-area-inset-*)` partout (barre, fenêtres, scanner, toast).
- **En-têtes collants empilés** dans la vue planète : en-tête, gisements, stocks se collent au même endroit, le suivant recouvre le précédent ; les onglets se collent dessous. CSS `style.css:652-662`, calcul des `top` et masquage des blocs recouverts par `stackSticky` (`js/app.js:19-36`, `ResizeObserver` + `scroll`). Depuis que `.topbar` est masquée, sa hauteur vaut 0 dans ce calcul.
- `prefers-reduced-motion` : barres sans transition (`style.css:417-419`) et ciel immobile (`js/galaxy.js:64`).
- Accessibilité : rôles `dialog`/`tab`/`radio`, `aria-live` sur le toast et la fiche de race, navigation des onglets aux flèches, Échap ferme les fenêtres.

### 7.4 Icônes et fond

- **`js/icons.js`** : 31 tracés 24 × 24 (`PATHS`). `ic(nom)` renvoie un `<svg class="ic" aria-hidden="true">` pour le HTML généré ; `fillIcons()` remplace chaque `<i data-ic="nom"></i>` du HTML statique (appelé au tout début de `app.js`). Style `.ic` : trait 1,6, `stroke-linecap: square`, couleur du texte (`style.css:559`). Ajouter une icône = ajouter un tracé dans `PATHS`.
- **Ressources et races** (`js/game.js:31-52`) : `resIcon(r, nom)` (cristal, feuille, éclair, buste ; classe `.ri ri-<r>` colorée par la variable de la ressource) et `raceIcon(r)` (casque, robot, alien ; classe `.rci`). Contrairement à `ic`, elles sont nommées (`role="img"`, `<title>`) pour les lecteurs d'écran.
- **`js/sky.js`** : `drawSun(ctx, sun, cell)` ; disque en dégradé blanc → jaune → orange qui remplit son carré de `sun.size` cases, halo qui déborde (1,7 × le rayon). Position donnée par `sunFor(gid)` de `game.js` (voir `regles.md` pour l'effet du soleil sur le climat).
- **`js/galaxy.js`** : `startGalaxy()` crée `div.galaxy` (fixe, `z-index: -1`) avec 3 couches d'étoiles (260/90/28 étoiles pour 400 × 800 px, densité constante), dessinées une fois en canvas puis posées en image de fond répétée (tuile = taille de l'écran). Graine fixe (`rng`) : le même ciel à chaque ouverture. 45 % des étoiles suivent une bande diagonale (« Voie lactée »). Parallaxe : défilement, souris, et inclinaison du téléphone (`devicemotion`, position de repos qui s'adapte ; permission demandée au premier toucher sur iPhone). Redessiné 150 ms après un redimensionnement. Sous les couches, la nébuleuse est un dégradé CSS du `body` (`style.css:589-596`). Chargé seulement par `index.html`.
- **`icons/`** : favicon SVG et icônes PWA 192/512, cités par `index.html:11-12`, `manifest.json` et la liste de cache de `sw.js`.

### 7.5 `technologies.html`

Page autonome : son propre `<style>` (`technologies.html:9-137`) qui recopie les variables du jeu **dans leur ancienne version** (`--panel: #111729`, `--radius: 14px`, boutons arrondis). Elle n'a donc pas reçu le passage aux angles droits. Elle n'est pas dans la liste de cache de `sw.js` (`sw.js:5-34`) : hors ligne, elle ne marche que si elle a déjà été ouverte en ligne (signalé par code-reseau).

Rendu (`js/techtree.js`, la construction du graphe est décrite dans `regles.md`) :
- Onglets des races (`renderTabs` 36-41), race dans l'adresse (`#human`, `#machine`, `#alien`, 25 et 291-310), couleur de la race dans `--race` (283).
- `renderGraph` (122-161) : un `<svg>` ; bulles de 164 × 50 px (`W`, `H`, 30-34), coins carrés pour les bâtiments, arrondis pour les technologies, pilule pour les pouvoirs, pointillés pour les vaisseaux (CSS) ; flèches en courbes de Bézier, étiquette « niv. N » au milieu ; noms trop longs resserrés par `textLength`.
- `select` (258-279) : toucher une bulle (ou Entrée/Espace) met en avant elle, tous ses prérequis et ce qu'elle ouvre ; le reste est atténué. `renderPanel` (243-256) remplit la fiche de droite (`techPanel`, `shipPanel`, `buildingPanel`, `powerPanel`).
- Le graphe défile dans son cadre sur téléphone ; fiche sous le graphe en dessous de 1240 px (`technologies.html:133-136`).

## 8. `replay.html` et `js/replay-view.js`

Écran « film » de la partie sauvegardée ; le moteur de rejeu (`js/replay.js`) est décrit dans `regles.md`. Rien n'est écrit : ni sauvegarde ni partie en cours ne changent (`js/replay-view.js:3`).

- `load` (28-66) : `loadGame()` (la partie sélectionnée dans l'historique), titre = noms des joueurs, `replayable(st)` ; messages si la copie n'est pas à jour ou si le début du journal manque ; calcul `replay(st)` lancé après 30 ms pour laisser s'afficher « Calcul du replay… » ; signale un « replay approché » si la fin ne retombe pas sur la vraie partie.
- Index `film.at` : pour chaque image, où trouver la dernière fiche de chaque joueur (53-59). `frameAt` : recherche dichotomique (69-79).
- Contrôles : lecture/pause (264-271), vitesse 1 min/s, 10 min/s (défaut), 1 h/s (`replay.html:35-39`), curseur sur 0-1000 (273-276), événement précédent/suivant (278-288). Pendant la lecture, si rien ne bouge et que le prochain événement est loin, on y saute (`QUIET_S`, 244-262).
- `renderPlayers` (200-224) : planètes, vaisseaux, minéraux, score à l'instant affiché. `renderLog` (227-241) : les 40 dernières entrées jusqu'à cet instant, la plus récente en haut.

## 9. Vérification dans le navigateur (2026-10-29)

Serveur `python3 -m http.server 8765` à la racine du dépôt, navigateur intégré en taille téléphone (375 × 812). 11 captures prises pendant ce test (01 à 11), gardées hors du dépôt (non versionnées) ; « capture 05 » plus bas renvoie à l'une d'elles.

Vérifié : accueil avec historique ; création ; choix de race (fiche, bouton « Commencer la partie ») ; carte de choix de planète (bandeau, soleil, planètes grises, comètes) ; fiche d'une planète libre (places, climat, gisements, « S'installer · Lyra ») ; vue planète (en-tête, gisements, 4 stocks dont habitants, onglets, bâtiments) ; lancement d'une Mine et sa ligne de journal en console ; fenêtre Joueurs ; fenêtre d'invitation (QR, lien `#o2.…`) ; second onglet sur `127.0.0.1` : note « Invitation reçue », écran réponse (`a2.…`), connexion après « Coller une réponse » ; race Aliens avec onglet Pouvoirs ; la planète du premier joueur visible en couleur sur la carte du second ; classement à 2 joueurs (« 1 ms réseau local ») ; `replay.html` ; `technologies.html`.

Non vérifié : flottes (décollage, déplacement, combat), échanges, scanner (pas de caméra), partage natif, service worker, inclinaison du téléphone.

## 10. D'où viennent ces choix

Les demandes de Vincent derrière l'interface sont datées dans [journal.md](../historique/journal.md) et [decisions.md](../decisions.md). Repères :
- carte = écran principal, toucher sa planète ouvre les bâtiments (commit `40cdb51`) ; guide retiré de l'interface vers `GUIDE.md` (25/10, `8dfd5e2`) ; journal en console (D-014, D-017, D-018) ;
- 28/10 (`061744b`) : icônes SVG au lieu d'abréviations, interface « la plus condensée possible », onglets, fiche planète en fenêtre, invitation par une icône, bulle d'aide « ? » (D-052, D-055) ;
- 28/10 soir (`1eeb2c1`, 30 demandes) : angles droits, `js/icons.js`, fond de galaxie, race en 3 icônes, en-têtes collants empilés, onglet Pouvoirs des aliens, **barre du haut retirée** (seul le compteur de joueurs reste ; conséquence : le nom et la race du joueur ne sont plus affichés en jeu, question restée ouverte) (D-064 à D-075).

## 11. Écarts et pièges relevés

- `README.md:16-20` : libellés du test à deux onglets périmés (voir §2). `README.md:13` dit aussi `cd astra-p2p`, alors que le dossier du dépôt s'appelle `astra`.
- Placeholder `index.html:50` « …#o1.… ou o1.… » alors que les invitations produites commencent par `o2.` (vu au test).
- Note `js/app.js:1943` : « appuie sur « Rejoindre une partie » » alors que le bouton s'appelle « Rejoindre ».
- `.topbar` masquée (`style.css:671`) mais toujours remplie par `renderState` et utilisée par `stackSticky`.
- À 375 px de large, le compteur de joueurs passe à la ligne sous le nom de la planète (capture 05).
- `technologies.html` : style d'avant les angles droits, absente du cache hors ligne, aucun lien depuis le jeu.
- Deux onglets de la même origine partagent le `localStorage` : pour tester à deux, changer d'origine ou de profil.
- Un autre programme peut déjà écouter le port 8765 (une autre session) : le navigateur affiche alors une **autre version** du code. Vérifier avec `curl -s http://localhost:<port>/js/game.js` avant de conclure (piège rencontré le 2026-10-29, session `26f178b9`).

## 12. Rythme des parties : ce qui s'affiche (2026-10-29)

Ajouts de la session `26f178b9` (D-083 à D-096). Les règles sont dans [regles.md](regles.md) §4.1 et §19.

- **Bandeau de course** `#race` (`index.html`, sous `#lost`), rempli par `renderRace(now)` dans
  `renderLive` (chaque seconde) : avant le départ du froid « Le soleil s'éteint · dernier en vie
  gagne · n en vie » ; ensuite « Ta planète la plus exposée gèle dans m:ss · va vers le
  soleil » ; « Éliminé · encore n en vie » ; « Victoire ! » ou « X gagne. · partie finie ». Classe
  `hot` (bordure orange) à moins de 3 min du gel, quand on est éliminé ou qu'un autre a gagné.
  Caché pour une partie d'avant la course.
- **Carte** : `drawFrost` voile en bleu tout ce qui est hors du cercle de froid (remplissage
  `evenodd`) et trace le cercle en pointillés ; il s'arrête à l'heure de fin. Les planètes
  gelées sont dessinées presque effacées (opacité 0,15). En-tête « éliminé » au lieu de « à
  choisir » pour un joueur éliminé, et pas de bandeau « Choisis ta planète ».
- **Liste des joueurs** : un joueur éliminé affiche « éliminé » et passe en bas ; les points
  affichés sont `session.scoreOf(p)` (tout l'empire).
- **Flottes** : sur une planète adverse, deux boutons « Attaquer X (joueur) » et « Conquérir X ·
  défense ⚔ a ◇ c » (`ordersAt`). Une flotte en conquête est dessinée en rouge comme une attaque.
- **Bâtiments** : les bâtiments de défense de la race apparaissent dans la liste comme les autres.
  Carte dépliée (toucher le nom) : bouton « Déconstruire un niveau » (`data-demolish`), caché au
  niveau 0, désactivé pendant un chantier ; une confirmation (`confirm`) rappelle qu'on récupère la
  moitié du prix et la place. Pendant la déconstruction, le bouton du bâtiment affiche « −m:ss ».
- **Débits** : tous les « / min » (ressources, gisements, réseau des machines, naissances) et les
  vitesses « cases/min » (fiches de vaisseau, `technologies.html`) sont multipliés par `TEMPO`,
  pour rester des minutes réelles. Recharge des pouvoirs en secondes.
- Vérifié dans le navigateur intégré le 2026-10-29 : bandeau et compte à rebours, cercle qui se
  resserre et planètes qui s'effacent, gel de la planète puis « Victoire ! » (froid accéléré à la
  main), liste des bâtiments aliens avec épines et dôme, déconstruction (niveau 1 → 0, place
  libérée). **Pas vérifié** : les boutons d'attaque et de conquête à deux joueurs réels.
