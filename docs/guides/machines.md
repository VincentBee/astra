# ⬢ Guide des machines

Pas de population, pas de nourriture : tout tourne à l'énergie. Les foreuses produisent
beaucoup mais mangent du courant, et les bâtiments coûtent aussi de l'énergie.

*Chiffres mesurés sur le commit `15ca511`, le 2026-11-04 vers 23:50 UTC. Scripts dans
`~/.claude/swarm-runs/astra-audit-2026-11-05/guides/` (voir [README](README.md)). Minutes
réelles depuis le départ.*

## En bref

| Forces | Faiblesses |
|---|---|
| La meilleure économie du départ : 1 138 minéraux/min dès 10 min avec un bon ordre | La planète est pleine très tôt (vers 7,6 min en suivant l'ordre de l'IA) |
| Drones rapides (22,5 cases/min) et vite construits (10 en 17 s) | Portée courte : 36 cases pour un drone, 30 pour la sonde |
| Défense la moins chère (tourelles et blindage) | Défense la plus faible en coque : elle tombe vite face aux gros lots |

Taux de victoire en parties d'IA contre IA :

| Contre | Parties | Victoires | Durée médiane | Si elle perd : éliminée vers |
|---|---|---|---|---|
| IA alien | 39 | **39 (100 %)** | 18,9 min | — |
| IA humaine | 39 | **38 (97,4 %)** | 22,9 min | — |
| 3 joueurs (humain, machine, alien) | 117 | **101 (86,3 %)** | 27,8 min | 33,4 min, surtout par le froid |

*Session `eq-races` (`eq-races/sim.mjs`, 297 parties d'IA contre IA, 20 cartes, froid réel ; champ `guide` de `eq-races.json`).* Dans 5 parties sur 6, c'est elle qui lance la première
conquête de la partie, entre 12,1 et 13,6 min.

À trois IA (une par race, 4 parties, `ia-parties.mjs`, sortie `ia-3.out`) : **l'IA machine gagne
4 fois sur 4** ; la partie finit entre 21,6 et 30,3 min. L'IA humaine est éliminée entre 21,6 et
23,9 min, l'IA alien entre 21,0 et 30,3 min.

## Départ : tes 5 à 10 premières minutes

1. **Choisis une planète proche** (2 cases en médiane depuis ton point d'apparition) et, si
   possible, **la plus chaude possible** : elle gèle plus tard et le climat y donne plus
   d'énergie ; minéraux extraits sur une partie (`eq-eco`) : 45 520 à chaleur 0,4, 65 781 à
   0,7, **77 525 à 0,9** (×0,82 dans un coin, ×1,18 au bord du soleil, `limites.mjs`).
2. **Le plus fort : foreuses et réacteurs en alternance, puis la recherche.** Ordre optimisé
   par la session `eq-eco` (objectif : minéraux extraits en 32 min ; planète de 18 places,
   chaleur 0,7 ; R = recherche) :

   foreuse 2 · réacteur 2 · foreuse 3 · réacteur 3 · foreuse 4 · réacteur 4 · foreuse 5 ·
   réacteur 5 · nœud 1 (4,1 min) · foreuse 6 · réacteur 6 · matrice 1 (5,8) · R supra 1 ·
   quantique 1 · supra 2 · quantique 2 · supra 3 · quantique 3 · foreuse 7 · stockage 1 ·
   quantique 4 · foreuse 8 (9,3)

   **2 022 minéraux/min à 10 min, contre 610 pour l'IA** (champ `guide.depart` de
   `eq-eco.json`, scripts dans `eq-eco/`). Cet ordre ne prépare ni matrice 2 ni usine : ni
   colonie ni vaisseau avant 10 min.
3. **Si tu veux aussi des vaisseaux tôt** (matrice 2 et usine avant 11,5 min), le meilleur
   ordre que j'ai trouvé **sans recherche** (`depart.mjs`, puis
   `depart-variantes.mjs`, planète type de 18 places) :

