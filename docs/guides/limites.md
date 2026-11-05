# Limites du jeu

Ce que le jeu ne permet pas, et à partir de quand. Tous les chiffres viennent d'une mesure : un
script qui lit le code ou qui joue avec les règles de `js/game.js`, `js/fleet.js` et `js/bot.js`.

- **Code mesuré** : commit `15ca511` (2026-11-04).
- **Mesures** : 2026-11-04 vers 23:40 UTC, par la session `guides` de l'audit du 2026-11-05.
  Les scripts sont hors du dépôt, dans `~/.claude/swarm-runs/astra-audit-2026-11-05/guides/`
  (nom du script et de sa sortie sous chaque tableau). D'autres chiffres viennent des sessions
  `eq-combat` et `eq-rythme` de la même équipe (dossiers `eq-combat/` et `eq-rythme/` à côté).
- Une minute, ici, c'est une **minute réelle** comptée depuis le départ commun de la partie.

## 1. La partie dure au plus 36 minutes

Le soleil s'éteint. Le froid part du coin le plus loin **12 minutes** après le départ et arrive
au soleil **24 minutes** plus tard. Il avance lentement au début, puis très vite.

| Distance au bord du soleil (cases) | 0 | 2 | 4 | 6 | 8 | 10 | 12 |
|---|---|---|---|---|---|---|---|
| Minute de gel (soleil 3×3) | 36,0 | 34,0 | 31,8 | 29,4 | 26,5 | 23,0 | 17,4 |

*Script `limites.mjs` (sortie `limites.out`), formule `frostAt` de `js/game.js`. Un soleil plus
petit ou plus grand change ces minutes de moins d'une minute, sauf tout au bord.*

Sur 300 cartes tirées au hasard (`limites.mjs`) :

| Ce qu'on mesure | Médiane | Extrêmes |
|---|---|---|
| Première planète gelée | 24,3 min | — |
| Une planète au hasard gèle | 29,7 min | 21,6 à 35,5 min |
| Dernière case gelée de la carte | 35,3 min | 35,5 min au plus |

Ce que ça veut dire :

- **Avant 21 minutes, aucune planète n'est perdue à cause du froid.** Le froid ne touche
  d'abord que les coins vides (17 à 22 min, mesure `eq-rythme`).
- **Entre 24 et 33 minutes, presque tout gèle.** Planètes encore vivantes (médiane, sur les
  14 de la carte, mesure `eq-rythme`, `eq-rythme/frost.mjs`) : 13 à 26 min, 8 à 29 min, 5 à
  31 min, 2 à 33 min, 0 à 35 min.
- **À 8 joueurs, il n'y a plus une planète par joueur vers 29 minutes** (`eq-rythme`).
- **Après 36 minutes, plus personne ne peut vivre.** Seul contre le froid, on ne gagne
  jamais : la partie finit sans gagnant.
- Le cercle où les joueurs apparaissent (7 cases du centre) gèle vers 29 à 31 minutes.

## 2. La place sur une planète

Chaque niveau de bâtiment prend **une place**, même un niveau de labo ou d'entrepôt.

| Corps | Places |
|---|---|
| Planète | 14 à 22 (médiane 18) |
| Astéroïde | 7 à 10 |
| Comète | 6 à 8 |

*Code `PLANET_PLACES` et `SMALL_BODIES` (`js/game.js`), médiane sur 300 cartes (`limites.mjs`).*

**Une planète de 18 places est pleine très tôt.** En suivant l'ordre de construction de l'IA
(script `depart.mjs`, planète de 18 places) :

| Race | Planète pleine vers |
|---|---|
| ⬢ Machines | 7,6 min |
| ◆ Humains | 9,1 min |
| ✦ Aliens | 14,3 min |

Ensuite, construire un niveau oblige à en **déconstruire** un autre (on récupère la moitié de
son prix). Pour grandir, il faut **coloniser** d'autres planètes.

