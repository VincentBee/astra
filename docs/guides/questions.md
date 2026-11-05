# Questions de joueurs

Les 24 questions préparées pendant l'audit du 2026-11-05 (session `questions`), avec leur
réponse. Trois sortes de réponses :

- **Mesuré** : un script a joué ou calculé avec les règles du jeu.
- **Lu dans le code** : la règle est écrite ainsi dans le code (fichier et ligne donnés).
- **Non confirmé** : pas mesuré, ou pas assez (peu de parties, pas en vraie partie). La raison est
  donnée.

*Code du commit `15ca511`. Scripts dans `~/.claude/swarm-runs/astra-audit-2026-11-05/` :
`guides/` (cette session), `questions/` (calculs de la session `questions`), `eq-eco/`,
`eq-tech/`, `eq-combat/`, `eq-rythme/`, `eq-races/`, `eq-ia/` (et le champ `guide` de leurs
fichiers `.json`).*

## Gagner

**Peut-on gagner sans jamais combattre, en tenant la planète qui gèle en dernier ? (q-01)**
Lu dans le code : à plusieurs, la partie finit quand il ne reste qu'un joueur en vie ; si tous
tombent à la même minute, le meilleur score juste avant la chute gagne (`checkOver`,
`js/session.js`). Seul, personne ne gagne (D-142). La dernière case gèle vers 35,3 min
(médiane, [limites](limites.md) §1). Mesuré par `eq-races` (q-08 ci-dessous) : un joueur qui ne combat jamais perd surtout **de
froid** (14 défaites sur 18), car il n'a pas de planète près du soleil ; les IA, elles, le visent
peu (7 % des prises). Mesuré par `eq-rythme` (`eq-rythme/q01.mjs`, 30 parties : un joueur qui construit, colonise vers
le soleil et se défend, mais n'attaque jamais) : **gagner sans combattre est rare : 3 parties
sur 30, et seulement avec les machines.** Contre 1 IA machine : 2 victoires sur 18 ; l'IA prend
sa première planète entre 11,5 et 16,3 min. Contre 3 IA : 1 victoire sur 12 ; on survit plus
longtemps (les IA se battent entre elles) mais on gèle avec les autres vers 32-33 min. Le
dernier colonisateur a été envoyé entre 14 et 23 min ; après 23 min, plus aucun n'a pu partir.
Une défense « tortue » (défenses et évacuation) perd aussi : 0 victoire sur 5 pour chaque race,
chute vers 18 à 25 min (`eq-ia`).

**Contre 3 IA, les IA s'attaquent-elles entre elles ? Vaut-il mieux attendre ? (q-08)**
Lu dans le code : l'IA vise toutes les planètes adverses, IA comprises, d'abord celles qui
gèleront le plus tard, puis les plus proches (`attack`, `js/bot.js`). Rien ne la fait préférer
un joueur humain. Mesuré par `eq-races` (`eq-races/sim.mjs`, 72 parties à 4 : un joueur + 3 IA) : **oui, les IA
s'attaquent entre elles** : 53 % des prises de planètes sont IA contre IA ; si le joueur ne
combat pas, 93 %. **Attendre ne gagne pas mieux** : joueur passif 6 victoires sur 24, joueur
normal 4 sur 24 (pas de différence nette), et le passif meurt surtout de froid (14 défaites sur
18) : sans conquête, il n'a pas de planète près du soleil. Attaquer sans trêve ne change rien
non plus : avant 10 min, aucune IA n'a de vaisseau de guerre. **La race compte bien plus que la
stratégie** : machines 3 à 4 victoires sur 8, les autres 0 à 1.

**Combien de planètes faut-il prendre pour éliminer une IA ? (q-20)**
Lu dans le code : l'IA cherche à tenir 4 planètes, la mère comprise (`WANT_PLANETS`,
`js/bot.js:52`). Si sa planète mère tombe, sa plus vieille colonie la remplace ; sans colonie,
elle est éliminée. Mesuré par `eq-ia` (`eq-ia/probe.jsonl`, 50 IA) : une IA humaine ou alien n'a qu'**une planète
jusqu'à 12 min**, puis 3 vers 18 et 24 min ; une IA machine en a 4 à 12 min, 7 à 18 min, 10 à
24 min (elle conquiert beaucoup). Contre 1 IA, de la première prise à l'élimination : 1,2 à
2,5 min avec une attaque rapide de drones (3 à 5 conquêtes), 3,9 à 16,9 min avec un jeu
économique. **Attaquer avant 12 min, c'est souvent prendre sa seule planète, donc l'éliminer.**

