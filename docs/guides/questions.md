# Questions de joueurs

Les 24 questions préparées pendant l'audit du 2026-11-05 (session `questions`), avec leur
réponse. Trois sortes de réponses :

- **Mesuré** : un script a joué ou calculé avec les règles du jeu.
- **Lu dans le code** : la règle est écrite ainsi dans le code (fichier et ligne donnés).
- **Non confirmé** : pas encore mesuré. La session de mesure qui doit répondre est indiquée.

*Code du commit `15ca511`. Scripts dans `~/.claude/swarm-runs/astra-audit-2026-11-05/` :
`guides/` (cette session), `questions/` (calculs de la session `questions`), `eq-tech/`,
`eq-combat/`, `eq-rythme/`.*

## Gagner

**Peut-on gagner sans jamais combattre, en tenant la planète qui gèle en dernier ? (q-01)**
Lu dans le code : à plusieurs, la partie finit quand il ne reste qu'un joueur en vie ; si tous
tombent à la même minute, le meilleur score juste avant la chute gagne (`checkOver`,
`js/session.js`). Seul, personne ne gagne (D-142). La dernière case gèle vers 35,3 min
(médiane, [limites](limites.md) §1). *Non confirmé : si l'IA laisse vivre ce joueur (en attente
de `eq-rythme`).*

**Contre 3 IA, les IA s'attaquent-elles entre elles ? Vaut-il mieux attendre ? (q-08)**
Lu dans le code : l'IA vise toutes les planètes adverses, IA comprises, d'abord celles qui
gèleront le plus tard, puis les plus proches (`attack`, `js/bot.js`). Rien ne la fait préférer
un joueur humain. Mesuré (`guides/ia-parties.mjs`, `ia-3.out`) : dans 4 parties à trois IA, l'IA
machine a gagné les 4 ; les IA humaine et alien ont été éliminées entre 21 et 30 min. *Non
confirmé : si attendre bat attaquer tôt (en attente de `eq-races`).*

**Combien de planètes faut-il prendre pour éliminer une IA ? (q-20)**
Lu dans le code : l'IA cherche à tenir 4 planètes, la mère comprise (`WANT_PLANETS`,
`js/bot.js:52`). Si sa planète mère tombe, sa plus vieille colonie la remplace ; sans colonie,
elle est éliminée. *Non confirmé : le temps entre la première prise et l'élimination (en
attente de `eq-ia`).*

**Si tout le monde gèle à la même minute, comment gagner le départage ? (q-23)**
Lu dans le code : le score d'empire compte les bâtiments (sauf les entrepôts), les recherches
et le prix des vaisseaux posés ou en vol, divisés par 100 (`empireScore`,
`js/game.js:1071-1090`). **Le stock ne compte pas** : avant le gel, dépense tout en vaisseaux,
en recherches ou en bâtiments, jamais en entrepôts. *Non confirmé en partie (en attente de
`eq-rythme`).*

## Planètes et colonies

**Combien de colonies valent la peine, et jusqu'à quand ? (q-02)** *Non confirmé (en attente de
`eq-eco`).* Prix pour débloquer le colonisateur (mesuré, `guides/deblocage.out`) : 1 870
(humains), 2 123 (machines), 2 263 (aliens), plus le colonisateur lui-même (360, 360, 510).

**Conquérir rapporte-t-il plus que coloniser ? (q-10)**
Lu dans le code : une planète prise devient une **colonie neuve de ta race**, avec les
bâtiments de départ ; les bâtiments de l'ennemi sont perdus. Tu gardes les vaisseaux
survivants, la cargaison, le butin et le carburant (`capture`, `js/session.js:2490-2510`).
*Non confirmé : le bilan chiffré (en attente de `eq-combat`).*

**Coloniser un astéroïde ou une comète vaut-il le coup ? (q-17)**
Lu dans le code : un astéroïde a 7 à 10 places, 35 % des minéraux et 10 % de la nourriture
d'une planète ; une comète 6 à 8 places, 20 % des minéraux et 35 % de la nourriture
(`SMALL_BODIES`, `js/game.js:1171-1174`). On ne peut pas y fonder sa planète mère. *Non
confirmé : la rentabilité (en attente de `eq-eco`).*

