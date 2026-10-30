# Règles du jeu : le moteur

> Décrit le code au commit `1eeb2c1`. Dates et heures en UTC.

Ce document explique le code qui fait les règles d'Astra : l'état d'une partie, le temps,
l'économie, les races, les technologies, les flottes, le combat, les échanges, les colonies,
le climat, le rejeu et les tests. Il s'adresse à un développeur (ou à Claude) qui arrive sur
le projet.

- Le détail **joueur** des races (stratégies, ordres de construction, pièges) est dans
  [GUIDE.md](../../GUIDE.md). Ici, on ne dit que ce qui les distingue dans le code.
- Le **pourquoi** du voyage spatial (choix validés, choix par défaut, lots) est dans
  [PLAN-VOYAGE.md](../../PLAN-VOYAGE.md).
- Le réseau, la synchronisation des fiches, `normalize`, la sauvegarde : voir
  [reseau.md](reseau.md). Les écrans, la page Technologies et le ciel : voir
  [interface.md](interface.md).

Toutes les références sont `fichier:ligne` au commit `1eeb2c1`.

## 1. Où sont les règles

| Fichier | Rôle | Pur ? |
|---|---|---|
| `js/game.js` | Races, bâtiments, économie, temps, constructions, pouvoirs aliens, univers (carte, soleil, climat, planètes, places), score | Oui : « fonctions pures, sans réseau ni DOM » (`js/game.js:1`) |
| `js/tech.js` | Technologies, vaisseaux, détection, bonus | Oui, données pures (`js/tech.js:1`) |
| `js/fleet.js` | Flottes : décollage, déplacement, carburant, transferts, poursuite, combat, pillage | Oui (`js/fleet.js:1`) |
| `js/trade.js` | Échanges entre joueurs : quantités, séquestre, issue d'une offre | Oui (`js/trade.js:1`) |
| `js/session.js` (partie « règles », l. 696-1771) | Applique les règles à la fiche du joueur : ordres, `tick()`, arrivées, combats contre planètes, rapports de dégâts, échanges, colonies | Non : c'est la classe `Session`, qui porte aussi le réseau |
| `js/replay.js` | Rejoue une partie à partir des journaux d'ordres | Utilise `Session` sans réseau |
| `js/techtree.js` | Page `technologies.html` : dessine le graphe à partir des données de `tech.js` et `game.js` | DOM (rendu détaillé : interface.md) |
| `js/galaxy.js` | Fond d'écran étoilé avec parallaxe, importé par `js/app.js:11`. **Ce n'est pas une règle du jeu** (détail : interface.md) | DOM |

Frontière avec la doc réseau : ici on décrit les méthodes de jeu de `Session`
(`addPlayer` … `fleetHit`, `js/session.js:696-1770`) et le journal d'ordres. La réception des
fiches (`mergeIn`, `recordOk`, `backdated`, `normalize`, `planetOk`, `cleanAmounts`) est dans
reseau.md.

## 2. Principe de base : chacun écrit sa fiche, tout se calcule depuis l'heure

- **Pas de tick partagé.** Une planète stocke son état à l'instant `at` (heure du
  téléphone, en ms). L'état à tout instant se recalcule à partir du temps écoulé
  (`js/game.js:4-7`).
- **Chaque joueur fait foi pour sa propre fiche.** Il applique ses ordres chez lui, puis
  envoie sa fiche aux autres ; personne n'écrit la fiche d'un autre (`js/session.js:5-10`).
  Conséquence partout dans les règles : quand j'inflige des pertes à un autre, je ne les écris
  pas chez lui. J'écris un **rapport** (`effects`) dans ma fiche, et son téléphone l'applique
  (section 9).
- **Les autres refont le même calcul pour afficher** ma planète (`stateAt`, sans la modifier).

## 3. Modèle de l'état

### 3.1 La partie (`state`)

`{ gid, key, players: {}, log: [] }` (`js/session.js:201`, créé en `js/session.js:219`).

- `gid` : identifiant de la partie. Il sert aussi de **graine** de la carte : toutes les
  planètes de l'univers en sont tirées (`planetsFor(gid)`, `js/session.js:741-744`).
- `players` : une fiche par joueur, indexée par son identifiant.
- `log` : journal lisible de la partie, 40 entrées au plus, texte coupé à 120 caractères
  (`pushLog`, `js/session.js:1779-1785`).

### 3.2 La fiche d'un joueur

Créée par `addPlayer` (`js/session.js:696-713`), complétée par `normalize`
(`js/session.js:90-135`, détail dans reseau.md).

| Champ | Sens | Source |
|---|---|---|
| `id`, `name`, `color`, `secretHash` | identité | `js/session.js:701-706` |
| `rank` | heure d'arrivée (ordre d'arrivée) | `js/session.js:704` |
| `actAt` | heure de la dernière modification (la plus récente gagne) | `js/session.js:712`, `touch` `js/session.js:586` |
| `v` | version du format (`FORMAT = 7`) | `js/session.js:41`, `js/session.js:587` |
| `race` | `human`, `machine` ou `alien`, choisie une seule fois | `chooseRace` `js/session.js:722-736` |
| `home`, `claimAt` | case de la planète mère, heure d'installation | `claimPlanet` `js/session.js:827-828` |
| `planet` | planète mère (3.3) | `js/session.js:829` |
| `colonies` | `{ idPlanèteUnivers: planète }` | `js/session.js:1631` |
| `fleets` | flottes sur la carte (3.4), 16 au plus | `MAX_FLEETS` `js/fleet.js:25` |
| `effects` | mes rapports de combat contre les autres, 300 au plus | `js/session.js:62`, `js/session.js:1170`, `js/session.js:1657` |
| `applied` | identifiants des rapports des autres déjà appliqués chez moi | `js/session.js:1713` |
| `engaged` | mes combats de flottes récents (20 au plus), pour ne pas compter deux fois un même combat | `js/session.js:1169`, `js/session.js:1758` |
| `raided` | `{ "pid:clé": heure }` : dernier pillage par planète | `js/session.js:1655` |
| `docked` | `{ idFlotte: cléPlanète }` : où s'est posée une flotte (60 au plus) | `js/session.js:1607-1609` |
| `offers`, `dropped`, `answers` | échanges (section 10) | `js/session.js:1275`, `1353`, `1323` |
| `orders` | journal d'ordres pour le rejeu, 1 500 entrées au plus | `MAX_ORDERS` `js/session.js:72`, `touch` `js/session.js:589-592` |

### 3.3 Une planète (mère ou colonie)

Créée par `newPlanet(race, now, world)` (`js/game.js:404-420`) :

| Champ | Sens |
|---|---|
| `race` | race du propriétaire |
| `stock` | `{ minerals, food, energy }` à l'instant `at` (départ : `RACES[race].start`) |
| `pop` | population (0 pour les machines) |
| `at` | heure (ms) à laquelle `stock`, `pop`, `reserve` sont vrais |
| `levels` | `{ bâtiment: niveau }`, départ : `buildings[k].start` |
| `queue` | chantier en cours `{ key, level, start, end }` ou `null` (`js/game.js:645`) |
| `plan` | fil de construction : noms de bâtiments qui attendent le chantier, 8 au plus (D-105) ; absent sur une planète d'avant |
| `research` | recherche en cours `{ key, level, start, end }` (`js/game.js:669`) |
| `yard` | lot de vaisseaux en cours `{ type, count, start, end }` (`js/game.js:688`) |
| `tech` | `{ technologie: niveau }` |
| `ships` | vaisseaux posés sur la planète `{ type: nombre }` |
| `powers` | `{ pouvoir: heure où il redevient prêt }` (aliens) |
| `trance` | heure de fin de la transe (aliens) |
| `nature`, `reserve` | gisements du sol : `nature[r] = { max, regen }`, `reserve[r]` = ce qu'il reste (copiés de la planète d'univers) |
| `climate` | `{ heat, energy, minerals, food }` (section 11) |
| `places`, `kind` | nombre de places, `planet` / `asteroid` / `comet` |
| `claimAt` | pour une colonie : heure de fondation (`js/session.js:1627`) |

Les champs `nature`, `climate`, `places` peuvent manquer sur une planète créée avant leur
apparition : le code les traite alors comme « sans limite » ou « ×1 » (`js/game.js:432`,
`js/game.js:447`, `js/game.js:977`).

### 3.4 Une flotte

Créée par `launch` (`js/fleet.js:114`) :
`{ id, ships, cargo: { minerals, food }, fuel, origin, from, to, depart, arrive, order }`,
plus `stranded` (panne, `js/fleet.js:150`) et `absorbed` (identifiants des flottes fusionnées
dedans, 40 au plus, `js/fleet.js:275`).