| # | Chantier | Vers |
|---|---|---|
| 1 | Réacteur 2 | 0 min |
| 2 | Foreuse 2 | 0,1 min |
| 3 | Foreuse 3 | 0,8 min |
| 4 | Réacteur 3 | 1,3 min |
| 5 | Réacteur 4 | 2,2 min |
| 6 | Réacteur 5 | 3,5 min |
| 7 | Matrice (labo) 1 | 4 min |
| 8 | Foreuse 4 | 4,6 min |
| 9 | Réacteur 6 | 6 min |
| 10 | Nœud de calcul 1 | 6,3 min |
| 11 | Foreuse 5 | 6,9 min |
| 12 | Foreuse 6 | 7,6 min |
| 13 | Matrice 2 | 8 min |
| 14 | Usine orbitale (chantier) 1 | 8,3 min |
| 15 | Banque de stockage 1 | 8,4 min |
| 16 | Foreuse 7 | 9,2 min |

*Minutes de lancement mesurées (`depart-logs.mjs`, sortie `depart-logs.out`).*

| Ordre | Minéraux/min à 10 min | à 12 min | à 20 min |
|---|---|---|---|
| Mon ordre (ci-dessus, sans recherche, usine après la matrice 2) | **1 138** | 1 138 | 1 138 |
| Même ordre, usine à 1,3 min | 892 | 1 138 | 1 138 |
| Même ordre + tourelles 1 et blindage 1 à la place de 2 niveaux de production | 892 | 892 | 892 |
| Ordre de l'IA | 682 | 682 | 682 |
| Le moins cher d'abord (sans labo ni usine) | 892 | 892 | — |

*Scripts `depart.mjs` (`depart-machine.out`), `depart-variantes.mjs`
(`depart-variantes.out`), `depart-check.mjs` (`depart-check.out`) : aucune panne d'énergie
jusqu'à 20 min avec cet ordre.*

*Les deux mesures n'utilisent pas la même planète (chaleur 0,7 chez `eq-eco`, 0,59 ici) : les
chiffres de l'IA diffèrent un peu entre les deux.*

4. **Pourquoi l'IA fait moins bien** : elle met tôt des tourelles, du blindage, un entrepôt et
   une deuxième usine. Sur 18 places, chaque niveau de défense est un niveau de foreuse en
   moins. **Ta planète est pleine vers 9 min** : la production ne monte plus ensuite, d'où le
   même chiffre à 12 et 20 min.
5. **La suite, c'est coloniser** : la sonde réplicatrice coûte **2 123** à débloquer (labo 1
   et 2, usine 1, propulseurs ioniques 1 et 2, réplication) (`deblocage.mjs`).

## Investissements rentables

« Remboursé » : temps pour que les minéraux en plus paient le prix (minéraux + énergie).
Mesuré sur la planète de l'IA à 5, 10 et 18 min, un seul niveau ajouté (`roi.mjs`,
`roi-tech.mjs`).

| Investissement | Prix | Minéraux en plus / min | Remboursé en |
|---|---|---|---|
| Forage quantique 1 (techno) | 200 | +48 à +87 | **2,3 à 4,3 min** |
| Foreuse (niveau 5 à 7) | 429 à 967 | +179 à +246 | **2,5 à 4 min** |
| Forage quantique 2 | 340 | +66 | 5,3 min |
| Forage quantique 3 | 577 | +66 | 8,8 min |
| Forage quantique 4 | 981 | +66 | 15 min |
| Forage quantique 5 | 1 669 | +66 | plus de 15 min |
| Réacteur, nœud de calcul, supraconducteurs | — | 0 tant que l'énergie suffit | seulement en cas de panne |

À retenir :

- **Foreuses et forage quantique 1 à 3** sont les meilleurs placements.
- **Le réacteur ne rapporte rien tout seul** : il permet à la foreuse suivante de tourner.
  Une foreuse 7 consomme environ 64 d'énergie par minute de plus (mesuré). Garde le solde
  d'énergie positif, sinon les foreuses ralentissent.
- **Le nœud de calcul** (−12 % de consommation des foreuses par niveau) ne s'est pas remboursé
  en 15 min dans ces mesures (niveaux 2 à 6) : il ne sert que si l'énergie manque.