**Combien vaut le climat ? (q-19)**
Lu dans le code (`climateAt`, `js/game.js:1226-1236`) : énergie ×0,8 à ×1,2, minéraux ×0,9 à
×1,1 (meilleurs près du soleil), nourriture ×0,6 à ×1,3 (meilleure en zone tempérée). Mesuré :
×0,82 / ×0,91 dans un coin, ×1,18 / ×1,09 au bord du soleil (`guides/limites.out`). Le climat
compte surtout parce qu'**une planète chaude gèle plus tard**. *Non confirmé : l'écart de
production en partie (en attente de `eq-eco`).*

**Le gisement peut-il s'épuiser avant le froid ? (q-09)**
Lu dans le code : un gisement de minéraux a 60 000 à 200 000 unités et se régénère de 150 à
450 par heure de jeu ; la nourriture 15 000 à 60 000 et 80 à 250 (`NATURE`,
`js/game.js:1200`). Une partie de 36 min dure 90 heures de jeu. *Non confirmé : à partir de quel
niveau il s'épuise (en attente de `eq-eco`).*

**À combien de minutes du gel faut-il arrêter de construire ? (q-03)**
Lu dans le code : l'IA arrête 2 min avant (`planBuilding`, `js/bot.js`). Mesuré
(`guides/roi.mjs`) : une mine ou une foreuse se rembourse en 2,5 à 5 min, un amplificateur en
5 à 14 min. Donc : **plus de mine ni de foreuse à moins de 5 min du gel**, plus
d'amplificateur à moins de 6 à 14 min. *Non confirmé pour les autres bâtiments (en attente de
`eq-eco`).*

**Comment vider une planète qui va geler ? (q-11)**
Mesuré (`guides/q11-deconstruction.mjs`) : déconstruire rend **tout de suite** la moitié du prix
du niveau, et ce remboursement **dépasse le plafond de l'entrepôt** (3 588 minéraux dans un
entrepôt de 1 000) ; on peut ensuite payer un prix plus grand que l'entrepôt. C'est
probablement un bug (`js/game.js:936`, demande de vérification déposée pour `verif-bug1`) : ne
compte pas dessus. L'IA évacue ses vaisseaux 40 s avant le gel (`evacuate`, `js/bot.js`).
*Non confirmé : combien emporter en cargos, et quand partir (en attente de `eq-rythme`).*

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
bâtiments qui le suivent (`js/game.js`). *Non confirmé : le meilleur fil et ce qu'on perd (en
attente de `eq-eco`).*

## Défense et combat

**Quelle défense l'IA n'attaque-t-elle jamais ? (q-04)**
Lu dans le code : l'IA n'attaque que si le calcul du combat lui donne la victoire **en gardant
au moins la moitié** de sa flotte (`js/bot.js:371`). Elle voit tous les vaisseaux posés, même
hors de sa détection (elle lit la fiche sans brouillard). Mesuré : la planète mère d'une IA
humaine à 12 min a ⚔ 48 / ◇ 400 ([limites](limites.md) §4.3). *Non confirmé : le seuil minute
par minute (en attente de `eq-ia`).*

**Quand l'IA part attaquer, sa planète reste-t-elle vide ? (q-05)**
Lu dans le code : l'IA envoie **tous** les vaisseaux de guerre posés de la planète d'où elle
attaque (`attack`, `js/bot.js`) : pendant l'aller-retour, cette planète n'a plus que ses
bâtiments pour se défendre. *Non confirmé : si une contre-attaque à ce moment réussit mieux (en
attente de `eq-ia`).*