- La position tient dans un **segment daté** `from → to`, de `depart` à `arrive`. À l'arrêt,
  `from` et `to` sont la même case (`js/fleet.js:8-10`).
- `fuel` est le carburant **au départ du segment** ; le carburant à un instant se calcule
  (`fuelAt`, `js/fleet.js:73-77`).
- `order` : ce qui s'applique à l'arrivée : `dock`, `colonize`, `attack`, ou `chase`
  (poursuite) (`ORDERS`, `js/fleet.js:29-34`) ; `null` = simple déplacement.

### 3.5 Une entrée du journal d'ordres

`{ t, k, a?, ids?, s? }` (`js/session.js:132-133`, créée en `js/session.js:1877`) :
heure, nom de l'ordre (ou `tick`), arguments, identifiants tirés pendant l'ordre, et
`s = { pid: nombre d'entrées du journal de ce joueur que je connais }` quand ce nombre a changé
(`seenNews`, `js/session.js:1853-1864`).

### 3.6 Une planète de l'univers (carte)

`planetsFor(gid)` renvoie `[{ id, name, x, y, nature, reserve, kind, places, climate }]`
(`js/game.js:912-961`). Ces planètes ne sont **jamais transmises** : chaque téléphone les
recalcule depuis `gid` (`js/game.js:811-813`).

## 4. Le temps

### 4.1 Vitesse

`SPEED = 60 × TEMPO` (`js/game.js`), avec `TEMPO = 2.5` défini dans `js/tech.js` (le seul
module sans dépendance, pour éviter un import circulaire) et réexporté par `game.js` (D-083).
Une « heure » de jeu dure donc 24 s réelles. Toutes les productions des races sont exprimées
**par heure de jeu** ; l'interface les affiche par minute réelle en les multipliant par
`TEMPO`. Un pas de `ms` millisecondes vaut `h = ms / 3 600 000 × SPEED` heures de jeu
(`advance`).

`TEMPO` divise aussi toutes les durées écrites en millisecondes : construction
(`buildDuration`), recherche (`researchDuration`), vaisseaux (`shipDuration`), trajets
(`tripMs`, `MIN_TRIP` 2 s), recharge et durée des pouvoirs aliens (`POWERS`), délai entre deux
pillages (`RAID_COOLDOWN_MS`), et le pas d'intégration (2 h de jeu au plus, soit
`120 000 / TEMPO` ms). Les délais des échanges (`js/trade.js`) ne changent pas : ce sont des
temps de réponse humains.

### 4.2 Intégration par petits pas

L'économie n'a pas de formule fermée (la population grandit ou meurt selon les stocks) : on
l'intègre par pas (`js/game.js:13-15`).

- `steps` (`js/game.js:519-531`) : pas `dt = max(1 s, min(2 min, durée / 300))`. Donc
  des pas de 1 s sous 5 min, exactement 300 pas entre 5 min et 10 h, et des pas de 2 min
  réelles au-delà (une journée = 720 pas).
- `simulate` (`js/game.js:534-541`) coupe le calcul à la fin d'une transe : production
  doublée (`boost = 2`) jusque-là.
- `advance` (`js/game.js:483-511`) fait un pas : flux (`flows`), plafonds des entrepôts,
  population, gisements.

### 4.3 `stateAt` et `settle`

- `stateAt(planet, now)` (`js/game.js:551-584`) calcule l'état sans modifier la planète. Trois
  files peuvent finir entre-temps : chantier (`queue`), recherche (`research`), chantier naval
  (`yard`). On avance l'économie jusqu'à la première fin, on applique son effet (nouveau
  niveau, nouvelle techno, nouveaux vaisseaux), puis on continue (`js/game.js:566-579`). À
  égalité d'heure, l'ordre est celui du nom de la file (`js/game.js:569`). Le résultat contient
  aussi `prod`, le rythme actuel pour l'affichage (`js/game.js:582`).
- **Fil de construction** (`plan`, D-105) : à chaque tour de cette boucle, si le chantier est
  libre, qu'il reste une place et qu'un bâtiment attend en tête du fil, `stateAt` avance
  l'économie pas à pas (fonction `until`, les pas de `steps`) jusqu'à ce que le stock couvre son
  prix, au plus jusqu'au prochain événement. Trouvé : il paye, remplit `queue`, retire la tête
  du fil, et note `{ kind: 'start', … }` dans `done`. Le fil avance donc aussi pendant une
  absence. `planForecast(planet, now)` refait ce calcul 10 min puis 6 h plus loin pour estimer
  le début et la fin de chaque élément (affichage seulement).
- `settle(planet, now)` (`js/game.js:591-607`) écrit cet état dans la planète. Seul le
  propriétaire l'appelle. **Une heure qui recule est ignorée** : `now = max(now, planet.at)`,
  et une heure invalide (`NaN`) ne fait rien (`js/game.js:592-594`).
- Chaque ordre (`startBuild`, `startResearch`, `startShips`, `usePower`) commence par
  `settle`, puis repart de `planet.at`, pas de l'heure donnée (`js/game.js:637-638`).

### 4.4 La boucle `tick()` du joueur

`Session.start()` lance `tick()` toutes les 250 ms (`js/session.js:301`). `tick()`
(`js/session.js:1541-1587`) ne fait avancer **que ce qui m'appartient**, dans cet ordre :