**Si tout le monde gèle à la même minute, comment gagner le départage ? (q-23)**
Lu dans le code : le score d'empire compte les bâtiments (sauf les entrepôts), les recherches
et le prix des vaisseaux posés ou en vol, divisés par 100 (`empireScore`,
`js/game.js:1071-1090`). **Le stock ne compte pas** : avant le gel, dépense tout en vaisseaux,
en recherches ou en bâtiments, jamais en entrepôts. Calcul de `eq-rythme` : 2 000 de stock
dépensés en chasseurs donnent +20 points (humains, 10 frégates), +19 (machines, 15 drones), +17
(aliens, 5 dards). **Ne déconstruis jamais juste avant le gel final** : tu perds tout le prix du
niveau et ne récupères que la moitié, en stock qui ne compte pas. Et ce départage ne sert que si
les dernières planètes gèlent à la même minute : sinon, **le dernier gelé gagne, quel que soit
son score** (`ranking` trie d'abord par heure de chute). *Non confirmé en scénario à deux
joueurs.*

## Planètes et colonies

**Combien de colonies valent la peine, et jusqu'à quand ? (q-02)**
Prix pour débloquer le colonisateur (mesuré, `guides/deblocage.out`) : 1 870 (humains), 2 123
(machines), 2 263 (aliens), plus le colonisateur lui-même (360, 360, 510). Mesuré par `eq-eco`
(`eq-eco/q-colonies.mjs`, sans combat, planète de chaleur 0,7) : **une colonie rembourse son
colonisateur 1 à 2,5 min après sa fondation**, et la première « tout compris » (labo 2,
chantier, technologie) en 4 à 8 min. **Toute colonie fondée plus de 3 min avant son gel vaut le
coup** (6 à 8 min pour la première). Ce qui limite le nombre de colonies, ce sont les planètes
libres et le froid, pas l'argent. Minéraux qu'une colonie extrait jusqu'à son gel :

| Fondée à | Humains | Machines | Aliens |
|---|---|---|---|
| 8 min | 26 671 | 47 595 | 22 571 |
| 16 min | 14 459 | 29 249 | 13 264 |
| 24 min | 3 085 | 8 540 | 3 981 |

*Non confirmé en vraie partie (trajet réel, planètes déjà prises).*

**Conquérir rapporte-t-il plus que coloniser ? (q-10)**
Lu dans le code : une planète prise devient une **colonie neuve de ta race**, avec les
bâtiments de départ ; les bâtiments de l'ennemi sont perdus. Tu gardes les vaisseaux
survivants, la cargaison, le butin et le carburant (`capture`, `js/session.js:2490-2510`).
Mesuré par `eq-combat` (`eq-combat/16_conquest.mjs`, 6 parties d'IA) : **après 18 min, il ne
reste que 2 planètes libres sur la carte** (médiane ; 13 à 12 min) : conquérir devient presque la
seule façon de s'agrandir. Prendre une **colonie** d'IA demande une flotte de 390 à 1 020, pour
0 à 520 de pertes (0 avec des croiseurs ou des léviathans) : moins cher qu'une arche (360 à 510),
et la flotte reste. Prendre une **planète mère** d'IA demande 1 800 à 3 060 de flotte, pour 650 à
1 690 de pertes ; butin 80 à 300.

**Coloniser un astéroïde ou une comète vaut-il le coup ? (q-17)**
Lu dans le code : un astéroïde a 7 à 10 places, 35 % des minéraux et 10 % de la nourriture
d'une planète ; une comète 6 à 8 places, 20 % des minéraux et 35 % de la nourriture
(`SMALL_BODIES`, `js/game.js:1171-1174`). On ne peut pas y fonder sa planète mère. Mesuré par `eq-eco`
(`eq-eco/q-colonies.mjs`) : **oui, ça vaut le coup**, le colonisateur se rembourse aussi vite
(1 à 2,5 min), mais un petit corps rapporte 2 à 4 fois moins qu'une planète (fondé à 8 min :
astéroïde 7 607 minéraux, comète 4 431, planète 26 671 chez les humains). À prendre quand aucune
planète n'est libre. L'astéroïde est un peu meilleur que la comète.

**Combien vaut le climat ? (q-19)**
Lu dans le code (`climateAt`, `js/game.js:1226-1236`) : énergie ×0,8 à ×1,2, minéraux ×0,9 à
×1,1 (meilleurs près du soleil), nourriture ×0,6 à ×1,3 (meilleure en zone tempérée). Mesuré :
×0,82 / ×0,91 dans un coin, ×1,18 / ×1,09 au bord du soleil (`guides/limites.out`). Mesuré par `eq-eco` (`eq-eco/q-gisement-climat.mjs`) : **le climat compte beaucoup, et pas
pareil selon la race**. Machines : plus c'est chaud, mieux c'est (à 15 min, 1 547 minéraux/min à
chaleur 0,16 contre 2 801 à 0,96, et la planète gèle 14 min plus tard). Humains et aliens : la
meilleure zone est **tempérée à chaude (0,5 à 0,7)** ; trop près du soleil, la nourriture baisse
et c'est la famine. Une planète glacée gèle tôt (21,6 min à 0,16) : à éviter pour tous.

**Le gisement peut-il s'épuiser avant le froid ? (q-09)**
Lu dans le code : un gisement de minéraux a 60 000 à 200 000 unités et se régénère de 150 à
450 par heure de jeu ; la nourriture 15 000 à 60 000 et 80 à 250 (`NATURE`,
`js/game.js:1200`). Une partie de 36 min dure 90 heures de jeu. Mesuré par `eq-eco`
(`eq-eco/q-gisement-climat.mjs`) : **non, le gisement ne se vide jamais avant le gel**, même le
plus pauvre. Il ne baisse que si l'extraction dépasse la repousse (375 à 1 125 minéraux par
minute réelle), à partir d'environ mine ou foreuse 6-7. Ce qui ne rentre pas dans l'entrepôt
reste dans le sol. **La richesse du sol ne compte presque pas pour choisir sa planète.**