## 3. Les autres plafonds

| Limite | Valeur | Où dans le code |
|---|---|---|
| Joueurs par partie | 8 | `MAX_PLAYERS`, `js/session.js` |
| Planètes sur la carte | 14, plus 4 astéroïdes et 3 comètes | `PLANET_COUNT`, `SMALL_BODIES` |
| Carte | 20 × 20 cases | `UNIVERSE` |
| Flottes en même temps | 16 | `MAX_FLEETS`, `js/fleet.js` |
| Fil de construction | 12 éléments par planète | `PLAN_MAX`, `js/game.js` |
| Vaisseaux par lot | 1 à 50 | `startShips` |
| Chantiers en même temps | 1 bâtiment, 1 recherche, 1 lot de vaisseaux par planète | `stateAt` |
| Niveaux de technologie | 5 (1 pour les colonies) | `TECHS`, `js/tech.js` |
| Détection | 3 cases autour d'une planète, 2 autour d'une flotte, +1 par niveau de radar | `SIGHT` |
| Pillage | une fois par planète toutes les 48 s, la moitié des minéraux et de la nourriture au plus, dans la place des soutes | `RAID_COOLDOWN_MS`, `plunder` |
| Échange | expire au bout de 5 min ; abandonné après 30 min sans nouvelles ; 10 offres au plus | `js/trade.js` |
| Trêve des IA | une IA n'attaque pas avant 10 min | `PEACE_MS`, `js/bot.js` |
| Pouvoirs aliens | arrachement toutes les 72 s ; transe toutes les 144 s, pendant 48 s | `POWERS` |

*Script `limites.mjs`, sortie `limites.out`.*

**Entrepôt** : il fixe le plus gros prix qu'on peut payer, pour chaque ressource.

| Niveau d'entrepôt | 0 | 1 | 2 | 3 | 4 | 5 | 6 |
|---|---|---|---|---|---|---|---|
| Plafond | 1 000 | 1 700 | 2 890 | 4 913 | 8 352 | 14 199 | 24 138 |

Un bâtiment, une recherche ou un lot de vaisseaux qui coûte plus que ce plafond est
**impossible** tant que l'entrepôt n'a pas grandi. Exemple : un lot de 8 croiseurs humains
(3 760 minéraux) demande un entrepôt de niveau 3.

## 4. Quand une planète ne peut plus se défendre

Une planète se bat comme **un seul gros vaisseau** : ⚔ 2 et ◇ 20 par niveau de bâtiment
ordinaire, plus ses bâtiments de défense. Ses vaisseaux posés se battent avec elle. Le combat
dure **4 passes au plus**. Pour **conquérir**, l'attaquant doit tout abattre en un seul combat.

### 4.1 Le seuil : combien de vaisseaux pour prendre une planète

Planète de 15 niveaux ordinaires (une planète mère vers 10 à 15 min), avec *k* niveaux de
**chacun** de ses deux bâtiments de défense, sans vaisseau posé, sans technologie. Nombre de
vaisseaux qu'il faut au minimum pour gagner (entre parenthèses, le prix du lot, toutes
ressources) :

**Défenseur humain** (canons + bouclier)

| *k* | Défense ⚔ / ◇ | Prix de la défense | Frégates humaines | Drones machines | Dards aliens |
|---|---|---|---|---|---|
| 0 | 30 / 300 | 0 | 8 (1 600) | 12 (1 560) | 5 (1 700) |
| 1 | 42 / 490 | 270 | 12 (2 400) | 18 (2 340) | 9 (3 060) |
| 2 | 54 / 680 | 675 | 17 (3 400) | 24 (3 120) | 12 (4 080) |
| 3 | 66 / 870 | 1 282 | 22 (4 400) | 31 (4 030) | 15 (5 100) |
| 4 | 78 / 1 060 | 2 192 | 26 (5 200) | 37 (4 810) | 17 (5 780) |
| 6 | 102 / 1 440 | 5 608 | 35 (7 000) | 50 (6 500) | 24 (8 160) |
| 8 | 126 / 1 820 | 13 295 | 44 (8 800) | 63 (8 190) | 30 (10 200) |