1. `checkClaim()` : rendre une planète ou une colonie prise avant moi (section 12).
2. Pour chaque planète (la mère d'abord) : recopier les technologies de la mère dans les
   colonies, à partir de la fin de la recherche (`js/session.js:1554-1558`) ; puis `settle` si
   une file est terminée **ou si le fil de construction peut lancer le suivant** (D-105), et écrire au journal (`js/session.js:1559-1570`). **`tick()` ne fait
   donc pas avancer `planet.at` toutes les 250 ms** : la fiche garde son ancien `at` (et son
   ancien stock) jusqu'à la fin d'une file ou au prochain ordre ; l'affichage passe par
   `stateAt`.
3. `applyEffects` : appliquer les dégâts que les autres m'ont infligés, **avant** de faire agir
   mes flottes (`js/session.js:1572-1573`).
4. Mes flottes : poursuite (`pursue`) ou arrivée (`arrive`) (`js/session.js:1574-1578`).
5. Échanges : `settleOffers`, `refuseExpired`, `noticeOffers` (`js/session.js:1579-1581`).
6. Si quelque chose a changé : `touch` (date et diffuse ma fiche) et sauvegarde.

## 5. Économie et ressources

### 5.1 Trois ressources

`RES = ['minerals', 'food', 'energy']` (`js/game.js:21`). Minéraux et nourriture viennent
**du sol** (`SOIL`, `js/game.js:23`) : ils s'épuisent et se régénèrent. L'énergie ne vient pas
du sol.

### 5.2 Les flux (`flows`)

`flows(...)` (`js/game.js:443-478`) calcule, par heure de jeu :

1. `rates(levels, pop)` de la race donne production et consommation brutes (section 6).
2. Bonus : technologies (`techBonus`) multipliées par le climat de la planète
   (`js/game.js:446-448`). L'énergie produite est multipliée par ce bonus (`js/game.js:449`).
3. **Rendement énergie** `effE = min(1, (stock énergie + production × h) / besoin)`
   (`js/game.js:450-451`). En pénurie, il vaut la part du besoin couverte.
4. Nourriture voulue `food(effE) × bonus`, extraite du sol (`extract`), puis **rendement
   nourriture** `effF` de la même façon (`js/game.js:452-455`).
5. Minéraux voulus `mineralsBase + minerals(effE, effF, boost) × bonus`, extraits du sol. Le
   revenu de base sort aussi du sol (`js/game.js:456-458`).

Le revenu de base (`mineralsBase`) n'est pas multiplié par les bonus : seul le terme
`minerals(...)` l'est (`js/game.js:457`).

`extract` (`js/game.js:431-435`) : on obtient ce que veulent les bâtiments tant que le
gisement n'est pas vide ; ensuite pas plus que `réserve / h + regen`.

**Alertes** (D-111) : `planetAlerts(race, s)` (`js/game.js`, juste après `flows`) lit `s.prod`
d'un `stateAt`. Pour la nourriture et l'énergie que la race utilise (les machines : énergie
seule) : `short` si `effF` / `effE` < 1, sinon `deficit` si le solde est sous −0,5 par heure de
jeu, avec `left` = millisecondes réelles avant que le stock soit vide. Pénuries d'abord.
Tests : `tests/alerts.test.mjs`. L'affichage est dans [interface.md](interface.md) §14.

### 5.3 Un pas (`advance`)

- Stock : `stock + net × h`, jamais négatif. Un entrepôt plein ne déborde pas mais n'est pas
  vidé non plus (`js/game.js:489-495`). Ce qui ne rentre pas est perdu (`lost`).
- Population : `grow` de la race, jamais sous `pop.min` (`js/game.js:497-498`).
- Gisements : `réserve + regen × h − prélevé`, borné à `[0, max]`. On ne prélève que ce qui
  est entré dans l'entrepôt (`js/game.js:500-509`).

### 5.4 Entrepôts

`storageCap(level) = round(1000 × 1,7^niveau)`, le même plafond pour les trois ressources
(`js/game.js:77-84`).

### 5.5 Constructions

- Coût : `floor(base × factor^niveau)` en minéraux et en énergie (`upgradeCost`,
  `js/game.js:613-617`).
- Durée : `max(4, round((minéraux + énergie) / 25))` secondes (`buildDuration`,
  `js/game.js:620-622`). La race et les niveaux ne changent pas la durée.
- `startBuild` : race choisie, bâtiment connu, **un seul chantier à la fois**, une place
  libre (section 11.3), ressources suffisantes ; paye tout de suite.
- **Déconstruire** (`startDemolish`, `js/game.js` ; ordre `Session.demolish`, D-096) : enlève
  un niveau. Occupe le même chantier que les constructions, pendant **la moitié** du temps de
  construction de ce niveau ; rend **tout de suite la moitié** de son coût ; le niveau (et sa
  place) ne disparaît qu'à la fin du chantier. La file `queue` porte alors `demolish: true` ;
  `stateAt` applique `levels[key] = job.level` comme pour une construction (le niveau baisse).
- **Fil de construction** (D-105) : ordre `Session.planBuild(key, where)` (ajoute en fin de fil,
  8 au plus, refusé si les places bâties + le chantier + le fil atteignent `places`) et
  `Session.unplan(key, index, where)` (retire un élément, seulement si c'est bien `key` à cette place : le fil a pu avancer entre l'affichage et le toucher). Les deux font d'abord `settle`, pour que le
  fil parte de maintenant. Le lancement automatique est décrit en §4.3. Un élément sans place
  bloque le fil jusqu'à ce que le joueur le retire ou déconstruise.
- `covers` tolère 1e-9 d'écart d'arrondi (`js/game.js:624-626`).

### 5.6 Classement

- `score` = ressources investies dans les bâtiments d'**une** planète / 100, **sans les
  entrepôts**.
- `empireScore` (`js/game.js`) = `score` de **toutes** les planètes du joueur + ressources
  investies dans ses recherches + prix de ses vaisseaux, posés ou en vol, le tout / 100 (D-085).
  `Session.scoreOf(p)` l'appelle ; c'est lui que le classement affiche. Il départage les joueurs
  que le froid élimine en même temps (section 19).
- `power` = population × `R.power` : un humain vaut 1, un psionique 120, une machine 0
  (`js/game.js:766-769`, valeurs `js/game.js:109`, `211`, `293`).

## 6. Races

Les trois races sont dans `RACES` (`js/game.js:94-376`). Chacune a : nom, icône, couleur,
textes, `resources`, `start` (stock de départ), `pop` (`{ label, unit, start, min }` ou
`null`), `power`, `buildings` (`{ name, short, start, desc, base, factor }`), une fonction
`rates` et une fonction `grow`. Le détail joueur est dans [GUIDE.md](../../GUIDE.md).

Fonction utilitaire : `curve(a, L) = a × L × 1,1^L`, arrondie au millionième
(`js/game.js:54-57`). Le labo et le chantier naval consomment `curve(5, labo) + curve(5,
chantier)` d'énergie pour toutes les races (`space`, `js/game.js:92`).

### Humains (`js/game.js:95-195`)

- Départ : 200 minéraux, 80 nourriture, 40 énergie ; 8 habitants, minimum 3.
- **La population travaille** : `emplois = 10 × mine + 5 × ferme` ; `work = min(1, pop /
  emplois)` (`js/game.js:169-170`). Les mines produisent `curve(36, mine) × work × effE`, les
  fermes `curve(18, ferme) × (0,3 + 0,7 × work) × effE` (elles tournent à 30 % sans ouvriers).
- Revenu de base : `10 + 0,4 × pop` minéraux (impôt) (`js/game.js:180`).
- Mangent `0,6 × pop` nourriture par heure (`js/game.js:178`).
- Plafond : `15 + curve(20, habitat)` (`js/game.js:182`).
- `grow` (`js/game.js:187-194`) : croissance logistique (r = 0,12) si nourris ; en famine,
  `pop × e^(−0,4 × (1 − effF) × h)` ; au-dessus du plafond, redescente vers le plafond.

### Machines (`js/game.js:197-276`)

- Pas de population ni de nourriture : `pop: null`, `resources: ['minerals', 'energy']`,
  `grow: () => 0`.
- Les bâtiments **coûtent aussi de l'énergie** (`base.energy > 0`).
- Foreuses : `curve(32, foreuse) × effE` minéraux, mais consomment `curve(16, foreuse) ×
  0,88^nœud` d'énergie : chaque niveau de nœud de calcul retire 12 % (`js/game.js:266`).
- Revenu de base : 10 minéraux.

### Aliens (`js/game.js:278-375`)

- Départ : 2 psioniques, minimum 1. Plafond : `2 + sanctuaire` (`js/game.js:363`).
- **Pas de mines** : `25 × pop × amplification × boost × min(effE, effF)` minéraux
  (`js/game.js:362`), avec `amplification = 1 + 0,25 × amplificateur`.
- Chaque psionique consomme 7 énergie et 7 nourriture par heure (`js/game.js:357-359`).
- `grow` (`js/game.js:368-374`) : +0,12 psionique par heure si nourris et alimentés ;
  dépérissement sinon.
- **Pouvoirs** (`POWERS`, `js/game.js:381-395`), seulement pour les aliens
  (`js/game.js:721`) :
  - `lift` (arrachement) : recharge 3 min, coûte `30 × ceil(pop)` énergie, ajoute
    `40 × pop × amplification` minéraux, sans dépasser ce qui reste au sol ni la place de
    l'entrepôt (`liftGain`, `js/game.js:711-718`). Le minerai sort du gisement
    (`js/game.js:738`).
  - `trance` (transe) : recharge 6 min, dure 2 min, coûte `25 × ceil(pop)` énergie ; double
    l'extraction télékinésique jusqu'à `planet.trance` (`js/game.js:742`, `js/game.js:534-541`).
  - `usePower` (`js/game.js:720-744`) **refuse sans rien faire payer** quand le pouvoir ne
    rapporterait rien. L'arrachement est refusé si le sol est vide ou si l'entrepôt de
    minéraux est plein (`js/game.js:733`) ; la transe, seulement si le sol est vide
    (`js/game.js:732`). Une transe lancée avec un entrepôt plein est payée.

## 7. Technologies et leur graphe

### 7.1 Données (`TECHS`, `js/tech.js:15-201`)

Sept technologies par race. Chacune : `name`, `desc`, `max` (niveau maximum), `req`
(`{ lab: niveau, autreTechno: niveau }`), `base` (coût du niveau 1), et des effets :

- `bonus` : part ajoutée par niveau (0,1 = +10 %) à `minerals`, `food`, `energy`, `speed`,
  `attack` ou `hull` (`js/tech.js:9-11`). `techBonus` additionne : `1 + Σ bonus × niveau`
  (`js/tech.js:250-256`).
- `unlock` : `{ typeVaisseau: niveau }` débloque un vaisseau (`js/tech.js:11`).
- `range` : cases ajoutées à la portée de détection (`js/tech.js:12-13`).

Même forme pour les trois races : extraction, production, propulsion (débloque le cargo),
chasseur, vaisseau lourd (au niveau 2 de la techno), colonisateur (techno `max: 1`, labo 3) et
détection.

### 7.2 Règles de recherche

- **Sur toute planète qui a un labo** (D-098) : `Session.research(key, where)`
  (`js/session.js:1077`) lance la recherche sur la planète `where`, avec `startResearch`
  (`js/game.js:730`). Le labo **de cette planète** donne les prérequis (`techMissing`) et la
  durée ; son stock paie. Une recherche à la fois par planète, et pas la même technologie sur
  deux planètes à la fois (refus « déjà en recherche sur … »).
- Coût : `floor(base × 1,7^niveau)` (`techCost`, `js/tech.js:259-265`).
  Humains : surtout des minéraux, plus de la nourriture pour Agronomie et Arches coloniales
  (D-099). Machines : minéraux + énergie. Aliens : minéraux + nourriture.
- Durée : `max(8, round(total / (20 × (1 + 0,5 × (labo − 1)))))` secondes
  (`researchDuration`, `js/tech.js:268-271`).
- Les technologies valent pour toutes mes planètes : la planète mère tient la liste de
  l'empire, chaque colonie en garde une copie, remise à jour par `tick()` (`shareTech`,
  `js/session.js:1751`) et donnée à la fondation. Une recherche finie dans une colonie monte
  d'abord dans la planète mère, puis un second passage la donne aux autres colonies
  (`js/session.js:1766`).