**Une flotte en orbite ou en vol est-elle à l'abri de l'IA ? (q-06)**
Lu dans le code : la défense d'une planète, ce sont ses vaisseaux **posés** et ses bâtiments ;
une flotte en orbite ne défend pas (`defenseAt`, `js/session.js:2518-2530`). L'IA ne poursuit
jamais une flotte, ne passe jamais en mode agressif et n'échange jamais (`js/bot.js` n'utilise
ni poursuite, ni comportement, ni échange) : **contre l'IA, une flotte hors d'une planète n'est
jamais attaquée.** *Non confirmé : ce que devient la flotte si la planète sous elle est prise
(en attente de `eq-ia`).*

**Les cargos protègent-ils une flotte de guerre ? (q-12)**
Lu dans le code : à chaque passe, les dégâts se répartissent selon la coque de chaque type de
vaisseau (`battle`, `js/fleet.js:457-467`) : un cargo prend sa part. Coque pour 100 de prix
(calcul `questions/code-answers.out`, vérifié) : humains cargo 13,3, frégate 15,0, croiseur
18,5 ; machines cargo 8,6, drone 11,5, destroyer 12,0 ; aliens méduse 14,6, dard 11,8,
léviathan 17,1. Le cargo alien encaisse mieux que le dard à prix égal. *Non confirmé : le gain
en combat (en attente de `eq-combat`).*

**Qui peut fuir qui ? (q-16)**
Lu dans le code : vitesse d'une flotte = celle de son vaisseau le plus lent, +10 % par niveau
de propulsion (`SHIPS`, `shipStats`, `js/tech.js`). Vitesses (cases par minute réelle) : drone
d'assaut 22,5, drone-cargo 20, frégate et dard 17,5, cargo humain, destroyer et sonde 15,
croiseur et méduse 12,5, léviathan, arche et graine-ruche 10. **Sans technologie, rien ne
rattrape un drone d'assaut.** La poursuite s'arrête si la cible sort de la vue (2 cases autour
d'une flotte). *Non confirmé en simulation (en attente de `eq-combat`).*

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
*Non confirmé : la part des planètes à portée (en attente de `eq-combat`).*

## Technologies

**Au plus tôt, quand lancer son premier colonisateur, chasseur, vaisseau lourd ? (q-07)**
Mesuré par `eq-tech` (`eq-tech/`) : l'IA débloque le cargo vers 3,5 à 6,5 min, le
colonisateur vers 8 à 11 min, le chasseur vers 9 à 11,5 min, le lourd vers 16,5 à 18,5 min.
*Non confirmé : le plus tôt possible avec un ordre optimal (en attente de `eq-tech`).*

**Plusieurs labos ou un gros labo ? (q-18)**
Lu dans le code : durée d'une recherche divisée par `1 + 0,5 × (labo − 1)` (`researchDuration`,
`js/tech.js`) ; une recherche à la fois par planète, jamais la même sur deux planètes. Mesuré
par `eq-tech` : le labo 2 ouvre tout l'arbre ; un labo 3 ne fait gagner que 82 à 109 s sur
l'arbre entier (351 à 453 s au labo 2). **Un labo 2 suffit.**

## Aliens

**Arrachement ou transe : lequel rapporte le plus ? (q-21)**
Lu dans le code (`POWERS`, `liftGain`, `js/game.js`) : par psionique, l'arrachement donne
40 minéraux (×amplificateur) pour 30 d'énergie, toutes les 72 s ; la transe double
l'extraction pendant 48 s, soit 50 minéraux en plus (×amplificateur) pour 25 d'énergie,
toutes les 144 s. **Par point d'énergie, la transe rapporte plus (2 contre 1,33) ; par
minute, l'arrachement rapporte plus** (33 contre 21 minéraux par psionique). Mesuré
(`guides/pouvoirs.out`) : arrachement seul +43 %, transe seule +37 % à 10 min. Voir
[aliens](aliens.md).

**Un pouvoir alien peut-il ruiner un voisin ? (q-24)**
Lu dans le code : non. Les pouvoirs n'agissent que sur la planète alien qui les lance
(`usePower`, `js/game.js:1021-1045`).