**À combien de minutes du gel faut-il arrêter de construire ? (q-03)**
Lu dans le code : l'IA arrête 2 min avant (`planBuilding`, `js/bot.js`). Mesuré
(`guides/roi.mjs`) : une mine ou une foreuse se rembourse en 2,5 à 5 min, un amplificateur en
5 à 14 min. Mesuré par `eq-eco` (`eq-eco/roi-table.mjs`, énergie consommée comprise) — **n'ajoute plus ce
niveau à moins de ces minutes du gel de la planète** :

| Race | Bâtiment et minutes avant le gel |
|---|---|
| ◆ Humains | mine 1-4 : 1-2 min ; mine 5 : 2,3 ; mine 7 : 3,7 ; mine 9 : 6,2 ; mine 12 : 13,6 · ferme 5 : 3,5 · solaire 5 : 3 |
| ⬢ Machines | foreuse 3 : 2,4 ; foreuse 5 : 3,9 ; foreuse 7 : 6,6 ; foreuse 9 : 11,3 · réacteur 5 : 3,2 ; réacteur 7 : 5,7 |
| ✦ Aliens | prisme 5 : 2,5 · ruche 5 : 3,2 · amplificateur 1 : 2,9 ; 2 : 4,9 ; 3 : 8,3 ; 4 : 14 (environ moitié moins avec les pouvoirs) |

Le seuil de l'IA (2 min) est trop tard dès la mine 5, la foreuse 3 ou la ruche 4. **Mais pour le
départage**, juste avant le gel, un bâtiment compte dans le score même s'il ne se rembourse pas,
et le stock ne compte pas : dépense tout (voir q-23).