### 7.3 Le graphe (`js/techtree.js`)

La page `technologies.html` ne contient aucune règle à elle : elle lit `TECHS`, `SHIPS`,
`POWERS`, `RACES` (`js/techtree.js:4-5`). `buildGraph` (`js/techtree.js:53-107`) en tire :

- des nœuds : bâtiments (`b:clé`), technologies, vaisseaux (`ship:type`), pouvoirs (`p:clé`,
  aliens seulement) ;
- des arêtes : `req` (techno à avoir avant), `unlock` (débloque un vaisseau), `bld` (labo vers
  les premières technos, chantier vers chaque vaisseau), `boost` (amplificateur vers les
  pouvoirs) (`js/techtree.js:49-51`, `js/techtree.js:63-82`) ;
- une mise en page en couches (profondeur = prérequis le plus profond + 1).

Les tableaux de coûts et durées de cette page appellent les mêmes fonctions que le jeu
(`upgradeCost`, `buildDuration`, `techCost`, `researchDuration`), donc ils restent justes si
on change l'équilibrage. Le rendu (SVG, panneaux, sélection) est décrit dans interface.md.

## 8. Vaisseaux et flottes

### 8.1 Vaisseaux (`SHIPS`, `js/tech.js:223-242`)

Quatre types par race : `cargo`, `colony`, `fighter`, `heavy` (ordre d'affichage
`SHIP_KEYS`, `js/tech.js:245`). Chacun : `attack`, `hull` (coque), `cargo` (soute), `speed`
(cases par minute), `burn` (carburant par case), `tank` (réservoir), `cost`.

- `shipStats` applique les bonus de vitesse, d'attaque et de coque (`js/tech.js:298-302`).
- Chantier naval : lot de 1 à 50, il faut un chantier, un seul lot à la fois, le vaisseau
  débloqué (`startShips`, `js/game.js:674-690`). Durée `max(6, round(coût total / (30 × (1 +
  0,5 × (chantier − 1)))))` secondes (`shipDuration`, `js/tech.js:305-309`).

### 8.2 Décoller (`launch`, `js/fleet.js:92-116`)

Retire de la planète les vaisseaux, la cargaison (minéraux, nourriture) et le carburant
(pris dans l'énergie du stock). Vérifie : nombres entiers, assez de vaisseaux, soutes et
réservoirs assez grands, stock suffisant. La flotte attend en orbite sur la case de la
planète. `Session.takeOff` ajoute la limite de 16 flottes (`js/session.js:976-998`).
`launch` met 0 carburant par défaut (`js/fleet.js:92`) ; c'est l'écran de décollage qui propose
le plein, dans la limite de l'énergie du stock (`js/app.js:1162`). Vincent a choisi de garder
ce plein par défaut (voir decisions.md ; `PLAN-VOYAGE.md` le range encore dans « Restent
ouverts »).

### 8.3 Se déplacer (`moveTo`, `js/fleet.js:134-152`)

- Vitesse de la flotte = celle de son vaisseau le plus lent (`fleetSpeed`,
  `js/fleet.js:42-46`), bonus de technologie compris. `slowestShip` (`js/fleet.js:48-57`) dit
  lequel ; un type à 0 exemplaire ne compte pas, une flotte vide a une vitesse 0 et ne bouge pas.
  Ajouter un seul vaisseau lent ralentit donc toute la flotte (D-101).
- Durée : `max(5 s, distance / vitesse × 1 min)` (`tripMs`, `js/fleet.js:80-85`).
- **Distance** : en nombre de pas, sans diagonale (Manhattan, `distance`,
  `js/game.js:782`). La position affichée, elle, est interpolée en ligne droite entre `from` et
  `to` (`fleetPos`, `js/fleet.js:119-122`).
- Carte : 20 × 20 cases (`UNIVERSE`, `js/game.js:779`) ; `moveFleet` refuse une case hors de
  la carte (`js/session.js:1009`).
- Chaque nouvel ordre ouvre un segment depuis là où est la flotte.
- `stopAt` : finit sa course sur la case la plus proche (`js/fleet.js:280-283`).
- `returnFleet` : se poser sur la planète de départ, ou la mère (`js/session.js:1510-1516`).

### 8.4 Carburant

- Une flotte brûle `Σ burn` par case parcourue et contient `Σ tank` (`js/fleet.js:56-67`).
- Le carburant baisse linéairement le long du segment (`fuelAt`, `js/fleet.js:73-77`).
- **Panne décidée à l'ordre** : si le réservoir ne suffit pas, le segment s'arrête tout de
  suite au point de panne, l'ordre tombe et `stranded = true` (`js/fleet.js:141-149`). Tous les
  téléphones voient la même panne sans rien calculer en route (`js/fleet.js:11-14`).
- Plein (`refuel`, `js/fleet.js:174-182`) : flotte arrêtée en orbite d'une de mes planètes,
  avec l'énergie de son stock, plein partiel si besoin. `parkedCell` arrondit la position : une
  flotte en panne à moins d'une demi-case de sa planète peut faire le plein
  (`js/fleet.js:191`, `js/session.js:1438`).
- En se posant, le carburant restant retourne au stock d'énergie (`js/session.js:1606`).

### 8.5 Entre mes flottes

Deux de mes flottes **arrêtées sur la même case** (`together`, `js/fleet.js:194-199`) peuvent :

- `transfer` : se passer vaisseaux, cargaison et carburant ; chacune garde au moins un
  vaisseau, et soutes et réservoirs doivent suffire (`js/fleet.js:212-248`) ;
- `split` : une flotte se scinde en deux (`js/fleet.js:254-258`) ;
- `merge` : `a` passe dans `b` ; `b` retient `a` dans `absorbed`, pour que les dégâts visant
  `a` l'atteignent quand même (`js/fleet.js:265-277`, `fleetOf` `js/session.js:1074-1077`).

Une flotte qui attend la réponse à un échange est **bloquée** (`locked`,
`js/session.js:1193-1197`).

### 8.6 Détection

- Portée de base : 3 cases autour d'une planète, 2 autour d'une flotte (`SIGHT`,
  `js/tech.js:204`), plus `range × niveau` des technologies de détection (`sightRange`,
  `js/tech.js:207-211`).
- `eyes` : un disque par planète et par flotte du joueur (`js/session.js:1057-1064`). `sees`
  mesure une distance **euclidienne** (`Math.hypot`, `js/session.js:1070`).
- C'est un **filtre d'affichage, pas un secret** : la copie de la partie contient tout
  (`js/session.js:1054-1055`). Il sert quand même de règle : on ne peut poursuivre qu'une flotte
  visible (`js/session.js:1088`), on perd la poursuite si la cible sort de vue
  (`js/session.js:1114-1119`), et on ne peut échanger qu'avec une flotte visible
  (`js/session.js:1228`).

## 9. Combat

### 9.1 Le calcul (`battle`, `js/fleet.js:370-409`)

- **Sans hasard** : les deux téléphones qui le calculent trouvent le même résultat.
- Jusqu'à 4 passes. À chaque passe, les deux camps tirent en même temps ; chaque camp inflige
  son attaque totale, répartie sur les vaisseaux adverses **au prorata de leur coque**. Les
  dégâts s'accumulent : un vaisseau tombe quand sa coque est entièrement entamée.
- Les effectifs sont ramenés à des entiers positifs (`js/fleet.js:373-374`).
- `won` : l'attaquant a des survivants, le défenseur aucun, et l'attaquant a des armes
  (`js/fleet.js:407`).
- Pas de ciblage : comme les tirs suivent la coque, les vaisseaux sans armes (cargos,
  colonisateurs) encaissent leur part des dégâts.
- Après 4 passes avec des survivants des deux côtés, chaque camp garde ses survivants. Le
  journal dit « Combat indécis » pour un combat de flottes (`js/session.js:1175-1176`), et
  « perd le combat » pour une attaque de planète non gagnée (`js/session.js:1662`).
- Le calcul est fait par le téléphone de l'attaquant, sur sa copie de la fiche du défenseur ;
  le défenseur ne décide rien. Pour un combat de flottes, la technologie du défenseur est celle
  de sa planète mère (`enemy.planet?.tech`, `js/session.js:1158`).

### 9.2 Attaquer une planète (ordre `attack`)

- Il faut une flotte armée. Deux ordres : `attack` (piller) et `conquer` (prendre la planète,
  D-092) ; `ordersAt` propose les deux sur une planète adverse, avec la défense affichée
  (« Conquérir Hadar · défense ⚔ 8 ◇ 80 + 3 vaisseaux posés · victoire probable »). Les vaisseaux
  posés ne sont comptés que dans ma détection (`seesCell`), sinon « ? ». L'estimation
  (`assaultView`, D-115) joue `battle` à l'heure présente avec ce que je vois : « bataille
  perdue » si perdu, « victoire incertaine » si gagné sans voir les vaisseaux ou en perdant plus de
  la moitié de la flotte, sinon « victoire probable ».
- À l'arrivée (`arrive`), le défenseur = **les vaisseaux posés sur la planète** à l'heure
  d'arrivée (`def.ships`) **et la défense de la planète** (`fortOf`, D-093, D-095), qui se bat
  comme un seul gros vaisseau (champ `fort` de `battle`, qui l'ajoute aux vaisseaux du camp et
  ne la compte pas dans les pertes). La défense est intacte à chaque assaut : il faut l'abattre
  en un seul combat de 4 passes. Les flottes en orbite ne défendent pas. On retire aussi les
  combats que son téléphone n'a pas encore lus
  (`defenseAt`, `js/session.js:1679-1691`). Sans ça, on pillerait le même stock et on tuerait
  les mêmes vaisseaux plusieurs fois.
- Victoire → pillage (`plunder`, `js/fleet.js:416-425`) : jusqu'à **la moitié** des minéraux
  et de la nourriture, dans la place libre des soutes des survivants.
- **Un seul pillage par planète toutes les 2 min, et par attaquant** (`RAID_COOLDOWN_MS`,
  `js/session.js:56`, `js/session.js:1650-1655`) : la mémoire `raided` est dans la fiche de
  l'attaquant, avec la clé `pid:planète`. Sans ça, des attaques en chaîne depuis l'orbite
  vidaient tout. Le combat a lieu quand même ; seul le butin est refusé.
- J'écris un rapport `{ id, to, key, at, ships: pertes, lost: mes pertes, take: butin }` dans mes
  `effects` (`lost` depuis D-110, pour le carnet du défenseur ; absent des anciens rapports).
- **Conquête** (`conquer` gagné, sur une case que le froid n'a pas prise) : le rapport porte en
  plus `capture: true` et `cell`. `Session.capture` crée tout de suite une colonie neuve de ma
  race sur la case (`newPlanet`, les bâtiments adverses sont perdus), avec les survivants, la
  cargaison, le butin et le carburant ; la flotte s'y pose. `ownerAt` ne compte plus l'ancien
  propriétaire dès que le rapport existe (même s'il ne l'a pas lu) ; `checkClaim` ne confond pas
  cette perte avec une installation simultanée. Le téléphone du perdant, en lisant le rapport
  (`applyEffects`, par la case et non la clé), appelle `losePlanet` (section 19).
- Pas de colonisateur pour conquérir : il ne sert qu'aux planètes libres (D-092 remplace D-091). Les vaisseaux perdus emportent leur cargaison (`applyLosses`,
  `js/fleet.js:334-359`).

### 9.3 Combat entre flottes (ordre `chase`)

- `chaseFleet` (`js/session.js:1080-1104`) : cible visible, flotte armée, pas de combat déjà
  livré en attente de rapport.
- `pursue` (`js/session.js:1111-1139`), à chaque `tick` : combat au contact (distance ≤
  `CONTACT = 0,5` case, `js/fleet.js:37`, `inContact` `js/fleet.js:312`) ; sinon nouveau cap
  vers le **point d'interception** (`intercept`, `js/fleet.js:298-309` : 240 instants testés sur
  le segment de la cible). C'est le téléphone du poursuivant qui calcule le combat
  (`js/fleet.js:291`).