**Défenseur machine** (tourelles + blindage)

| *k* | Défense ⚔ / ◇ | Prix de la défense | Frégates humaines | Drones machines | Dards aliens |
|---|---|---|---|---|---|
| 0 | 30 / 300 | 0 | 8 (1 600) | 12 (1 560) | 5 (1 700) |
| 1 | 48 / 405 | 240 | 11 (2 200) | 16 (2 080) | 8 (2 720) |
| 2 | 66 / 510 | 586 | 14 (2 800) | 21 (2 730) | 10 (3 400) |
| 3 | 84 / 615 | 1 090 | 17 (3 400) | 26 (3 380) | 12 (4 080) |
| 4 | 102 / 720 | 1 820 | 20 (4 000) | 30 (3 900) | 14 (4 760) |
| 6 | 138 / 930 | 4 414 | 26 (5 200) | 40 (5 200) | 18 (6 120) |
| 8 | 174 / 1 140 | 9 874 | 32 (6 400) | 49 (6 370) | 23 (7 820) |

**Défenseur alien** (épines + dôme, 4 psioniques)

| *k* | Défense ⚔ / ◇ | Prix de la défense | Frégates humaines | Drones machines | Dards aliens |
|---|---|---|---|---|---|
| 0 | 30 / 300 | 0 | 8 (1 600) | 12 (1 560) | 5 (1 700) |
| 1 | 42 / 620 | 540 | 15 (3 000) | 21 (2 730) | 11 (3 740) |
| 2 | 54 / 940 | 1 404 | 22 (4 400) | 32 (4 160) | 15 (5 100) |
| 3 | 66 / 1 260 | 2 785 | 30 (6 000) | 42 (5 460) | 20 (6 800) |
| 4 | 78 / 1 580 | 4 995 | 37 (7 400) | 52 (6 760) | 25 (8 500) |
| 6 | 102 / 2 220 | 14 193 | 51 (10 200) | 72 (9 360) | 35 (11 900) |
| 8 | 126 / 2 860 | 37 744 | 66 (13 200) | 92 (11 960) | 45 (15 300) |

*Script `defense.mjs` (sortie `defense.out`) : `fortOf` + `battle`, comme l'ordre « Conquérir ».
Les vaisseaux lourds (croiseur, destroyer, léviathan) sont dans la sortie ; à prix égal, le
croiseur humain et le léviathan alien valent les chasseurs, le destroyer machine coûte
toujours plus cher (aussi mesuré par `eq-combat`, `eq-combat/02_defense.mjs`).*

### 4.2 Ce qu'il faut retenir

- **Une planète sans défense tombe devant 1 300 à 1 700 de vaisseaux** : 2 croiseurs, 8 frégates,
  12 drones ou 5 dards. Toutes races pareilles, car les bâtiments ordinaires défendent pareil.
- **Les premiers niveaux de défense sont très rentables** : 270 de canons et de bouclier
  humains (*k* = 1) obligent l'attaquant à payer 800 de plus.
- **Les niveaux hauts ne le sont plus** : le prix d'un niveau de défense est multiplié par 1,5
  (1,45 machines, 1,6 aliens) à chaque niveau, mais l'attaquant n'a besoin que de quelques
  vaisseaux de plus. À *k* = 8, la défense humaine coûte 13 295 et se fait prendre par
  8 800 de frégates. Au-delà de *k* = 6 environ, **la défense coûte plus cher que la flotte
  qui la prend**.