**Comment vider une planète qui va geler ? (q-11)**
Mesuré (`guides/q11-deconstruction.mjs`) : déconstruire rend **tout de suite** la moitié du prix
du niveau, et ce remboursement **dépasse le plafond de l'entrepôt** (3 588 minéraux dans un
entrepôt de 1 000) ; on peut ensuite payer un prix plus grand que l'entrepôt. C'est
probablement un bug (`js/game.js:936`, demande de vérification déposée pour `verif-bug1`) ; un
constat voisin est confirmé (`code-eco-02` : un stock au-dessus du plafond, par une cargaison
déchargée, bloque le fil mais pas le bouton Construire). Ne compte pas dessus. L'IA évacue ses vaisseaux 40 s avant le gel (`evacuate`, `js/bot.js`). Mesuré par
`eq-rythme` (`eq-rythme/q11.mjs`, planète d'IA à 22 min) : **tout déconstruire prend 20 à 30 s**
et rend 1 173 minéraux (humains, 16 niveaux), 1 452 minéraux et 346 énergie (machines), 1 352
minéraux et 218 énergie (aliens). **2 à 4 cargos emportent le tout** (soute 400 à 500 ; un cargo
se construit en 2,4 à 3,2 s ; 12 cases en 36 à 58 s). Donc : **commence à vider au moins
« trajet + 30 s » avant le gel.** Avec les 40 s de l'IA, on n'arrive qu'à une planète à moins
de 8 à 10 cases. Déconstruire fait perdre les points des bâtiments : seulement si la ressource
sert ailleurs.

**Quand l'entrepôt devient-il le mur ? (q-14)**
Mesuré (`guides/q14-q15.mjs`, sortie `q14-q15.out`) : sans entrepôt, plafond de 1 000 par
ressource. Premiers niveaux impossibles :

| Race | Bâtiments | Technologies | Plus gros lot avec 1 000 de chaque |
|---|---|---|---|
| ◆ Humains | habitat 7, mine 8, labo 4, chantier 4, bouclier 6 | armement 3, blindage 4, niveau 5 des autres | 6 frégates, 2 croiseurs |
| ⬢ Machines | réacteur 7, foreuse 8, labo 4, usine 4, nœud 5 | coque 3, essaim 4 | 11 drones, 1 destroyer |
| ✦ Aliens | sanctuaire 4, amplificateur 5, labo 4, couveuse 4 | carapace 3, dard 4 | 3 dards, 1 léviathan |

**Le fil d'attente pendant une absence (q-13)**
Lu dans le code : 12 éléments au plus (`PLAN_MAX`), et un bâtiment sans place bloque les
bâtiments qui le suivent (`js/game.js`). Mesuré par `eq-eco` (`eq-eco/q-pouvoirs-absence.mjs`) : **partir 10 min avec un fil bien
rempli coûte peu** : à 3 et 8 min, 12 éléments couvrent environ 10 min (6 à 7 bâtiments et 5 à 6
recherches). Bon fil : les bâtiments de production en alternance avec les recherches de
production, **et un entrepôt au milieu** (sinon le stock déborde). Ce qui se perd : les pouvoirs
aliens (−14 % d'extraction à 3 min, −6 à −7 % ensuite). Après la planète pleine (vers 13 min),
être là ou non ne change rien à l'économie. *Non confirmé en chiffres pour humains et machines.*

## Défense et combat

**Quelle défense l'IA n'attaque-t-elle jamais ? (q-04)**
Lu dans le code : l'IA n'attaque que si le calcul du combat lui donne la victoire **en gardant
au moins la moitié** de sa flotte (`js/bot.js:371`). Elle voit tous les vaisseaux posés, même
hors de sa détection (elle lit la fiche sans brouillard). Mesuré par `eq-ia` (`eq-ia/q04.mjs`, plus grosse flotte posée par IA sur 20 parties, planète à
10 niveaux ordinaires, sans vaisseau posé) — **défense minimale pour que l'IA ne t'attaque pas** :

| Minute | Contre l'IA machine | Contre l'IA humaine | Contre l'IA alien |
|---|---|---|---|
| 10 min | rien (2 drones au plus) | rien | rien |
| 15 min | 1 niveau d'arme (0 avec 15 niveaux ordinaires) | 1 niveau d'arme | 1 niveau d'arme |
| 20 min | 5 boucliers / 5 tourelles / 3 dômes | 2 boucliers / 3 tourelles / 1 dôme | 1 bouclier / 2 tourelles / 1 dôme |
| 25 min | 8 boucliers / 9 tourelles / 5 dômes | 5 boucliers / 8 tourelles / 3 dômes | 7 boucliers / 9 tourelles / 4 dômes |

(« boucliers » pour une planète humaine, « tourelles » pour une machine, « dômes » pour une
alienne.) Chaque niveau prend une place : 5 niveaux, ce sont 5 mines de moins.

**Quand l'IA part attaquer, sa planète reste-t-elle vide ? (q-05)**
Lu dans le code : l'IA envoie **tous** les vaisseaux de guerre posés de la planète d'où elle
attaque (`attack`, `js/bot.js`) : pendant l'aller-retour, cette planète n'a plus que ses
bâtiments pour se défendre. Mesuré par `eq-ia` : **100 % des départs** de conquête de l'IA (1 914 sur 1 914) laissent sa
planète sans vaisseau de guerre, pendant 24 s en médiane (humains, machines) à 51 s (aliens),
jusqu'à 12 min. Son trajet aller dure 17 à 20 s en médiane. *Non confirmé : si une contre-attaque
lancée exactement à ce moment réussit mieux.*

**Une flotte en orbite ou en vol est-elle à l'abri de l'IA ? (q-06)**
Lu dans le code : la défense d'une planète, ce sont ses vaisseaux **posés** et ses bâtiments ;
une flotte en orbite ne défend pas (`defenseAt`, `js/session.js:2518-2530`). L'IA ne poursuit
jamais une flotte, ne passe jamais en mode agressif et n'échange jamais (`js/bot.js` n'utilise
ni poursuite, ni comportement, ni échange) : **contre l'IA, une flotte hors d'une planète n'est
jamais attaquée.** Lu par `eq-ia` : si la planète sous elle est prise, **la flotte reste en orbite, intacte** (la
prise ne touche que les vaisseaux posés) ; il lui faut du carburant pour aller se poser ailleurs
(sans carburant, elle reste coincée). L'IA ne rappelle jamais une flotte en route et ne voit pas
une flotte comme une menace.

**Les cargos protègent-ils une flotte de guerre ? (q-12)**
Lu dans le code : à chaque passe, les dégâts se répartissent selon la coque de chaque type de
vaisseau (`battle`, `js/fleet.js:457-467`) : un cargo prend sa part. Coque pour 100 de prix
(calcul `questions/code-answers.out`, vérifié) : humains cargo 13,3, frégate 15,0, croiseur
18,5 ; machines cargo 8,6, drone 11,5, destroyer 12,0 ; aliens méduse 14,6, dard 11,8,
léviathan 17,1. Mais mesuré par `eq-combat` (`eq-combat/14_cargo_shield.mjs`, budget de 6 000, 0 à 30 % de
cargos) : **non, les cargos ne font pas un bon bouclier**. Pour les 6 vaisseaux de guerre, chaque
cargo ajouté fait baisser le résultat : ils prennent des tirs mais ne tirent pas.

**Qui peut fuir qui ? (q-16)**
Lu dans le code : vitesse d'une flotte = celle de son vaisseau le plus lent, +10 % par niveau
de propulsion (`SHIPS`, `shipStats`, `js/tech.js`). Vitesses (cases par minute réelle) : drone
d'assaut 22,5, drone-cargo 20, frégate et dard 17,5, cargo humain, destroyer et sonde 15,
croiseur et méduse 12,5, léviathan, arche et graine-ruche 10. **Sans technologie, rien ne
rattrape un drone d'assaut.** Mesuré par `eq-combat` en vraie partie (`eq-combat/15_chase.mjs`) :
plus rapide que la cible, on la rattrape en route ; aussi rapide ou à peine plus lent, on la
rattrape à son arrivée ; nettement plus lent, elle sort de la vue (2 cases autour d'une flotte)
et la poursuite s'arrête. **Pour fuir, il faut être nettement plus rapide** : 4 % de plus ne
suffit pas, 14 % suffit (sur 17 cases). Exemples : une frégate perd de vue un drone d'assaut ;
avec propulsion 3, elle le rattrape à son arrivée. Un croiseur ne rattrape que le léviathan.

**Combien de secondes d'alerte avant une attaque ? (q-15)**
Mesuré (`guides/q14-q15.mjs`) : une planète voit à 3 cases. Une flotte vue au bord de cette
portée arrive en :

| Attaquant | Sans radar | Radar 2 | Radar 5 |
|---|---|---|---|
| Drone d'assaut | 8 s | 13 s | 21 s |
| Frégate, dard | 10 s | 17 s | 27 s |
| Destroyer | 12 s | 20 s | 32 s |
| Croiseur | 14 s | 24 s | 38 s |
| Léviathan | 18 s | 30 s | 48 s |

Au chantier 1, 10 frégates sortent en 27 s, 2 frégates en 5 s (`guides/deblocage.out`,
`shipDuration`) : **sans radar, on a juste le temps de lancer un petit lot, si le chantier est
libre et le stock prêt, ou un niveau de défense** (canon 1 : 2 s ; canon 3 : 5 s ; un seul
bâtiment à la fois, `buildDuration`). Les IA ne cherchent
jamais le radar (`eq-tech`).

**Jusqu'où attaquer et revenir avec un plein ? (q-22)**
Lu dans le code (`SHIPS`, `js/tech.js`) : un plein mène à 40 cases (humains), 36 (drones et
destroyers machines, 30 pour la sonde), 50 (aliens) ; aller-retour : 20, 18 et 25 cases. La
carte fait 38 cases d'un coin à l'autre. Faire le plein sur une colonie allonge la portée.
Mesuré par `eq-combat` (`eq-combat/17_range.mjs`, 300 cartes) : depuis sa planète mère, un
aller-retour atteint **89 % des autres planètes (humains), 83 % (machines), 98 % (aliens)**.
Deux mondes sont à 12 cases l'un de l'autre en médiane, 34 au plus.

## Technologies

**Au plus tôt, quand lancer son premier colonisateur, chasseur, vaisseau lourd ? (q-07)**
Mesuré par `eq-tech` (`eq-tech/`) : l'IA débloque le cargo vers 3,5 à 6,5 min, le
colonisateur vers 8 à 11 min, le chasseur vers 9 à 11,5 min, le lourd vers 16,5 à 18,5 min.
Mesuré par `eq-tech` (`eq-tech/rush.mjs`, meilleur ordre trouvé en 1 900 essais, minutes
depuis la fondation, vaisseau **fini**) :

| Race | 1er chasseur | 1er colonisateur | 1er lourd | IA : 1er chasseur commandé |
|---|---|---|---|---|
| ◆ Humains | 7,8 min | 9,5 min | 11,5 min | 14,2 min |
| ⬢ Machines | 7,75 min | 9,7 min | 12,6 min | 12,75 min |
| ✦ Aliens | 10,1 min | 11,9 min | 18,1 min | 22,4 min |

**Un joueur pressé a son premier chasseur 5 à 12 min avant l'IA**, donc pendant sa trêve. L'IA
ne construit jamais de vaisseau lourd. Ordres : dans les guides de chaque race.

**Plusieurs labos ou un gros labo ? (q-18)**
Lu dans le code : durée d'une recherche divisée par `1 + 0,5 × (labo − 1)` (`researchDuration`,
`js/tech.js`) ; une recherche à la fois par planète, jamais la même sur deux planètes. Mesuré
par `eq-tech` : le labo 2 ouvre tout l'arbre ; un labo 3 ne fait gagner que 82 à 109 s sur
l'arbre entier (351 à 453 s au labo 2). **Un labo 2 suffit.** Mesuré par `eq-tech` (`eq-tech/labs.mjs`) : deux labos niveau 2 (sur
deux planètes) finissent la liste de l'IA plus vite qu'un labo 4, pour moitié prix (humains :
70 s contre 80 s, 1 120 contre 2 374). Mais toute cette liste ne prend que 47 à 122 s : **c'est le
prix des recherches qui freine, pas le labo.** Un labo sur une colonie a surtout un intérêt : la
colonie paie la recherche avec son propre stock.