- `fight` (`js/session.js:1157-1188`) : victoire → `salvage`, **toute** la cargaison de la
  flotte vaincue dans la place libre (`js/fleet.js:318-326`). Rapport avec `fleet`, `by`,
  `sim: true`, `ack` et `lost` (mes pertes, D-110).
- **Même combat livré des deux côtés** (poursuite mutuelle) : `engaged`, `ack` et `sim`
  servent à reconnaître que c'est le même combat, pour ne compter les pertes qu'une fois
  (`js/session.js:1160-1170`, `fleetHit` `js/session.js:1746-1770`). À plus de 30 min d'écart,
  ce n'est jamais le même combat (revanche) (`js/session.js:1754-1755`).

### 9.3 bis Comportement en voyage : passif ou agressif (D-100)

- Champ `stance` de la flotte : `'passive'` (défaut, `launch` et `split`) ou `'aggressive'`
  (`STANCES`, `aggressive`, `armed`, `js/fleet.js`). Sans champ : passive.
- `setFleetStance(id, stance)` (`js/session.js`, ordre noté au journal et rejoué) : refusé pour
  une flotte sans armes ; si une flotte ennemie est déjà au contact, le combat a lieu tout de
  suite.
- `engage` (`js/session.js`), à chaque `tick`, pour chaque flotte agressive qui ne poursuit pas :
  la flotte ennemie **visible** la plus proche **au contact** (`inContact`), sans combat en
  attente de rapport (`pendingFight`), est combattue par `fight(…, onward = true)` : mêmes
  calculs, butin et rapport que la poursuite, mais la flotte **garde son ordre et reprend son
  trajet** (`applyLosses`). Puis l'arrivée éventuelle (`arrive`).
- Deux flottes agressives qui se croisent livrent le même combat chacune de leur côté : comme
  pour la poursuite mutuelle, les pertes ne comptent qu'une fois (`sim`, `ack`, `engaged`).
- Une fois les rapports lus, si les deux flottes sont encore au contact, le combat recommence.
- **Rencontres que personne n'a regardées** (D-109) : un téléphone hors ligne ou en arrière-plan
  ne passe pas au bon moment. À chaque `tick`, `engage` et `pursue` cherchent aussi, depuis le
  passage précédent (`scanAt`, en mémoire ; au lancement, `actAt` de ma fiche), le premier instant
  où ma flotte **entre** au contact d'une flotte ennemie (`firstContact`, `js/fleet.js` : calcul
  exact sur les deux segments, distance sans diagonale). Si la cible était visible à cet instant,
  le combat a lieu **daté de la rencontre** (`fight(…, t)`), puis la flotte reprend sa route
  (agressive) ou s'arrête là (poursuite). Le passage suivant repart de ce combat, pour trouver une
  autre rencontre plus tard dans la même absence. La fenêtre est notée dans le journal d'ordres
  (`from` de l'entrée `tick`) : le rejeu cherche sur la même.
- Limites : un contact déjà en cours au début de la fenêtre ne compte pas (il a été vu) ; avant le
  départ du segment actuel d'une flotte, on ne sait pas où elle était (l'ancien segment est
  remplacé), donc une rencontre faite avant un changement de cap de la cible est perdue ; la
  vue à l'instant de la rencontre compte mes flottes à leur position de ce moment-là sur leur
  segment actuel.

### 9.4 Appliquer les dégâts reçus (`applyEffects`, `js/session.js:1697-1739`)

- Pour chaque rapport d'un autre qui me vise et que je n'ai pas encore appliqué : je le note
  dans `applied`, puis je retire vaisseaux et butin, de la flotte visée (`fleetHit`) ou de la
  planète.
- Une flotte posée entre-temps : sa planète encaisse (`docked`, `js/session.js:1716`). Une
  flotte qui vient de fonder une colonie : la colonie encaisse (`js/session.js:1632-1635`).
- Nettoyage : j'oublie mes rapports dès que leur cible les a appliqués ; j'oublie un
  identifiant appliqué quand son auteur a effacé le rapport (`js/session.js:1700-1705`,
  `js/session.js:1729-1737`).

### 9.5 Carnet de combats (`Session.note`, D-110)