- **Le plafond absolu** : même une planète de 22 places couverte uniquement de défenses
  (11 + 11 niveaux, rien d'autre) tombe devant :

| Défenseur | Défense ⚔ / ◇ | Prix de la défense | Flotte la moins chère qui la prend |
|---|---|---|---|
| ◆ Humains | 132 / 2 090 | 46 162 | 71 drones (9 230) |
| ⬢ Machines | 198 / 1 155 | 31 220 | 10 croiseurs (6 500) |
| ✦ Aliens (6 psioniques) | 154 / 3 520 | 157 412 | 113 drones (14 690) |

  **Aucune planète n'est imprenable** : avec 50 vaisseaux par lot et 16 flottes, on peut
  toujours réunir assez de vaisseaux. La limite, c'est l'économie et le temps avant le froid.
- **Les technologies ne renforcent pas la défense des bâtiments**, seulement les vaisseaux
  (attaquant ou posés). Un attaquant avec 3 niveaux d'attaque et de coque a besoin d'environ
  un quart de vaisseaux en moins (défense humaine *k* = 3 : 17 frégates au lieu de 22).
- **Des vaisseaux posés aident à peu près autant qu'ils coûtent** : 6 frégates posées
  (1 200) sur la planète humaine *k* = 2 font passer le seuil de 17 à 27 frégates
  (+2 000) ; c'est mieux que les hauts niveaux de défense, et ces vaisseaux peuvent aussi
  attaquer.
- **La défense repart entière à chaque combat** (D-095) : on ne l'use pas par petites
  attaques. Seuls les vaisseaux posés détruits sont perdus.
- **Un bouclier seul ne tue presque rien** : l'attaquant perd 0 à 2 vaisseaux, même quand il
  gagne (mesure `eq-combat`).

### 4.3 En partie, contre l'IA

Parties d'IA complètes, froid réel (script `ia-parties.mjs`, sorties `ia-*.out`) : vers 10 à
13 minutes, la planète mère d'une IA humaine a une défense de ⚔ 44 à 50 / ◇ 360 à 420 et aucun
vaisseau posé ; celle d'une IA machine ⚔ 24 / ◇ 240 avec 6 à 14 drones posés. Seuils exacts pour ces
planètes (script `ia-cibles.mjs`, sortie `ia-cibles.out`) :

| Planète observée | Frégates | Croiseurs | Drones | Destroyers | Dards | Léviathans |
|---|---|---|---|---|---|---|
| IA humaine, 11 à 13 min (⚔ 48 / ◇ 400) | 11 | 3 | 16 | 4 | 8 | 2 |
| IA machine, 12 min (⚔ 24 / ◇ 240 + 8 drones posés) | 12 | 4 | 18 | 4 | 9 | 2 |
| IA machine, 13 min (⚔ 24 / ◇ 240 + 14 drones posés) | 16 | 5 | 25 | 5 | 11 | 3 |

## 5. Ce qui devient impossible, et quand

| Quand | Ce qui devient impossible |
|---|---|
| Dès que le prix dépasse l'entrepôt | Payer ce bâtiment, cette recherche ou ce lot (agrandir l'entrepôt) |
| Planète pleine (7 à 14 min selon la race, sur 18 places) | Construire sans déconstruire |
| Planète gelée | Y vivre, la coloniser, la conquérir, s'y poser |
| Plus de planète, plus de colonisateur | Jouer : le joueur est éliminé |
| Vers 29 min à 8 joueurs | Trouver une planète chaude pour chacun |
| 36 min | Survivre : tout est gelé |
| Partie finie | Donner un ordre |

## Non confirmé

- Les minutes « planète pleine » supposent l'ordre de l'IA sur une planète de 18 places ; un
  joueur qui bâtit autrement remplit sa planète à un autre moment.
- Les seuils de défense sont exacts pour le calcul du combat, mais en partie la cible peut
  construire ou recevoir des renforts pendant le trajet de l'attaquant.
- Les parties d'IA ne disent rien de ce que fait un vrai joueur.
