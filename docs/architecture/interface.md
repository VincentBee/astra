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
| `js/spark.js` | Historique des mini-graphes des tuiles, une série par planète (D-340) : `ownHistory`, `addSample`, `sparkPath`. Fonctions pures, testées par `tests/spark.test.mjs`. |
| `js/galaxy.js` | `startGalaxy` : fond étoilé immobile, derrière toutes les vues du jeu (D-137). |
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
1. Onglet A : un nom → **Créer** → choisir la race → **Choisir cette race** → bandeau du départ (D-120) : **Inviter**.
2. Onglet A : bouton du compteur de joueurs (icône « users » + nombre) → **Inviter un joueur** → bouton **copier** (icône) sous le QR. Le lien a la forme `http://…/#o2.…`.
3. Onglet B : ouvrir ce lien. L'accueil dit « Invitation reçue… ». Un nom → **Rejoindre**. L'écran « Montre ta réponse » apparaît → bouton **copier** (code `a2.…`).
4. Onglet A : dans la fenêtre d'invitation, « Coller une réponse » → coller → **Valider**. Toast « Joueur connecté. ».
5. Onglet B passe à l'écran de race (bouton « Choisir cette race », la race de A affichée dessous).
6. Chacun touche **Je suis prêt** dans le bandeau : la partie part quand tous les joueurs en
   ligne le sont. Chacun a alors une flotte d'un seul colonisateur : toucher une planète libre →
   **Y envoyer mon colonisateur** ; à l'arrivée, elle devient la planète mère.

Vérifié le 2026-10-31 dans Chromium (390 × 844) : seul (prêt → départ → colonisateur envoyé →
planète mère fondée) et à deux avec deux contextes de navigateur et une vraie invitation
WebRTC (Alice prête attend Bob, qui choisit sa race puis se dit prêt ; même départ sur les deux
téléphones ; flottes de départ en [6:15] et [13:4]).

> Le pas à pas de `README.md:16-20` ne correspond plus aux libellés : « Créer une partie » est devenu « Créer », « Copier le lien » / « Copier la réponse » sont des boutons-icônes, « Il est à distance ? Colle la réponse reçue » est devenu « Coller une réponse », et l'invitation passe par le compteur de joueurs, pas par une icône « en haut à droite ».

**Déboguer.** `window.astra.session` donne la session en cours dans la console (`js/app.js:45`). Le journal partagé est aussi copié dans la console, chaque entrée une fois, `[Astra hh:mm:ss] texte` (`printLog`), lignes d'ordre de flotte cachées comprises (D-210 : voulu, pour le débogage) ; dans le jeu, c'est la fenêtre Journal qui le montre (D-110).

Les tests automatiques (`tests/*.test.mjs`) portent sur les règles et le réseau, pas sur l'interface : voir `regles.md` / `reseau.md`.

## 3. Écrans et fenêtres de `index.html`

Quatre **écrans** (`<section class="screen">`), un seul visible à la fois via `show(nom)` (`js/app.js:54-57`, met `hidden` sur les autres). Par-dessus, des **fenêtres** (`.sheet` : modale presque plein écran sur fond sombre, toutes au style du Journal, D-302) et quelques couches fixes.

### 3.1 Écrans

| Élément (`index.html`) | Ce qu'on y voit | Fonctions de `js/app.js` |
|---|---|---|
| `#screen-home` (19-38) | Titre, historique des parties (`#saved`/`#games`), champ Nom, **Créer**, **Rejoindre**, note `#home-note`, roue crantée des réglages (`.settings-btn`, D-114). | `showSaved` 153-172 (liste), clic sur la liste 174-190 (Reprendre → `Session.resume` ; Revoir → `replay.html` ; Oublier → `forgetGame`), `btn-create` 194-201, `btn-join` 203-206, `playerName` 89-100, `boot` 1935-1957. |
| `#screen-join` (41-67) | Étape 1 : scanner ou coller l'invitation. Étape 2 : QR de la réponse, copier/partager, statut, **Autre invitation** (`#btn-other-invite`, D-290 : arrête la tentative comme Retour et revient à l'étape 1). `#join-error`. | `startJoin` 212-219, `useOffer` 236-258, `onSessionChange` 263-283, scanner 226-232. |
| `#screen-race` (70-80) | 3 boutons de race (radiogroup), fiche de la race choisie, bouton **Choisir cette race** (mène à la carte et au bandeau du départ, D-120), ce qu'ont choisi les autres. | `showRace` 385-395, `updateRacePick` 398-410, `renderRaceOthers` 413-419, `btn-race` 428-432. |
| `#screen-game` (83-200) | La partie. Deux **vues** : la carte (`#view-universe`) ou une planète (`#view-planet`). | `startGame` 436-447, `stopGame` 449-455, `showView` 1217-1229. |

Détail de `#screen-game` :