- La recherche ne dure que 3 à 22 secondes avec une matrice 2 (`roi-tech.mjs`).

**Sur toute une partie** (session `eq-tech`, 16 parties d'IA, ressources gagnées de 10 à 29 min
pour un niveau acheté à 10 min, divisées par son prix ; champ `guide` de `eq-tech.json`) :

| Quantique 1 | Supra 1 | Quantique 2 | Supra 2 | Quantique 3 | Supra 3 | Quantique 4 | Supra 4 | Quantique 5 | Supra 5 |
|---|---|---|---|---|---|---|---|---|---|
| ×30,5 | ×26,3 | ×17,9 | ×15,4 | ×10,6 | ×9,1 | ×6,2 | ×5,4 | ×3,7 | ×3,2 |

**Tout se rembourse** chez les machines, car leur empire grandit vite (12 planètes en moyenne
à 20 min chez les IA). Les supraconducteurs comptent ici l'énergie gagnée (ma mesure sur une
seule planète, qui ne compte que les minéraux, leur donne 0 tant que l'énergie ne manque pas).

**Bâtiments, d'après `eq-eco`** : foreuse 1 à 5 remboursée en 0,9 à 2,4 min (1,5 à 3,9 en
comptant son énergie), réacteur 2 à 5 en 1,5 à 3,2 min d'énergie, nœud de calcul 1 en 3,5 min
s'il va avec un réacteur (7 à 18 min seul), foreuse 6 à 9 en 3 à 6,4 min.

**Technologies militaires** (`eq-tech`, `eq-combat`) : un niveau d'attaque ou de coque ne vaut
qu'environ +5 % de flotte. Le niveau 3 n'est rentable qu'au-delà de 15 600 à 31 800 de vaisseaux
de guerre construits dans la partie ; les niveaux 4 et 5 ne le sont pour aucune race. Les IA
construisent en médiane 4 400 (humains), 28 500 (machines), 4 100 (aliens) de vaisseaux.

## Défendre

Seuils exacts pour une planète de 15 niveaux ordinaires et *k* niveaux de tourelles **et** de
blindage (`defense.mjs`, tableau complet dans [limites](limites.md) §4) :

| *k* | Prix de ta défense | Il faut à l'ennemi au moins… (lot le moins cher) |
|---|---|---|
| 0 | 0 | 8 frégates, 12 drones ou 5 dards (dès 1 300 avec 2 croiseurs) |
| 1 | 240 | 11 frégates, 16 drones ou 8 dards (dès 1 950 avec 3 croiseurs) |
| 2 | 586 | 14 frégates, 21 drones ou 10 dards (dès 2 600 avec 4 croiseurs) |
| 3 | 1 090 | 17 frégates, 26 drones ou 12 dards (dès 3 250 avec 5 croiseurs) |
| 4 | 1 820 | 20 frégates, 30 drones ou 14 dards (dès 3 900) |
| 6 | 4 414 | 26 frégates, 40 drones ou 18 dards (dès 5 200) |

- **Ta défense est bon marché mais fragile** : à niveau égal, elle arrête moins d'ennemis
  (à *k* = 4, 3 900 d'attaque suffisent contre toi, 4 810 contre des humains, 6 760 contre des
  aliens). Mais elle coûte moins (1 820 contre 2 192 et 4 995) : pour chaque minerai dépensé,
  elle vaut celle des humains et mieux que celle des aliens.
- **Des drones posés comptent beaucoup** : l'IA machine garde 6 à 14 drones sur sa planète
  mère à 12-13 min ; avec 14 drones posés, il faut 25 drones ou 16 frégates pour la prendre
  (`ia-cibles.mjs`).
- Tes technologies renforcent tes drones, **pas** tes tourelles ni ton blindage.

## Attaquer et gagner

**Débloquer** (`deblocage.mjs`) : le drone d'assaut demande matrice 1 et 2, usine 1,
propulseurs ioniques 1 et intelligence d'essaim 1, soit **1 620**. Le destroyer : coque
nanométrique 2 en plus, soit **3 024**.