- Chaque combat qui me concerne, vu de mon côté, s'inscrit dans `session.journal`
  `{ n, read, list }` (100 entrées) : attaquant dans `fight`, `arrive` (attaque) et `capture` ;
  défenseur dans `applyEffects` (planète attaquée ou prise) et `fleetHit` (flotte attaquée ou
  détruite ; rien si c'est le même combat que le mien, déjà noté). `losePlanet` y ajoute la planète
  perdue (prise, gel, élimination).
- Une entrée : `{ n, at, kind: 'combat' | 'planet', tone: 'good' | 'bad' | 'even', text, who,
  planet, capture, mine, theirs, loot, pillaged }` ; `mine`/`theirs` = vaisseaux perdus de chaque
  côté (`theirs` = `null` si le rapport n'a pas `lost`) ; `loot` = ce que j'ai pris, `pillaged` =
  ce qu'on m'a pris ; `at` = l'heure du combat (passée si calculée au retour, D-109).
- Gardé dans la sauvegarde du téléphone (`saveGame(me, state, journal)`), repris par
  `Session.resume` **avant** le rattrapage, et par `onWelcome` si c'est la même partie et le même
  joueur. Jamais dans la fiche ni le journal d'ordres : rien à rejouer, rien à fusionner.
  `markRead()` avance `read`. L'affichage est dans `interface.md`.

## 10. Échanges entre joueurs

Fonctions pures dans `js/trade.js`, application dans `js/session.js:1199-1428`.

- Une **partie** est `{ fleet }` (arrêtée) ou `{ planet }` ; le carburant d'une planète est
  l'énergie de son stock (`js/trade.js:21-22`). Ressources échangées : minéraux, nourriture,
  carburant (`TRADE_RES`, `js/trade.js:27`).
- Les deux parties doivent être **arrêtées sur la même case** (`js/session.js:1270`). Une
  planète ne peut échanger qu'avec une flotte (`js/session.js:1231-1234`).
- **Pas de retour arrière possible**, par construction (`js/trade.js:8-19`) :
  - ce qui est donné part **sous séquestre** dès la proposition (`take`,
    `js/session.js:1273`) ;
  - une offre ne s'annule pas : elle expire au bout de `OFFER_MS = 5 min`
    (`js/trade.js:28`) ;
  - une acceptation datée d'avant l'expiration vaut (`outcome`, `js/trade.js:118-123`).
- Le séquestre revient (`outcome = 'returned'`) si l'autre a refusé, si sa fiche prouve
  qu'il a joué plus de `GRACE_MS = 1 min` après l'expiration sans accepter, ou après
  `ABANDON_MS = 30 min` (`js/trade.js:29-30`, `js/trade.js:119-122`).
- Offre reprise sans réponse puis acceptée à temps quand même : `settleDropped` corrige sur
  la planète mère (`js/session.js:1368-1387`). Au-delà de 7 jours de silence, on abandonne
  (`js/session.js:1373`).
- Le destinataire refuse tout seul une offre expirée sans réponse (`refuseExpired`,
  `js/session.js:1406-1418`).
- Limites : 10 offres en attente (`MAX_OFFERS`, `js/trade.js:31`) ; 200 réponses gardées
  (`js/session.js:1399`).

## 11. Univers, soleil, climat, places

### 11.1 Carte et planètes

- Grille de 20 × 20 (`js/game.js:779`). `freeCell` tire une case à au moins `minGap` pas des
  autres, en relâchant l'écart si besoin (`js/game.js:788-805`).
- 14 planètes (`PLANET_COUNT`, `js/game.js:816`), plus des petits corps : 4 astéroïdes et
  3 comètes (`SMALL_BODIES`, `js/game.js:826-829`). Leurs gisements sont une fraction de ceux
  d'une planète (`share`).
- Gisements : `NATURE` (`js/game.js:855-858`) donne les bornes de `max` et `regen` par
  ressource du sol. Les planètes naissent pleines (`reserve = max`).

### 11.2 Soleil et climat

- Soleil : un carré de 2 × 2 à 4 × 4 au milieu de la carte (`sunFor`, `js/game.js:865-868`).
  Aucune planète dedans : une planète tirée dans le soleil est replacée
  (`js/game.js:929-939`).
- Climat (`climateAt`, `js/game.js:881-892`) : `heat` de 1 au bord du soleil à 0 dans le coin
  le plus loin (distance euclidienne). Facteurs : énergie `0,8 + 0,4 × heat`, minéraux
  `0,9 + 0,2 × heat`, nourriture `1,3 − 1,4 × |heat − 0,5|` (mieux en zone tempérée). Ces
  facteurs multiplient la production dans `flows` (`js/game.js:447-448`).
- Le climat est **copié dans la planète du joueur à l'installation** (`newPlanet`,
  `js/game.js:417`) : ensuite, la planète garde ces valeurs.
- L'interface nomme « Biomasse » le gisement de nourriture (`js/app.js:561`) ; dans le code des
  règles, c'est `food`.
- Noms : Brûlant ≥ 0,8, Chaud ≥ 0,6, Tempéré ≥ 0,4, Froid ≥ 0,2, Glacé (`climateName`,
  `js/game.js:895-901`).

### 11.3 Places

- Chaque niveau de bâtiment occupe une place (`usedPlaces`), **défenses comprises** (D-094).
  On peut déconstruire pour libérer une place (section 5.5). Une planète a
  de 14 à 22 places (`PLANET_PLACES`, `js/game.js:818`), un astéroïde 7 à 10, une comète 6 à 8.
- `startBuild` refuse quand il n'y a plus de place (`js/game.js:640`).
- **Les places viennent de la carte, pas de la fiche** : `Session.build` les recopie depuis
  la planète d'univers avant chaque construction (`js/session.js:905-908`).

## 12. Installation et colonies

- **Race** : choisie une fois, définitive (`chooseRace`, `js/session.js:722-736`).
- **Planète mère** : `claimPlanet` (`js/session.js:808-833`), seulement sur une planète libre
  de type `planet` (pas un petit corps).
- **Propriétaire d'une case** : le premier installé, d'après `claimAt` (ou `rank`), départagé
  par identifiant à égalité (`ownerAt`, `js/session.js:775-788`). Même résultat sur tous les
  téléphones.
- **Coloniser** : il faut un vaisseau colonisateur dans la flotte. La technologie de colonie
  demande le labo 2 (et non plus 3), coûte la moitié d'avant, et le colonisateur 0,6 fois son
  ancien prix (D-084). Une case déjà gelée ne se colonise pas. À
  l'arrivée (`js/session.js:1616-1640`), la colonie est créée avec la cargaison comme stock,
  le carburant restant comme énergie, les technologies de la mère, et les autres vaisseaux
  posés dessus ; le colonisateur est consommé.
- **Le premier arrivé l'emporte**, même si son téléphone passe après : la comparaison se fait
  à l'heure d'arrivée `f.arrive` (`takenBefore`, `js/session.js:794-799`).
- **Perdant** (choix simultanés, partie coupée en deux) : `checkClaim` rend la planète.
  Pour une colonie, `evacuate` remet vaisseaux (colonisateur compris), cargaison et carburant
  en orbite (`js/session.js:840-889`). Pour une planète mère, le joueur doit en choisir une
  autre (`js/session.js:853-862`).

## 13. Journal d'ordres et rejeu

### 13.1 Enregistrer

- Chaque méthode de `ORDER_KINDS` (17 ordres) et `tick` est enveloppée
  (`js/session.js:1871-1893`). L'enveloppe crée `this.entry = { t, k, a, s }`.
- Pendant un ordre, l'**heure est figée** : `now()` renvoie `entry.t` (`js/session.js:319-321`).
- Les identifiants tirés (flotte, offre, rapport) sont notés dans `entry.ids` (`newId`,
  `js/session.js:327-329`) ; au rejeu, ils sont relus dans `replayIds`.
- L'entrée rejoint le journal quand la fiche change (`touch`, `js/session.js:589-592`). Un
  ordre refusé est gardé aussi (`js/session.js:1882-1889`). Un `tick` n'est noté que s'il a
  changé quelque chose.

### 13.2 Rejouer (`js/replay.js`)

- `replayable(state)` (`js/replay.js:52-61`) : chaque journal doit commencer par
  `chooseRace` (sinon tronqué ou d'avant le journal), et aucune entrée ne doit citer une entrée
  d'un autre que cette copie n'a pas encore reçue (`stale`).
- `replay(state)` (`js/replay.js:75-149`) : une `Session` par joueur, sans réseau ni
  sauvegarde (`js/replay.js:91-94`). Les entrées sont rejouées dans l'ordre des heures ; avant
  chacune, le joueur retrouve les fiches des autres **telles qu'il les voyait** (grâce à `s`,
  `js/replay.js:112-122`). Lance « Journaux incohérents. » si deux journaux se citent en boucle
  (`js/replay.js:117`).
- `faithful[pid]` : la fiche rejouée est-elle celle de la vraie partie ? La comparaison
  (`comparable`/`stable`) trie les clés et arrondit les nombres à 10 chiffres, car deux
  navigateurs ne calculent pas les puissances et exponentielles au dernier chiffre près
  (`js/replay.js:24-46`).
- `playersAt(frames, i)` : les fiches de tous à l'image `i` (`js/replay.js:152-156`). L'écran
  qui montre le rejeu (`js/replay-view.js`) est décrit dans interface.md.

## 14. Déterminisme et garde-fous

### 14.1 Même résultat sur tous les téléphones

- Hasard **reproductible** : `seeded(texte)` (hachage FNV puis mulberry32,
  `js/game.js:839-848`). Chaque tirage a sa propre graine : `gid`, `gid/soleil`,
  `gid/hors-soleil`, `gid/taille`, `gid/petits-corps`. Ajouter un tirage ne déplace pas les
  planètes des parties déjà commencées (`js/game.js:929-931`, `js/game.js:940-941`).
- Mélange de Fisher-Yates plutôt qu'un tri à comparateur aléatoire, qui dépend du moteur
  JavaScript (`js/game.js:914-915`).
- `curve` arrondi au millionième (`js/game.js:54-57`).
- Combat sans hasard (`js/fleet.js:362`) ; panne décidée à l'ordre (`js/fleet.js:11-14`).
- Rejeu : heure figée et identifiants rejoués (section 13).

### 14.2 Contre l'heure du téléphone

- `settle` ne recule jamais (`js/game.js:592-594`).
- Les ordres repartent de `planet.at` (`js/game.js:638`, `658`, `680`, `725`).
- `moving` : un segment immobile n'est jamais « en route », même figé dans le futur proche par
  un téléphone en avance (`js/fleet.js:125-127`).
- La datation et l'acceptation des fiches venues d'ailleurs (fiche datée loin dans le futur) :
  voir reseau.md.

### 14.3 Contre les fiches abîmées ou trafiquées

- `own(table, clé)` : seulement les vraies entrées d'une table, pas `constructor` ou
  `__proto__` (`js/game.js:60-61`), utilisé pour bâtiments, technos, vaisseaux, pouvoirs.
- Combat : effectifs ramenés à des entiers positifs (`js/fleet.js:373-374`).
- Places lues sur la carte (`js/session.js:905-908`).
- Ne pas compter deux fois : `defenseAt`, `pendingFight`, `engaged`/`ack`, `applied`,
  `RAID_COOLDOWN_MS`.
- `normalize`, `planetOk`, `cleanAmounts` (formes et bornes des fiches reçues) : reseau.md.

## 15. Constantes d'équilibrage : où les changer

| Quoi | Où | Valeur |
|---|---|---|
| Vitesse du jeu | `TEMPO`, `js/tech.js` ; `SPEED = 60 × TEMPO`, `js/game.js` | 2,5 (1 heure de jeu = 24 s) |
| Fin de partie (froid) | `FROST`, `js/game.js` | départ 12 min, durée 24 min, `ease` 2 |
| Défense des planètes | `fortOf` et `buildings[k].defense`, `js/game.js` | ordinaire ⚔ 2 ◇ 20 par niveau ; défenses : section 19 |
| Stocks et population de départ | `RACES[r].start`, `.pop`, `js/game.js:107-108`, `209-210`, `291-292` | voir code |
| Coût des bâtiments | `buildings[k].base`, `.factor` | ex. Mine 60 × 1,5^niv |
| Production et consommation | `rates`, `js/game.js:168-185`, `262-274`, `352-366` | coefficients de `curve` |
| Croissance | `grow`, `js/game.js:187-194`, `368-374` | r = 0,12, famine 0,4… |
| Pouvoirs aliens | `POWERS`, `js/game.js:381-395`, `LIFT_PER_PSI` `js/game.js:711` | 40 par psionique |
| Entrepôts | `storageCap`, `js/game.js:78` | 1 000 × 1,7^niv |
| Durée de construction | `buildDuration`, `js/game.js:621` | (coût)/25 s, min 4 s |
| Technologies | `TECHS`, `js/tech.js:15` ; `techCost` ×1,7 (`js/tech.js:261`) ; `researchDuration` /20 (`js/tech.js:270`) | |
| Vaisseaux | `SHIPS`, `js/tech.js:223` ; `shipDuration` /30 (`js/tech.js:308`) | |
| Détection | `SIGHT`, `js/tech.js:204` | planète 3, flotte 2 |
| Flottes | `MAX_FLEETS` 16, `MIN_TRIP` 5 s, `CONTACT` 0,5 (`js/fleet.js:25-37`) | |
| Combat | 4 passes (`js/fleet.js:394`) ; pillage la moitié (`js/fleet.js:420`) ; `RAID_COOLDOWN_MS` 2 min (`js/session.js:56`) | |
| Échanges | `OFFER_MS` 5 min, `GRACE_MS` 1 min, `ABANDON_MS` 30 min, `MAX_OFFERS` 10 (`js/trade.js:28-31`) | |
| Carte | `UNIVERSE` 20 × 20, `PLANET_COUNT` 14, `PLANET_PLACES` 14-22, `SMALL_BODIES`, `NATURE` (`js/game.js:779-858`) | |
| Climat | `climateAt`, `js/game.js:888-890` | |
| Mémoire des fiches | `MAX_ORDERS` 1 500, `MAX_EFFECTS` 300 (`js/session.js:62-72`) | |

Après un changement, la page `technologies.html` se met à jour toute seule (section 7.3).
`GUIDE.md` et `README.md` contiennent des chiffres écrits à la main : à relire.

## 16. Tests

Ils tournent dans Node, sans navigateur. Le harnais (`tests/harness.mjs`) et
`tests/hostile.test.mjs` sont détaillés dans reseau.md ; en bref, `tests/harness.mjs` remplace `localStorage` et
`document` (`tests/harness.mjs:4-8`) et fournit `newGame(n)` : `n` joueurs (`p0`, `p1`…) sur
une **horloge commune**, chacun installé sur sa planète, et `sync(a, b)` qui donne à `a` la
fiche de `b` (`tests/harness.mjs:20-35`).

### Commandes

```bash
node --test tests/*.test.mjs
```

Résultat le 2026-10-30 (Node v24.14.1), avec la recherche en colonie (D-098) et le comportement en voyage (D-100) : `tests 125, pass 125, fail 0` (12 fichiers, dont les `decisions-*.test.mjs` de D-082). Le harnais
coupe le froid (`FROST.delayMs = Infinity`) : les parties de test ne finissent pas d'elles-mêmes ;
`tests/end.test.mjs` le rallume test par test.

Avant le tempo (au commit `1eeb2c1`) : `tests 35, pass 35, fail 0`. Cette commande inclut
`tests/peer.test.mjs` (réseau, voir reseau.md).

```bash
node --test tests/colony.test.mjs tests/combat.test.mjs tests/effects.test.mjs tests/fleet.test.mjs tests/hostile.test.mjs tests/replay.test.mjs tests/rules.test.mjs
```

Résultat : `tests 34, pass 34, fail 0`, environ 5,6 s (le rejeu d'une partie de robots prend
à lui seul environ 4,3 s).

### Ce que couvre chaque fichier

| Fichier | Tests | Ce qui est vérifié |
|---|---|---|
| `tests/end.test.mjs` | 13 | Score de tout l'empire ; le froid prend d'abord le bord ; planète mère gelée remplacée par la colonie la plus vieille, puis élimination ; à deux, le dernier en vie gagne même si l'autre est hors ligne, la fin se propage et bloque les ordres ; défense par race (`fortOf`) ; conquête qui élimine ; tourelles qui repoussent 3 frégates sans pillage ; colonisateur seul ou ordre « attaquer » ne prennent rien ; partie d'avant la course sans froid ; « Attaquer » et « Conquérir » : vaisseaux posés, « ? » hors détection, estimation du combat |
| `tests/rules.test.mjs` | 11 | Déconstruire (moitié du prix rendue, place libérée à la fin) ; heure qui recule puis revient : pas de double production ; longue absence ≈ passages toutes les heures (population à moins de 2 %) ; arrachement refusé sans payer ; clés héritées (`constructor`, `__proto__`) refusées ; effectifs négatifs ou fractionnaires au combat ; soleil au centre et sans planète ; climat et production ; une place par niveau ; places lues sur la carte ; une colonie humaine sur le plus petit corps garde des places |
| `tests/combat.test.mjs` | 4 | Attaques contre une planète : pas de butin créé avec un défenseur hors ligne ou plusieurs flottes arrivées ensemble ; 70 attaques avant le retour du défenseur ; les vaisseaux perdus emportent leur cargaison |
| `tests/effects.test.mjs` | 1 | 5 joueurs, 4 attaquants × 70 combats : chaque perte subie une fois, puis rapports oubliés des deux côtés |
| `tests/fleet.test.mjs` | 20 | Deux flottes sur la même cible ; poursuite mutuelle ; colonie qui encaisse les pertes ; premier arrivé à la colonisation ; plein en panne tout près ; plusieurs attaquants ne pillent pas plus que le stock ; revanche ; raids sans armes et un pillage par 2 min ; flotte agressive qui combat puis reprend sa route ; flotte passive qui croise sans combattre ; agressive à l'arrêt qui garde sa case ; deux agressives : pertes comptées une fois ; agressive refusée sans armes, vue par les autres, gardée à la fusion (D-100) ; vitesse du vaisseau le plus lent ; rencontres que personne n'a regardées : `firstContact`, agressive et poursuite hors ligne, pas de combat rejoué, pertes comptées une fois (D-109) |
| `tests/colony.test.mjs` | 1 | Colonie perdue au recollage : vaisseaux et cargaison restent en orbite |
| `tests/hostile.test.mjs` | 6 | Pair malveillant ou fiche abîmée : personne ne réécrit ma fiche ni un secret, ni ne date sa fiche loin dans le futur ; fiche abîmée sans plantage ; race ou identifiant spécial ; installation antidatée ; heure qui recule ; téléphone en avance reste visible. Une partie de ces tests passe par l'acceptation des fiches (mécanisme décrit dans reseau.md) |
| `tests/replay.test.mjs` | 4 | Une partie de robots (construire, chercher, armer, décoller, attaquer, échanger) rejouée retombe sur les mêmes fiches ; partie coupée en deux puis recollée ; journal tronqué signalé ; copie pas à jour signalée |

| `tests/decisions-planete.test.mjs` | 24 | Une règle par décision (D-002 → D-074) : vitesse, races, départ, gisements, prélèvement, labos, soleil, climat, places, équilibrage, pouvoirs |
| `tests/decisions-flotte.test.mjs` | 30 | Une règle par décision (D-017 → D-062) : voyage, carburant, ordres, interception, échanges, anti-triche, armes et pillage |
| `tests/decisions-reseau.test.mjs` | 20 | Une règle par décision (D-005 → D-068) : invitations, 8 joueurs, sauvegarde, rendez-vous, journal et rejeu, découpage, icônes, historique, parallaxe |

Depuis le 2026-10-29 : `node --test tests/*.test.mjs` → `tests 109, pass 109, fail 0`. Le tableau
décision → test est dans [tests-decisions.md](tests-decisions.md) (D-082).

Plusieurs fichiers le disent : ces cas ont été **trouvés en faisant jouer des robots**
(`tests/fleet.test.mjs:3`, `tests/hostile.test.mjs:3`).

## 17. Pourquoi ces règles

Les décisions qui expliquent ces règles (gisements, prélèvement de tout revenu dans le sol,
combat calculé par l'attaquant, réglages du 28 octobre trouvés par des robots : climat adouci,
places, pillage, coûts des vaisseaux…) sont numérotées dans [decisions.md](../decisions.md),
avec leur date et leur source.

## 18. Écarts relevés entre commentaires et code

À corriger un jour dans le code (rien n'est cassé, ce sont des commentaires) :

1. `js/game.js:14-15` dit « 300 [pas] au plus par calcul, même après une journée
   d'absence ». Le code (`js/game.js:524`) plafonne le pas à 2 min : une journée réelle donne
   720 pas.
2. `js/game.js:516-517` parle de pas qui s'allongent « au-delà de 2000 pas ». Le code ne le
   fait pas ; le commentaire juste au-dessus du calcul (`js/game.js:523`) dit le contraire.
3. `js/game.js:969` dit « de 12 à 22 places » ; `PLANET_PLACES` vaut `[14, 22]`
   (`js/game.js:818`, dont le commentaire explique que 12 était trop peu).
4. `js/tech.js:224-226` : « un plein mène à 30 [cases] (machines) ». Seule la sonde
   réplicatrice fait 30 cases (90 / 3) ; les autres vaisseaux machines font 36. Le commentaire
   date du lot 7 (commit `a8a229d`) ; le commit `061744b` a donné +20 % d'autonomie aux
   machines (30 → 36) sans le mettre à jour.
5. `js/fleet.js:15-19` liste les ordres `dock`, `colonize`, `attack` ; `chase` existe aussi
   (`js/fleet.js:33`).
6. `js/game.js:703-710` : trois commentaires de documentation empilés (ceux de `usePower` et
   de `liftGain` sont avant `LIFT_PER_PSI`).

## 19. Fin de partie : le soleil s'éteint, la conquête, l'élimination

Remplace le chrono et l'objectif de points (D-086, remplacée par D-088). Tout se calcule depuis
l'heure et les fiches : chaque téléphone trouve le même résultat, sans arbitre.

### 19.1 Début de la course

- `claimPlanet` écrit `p.since` (une seule fois) ; `Session.startedAt` = le plus petit `since`
  des joueurs. Une partie d'avant la course n'a aucun `since` : ni froid, ni fin (D-087).

### 19.2 Le froid (`FROST`, `frostAt`, `frostLine`, `sunDistance`, `js/game.js`)

- `sunDistance(sun, c)` : distance `d` de la case au bord du soleil, et `far`, la plus grande
  possible (la même mesure que le climat).
- Le froid part du coin le plus loin `FROST.delayMs` (12 min) après le début et atteint le
  soleil `FROST.durationMs` (24 min) plus tard. `frostAt(sun, start, c) = start + delay +
  duration × (1 − d/far)^(1/ease)`. Avec `ease = 2`, il avance lentement puis de plus en plus
  vite (D-090) : les planètes du bord tiennent assez longtemps pour qu'une race lente (machines)
  ait le temps de coloniser.
- `frostLine(sun, start, now)` : rayon autour du soleil où passe le froid (Infinity avant le
  départ) ; la carte le dessine.
- `Session.frostOf(cell)` : heure de gel d'une case dans cette partie.

### 19.3 Perdre une planète (`losePlanet`, `freeze`, `js/session.js`)

- À chaque `tick`, `freeze` prend mes planètes dont l'heure de gel est passée, la plus lointaine
  d'abord.
- Colonie perdue : retirée de `p.colonies`.
- Planète mère perdue (gel ou conquête) : la **plus vieille colonie encore en vie** devient la
  planète mère (`p.home`, `p.planet`, `p.claimAt` repris de la colonie, D-089). `backdated`
  accepte ce changement de `home` daté d'avant (c'était une de mes colonies). Sans colonie :
  `p.home = null`, `p.out = heure` : le joueur est **éliminé** (`canAct` faux, `claimPlanet`
  refusé).
- `losePlanet` note les points de la vague (`this.wave` : joueur, heure, `scoreOf` avant la
  première perte de cette heure). À l'élimination, ils vont dans `p.deathPts` (D-102).

### 19.4 Qui est en vie, qui gagne (`livePlanets`, `deadAt`, `ranking`, `checkOver`)

- `livePlanets(p)` : planètes ni gelées, ni prises (d'après `ownerAt`).
- `deadAt(p)` : `p.out` s'il existe ; sinon, si plus aucune planète n'est en vie, l'heure du
  dernier gel (ou maintenant pour une prise). Calculable par **tous**, même si le joueur est
  hors ligne.
- `scoreOf(p)` : ce que le joueur possède **maintenant** ; tout perdu : 0 (hors flottes en vol).
- `ranking` : `{ id, pts, dead, best }`. `best` départage les joueurs tombés à la même heure :
  `deathPts` (points juste avant la chute), ou `scoreOf` si la fiche n'a pas encore vu la chute
  (D-102).
- `checkOver` : à plusieurs, la partie finit quand il reste **un seul** joueur en vie (ou
  aucun : le dernier tombé gagne, puis le meilleur `best`). Seul : quand le froid a tout
  pris. Le téléphone qui le voit écrit `p.over = { at, winner }` dans sa fiche ;
  `Session.over` prend la plus ancienne fin écrite par un joueur.
- Partie finie : `tick` ne fait plus que lire les derniers rapports de combat ; tous les ordres
  sont refusés (`canAct`).

### 19.5 Défenses des planètes (`fortOf`, `js/game.js`, D-093)

Chaque niveau de bâtiment ordinaire donne ⚔ 2 et ◇ 20. Bâtiments de défense, une place par
niveau :

| Race | Clé | Nom | Par niveau | Coût de base × facteur |
|---|---|---|---|---|
| Humains | `cannon` | Batterie de canons | ⚔ 12, ◇ 40 | 130 minéraux × 1,5 |
| Humains | `shield` | Bouclier déflecteur | ◇ 150 | 140 minéraux × 1,5 |
| Machines | `turret` | Tourelles automatiques | ⚔ 18, ◇ 15 | 90 min. + 30 én. × 1,45 |
| Machines | `shield` | Blindage réactif | ◇ 90 | 90 min. + 30 én. × 1,45 |
| Aliens | `spines` | Épines psioniques | ⚔ 8 + 1 par psionique, ◇ 60 | 200 min. + 40 × 1,6 |
| Aliens | `dome` | Dôme psychique | ◇ 260 | 240 min. + 60 × 1,6 |

Valeurs **non équilibrées** : les robots de simulation n'attaquent pas (non confirmé en jeu).

### 19.6 Format

`FORMAT = 8` (`js/session.js`) : nouveaux champs de fiche `since`, `out`, `over`, rapports
`capture` / `cell`, file `queue.demolish`. Le service worker passe à `astra-p2p-v52`.