| Élément | Rôle | Rendu |
|---|---|---|
| `.topbar` (84-95) | Ancienne barre du haut (nom, race). **Masquée** par `style.css:671` (`display: none`) ; ses champs sont encore remplis par `renderState` 753-762. | — |
| `#net` (91-93) | Compteur de joueurs en ligne (vert, orange si un lien > 250 ms). `showView` le **déplace** dans la première ligne de la vue affichée (`js/app.js:1223`). Ouvre `#sheet-players`. **Caché avant le départ** (`renderLobby` : `$('net').hidden = mapVeiled()`, D-310) : en préparation, le lobby liste les joueurs et invite. | `renderLive` 811-821, clic 319-322. |
| `#lost` (97-100) | Bandeau « Seul en ligne » + **Rejoindre** (rejoindre les autres par une nouvelle invitation). | `renderState` 762 (`session.alone`), `btn-rejoin` 286-289. |
| `#view-universe` (102-148) | Vue carte : `#pick` (bandeau du départ, D-120 : « Prépare-toi » / « Prêt · on attend … » avec les joueurs, prêts en vert, absents grisés, et les boutons **Je suis prêt** / **Plus prêt** / **Inviter** ; après le départ « Envoie ton colonisateur » et **Ma flotte** ; caché dès la planète mère fondée), `#trades` (offres d'échange), `.map-head` (coordonnées ; plus de bouton d'aide `?` depuis D-245), `canvas#map`, `#map-wrap` caché avant le départ (D-240, D-241 : tant que `session.startedAt` est nul, `mapVeiled()` cache la carte entière dans `renderLobby` et `drawMap`, et vide `mapPlanets()`). Les joueurs du bandeau (`#pick-who`) sont en liste, un par ligne (D-241). Pendant le lobby, `renderLobby` met la classe `lobby` sur `#screen-game` : l'en-tête passe en haut, `#pick` prend toute la hauteur de l'écran, la liste défile si besoin et les boutons sont en bas (D-242). Dans le bandeau, l'icône d'un bouton plein (**Je suis prêt**, **Ma flotte**) prend la couleur du texte (`.banner button.primary .ic`, D-240). | `drawMap` 1349-1538, `renderPick` 1876-1913, `renderTrades` 1777-1800. |
| `#sheet-planet` | Fiche de la planète touchée : nom, coordonnées, propriétaire, places, climat, gisements, **Y envoyer mon colonisateur** (`#btn-claim` : planète libre, pas un petit corps, tant que je n'ai pas de planète mère, D-120) ou **Voir la planète** (`#btn-open-planet`, D-138 ; avant : « Bâtiments »). Sur une de mes planètes, partie **Chantier** (`#pi-yard`, D-106) : vaisseaux recherchés (recherche au fil comprise), prix, « jusqu'à N », boutons ×1 / ×5 / ×N, et **Décoller**. Même logique que l'onglet de la planète (D-312) : chantier libre, fil vide (D-420) et stock suffisant → ×1 / ×5 / ×N lancent le lot ; sinon ils deviennent +1 / +5 / +N et l'ajoutent au fil (`data-mode="plan"`). Max à 0 (stock vide) reste grisé. Fil plein (12) : boutons grisés, titre « Fil plein (12 au plus) » ; la ligne d'état dit « N lots de vaisseaux au fil · fil plein (12 au plus) ». | `renderPick`, `renderPickYard`, écouteur de `#pi-ships`, `btn-pi-takeoff`, `btn-claim`, `btn-open-planet`, `closePlanetSheet`. |
| `#map-fleets` (sous `canvas#map`) | Mes planètes puis mes flottes en grille (2 colonnes sur téléphone). **Une case par planète** (D-115 ; cadre fin, sans bord gauche coloré depuis D-301) : nom, compte à rebours du chantier, sous le nom des **jauges de stock** sans chiffre (D-303 : une barre fine par ressource de la race puis les habitants, stock / plafond de l'entrepôt ou des logements ; `aria-label` en mots, « minéraux presque plein… »), une icône par type de vaisseau à quai avec son nombre, statut (« Chantier : +5 Frégate », « 7 à quai », « Aucun vaisseau à quai » ou « 🔒 » sans chantier naval) et deux boutons-icônes : **+** (Construire, si la planète a un chantier naval) ouvre `#sheet-planet` sur sa partie Chantier ; **Décoller** (icône `fleet`, s'il y a des vaisseaux à quai) ouvre directement le formulaire de décollage de cette planète. Toucher ailleurs sur la case ouvre la fiche de la planète. Une case par flotte : nom, compte à rebours, une icône par type de vaisseau avec son nombre, statut ; bord rouge si attaque/conquête/poursuite, grisée si à sec. Toucher = sélectionner la flotte (ouvre `#fleet-info`), retoucher = la relâcher (D-107, D-108). | `renderMapFleets`, appelé par `renderLive` ; le HTML n'est réécrit que si le contenu ou le statut change, les comptes à rebours (flotte, chantier), la largeur des jauges et leur `aria-label` (D-303) et `aria-pressed` sont mis à jour en place. Un seul écouteur de clic : `[data-mp-build]`, `[data-mp-go]`, `[data-planet]`, puis `[data-fleet]`. |
| `#fleet-info` (129-145) | Fiche de la flotte sélectionnée : vaisseaux, statut (avec la vitesse et, si la flotte mêle plusieurs types, le nom du plus lent : `speedText`), carburant, choix d'ordres (`#fi-choice`), mes flottes à côté (`#fi-beside`), joueurs à côté (`#fi-partners`), boutons Arrêter / Rentrer / Se poser / Plein / Passive-Agressive (`#btn-fi-stance`, icône d'attaque, pleine quand la flotte est agressive, cachée pour une flotte sans armes ; D-100) / Scinder / Fermer. Le statut finit par « · agressive » (`fleetStatus`). | `renderFleetInfo` 1643-1687, handlers 1689-1714. |
| `#view-planet` (150-199) | Vue planète : en-tête (retour, nom ; plus de climat depuis D-311), gisements `#soil-zone`, stocks `#resources` (chaque carte de ressource montre son coefficient de climat « ×1,10 » à côté de l'icône, `[data-clim]`, vert au-dessus de 1, orange en dessous, caché sans climat : D-221), onglets, puis les panneaux `data-pane`. Si la colonie affichée n'est plus à moi, la vue revient sur la planète mère avec le message « Tu as perdu ta colonie X : retour à ta planète mère. » (seulement si la vue planète est à l'écran ; D-350). | `renderPlanet` 869-988. |
| `.tabs` (163-168) | Onglets Bâtiments / Pouvoirs (aliens seulement) / Recherche (toute planète ; « 🔒 Il faut un labo » sans labo, technologie grisée si elle est en recherche sur une autre planète) / Flottes. | `showTab`, flèches clavier. Ouvrir une planète (`showView('planet')`) affiche toujours **Bâtiments** ; l'onglet n'est plus retenu entre deux visites ni dans `localStorage` (D-156). |
| `[data-pane=power]` `#powers-zone` (170-173) | Pouvoirs aliens. Chaque carte : coût, gain attendu de l'arrachement (`+80◆`, `liftGain`) et recharge (`↻ 72 s`, `secs(cooldown)`) ; description de la transe depuis `POWERS.trance.duration` (D-390). Le toast de `power()` vient de `usePower` (`toast`) : durée de la transe, gain de l'arrachement. | `buildStatic` 526-540, `renderPlanet` 1338-1356. |
| `[data-pane=build]` (175-178) | Bâtiments + compteur de places `#places`. | `buildStatic` 488-498, `renderPlanet` 942-964. |
| `[data-pane=research]` `#research-zone` (180-184) | Technologies. | `buildStatic` 500-510, `renderResearch` 1000-1036. |
| `[data-pane=fleet]` `#yard-zone` (186-190) | Chantier naval (×1, ×5). | `buildStatic` 512-524, `renderYard` 1043-1072. |
| `[data-pane=fleet]` `#fleet-zone` (192-198) | Vaisseaux à quai, **Décoller**, liste de mes flottes, joueurs sur la même case. | `renderFleets` 1075-1091, `renderPartners` 1727-1742. |

Les panneaux sont filtrés en CSS selon `#view-planet[data-tab]` (`style.css:463-466`), pas en JS.

### 3.2 Fenêtres (`.sheet`)

Toutes se ferment par leur croix (`.close-btn`), un toucher sur le fond sombre ou Échap (`js/app.js:689-698` : ces deux gestes cliquent la croix).

Style commun (D-302, celui du Journal, D-246) : une seule règle dans `style.css` (`.sheet`, `.sheet-panel`, `.sheet-head`) pour **toutes** les fenêtres, sans variante par fenêtre. `.sheet` fait `100dvh` (haut de l'écran visible, pas `inset: 0`, D-243), fond assombri, 12 px de marge ; le panneau est centré, prend toute la hauteur restante (`height: 100%`), 760 px de large au plus, bord de 1 px sur les quatre côtés ; son en-tête (titre, croix) est collé en haut (`position: sticky`) avec un trait dessous ; le contenu défile dans le panneau (`overscroll-behavior: contain`) et, tant qu'une fenêtre est ouverte, la page derrière ne défile pas (`body:has(.sheet:not([hidden])) { overflow: hidden; }`). Seuls l'espacement interne (`gap`) et le contenu changent d'une fenêtre à l'autre.

Échap ne ferme que la fenêtre du dessus (D-192, issue #72) : toutes les fenêtres ont le même
`z-index` (20, `.sheet` dans `style.css`), donc celle qui se voit devant est la **dernière visible
dans l'ordre du HTML** ; le gestionnaire la prend avec `findLast` (`js/app.js`, « Toutes les
fenêtres se ferment… »). Un deuxième Échap ferme la suivante. `tests/escape.test.mjs` vérifie ce
dont la règle a besoin : un seul `z-index` pour les fenêtres, une croix dans chacune, `findLast`
dans le gestionnaire. Si un jour une fenêtre reçoit son propre `z-index`, ou sort de l'ordre du
HTML, cette règle ne tient plus : il faudra une pile d'ouverture.

| Fenêtre | Ouverte par | Contenu / action | Code |
|---|---|---|---|
| `#sheet-players` (`index.html:203-216`) | `#net` (seulement après le départ, D-310 ; fermée par `renderLobby` tant que `mapVeiled()`) | Détail réseau, **Inviter un joueur**, classement (`#players`). | 319-327 ; liste `renderState` 765-779 ; lignes `renderLive` 835-865 (score, `style.order` pour trier sans redessiner, 864). |
| `#sheet-settings` | roue crantée (`[data-settings]` : accueil et `#btn-settings` dans la rangée du jeu) | Réglages de l'appareil : liste **Fond** (`#sky`, D-112). | branchement près de l'accueil dans `app.js` (D-114). |
| `#sheet-invite` (219-248) | **Inviter un joueur** | QR de l'invitation + copier/partager ; scanner ou coller la réponse. | `openInviteSheet` 297-312, `useAnswer` 341-363, fermeture → `session.cancelInvite()` 328-331. |
| `#sheet-fleet` (251-275) | **Décoller** (onglet Flottes) | Nombre de vaisseaux, cargaison, carburant ; calcule soutes, vitesse (et le vaisseau le plus lent, qui la fixe), réservoir, portée. | `openFleetSheet` 1147-1165, `updateFleetSheet` 1167-1180, `btn-fleet-go` 1185-1196. |
| `#sheet-move` (278-295) | « Donner » (`#fi-beside`) ou **Scinder** | Vaisseaux, cargaison, carburant à passer à une autre flotte ou à une nouvelle. La fenêtre garde l'identifiant de sa flotte (`moveSheet.from`) et n'agit que sur elle ; si cette flotte (ou celle qui reçoit) disparaît, elle se ferme avec « Cette flotte n'existe plus. » (`refreshMoveSheet`, appelé par `renderFleetInfo` ; D-350). | `openMoveSheet`, `refreshMoveSheet`, `btn-move-go` (~2836-2890). |
| `#sheet-trade` (298-315) | Bouton échange d'un joueur sur la même case | « Je donne » / « Je demande ». | `openTradeSheet` 1746-1757, `btn-trade-go` 1768-1774. |

### 3.3 Couches fixes

- `#scanner` (`index.html:412-417`) : caméra plein écran, `scan()` (`js/app.js:135-150`) appelle `scanQr` de `js/scanner.js` (voir `reseau.md`), **Annuler** abandonne via `AbortController`. Depuis D-250 (#42), Annuler marche à tout moment, même avant que la caméra soit prête : `scanQr` rejette aussitôt avec `AbortError`, le `finally` de `scan()` cache `#scanner`, et un flux de caméra arrivé après coup est éteint dès qu'il arrive. Un nouveau `scan()` annule celui qui serait encore ouvert.
- `#toast` : messages **à la file** (D-110), `toast(text, ms = 3200)` puis `nextToast()` : un à la fois, dans l'ordre ; 6 en attente au plus (les longs restent) ; un doublon de ce qui est affiché ou attend est ignoré ; d'autres attendent → au moins 2 s chacun. Appli cachée : ignoré. La session y écrit aussi via `session.ontoast` (« tu es éliminé » : 8 s).
- `#btn-journal` (à gauche de `#net`, déplacé avec lui par `showView`) et `#sheet-journal` (D-110) : `openJournal(away)` montre « Combats et planètes » (le carnet `session.journal`, du plus récent au plus ancien ; bord vert gagné, rouge perdu ; ligne « Tes pertes · Ses pertes · Butin / Pillé » ; fond plus clair = pas encore lu ; depuis D-122, `reportHtml(e)` ajoute la phrase « pourquoi » (`.j-why`) et un `<details class="j-report">` « Détail du combat » : ce qui a pesé (`.j-reasons`), deux tableaux des forces `.j-forces` — « Tes forces » et « Forces de … », avec feu et coque au départ ; colonnes Vaisseau, Nb, ⚔, ◇, Perdus ; défense « tient » ou « abattue » — et les passes (`.j-rounds`), textes de `js/report.js`), puis « Ce qui me concerne » (lignes du journal partagé qui contiennent mon nom, 20 au plus ; depuis D-210, une ligne d'ordre de flotte d'un autre joueur, marquée `{ pid, fleet }`, n'y est que tant que je vois sa flotte : `session.showsLog(l)`). Ouvrir marque tout lu (`session.markRead`). Pastille `#journal-count` = entrées non lues (mise à jour par `renderLive`).
- Résumé « Pendant ton absence » : `showAbsence(gone)` ouvre la même fenêtre limitée au neuf si l'absence dépasse `AWAY_MS` (2 min) et qu'il y a du neuf. Appelé à la reprise d'une partie (absence = depuis `savedAt`, neuf = non lu) et 1 s après le retour au premier plan (`visibilitychange` ; neuf = noté depuis qu'elle a été cachée). Bouton « Tout le journal ».
- Fond de galaxie : un `div.galaxy` inséré en tête de `<body>` par `startGalaxy()` (§7.4).

## 4. Le cycle de vie dans `app.js`

### 4.1 Démarrage (fin du fichier)

1. Au chargement du module : `fillIcons()` puis `startGalaxy()` (`js/app.js:16-17`), mise en place du collage des en-têtes (`stackSticky`, 22-36), restauration du nom (`astra.name`, 132-134) ; l'ancienne clé `astra.tab` (onglet retenu) est effacée, plus lue depuis D-156.
2. `showSaved()` puis `boot()` (1959-1960). `boot` lit `location.hash`, l'efface de l'adresse, et le décode avec `decode` (`js/invite.js`) :
   - invitation (`kind === 'o'`) : si un nom est déjà connu → `startJoin(hash)` ; sinon note sur l'accueil et le code est gardé dans `pendingInvite` (D-290, #69). Le premier appui sur **Rejoindre** le consomme (remis à `null`, note cachée) ; les appuis suivants ouvrent l'étape 1 normale, champ vide ;
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
| À chaque changement d'état (`session.onchange`) | `renderState` (753-783) | Identité, bandeau « Seul en ligne », liste des joueurs, copie du journal en console, puis `renderLive`. |
| Fiche reçue d'un autre joueur ou d'une IA (`onchange('state', 'record')`, D-370) | `renderState` sur la prochaine image (`requestAnimationFrame`, `stateFrame`) | Rendus groupés : au plus un par image, rien quand la page est cachée ; un rendu direct annule celui qui attend. `globalThis.astraStats.renders` les compte. |
| 5 fois par seconde | `renderLive` (805-866) | Réseau, planète ouverte (`renderPlanet`), bandeau de choix (`renderPick`), fiche de flotte, échanges, avertissement de version (`session.outdated`, 830-833), lignes du classement. |
| Chaque image (`requestAnimationFrame`) | `drawMap` (1349-1538) | La carte, seulement quand la vue carte est affichée (`showView` 1225-1227, `stopMap` 1231-1234). |

Conventions de rendu, à respecter pour ne pas casser le toucher :
- **Ne réécrire le HTML que s'il a changé** : `setHtml` (726-731) et le même motif avec `dataset.html` (`renderFleets` 1087-1090, `renderFleetInfo` 1683-1686, `renderPartners` 1738-1741, `renderTrades` 1792-1795, `renderBeside` 1821-1824). Commentaire explicite en 1788-1789 : redessiner sous le doigt ferait rater le toucher sur « Accepter ».
- **Éléments repérés par `data-*`** (`data-res`, `data-cost`, `data-build`, `data-tlevel`…), créés par `buildStatic` et mis à jour par les `render*`.
- **Délégation d'événements** : un seul écouteur par conteneur (`#buildings` 747-750, `#techs`, `#ships`, `#powers` 604-615, `#games`, `#races`, `#trades`, `#fi-choice`, `#fi-beside`…), qui lit le `data-*` du bouton touché.
- Carte de bâtiment : le nom est un bouton qui déplie la description (`cardHead` 547-548, écouteur global 551-556, CSS `.building.open` `style.css:512`). Barre de progression en bas de la carte pendant un chantier (`cardProgress` 991-997).
- Mini-graphes (« sparklines ») dans les tuiles : un relevé toutes les 5 s de la planète ouverte, 10 min gardées **par planète** dans `localStorage['astra.hist']` (`{ id: 'partie|joueur', p: { clé: { t, v } } }`, D-340). Logique pure dans `js/spark.js` (`ownHistory`, `addSample`, `sparkPath`) ; `sampleHistory` et `drawSparks` (`js/app.js`) lisent/écrivent localStorage et le SVG. Moins de 2 relevés pour la planète affichée : tracé vide (jamais la courbe d'une autre planète).

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
| Se dire prêt / plus prêt (D-120) | `btn-ready` | `ready(true / false)` puis `checkStart` |
| Envoyer le colonisateur de départ (D-120) | `btn-claim` (fiche de la planète), ou carte une fois la flotte choisie (`btn-pick-fleet`) | `moveFleet(id, case, 'colonize')` |
| Bâtiment / recherche / vaisseaux / pouvoir | 749, 610, 614, 606 | `build` (ou `planBuild`, voir §13), `research`, `buildShips`, `power` |
| Retirer un élément du fil de construction | `#plan` (× d'un élément) | `unplan` |
| Vaisseaux depuis la carte (D-106, D-115) | écouteur de `#pi-ships` (fiche ouverte en touchant la planète, ou par le bouton **+** de sa case sous la carte) | `buildShips(type, n, clé de la planète touchée)`, ou `planShips(type, n, clé)` quand le bouton est en mode « plan » (D-312) ; ×N / +N = `shipsAffordable` au moment du toucher |
| Décoller (onglet Flottes, fiche de la carte, ou case de la planète sous la carte, D-115) | `openFleetSheet(clé)`, `btn-fleet-go` | `takeOff(fleetKey, …)` (renvoie l'id de la flotte, sélectionnée ensuite) |
| Envoyer une flotte sur une case (toucher ou glisser, D-126) | `orderAt`, `actionsFor`, menu `#map-menu` | `ordersAt` (ordres possibles) puis `moveFleet` |
| Poursuivre une flotte ennemie | menu au doigt « Attaquer la flotte de … » (`actionsFor`) | `chaseFleet` |
| Arrêter / plein / rentrer / se poser | 1701-1708 | `stopFleet`, `refuelFleet`, `returnFleet`, `moveFleet(…, 'dock')` |
| Donner / fusionner / scinder | 1869, 1832 | `transferFleet`, `mergeFleets`, `splitFleet` |
| Fusionner avec une autre de mes flottes, ou la rejoindre pour fusionner (toucher sur la carte, D-159) | `actionsFor`, menu `#map-menu` | `mergeFleets`, `joinFleet` |
| Proposer / accepter / refuser un échange | 1770, 1806 | `proposeTrade`, `answerTrade` |

Lectures seules utilisées pour le rendu : `now`, `planets`, `planetsOf`, `planetOf`, `planetsAt`, `ownerAt`, `myFleet`, `fleetsBeside`, `eyes`, `sees`, `linkInfo`, `tradePartners`, `tradeHoldings`, `incomingOffers`, et les propriétés `state`, `me`, `status`, `myRace`, `links`, `peerCount`, `alone`, `outdated`, `failure`, `refusal`.

Retour de la session vers l'interface : seulement deux rappels, `session.onchange` et `session.ontoast` (`js/session.js:206-207`), branchés à chaque création de session (`js/app.js:186-187`, 198-199, 245-246).

## 6. La carte (`canvas#map`)

### 6.1 Dessin (`drawMap`, `js/app.js:1349-1538`)

- Canvas carré (`aspect-ratio: 1`, `style.css:356`), redimensionné à `largeur CSS × devicePixelRatio` (max 3). Une case = `largeur × zoom.z / UNIVERSE.w` pixels ; tout est dessiné sous `ctx.setTransform(1, 0, 0, 1, -zoom.x × case, -zoom.y × case)` (zoom, D-117, §6.4).
- L'image suivante est demandée **avant** de dessiner : une erreur ne fige pas la carte (1352-1353).
- Ordre des couches :
  1. fond `#05070f`, étoiles fixes tirées de `noise(x, y)` (bruit déterministe : mêmes étoiles partout, 1305-1308) et quadrillage très pâle (1365-1387) ;
  2. soleil : `drawSun(ctx, sunFor(gid), cell)` (`js/sky.js`) ;
  3. halo de détection de ma couleur, en un seul tracé pour que les zones superposées ne foncent pas (1394-1405) ;
  4. planètes (`mapPlanets()`, 1286-1299) : disque + anneau incliné ; libre = gris `#8d95b3` et anneau en pointillés, et pulsation pendant le choix de planète ; à moi ou touchée = cercle blanc ; nom du propriétaire au-dessus (tronqué à 8 caractères) ; joueur hors ligne = transparence. Astéroïdes (polygone irrégulier) et comètes (tête + queue opposée au soleil) : `drawSmallBody` (1314-1347) ;
  5. flottes (`fleetSpots`, 1546-1566) : triangle orienté ; en route, pointillés jusqu'à la destination ; à l'arrêt, posées en couronne autour du centre de la case ; rouge `#ff7a93` si attaque ou poursuite ; cercle blanc = ma flotte sélectionnée, cercle rouge = proie visée ; croix rouge au point de panne ; jauge de carburant sous mes flottes ; flotte à sec grisée ;
  6. case visée en attente d'un choix (menu au doigt ouvert) : carré blanc qui pulse ;
     losange d'autonomie de la flotte sélectionnée (`drawRange`) et visée d'une flotte traînée
     (`drawAim`) : voir §6.2 (D-126).
- Seules les flottes que je vois (`session.sees`, portée de détection) sont dessinées (1552).
- Planètes des autres (D-124) : `mapPlanets` passe par `session.knownOwner`. Jamais vue = dessinée
  libre ; planète mère hors de l'univers jamais vue = pas dessinée du tout ; vue autrefois =
  souvenir : couleur et nom de son propriétaire d'alors, pâles, anneau en pointillés, sans son
  état (`pl` nul). La fiche dit « vue il y a … , hors de portée » (`seenAgo`) et ne montre que ce
  que tout le monde sait de l'univers (gisements de départ, climat, places).
- Coordonnées de ma planète mère dans `#my-coords`, ou « à choisir » (1537).

### 6.2 Toucher et viser (D-126)

Le point touché est converti en cases par `toCells` : `zoom.x + pixels CSS / cellCss() − 0,5`
(le centre d'une case tombe sur ses coordonnées entières, comme les planètes et `fleetSpots`).
Un clic qui termine un glissé, un pincement ou une visée (`gesture.moved`) est ignoré.

**Aimant (`js/aim.js`, sans DOM, testé par `tests/aim.test.mjs`).** `mapItems()` liste tout ce
qu'on peut toucher : planètes (`type: 'planet'`), mes flottes (`'mine'`), flottes adverses vues
(`'foe'`). `underFinger` garde ceux à portée du doigt (`FINGER` = 18 px CSS, au moins
`MIN_REACH` = 0,6 case zoomé), du plus proche au plus loin ; `contenders` garde le premier et
ceux à moins de `GAP` = 12 px de lui. `readTap(items, at, px, sel, drag)` renvoie `empty`, `one`
(un objet) ou `many` (plusieurs à égalité). Sans flotte sélectionnée, les flottes adverses ne
comptent pas ; la flotte sélectionnée ne compte que seule sous le doigt ; une flotte lâchée
(`drag`) ne vise jamais une de mes flottes.

**Toucher (écouteur `click` de `#map`).** Menu ouvert → le toucher le ferme, rien d'autre. Puis :
1. `many` sans flotte sélectionnée → menu « Lequel ? » (une ligne par objet : « Flotte 2 ·
   3 vaisseaux », « Lyra · fiche ») ;
2. une de mes flottes sans flotte sélectionnée → la sélectionner (`selectFleet`) ; la flotte
   déjà sélectionnée → la relâcher ;
3. flotte sélectionnée → `orderAt` : les actions de chaque objet visé (`actionsFor` :
   `session.ordersAt` sur la planète ou la case vide, « Attaquer la flotte de … » sur une
   flotte adverse ; sur une autre de mes flottes (D-159) : « Fusionner avec Flotte N » si les
   deux sont arrêtées sur la même case (`mergeFleets`, l'autre passe dans la flotte
   sélectionnée), sinon « Rejoindre Flotte N et fusionner » (`joinFleet`, « · panne en
   route » si le carburant ne suffit pas), en premier et en couleur, puis « Choisir · Flotte
   N »). Le titre du menu est alors le nom de la flotte touchée. Un seul ordre sans
   panne vers une planète ou une case → `moveFleet` tout de suite ; sinon menu au doigt
   (ordre principal en premier, en couleur, puis « Fiche de … ») ;
4. sinon une planète → sa fiche (`selected`, `#sheet-planet`) ; le vide → ferme la fiche.

Autre façon de sélectionner : toucher la flotte dans la grille `#map-fleets` sous la carte
(D-107, D-108) ; la même grille commence par une case par planète à moi (D-115). Carte zoomée :
choisir une flotte dans la grille recentre la vue sur elle si elle est hors champ (`reveal`).

Flotte choisie qui disparaît en se fondant dans une autre (jonction, D-159) : `renderFleetInfo`
cherche la flotte qui l'a absorbée (`absorbed`) et la choisit à sa place.
Vérifié dans Chromium (390 × 844, clics de souris sur `index.html?view`) : Flotte 1 choisie,
toucher Flotte 2 et 3 posées ensemble → « Que viser ? » avec « Rejoindre Flotte 2 et fusionner /
Choisir · Flotte 2 / Rejoindre Flotte 3 et fusionner / Choisir · Flotte 3 » ; choisir la 1ʳᵉ →
fiche « Jonction → [13:17] ».

**Menu au doigt (`#map-menu`, dans `.map-wrap`).** `openMenu(at, items, …)` écrit les boutons
puis le place avec `menuPlace` (à droite du doigt s'il y a la place, sinon à gauche, jamais hors
de la carte). Il se ferme par sa croix, Échap, un toucher sur la carte ou hors d'elle, un
glissé, un pincement, la molette ou les boutons de zoom (il est posé sur un point de la carte
et ne suit pas la vue). La case visée pulse en blanc (`menu.cell`), la flotte adverse visée a
un cercle rouge (`menu.foe`).

**Glisser une flotte (`gesture.aim`).** `pointerdown` sur une de mes flottes (parmi les objets
à égalité sous le doigt ; la sélectionnée d'abord) arme la visée. Au-delà de 8 px, la vue ne
bouge pas : la flotte est sélectionnée, `drawAim` trace un trait jusqu'à la cible aimantée
(`aimRead`), l'entoure, et écrit l'ordre au-dessus du doigt (rouge si attaque ou panne en
route). `pointerup` → `dropFleet` : même règle que le toucher (`orderAt`), sauf lâchée sur
elle-même (rien). Un deuxième doigt annule la visée (pincement). Un glissé qui commence hors
de mes flottes déplace la vue (§6.4).

**Autonomie.** `drawRange` dessine, autour de la flotte sélectionnée (ou traînée), le losange
pointillé jaune des cases que son carburant atteint (`fuelAt / fleetBurn`, distance
|dx| + |dy|).

La fiche de la flotte (`#fleet-info`) est juste sous la carte, avant la grille `#map-fleets`
(avant D-126 elle était après, et ses boutons d'ordre `#fi-choice`, retirés, tombaient souvent
hors de l'écran).

État de la carte, variables de module : `currentView`, `openKey` (« home » ou id d'une
colonie), `mapFrame`, `selected` (planète dont la fiche est ouverte), `selFleet`, `menu`
(`{ at, items, title, cell, fleet, foe }`), et `gesture` (`pts`, `moved`, `aim`).

### 6.4 Zoom (D-117)

- État : `zoom = { z, x, y }` (`z` de 1 à `ZOOM_MAX` = 4, soit 20 à 5 cases de large ; `x`, `y` = coin haut-gauche de la partie vue, en cases). `clampZoom` garde la vue dans l'univers et met à jour les boutons. Le zoom n'est pas sauvegardé : chaque ouverture de l'appli repart de la carte entière.
- Gestes sur `canvas#map` (événements `pointer*`, `touch-action: none` déjà posé) : un doigt ou la souris **glisse** la vue (au-delà de 8 px, sinon c'est un toucher) ; deux doigts **pincent** (l'écart donne le zoom, le milieu suit les doigts) ; la **molette** zoome autour du curseur (`zoomAt` garde fixe le point visé).
- Boutons `.map-zoom` en haut à droite du canvas : `#btn-zoom-in` (+), `#btn-zoom-out` (−), `#btn-zoom-fit` (vue entière, caché à zoom 1) ; facteur 1,6 autour du centre de la vue.

### 6.3 Carte du replay

`js/replay-view.js:116-199` redessine une carte plus simple sur le même principe (fond, quadrillage, `drawSun`, planètes `planetsFor(gid)`, nom sous les planètes possédées, flottes en **losange**, décalées quand elles sont arrêtées).

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

- **`js/icons.js`** : 40 tracés (dont les 4 vaisseaux `cargo`, `fighter`, `heavy`, `colony`, D-108, la roue crantée `gear`, D-114, et `minus` et `fit` du zoom de la carte, D-117) 24 × 24 (`PATHS`). `ic(nom)` renvoie un `<svg class="ic" aria-hidden="true">` pour le HTML généré ; `fillIcons()` remplace chaque `<i data-ic="nom"></i>` du HTML statique (appelé au tout début de `app.js`). Style `.ic` : trait 1,6, `stroke-linecap: square`, couleur du texte (`style.css:559`). Ajouter une icône = ajouter un tracé dans `PATHS`.
- **Ressources et races** (`js/game.js:31-52`) : `resIcon(r, nom)` (cristal, feuille, éclair, buste ; classe `.ri ri-<r>` colorée par la variable de la ressource) et `raceIcon(r)` (casque, robot, alien ; classe `.rci`). Contrairement à `ic`, elles sont nommées (`role="img"`, `<title>`) pour les lecteurs d'écran.
- **`js/sky.js`** : `drawSun(ctx, sun, cell)` ; disque en dégradé blanc → jaune → orange qui remplit son carré de `sun.size` cases, halo qui déborde (1,7 × le rayon). Position donnée par `sunFor(gid)` de `game.js` (voir `regles.md` pour l'effet du soleil sur le climat).
- **`js/galaxy.js`** : `startGalaxy()` crée `div.galaxy` (fixe, `z-index: -1`) avec une seule image : 3 couches d'étoiles (260/90/28 étoiles pour 400 × 800 px, densité constante) dessinées ensemble dans un canvas de la taille de l'écran. Graine fixe (`rng`) : le même ciel à chaque ouverture. 45 % des étoiles suivent une bande diagonale (« Voie lactée »). Immobile (D-137) : plus de parallaxe, ni défilement, ni souris, ni accéléromètre. Redessiné 150 ms après un redimensionnement. Sous l'image, la nébuleuse est un dégradé CSS du `body`. Chargé seulement par `index.html`.
  - **Réglage « Fond »** (D-112, D-137) : `skyMode()` lit `localStorage['astra.sky']` (`fixe` par défaut, `aucun` ; l'ancien `anime` devient `fixe`) ; `setSkyMode(m)` le garde et refait le fond tout de suite (l'ancien fond et son écouteur sont retirés par un `AbortController`). La liste `#sky` (« Étoiles », « Sans étoiles ») est dans la fenêtre Réglages (`#sheet-settings`, D-114) ; `app.js` la remet sur `skyMode()` à chaque ouverture. `aucun` : pas de `div.galaxy`, seul le dégradé reste.
  - **Coût mesuré** le 2026-10-30 (Chrome, 390 × 844, densité 3, processeur × 4), avant D-137 : l'ancien fond animé = 3 calques de 2 × 2 écrans (≈ 142 Mo de surface, estimation), jusqu'à 180 écritures de style/s quand le téléphone bougeait ; le fond fixe, seul gardé = 1 image de 12 Mo, 38 ms de dessin, 0 ensuite ; aucun = 0.
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

- `load` (31-76) : `loadGame()` (la partie sélectionnée dans l'historique), titre = noms des joueurs, `replayable(st)` ; messages si la copie n'est pas à jour ou si le début du journal manque ; calcul `replay(st)` lancé après 30 ms pour laisser s'afficher « Calcul du replay… » ; signale un « replay approché » si la fin ne retombe pas sur la vraie partie.
- Index `film.at` : pour chaque image, où trouver la dernière fiche de chaque joueur (56-62). `frameAt` : recherche dichotomique (80-90).
- Contrôles : lecture/pause (`play`, `pause` 362-376, bouton 395-400), vitesse 1 min/s, 10 min/s (défaut), 1 h/s (`replay.html:35-39`), événement précédent/suivant (409-418 : on saute à l'événement, la lecture continue si elle tournait). Pendant la lecture, si rien ne bouge et que le prochain événement est loin, on y saute (`QUIET_S`, 346-360).
- Curseur du temps `#rp-time` (D-118) : un cran par minute de partie (`max` = durée en minutes, fixé par `load`), donc n'importe quelle minute, au doigt ou aux flèches du clavier ; « Début » et la durée totale (`#rp-length`) sous ses bouts ; la partie déjà vue en couleur (`--pct`, mis par `render`). Glisser pendant la lecture la met en pause (`scrub`, 378-385) ; lâcher la relance d'ici (`release`, 388-393, sur `change`, `pointerup`, `pointercancel`), sauf au bout de la partie. Style : `.rp-timeline`, piste de 4 px, pouce carré de 22 px (`style.css`, section Replay).
- Section « Points » (`replay.html`, `#rp-score`, D-103) : `drawScores` (232-300) dessine sur un canvas la courbe en escalier de chaque joueur (`film.scores` = `scoreSeries(frames, gid)`, `js/replay.js`), à sa couleur, graduée 0 / moitié / haut, avec un trait à l'instant affiché ; `#rp-score-legend` donne nom et points à cet instant, dans l'ordre d'arrivée. Toucher ou glisser sur la courbe déplace le replay, comme le curseur : pause pendant le glissé, reprise en lâchant (420-428). Adresse `replay.html#points` (lien du bandeau de fin) : `load` se place à la fin de la partie et fait défiler jusqu'à la courbe.
- `renderPlayers` (302-327) : planètes, vaisseaux, minéraux, points de l'empire à l'instant affiché (`ptsAt`, les mêmes que la courbe). `renderLog` (329-343) : les 40 dernières entrées jusqu'à cet instant, la plus récente en haut.

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

- **Bandeau de fin** `#race` (`index.html`, sous `#lost`), rempli par `renderRace()` dans
  `renderLive` : **caché pendant la partie et quand on est éliminé** (D-201 ; il disait avant
  « Ta planète la plus exposée gèle dans m:ss · va vers le soleil · n en vie », « Le soleil
  s'éteint… », « Éliminé… »). Il n'apparaît qu'en fin de partie : « Victoire ! », « X gagne. » ou,
  seul, « Perdu. » (D-142) · partie finie, suivi du bouton **Classement** (rouvre l'écran de fin,
  D-143, seul moyen de le rouvrir après l'avoir fermé) et du lien **Voir la courbe des points**
  (`replay.html#points`, D-104). Classe `hot` (bordure orange) quand un autre a gagné.
- **Carte** : `drawFrost` voile en bleu tout ce qui est hors du cercle de froid (remplissage
  `evenodd`) et trace le cercle en pointillés ; il s'arrête à l'heure de fin. Les planètes
  gelées sont dessinées presque effacées (opacité 0,15). En-tête « éliminé » au lieu de « à
  choisir » pour un joueur éliminé, et pas de bandeau « Choisis ta planète ».
- **Liste des joueurs** : un joueur éliminé affiche « éliminé » et passe en bas ; les points
  affichés sont `session.scoreOf(p)` (tout l'empire).
- **Flottes** : sur une planète adverse, deux boutons « Attaquer X (joueur) » et « Conquérir X »,
  suivis tous deux de « · défense ⚔ a ◇ c + N vaisseaux posés · victoire probable » (`ordersAt`,
  `assaultView`, D-160) ; issue « victoire probable », « victoire incertaine » ou « bataille
  perdue ». Hors de ma détection (D-190), le menu suit `knownOwner` comme la fiche : planète
  retenue → « Attaquer X (joueur) · hors de portée : défense inconnue », sans estimation ; jamais
  vue → les ordres d'une planète libre (« Coloniser », « Juste y aller »). Une flotte en conquête est dessinée en rouge comme une attaque.
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

## 13. Fil de construction (2026-10-30, D-105)

- `index.html` : `<ol id="plan" class="plan">` au-dessus de `#buildings`, caché quand le fil est
  vide (déplacé sous les onglets par D-158, voir plus bas).
- Bouton d'un bâtiment (`[data-build]`, `renderPlanet`) : `data-mode="now"` (icône ↑) quand le
  chantier est libre, le fil vide et le stock suffisant → `session.build` ; sinon
  `data-mode="plan"` (icône +) → `session.planBuild`. Le niveau affiché est celui du prochain
  ajout (chantier et fil compris), comme le prix. Désactivé si les places ne suffiront pas ou si
  le fil est plein, ou si le prix dépasse l'entrepôt de fin de fil (`tooBig(race,
  planAhead(s).levels, cost)`, #50, D-441) : la carte dit alors « il faut Entrepôt niv 1 » à la
  place de la durée (`.building .cost .neg`). La carte Entrepôt dit son plafond : « niv 0 · max
  1 000 » (D-442). Le compte à rebours du chantier passe dans l'étiquette de niveau
  (« niv 2 → 3 · 0:04 ») : le bouton reste libre pour ajouter.
- `renderPlan` : une ligne par élément, « 1. Mine niv 5 ≈ dans 0:07 → fini dans 0:09 » et un
  bouton × (`[data-unplan]` + `data-key` : la session refuse si le fil a bougé entre-temps). L'estimation (`planForecast`) est recalculée au plus une fois par
  seconde (cache sur l'heure de la fiche, le fil et les fins de files). La structure de la liste
  n'est réécrite que quand le fil change ; les heures sont mises à jour à part, pour que le ×
  ne soit pas remplacé sous le doigt toutes les secondes (bug vu pendant le test).
- Style : `.plan`, `.plan-item` (bloqué : `.blocked`, heure en orange), fin de `style.css`.
- **Fil d'attente mêlé (2026-11-02, D-158)** : `<section id="plan-zone">` (titre « Fil
  d'attente ») est sorti de l'onglet Bâtiments et posé juste sous les onglets, sans
  `data-pane` : visible sur tous les onglets, caché quand le fil est vide. `renderPlan`
  nomme chaque élément selon son chantier : « Mine niv 5 », icône recherche + « Agronomie
  niv 1 », icône flotte + « 5 × Cargo Hermès » ; le × porte `data-key = planId(item)`.
  - Recherche (`renderResearch(me, pl, s, now, ahead)`) : labo libre, aucune recherche au fil
    et stock suffisant → ↑ (`data-mode="now"`, `session.research`) ; sinon + (`data-mode="plan"`,
    `session.planResearch`), avec le niveau, le prix et les prérequis comptés fil compris
    (`ahead = planAhead(s)`). Le compte à rebours passe dans l'étiquette de niveau, comme pour
    les bâtiments.
  - Chantier naval (`renderYard(…, ahead)`) : ×1 / ×5 lancent le lot si le chantier naval est
    libre, sans vaisseaux au fil et le stock suffit ; sinon +1 / +5 ajoutent le lot au fil
    (`session.planShips`). Le verrou d'un vaisseau compte la recherche au fil.
  - Bâtiments : le bouton ne passe en + que si le chantier est occupé ou qu'un **bâtiment** est
    au fil (une recherche au fil ne l'empêche plus de lancer tout de suite).
    **Remplacé par D-420** : fil pas vide (quoi qu'il tienne), tous les boutons passent en +
    (« Ajouter … au fil ») ; ↑ et ×n seulement fil vide, chantier libre et stock suffisant.
  - Le chantier de la fiche de la carte (`data-pi-ship`) lance toujours directement, sans fil (remplacé par D-312, puis D-420).
  - Vérifié dans Chromium (`index.html?view`, partie à un joueur humain, fil : labo, Propulsion,
    5 cargos, centrale) : trois onglets, 360 et 320 px, pas de défilement horizontal.
- Mise en page d'une ligne (2026-11-02, D-157) : `.plan-item` est une grille à deux colonnes,
  nom en haut, heure dessous, × à droite sur les deux lignes ; `.plan` a
  `grid-template-columns: minmax(0, 1fr)`. Avant, l'heure tenait sur la même ligne sans pouvoir
  passer à la ligne et la page débordait (484 px de large sur un écran de 360). Vérifié dans
  Chromium à 360 et 320 px : plus de défilement horizontal.
- Vérifié dans le navigateur (vue mobile 375 × 812, 2026-10-30) : ajout de 3 bâtiments, lancement
  automatique de la mine à l'heure annoncée, retrait par ×, rattrapage après rechargement.

## 14. Alertes et diagnostic des planètes (2026-10-30, D-111)

- `renderAlerts(me, now)`, appelé par `renderLive`, calcule `planetAlerts` sur
  `session.livePlanets(me, now)` et range le résultat dans `alertsNow` (case « x:y » → planète et
  problèmes). `drawMap` ne fait que lire `alertsNow` (`drawAlertDot`) : pas de `stateAt` à chaque
  image.
- **Pastille** sur mes planètes (et astéroïdes, comètes) de la carte : rouge qui pulse si
  pénurie, orange si un stock vital baisse.
- **Toast** à l'apparition d'un problème (`alertsSeen` : clé planète + ressource + type, oubliée
  après 10 s d'absence). Les toasts passent à la file (D-110) : à la reprise, l'alerte et
  « Partie reprise. » s'affichent l'un après l'autre.
- **Bandeau** `#alert-line` (sous `#race`) : « Famine sur X · Panne d'énergie sur Y », pénuries
  seulement, caché sinon.
- **Icône** `#alerts-btn` (triangle `alert` de `js/icons.js`, nombre de problèmes) : grise si tout
  va bien, orange, rouge si pénurie. `showView` la range entre `#btn-journal` et `#net` (à droite de `.map-head`, ou
  dans `.planet-head`) et met `#alerts-panel` en fin de cette ligne (pleine largeur, `flex-wrap`).
  Sur la carte, la liste couvre toutes mes planètes et le nom de chacune ouvre sa vue
  (`[data-alert-go]`) ; sur une planète, seulement celle-ci. Temps « vide dans N min » arrondi à
  la minute, pour que la liste ne soit pas réécrite sous le doigt.
- Style : fin de `style.css` (`.alert-line`, `.alerts-btn`, `.alerts-panel`, `.alerts-list`).
- Vérifié dans le navigateur (375 × 812, 2026-10-30), humains, ferme à 0 et stock vidé à la
  main : toast « Famine sur Orion », bandeau, icône rouge « 1 », pastille, liste, toucher du nom →
  vue planète avec la seule liste de la planète ; ferme remise → bandeau caché, icône orange
  « Énergie en baisse · vide dans 2 min ». **Pas vérifié** : aliens et machines dans le
  navigateur (couverts par les tests), plusieurs colonies à la fois.

## 15. Départ commun et colonisateur (2026-10-31, D-120)

- `renderLobby(me)` (appelé par `renderPick`) remplit `#pick` : avant le départ, « Prépare-toi »
  ou « Prêt · on attend Bob », la liste des joueurs (`.pick-who`, race, nom, « prêt » / « pas
  prêt » / « choisit sa race » / « absent ») et les boutons ; après le départ, « Envoie ton
  colonisateur » et **Ma flotte** (sélectionne la flotte et la ramène dans la vue) ; partie
  partie sans m'être dit prêt : « La partie a commencé » et **Je suis prêt**.
- `myColonizer(me)` : ma flotte avec un colonisateur tant que je n'ai pas de planète mère. Les
  planètes libres clignotent sur la carte seulement dans ce cas.
- Dans la fenêtre Joueurs, un joueur sans planète est « pas encore prêt », « prêt », « en route
  vers sa planète… » ou « éliminé » ; l'en-tête de la carte dit « préparation » (D-244 ; avant : « avant le départ ») puis
  « à fonder » à la place des coordonnées.
- Le bouton de l'écran de race dit **Choisir cette race** (avant : « Commencer la partie » ou
  « Rejoindre la partie »).

## 16. Alerte de flotte ennemie (2026-10-30, D-133)

- `index.html` : `<button id="threat" class="banner threat">` juste sous `#race`, hors des onglets :
  visible sur la carte comme sur l'écran d'une planète. Un toucher appelle `showView('map')`.
- `renderThreat(now)` (`js/app.js`), appelé par `renderLive` (5 fois par seconde) : lit
  `session.threats(now)` et montre la menace en tête, texte écrit par `threatText`
  (`js/session.js`, partagé avec les scénarios de test, D-135) : « N vaisseaux de X sur P dans S s »,
  « … en orbite de P » (arrivée, combat pas encore réglé) ou « … en vue, à C cases de P » (ne
  vise rien), puis « +N autres ». Caché s'il n'y a rien, ou en partie finie.
- `Session.threats(now)` (`js/session.js`, à côté de `eyes`/`sees`) : flottes armées, adverses
  (joueur pas éliminé), visibles ; triées cible d'abord (par heure d'arrivée), puis distance.
- Carte (`drawMap`, boucle des flottes) : le nombre de vaisseaux en blanc, cerné de sombre, en
  haut à droite du triangle de chaque flotte adverse visible. Pas sur mes flottes (leur grille
  `#map-fleets` le montre déjà).
- Style : `.banner.threat` (fond rouge pâle, bord `--danger`), après `.banner.race.hot`.
- Vérifié dans le navigateur (vue 400 × 850, 2026-10-30) : un faux joueur ajouté par la console
  avec une flotte de 12 en route pour conquérir ma planète et une de 7 arrêtée à côté : compte à
  rebours qui descend, puis « en orbite », « +1 autre », chiffres 12 et 7 sur la carte. Pas
  vérifié à deux vrais téléphones.

## 17. Lecture seule pour les rapports de test (2026-11-01, D-140)

- `index.html?view` : `app.js` ne montre ni l'accueil ni l'historique, n'enregistre pas le
  service worker, ajoute `html.view-only` (`pointer-events: none` sur les écrans) et prévient la
  page parente (`{ astraViewReady: true }`).
- Message `{ astraView: { state, me, t, intel, selected, frost } }` (même origine seulement) →
  `showSnapshot` : nouvelle `Session` sur cet état, `now()` figé à `t`, `save`, `scheduleSave`,
  `start`, `tick` neutralisés, les autres joueurs dans `links` (connectés), réglages du froid
  appliqués, puis le même rendu qu'en jeu (`buildStatic`, `showView`, `renderState`, `renderLive`
  toutes les 200 ms) ; `selected` ouvre la fiche de la planète touchée. Une erreur est notée dans
  `body.dataset.viewError`.
- Bouton « Voir la planète » : `renderPick` lit `session.myPlanetAt(w)` (D-139).

## 18. Écran « Fin de partie » (2026-11-01, D-143)

- `#sheet-finish` (`index.html`, après la fenêtre Joueurs) : fenêtre `.sheet` au style commun
  (D-302 ; `.finish` ne règle plus que son contenu), titre « Fin de partie » avec l'icône `trophy`, la liste `#finish-board` (pas de ligne
  « X gagne. » : le bandeau `#race` le dit, D-145), le lien **Voir la courbe des points** (`replay.html#points`) et le bouton
  **Revoir la carte**.
- `showFinish(over, again)` (`js/app.js`) : appelé par `renderRace` quand la partie est finie ;
  ne s'ouvre qu'une fois par partie (`finishSeen` = « gid@heure de fin », en mémoire : un
  rechargement le remontre une fois). Le bouton **Classement** du bandeau `#race` le rouvre
  (délégation sur `#race`, `data-finish`). Croix, Échap, toucher du fond, **Revoir la carte**
  (qui revient aussi sur la carte) le ferment.
- Chaque ligne `.finish-row` : médaille `.medal` (carré avec la place ; `.gold`, `.silver`,
  `.bronze` aux trois premiers s'il y a un vainqueur), pastille de couleur, nom (« toi » pour
  moi), race · « éliminé » ou « en vie », points (`best`). Ma ligne : `.me` (bordure et trait
  bleus à gauche). Données : `finalBoard` (`js/finish.js`), testé dans `tests/finish.test.mjs`.
- Couleurs : `--gold` `#f5c542`, `--silver` `#c9d1e3`, `--bronze` `#d08a52` (`style.css`,
  `:root`).
- Ce que le test vérifie, posé sur la carte par `showMarks` dans `#view-marks` (dans
  `.map-wrap`, z-index 25 : par-dessus la fiche ; vidé à chaque image ; jamais en jeu) :
  - doigt (D-146) : chaque image remet le zoom à 1, sauf si elle porte `finger: { x, y, zoom, r,
    raw, text }` : alors zoom du test, centré sur le toucher, et `.view-finger` : cercle blanc en
    pointillés de rayon `r` cases, point au centre, texte au-dessus, petit cercle de rayon `raw`
    quand le minimum `MIN_REACH` joue ;
  - valeurs vérifiées (D-147) : `marks: [{ n, text, ok, x, y, pid, id }]` → `.view-mark`
    (anneau vert ou rouge, pastille au numéro `n` en haut à droite, texte en `title`) sur la case,
    ou sur la flotte là où `fleetSpots` la dessine ; sans case, rien sur la carte. Le texte est
    dans la légende du rapport (`tests/scenario.mjs`, liste numérotée à côté du téléphone).

## 19. Jouer contre l'IA (2026-11-02, D-154)

- Accueil (`index.html`) : bouton `#btn-solo` **Contre l'IA** (icône `bot`, `js/icons.js`),
  sous « Rejoindre ». `app.js` : `Session.create(nom)`, puis `addBot(session)` (`js/bot.js`),
  puis `startGame()` (choix de la race).
- Bandeau du départ (`#pick`) : bouton `#btn-pick-bot` **Ajouter une IA**, à côté d'« Inviter »,
  caché dès que la partie est partie ou à 8 joueurs (`renderLobby`). Un toucher ajoute une IA
  et le dit (« IA Orion rejoint la partie : elle joue sur ce téléphone. »).
- **Modifier une IA dans le lobby (D-399, D-400)** : chez l'hôte qui la fait jouer, et tant que
  la partie n'est pas partie, la ligne de l'IA dans `#pick-who` est un bouton (`data-bot`, bord
  pointillé, crayon ✎). Un toucher ouvre `#sheet-bot` (`openBotSheet`) : champ **Nom**
  (`#bot-name`, 16 caractères), les trois races en boutons radio (`#bot-races`, même dessin que
  le choix de race du joueur, sans la fiche détaillée), **Valider** (`renameBot` puis
  `setBotRace` ; nom vide → message « Le nom ne peut pas être vide : l'IA garde le sien. », rien
  ne change) et **Retirer de la partie** (`removeBot`, message « X quitte la partie. »). Les autres
  téléphones voient une ligne simple. Partie partie (ou IA disparue), `renderLobby` ferme la
  fenêtre. Les listes de joueurs (lobby, fenêtre Joueurs, choix de race, historique, rejeu)
  passent par `session.roster` : une IA retirée n'y est plus.
- Reprise depuis l'historique : `wakeBots(session)` juste après `Session.resume` (`app.js`).
- Fenêtre Joueurs : pour une IA, la ligne dit « IA sur ce téléphone » (`routeLabel('bot')`) au
  lieu de la latence.
- Vérifié dans Chromium (390 × 844) le 2026-11-02 : accueil, salon (« Vincent pas prêt · IA
  Véga prêt · IA Orion prêt »), départ, planètes des IA fondées en moins d'une minute, reprise
  avec les IA reliées. Seules erreurs de la console : les relais Nostr, injoignables dans le
  conteneur de test.

## 20. « Retour » pendant une partie en cours (2026-11-07, D-417)

- Partie **en cours** = `js/back.js` `playing` : `status === 'playing'`, partie partie
  (`startedAt`), pas finie (`over`), écran `#screen-game` affiché, hors lecture seule (`?view`).
  Le lobby (avant le départ), le choix de race et l'écran de fin n'en sont pas.
- `armBack` (`app.js`, appelé à chaque `renderLive`) pose **une** entrée d'historique « garde »
  (`history.pushState({ astraGuard: true })`) dès que la partie est en cours. Un retour (bouton
  ou geste d'Android, bouton précédent, geste d'iOS dans l'appli installée) la consomme :
  `popstate` → `backAction` (`js/back.js`) :
  - une fenêtre `.sheet` ouverte → celle du dessus se ferme (sa croix), la garde est reposée, pas
    de question. C'est `topSheet`, la même fonction qu'Échap (D-192) : un seul chemin de fermeture ;
  - sinon → fenêtre `#sheet-quit` « Quitter la partie en cours ? » (style commun des fenêtres,
    D-302) : **Rester** (ou la croix, le fond, Échap) repose la garde, un retour suivant redemande ;
    **Quitter la partie** fait `history.back()`, comme le retour d'avant (page précédente, ou
    l'appli se ferme). Rien avant la page (appli installée, onglet neuf) : au bout de 600 ms,
    `location.replace` ramène à l'accueil, la partie reste dans l'historique des parties.
  - Question affichée, la garde n'est pas reposée : un **2ᵉ retour** quitte, sans autre alerte.
  - Partie finie avec une garde restée : le retour la consomme sans rien montrer, le suivant
    quitte.
- `beforeunload` pendant une partie en cours (fermer l'onglet, recharger) : le navigateur pose
  sa propre question. Pas pendant « Quitter » ni quand `#sheet-quit` est ouverte. iOS ne la
  montre pas (non confirmé sur un vrai téléphone).
- Vérifié dans Chrome (390 × 844) par `tests/back-browser.mjs` (Playwright, hors
  `node --test`) ; la règle seule dans `tests/back.test.mjs`.