| Vaisseau | ⚔ | ◇ | Vitesse | Portée d'un plein | Prix | 10 à l'usine 1 |
|---|---|---|---|---|---|---|
| Drone d'assaut | 9 | 15 | 22,5 cases/min | 36 cases | 90 min. + 40 én. | 17 s |
| Destroyer | 35 | 90 | 15 cases/min | 36 cases | 550 min. + 200 én. | 100 s |
| Sonde réplicatrice | 0 | 25 | 15 cases/min | 30 cases | 270 min. + 90 én. | 48 s |

- **Attaque en essaim de drones** : 12 drones (1 560) prennent une planète sans défense.
- **Évite le destroyer pour attaquer** : contre toutes les défenses mesurées, c'est le lot le
  plus cher pour prendre une planète (aussi mesuré par `eq-combat`).
- **Flotte contre flotte, à prix égal** (`eq-tech`, `eq-combat`) : le croiseur bat la frégate,
  le léviathan bat le dard ; le destroyer perd contre le drone d'assaut.
- **Les lourds ne perdent rien contre une défense faible** : une flotte qui abat la défense en
  1 ou 2 passes ne perd aucun vaisseau si l'attaque de la défense × les passes reste sous la
  coque d'un de ses vaisseaux ; les lourds sont ainsi intouchables par les défenses d'IA
  vues en partie (⚔ 45 à 70) (`eq-combat`).
- **Ce que fait l'IA machine, et qui gagne contre les IA** : elle lance des conquêtes de
  drones dès 12 min, avant que les autres aient des vaisseaux posés, et finit ses duels entre
  15,9 et 20,0 min (`ia-parties.mjs`).
- **Le plus vite possible** (`eq-tech/rush.mjs`, meilleur ordre trouvé, vaisseau fini, minutes
  depuis la fondation) : **1er drone à 7,75 min** avec réacteur, matrice 1, foreuse, matrice 2,
  réacteur, ions 1, essaim 1, usine ; 1re sonde à 9,7 min (l'IA fait mieux : 8,7 min) ;
  1er destroyer à 12,6 min. L'IA machine commande ses premiers drones vers 12,75 min.
- **Colonise tôt** (`eq-eco`, `eq-eco/q-colonies.mjs`) : une colonie fondée à 8 min extrait
  47 595 minéraux jusqu'à son gel, à 16 min 29 249 ; son colonisateur se rembourse en 1 à
  2,5 min. Toute colonie fondée plus de 3 min avant son gel vaut le coup.
- **Après 18 min, il ne reste que 2 planètes libres** sur la carte (médiane, `eq-combat`) :
  pour grandir, il faut conquérir.
- **Façon la plus rapide de gagner** (mesure `eq-races`) : **prendre les machines, coloniser tôt
  (2e planète vers 9 min), puis conquérir après 10 min**. Victoire en 19,9 min en médiane contre
  1 IA (12,6 min au plus vite), 26,7 min contre 3 IA. C'est la façon la plus rapide de gagner
  du jeu. La stratégie « guerre d'abord » (vaisseaux avant les colonies) perd presque toujours.

## Pièges

- **Deux foreuses de suite sans réacteur** : le solde d'énergie tombe, les foreuses
  ralentissent.
- **Défense trop tôt** : 2 niveaux de défense sur 18 places = −22 % de minéraux (892 au lieu
  de 1 138 par minute, `depart-variantes.out`).
- **Vider l'énergie dans un plein de carburant** : les foreuses s'arrêtent.
- **Partir loin** : avec 36 cases de portée, un drone ne traverse même pas la carte d'un coin
  à l'autre (38 cases) ; prévois le retour.

## Non confirmé

- Le « meilleur ordre » vient d'une recherche locale (400 essais) sur une planète type ; ce
  n'est pas forcément le meilleur possible.
- Les taux de victoire sont ceux de l'IA contre l'IA : un vrai joueur joue autrement.
- La façon la plus rapide de gagner a été mesurée avec des joueurs scriptés (`eq-races`), pas
  avec un vrai joueur.
