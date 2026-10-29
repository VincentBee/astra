# Rythme du jeu Astra — rapport (2026-10-29)

Analyse faite par 4 agents : `sim-robots`, `courbes`, `interactions` et `contradicteur`.
Les trois premiers ont trouvé des constats ; le contradicteur a essayé de les démonter avec sa propre simulation.
Toutes les durées sont en **minutes réelles** (le jeu va 60 fois plus vite que le temps réel).
Scripts, sorties et JSON détaillés : `~/.claude/swarm-runs/rythme-astra-2026-10-29/`.
Le code du jeu n'a pas été modifié.

## Réponse courte

**Non, le rythme n'est pas homogène.** Il y a deux moments morts, et le deuxième est très grave.

1. **Un creux au milieu**, quand la planète mère est pleine : de 20-28 min jusqu'à la 1re colonie (40-46 min).
2. **Un arrêt total à la fin.** Après 1 h 30 à 2 h (jusqu'à 4 h chez les aliens), il n'y a plus *aucune* décision utile.
   Les stocks restent pleins pour toujours. Sur une partie de 3 jours, plus de 95 % du temps est vide.

**La cause n'est pas le prix des choses : le jeu n'a plus de contenu à proposer.** Baisser les coûts fait arriver la fin plus tôt (testé).

## Courbe d'intensité (meilleure stratégie de robot, 3 joueurs)

| Moment | Décisions / min | Ressenti |
|---|---|---|
| 0-20 min | 0,3-0,6 (aliens 1-1,5) | Haché : 6 à 8 min sans rien de payable sur le premier quart d'heure |
| 20-28 → 40-46 min | 0,3-0,7 | **Creux** : planète mère pleine, on attend la 1re colonie |
| 45-75 min | 2-5 | **Pic** : les colonies ouvrent chacune un chantier |
| 75-115 min | en baisse | Plus de planète libre, la recherche se termine |
| après ~95-115 min (3 joueurs) | **0** | **Mort définitive** (hors combat entre joueurs) |

## Constats

Le niveau de confiance compte l'accord entre agents et le passage du contradicteur.

| # | Constat | Confiance |
|---|---|---|
| 1 | **Plateau final** : plus aucune décision après 88 min (humains), 138 (machines), 231 (aliens) selon sim-robots ; 94-114 min selon le contradicteur. Causes : toutes les planètes pleines, plus de corps libre, arbre de technos fini. | Haute (2 simulations indépendantes) |
| 2 | **Pas de fin de partie** : aucune victoire, aucun objectif. Le score ne compte que les bâtiments de la planète mère (`js/app.js:860`). Coloniser ou se battre ne rapporte aucun point. | Haute (code vérifié) |
| 3 | **Limite de places** : 1 niveau de bâtiment = 1 place (`js/game.js:974`), 14 à 22 places (`js/game.js:818`), pas de démolition. Labo, chantier spatial et entrepôt prennent aussi des places. | Haute |
| 4 | **Creux du milieu** entre « planète mère pleine » et la 1re colonie : aucune stratégie testée ne le supprime. | Haute |
| 5 | **Mur du stock** : armement 5 coûte 3 341, plus que le plafond de l'entrepôt 2 (2 890). Faute de place pour un 3e entrepôt, 4 parties humaines sur 6 n'ont jamais fini l'arbre. | Haute |
| 6 | **Piège à énergie (humains)** : si on manque de centrales, le colonisateur est construit mais ne décolle jamais. Les places sont pleines et on ne peut rien démolir : on reste bloqué. | Haute |
| 7 | **La colonisation fait boule de neige** : le premier qui colonise prend presque tout (jusqu'à 18 colonies contre 0). Le coût du colonisateur ne monte jamais. | Moyenne |
| 8 | **Aucune menace en solo** ; un pillage ne laisse qu'environ 26 s de préavis, sans notification. | Haute (code), non simulé en combat |
| 9 | **Les durées de chantier ne sont pas le problème** : elles ne causent aucun des 333 trous mesurés. | Haute |
| 10 | Début de partie un peu lent (revenu de 34 à 55/min face à des chantiers de 90 à 420). | Moyenne |

**Réfutés par le contradicteur** (écartés) : le creux de 61 % chez les aliens entre 10 et 30 min (c'était le robot qui jouait mal ses pouvoirs) ; la machine bloquée pendant 60 min (erreur de stratégie du robot) ; « 45-90 min sans action » (c'est en fait le pic, grâce aux colonies) ; le mur du stock à 1 000 (il existe, mais plus haut, à 2 890).

**Non tranché** : l'« escalier de recherche », des attentes de 3 à 25 min qui s'allongent en fin de recherche. sim-robots le voit, mais le robot du contradicteur arrête la recherche plus tôt.

## Comment rendre le rythme plus homogène

Par ordre d'impact. ✅ = testé en simulation, 🧮 = calculé seulement, 💡 = idée non testée.

### 1. Ajouter du contenu de fin de partie (le plus important) 💡
C'est le seul levier qui supprime le plateau final. Les idées ne prennent pas de place sur la planète :
- un **mégaprojet par paliers** (environ 30 000 minéraux par palier, payable depuis toutes les planètes), soit une décision toutes les 8 à 10 min ;
- des **niveaux de technologie au-delà de 5**, ou des technologies qui **donnent des places** ;
- **une fin de partie** : une durée fixe (par exemple 3 h) ou la victoire au premier qui finit un monument.

### 2. Compter tout l'empire dans le score 💡 (coût faible)
Le score doit compter les colonies, les vaisseaux et les combats. Sinon, le classement est figé dès que la planète mère est pleine.

### 3. Coloniser plus tôt ✅
Technologie de colonie au labo 2 au lieu de 3, coût 400 au lieu de 800, colonisateur ×0,6.
Résultat mesuré : 1re colonie à 31-34 min au lieu de 45, dans 9 parties sur 9. Le creux du milieu tombe à environ 10 min.
⚠️ Seul, ce réglage avance aussi la fin. Il faut le faire avec le point 1.
Fichiers : `js/tech.js:60-67, 122-129, 184-191` (technos) et `js/tech.js:226, 232, 238` (colonisateurs).

### 4. Plus de places sur les planètes 🧮
Sortir le labo, le chantier spatial et l'entrepôt du compte des places, et passer `PLANET_PLACES` de `[14, 22]` à `[24, 36]` (`js/game.js:818`).
Calcul : le creux après le remplissage passe de 16-44 min à 0,3-12 min (sur 45 min).

### 5. Faire payer la recherche par toutes ses planètes 💡
Aujourd'hui, seule la planète mère paie. Pourtant, les colonies gagnent 3 000 à 4 000 minéraux/min, qui restent bloqués chez elles.

### 6. Freiner la boule de neige des colonies 💡
Colonisateur × (1 + 0,5 × nombre de colonies déjà possédées), ou un nombre de colonies limité par une technologie.

### 7. Des événements quand on est seul 💡
Des épaves à récupérer toutes les 8-10 min, des pirates programmés à partir de 20 min, des petites missions.
Ce sont des événements prévus à l'avance, sans hasard, pour rester compatibles avec le jeu en pair à pair.

### 8. Petits conforts 💡
Une alerte « énergie trop basse » (contre le piège du constat 6), une notification de pillage, un journal visible dans le jeu, une file de 3 chantiers pour le jeu hors ligne.

### À ne PAS faire ✅
Baisser seulement les coûts (bâtiments ×1,4, technos ×1,4, sanctuaire alien 1,6) ou plafonner les durées de chantier.
Mesuré : la fin arrive plus tôt. Par exemple, les technos à ×1,4 avancent la fin de 138 à 81 min chez les machines.

## Ce qui n'a pas été couvert

- Combats, pillages et échanges entre robots : les robots étaient pacifiques.
- Le jeu hors ligne, les parties à plus de 3 joueurs, les races mélangées dans une même partie (sauf chez le contradicteur).
- Le ressenti d'un vrai joueur humain : les robots mesurent des décisions possibles, pas le plaisir.
- Les recommandations 1, 2 et 4 à 8 ne sont pas simulées.
- La durée visée d'une partie n'est écrite nulle part. C'est à toi de la fixer : elle décide où placer le contenu de fin.

Coût : 4 agents lancés (le budget approuvé), environ 880 000 tokens au total.

---

## Changements faits (objectif : une partie de 20 à 40 min, sans temps mort à la fin)

| Changement | Où |
|---|---|
| **Tempo ×2,5** : production, chantiers, recherches, vaisseaux, trajets, pouvoirs et délai de pillage vont 2,5 fois plus vite. Un seul réglage : `TEMPO`. | `js/tech.js` (`TEMPO`), `js/game.js`, `js/fleet.js`, `js/session.js` |
| **Colonies plus tôt** : technologie au labo 2 au lieu de 3, à moitié prix ; colonisateur ×0,6. | `js/tech.js` |
| **Score de tout l'empire** : bâtiments de toutes les planètes (hors entrepôts), recherches et vaisseaux (posés ou en vol). Jusqu'à la fin, on peut toujours marquer des points. | `js/game.js` (`empireScore`), `js/session.js` (`scoreOf`) |
| **Fin de partie** : le premier à **220 points** gagne ; sinon, le meilleur score gagne au bout de **40 min** après la première installation. La fin est écrite dans la fiche du joueur qui la voit et se propage aux autres. Ensuite, plus aucun ordre n'est possible. | `js/game.js` (`GOAL`), `js/session.js` (`checkOver`, `over`, `canAct`) |
| **Bandeau de course** en haut de l'écran : objectif, joueur en tête, temps restant, puis le vainqueur. Il devient orange pendant les 5 dernières minutes. | `index.html`, `style.css`, `js/app.js` (`renderRace`) |
| Les débits affichés « / min » et les vitesses « cases/min » suivent le tempo. | `js/app.js`, `js/techtree.js` |
| Format des fiches passé à 8 : un téléphone resté sur l'ancienne version est invité à recharger l'appli. | `js/session.js` |

### Mesures après les changements
Robot « rush » du contradicteur, 3 joueurs (un par race), 3 cartes. Les valeurs sont en actions par minute.

| Moment | Humains | Machines | Aliens |
|---|---|---|---|
| 0-12 min | 0,3-1,7 | 0,3-1 | 2-3 |
| 12-21 min (premières colonies) | 1-6 | 0,7-3 | 3-10 |
| 21-30 min (fin de la course) | 3-7 | 3-5 | 3-10 |
| **Fin** | **29,0 / 29,9 / 31,0 min** selon la carte, avec le même vainqueur sur les trois téléphones | | |

Sans fin de partie, l'activité s'effondrait vers 33-36 min : la fin arrive donc pendant le pic, pas après.

### Ce qui reste à surveiller
- **Les aliens gagnent les 3 parties.** Avec une course aux points, ce déséquilibre décide de la partie : c'est le prochain réglage à faire. Deux causes mesurées à 26 min : les aliens marquent environ 2 fois plus de points par planète (20 contre 10 chez les humains, cartes 1 et 2), et ils colonisent plus vite. Le score est calculé sur les prix, et les aliens sont la race chère : il faudrait probablement le corriger par race.
- **Anciennes parties** : elles n'ont pas de date d'entrée dans la course (`since`). Elles ne finissent donc jamais, mais elles vont aussi 2,5 fois plus vite.
- **Début encore calme** pour les humains et les machines : environ une action par minute pendant les 12 premières minutes.
- Les robots sont pacifiques. Dans une vraie partie, les combats et les vaisseaux achetés pour marquer des points ajoutent de l'activité en fin de partie, mais ce n'est pas mesuré.
- Une partie de 20 à 40 minutes se joue d'une traite : la reprise « le lendemain » perd son intérêt. Un joueur déconnecté pendant 10 minutes est très pénalisé.
- Pas encore testé sur de vrais téléphones à plusieurs.


---

## Version 2 : le soleil qui s'éteint (remplace le chrono et l'objectif de points)

### Les règles
- **Le froid** part du coin de la carte le plus loin du soleil, **12 min** après la première installation. Il se resserre vers le soleil et l'atteint **24 min** plus tard, soit 36 min après le début. Il avance lentement au début, puis de plus en plus vite (`FROST.ease` = 2).
- **Une planète que le froid atteint est perdue.** Si c'est la planète mère, la plus vieille colonie encore en vie la remplace.
- **Défense des planètes** : une planète se bat avec ses vaisseaux posés **et** sa défense, qui combat comme un seul gros vaisseau. Chaque niveau de bâtiment ordinaire donne ⚔ 2 et ◇ 20. Chaque race a en plus deux bâtiments de défense, qui prennent une place par niveau comme les autres :

  | Race | Canons | Bouclier |
  |---|---|---|
  | Humains (polyvalents) | Batterie de canons : ⚔ 12, ◇ 40 | Bouclier déflecteur : ◇ 150 |
  | Machines (bon marché, fragiles) | Tourelles automatiques : ⚔ 18, ◇ 15 (coût ×1,45) | Blindage réactif : ◇ 90 (coût ×1,45) |
  | Aliens (chers, redoutables) | Épines psioniques : ⚔ 8 + 1 par psionique, ◇ 60 | Dôme psychique : ◇ 260 |

- **Attaquer** (piller) **et Conquérir** demandent tous deux de battre les vaisseaux **et** la défense. Si on gagne, « Attaquer » pille, et « Conquérir » pille puis prend la planète (à rebâtir pour la race du vainqueur). Le téléphone du perdant retire alors la planète de sa fiche. Un colonisateur ne sert plus qu'aux planètes libres. La défense est intacte à chaque assaut : il faut l'abattre en un seul combat de 4 tours.
- **Sans planète, on est éliminé.** Le **dernier joueur en vie gagne**. Si les derniers tombent en même temps, le meilleur score les départage. En solo, la partie finit quand le froid a tout pris.
- **Calculé par chaque téléphone**, à partir de l'heure : chacun voit le même froid. Un joueur hors ligne est éliminé quand même.
- **À l'écran** : un cercle pointillé se resserre sur la carte, les planètes gelées s'effacent, et le bandeau affiche « Ta planète gèle dans m:ss · va vers le soleil ». Ensuite : « Éliminé », puis le vainqueur.
- Les anciennes parties, sans `since`, n'ont ni froid ni fin.

Fichiers : `js/game.js` (`FROST`, `frostAt`, `frostLine`, `sunDistance`), `js/session.js` (`frostOf`, `livePlanets`, `deadAt`, `losePlanet`, `freeze`, `capture`, `checkOver`), `js/game.js` (`fortOf`, bâtiments de défense), `js/fleet.js` (`battle` avec `fort`, ordre `conquer`), `js/app.js` (`drawFrost`, `renderRace`), `tests/end.test.mjs` (10 tests).

### Mesures (robots pacifiques qui fuient vers le soleil, 3 races, 3 cartes)

| Réglage | Fin de partie | Ce qui se passe |
|---|---|---|
| Froid linéaire, départ 12 min | 23 à 35 min | ❌ Les machines gèlent vers 19-21 min **avant d'avoir colonisé** : éliminées sans avoir joué. |
| **Froid lent puis rapide (retenu)** | **30 à 35 min** | ✅ Toutes les races colonisent (machines vers 23-25 min) et tiennent jusqu'à 28-30 min au moins. |

Activité (actions par minute, par tranche de 5 min) avec le réglage retenu :
- 0-15 min : 0,6-1,4 pour les humains et les machines, 2-3 pour les aliens ;
- 15-30 min : **pic de 2 à 9**, c'est la fuite vers le soleil ;
- 30-35 min : **0 à 1,8** chez les robots.

### Ce qui reste à vérifier
- **Les 5 dernières minutes reposent sur le combat.** Les robots ne se battent pas, donc ils n'ont plus rien à faire quand toutes les planètes chaudes sont prises. Dans une vraie partie, c'est le moment où il faut prendre une planète au voisin pour survivre. Ce n'est pas encore mesuré : il faudrait des robots qui attaquent.
- **Les aliens gagnent encore le plus souvent** : ils colonisent plus tôt (14-16 min).
- **Les machines restent fragiles** quand leur planète mère est loin du soleil.
- Idée à tester : **chaque joueur commence avec un colonisateur de secours**. Tout le monde pourrait alors fuir au moins une fois, et ce serait un vrai choix : s'étendre tôt ou garder sa bouée.
- **Les valeurs des défenses ne sont pas équilibrées par simulation.** Les robots n'attaquent pas : les chiffres ⚔/◇ sont un premier jet, à régler en jouant.