## Aliens

**Arrachement ou transe : lequel rapporte le plus ? (q-21)**
Lu dans le code (`POWERS`, `liftGain`, `js/game.js`) : par psionique, l'arrachement donne
40 minéraux (×amplificateur) pour 30 d'énergie, toutes les 72 s ; la transe double
l'extraction pendant 48 s, soit 50 minéraux en plus (×amplificateur) pour 25 d'énergie,
toutes les 144 s. **Par point d'énergie, la transe rapporte plus (2 contre 1,33) ; par
minute, l'arrachement rapporte plus** (33 contre 21 minéraux par psionique). Mesuré à 10 min (`guides/pouvoirs.out`) : arrachement seul +43 %, transe seule +37 %. Mesuré
par `eq-eco` sur toute une partie de 32 min : arrachement +11 %, transe +21 %, les deux +24 %.
**La transe ne vaut que si l'entrepôt a de la place pendant ses 48 s** : ne la lance jamais
entrepôt plein. Le nombre de psioniques ne change pas ce rapport : les deux pouvoirs valent le
coup dès 1 psionique. Voir [aliens](aliens.md).

**Un pouvoir alien peut-il ruiner un voisin ? (q-24)**
Lu dans le code : non. Les pouvoirs n'agissent que sur la planète alien qui les lance
(`usePower`, `js/game.js:1021-1045`).
