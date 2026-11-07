# ◆ Guide des humains

Une population qui travaille dans les mines et les fermes. Plus d'habitants, plus de bras,
plus de minéraux.

*Chiffres mesurés sur le commit `15ca511`, du 2026-11-04 vers 23:40 au 2026-11-05 UTC. Scripts dans
`~/.claude/swarm-runs/astra-audit-2026-11-05/guides/` (voir [README](README.md)). Minutes
réelles depuis le départ.*

## En bref

| Forces | Faiblesses |
|---|---|
| Le croiseur est le vaisseau d'attaque le moins cher du jeu contre une planète peu défendue (2 croiseurs, 1 300, prennent une planète sans défense) | Il faut des habitants pour faire tourner les mines : on démarre lentement |
| Défense polyvalente (canons qui tirent, bouclier qui encaisse) | La planète est pleine vers 9 min (18 places) |
| La recherche de minéraux (forage) se rembourse en 2 à 4 min | Famine si on oublie la nourriture : la population meurt et la production avec |

Taux de victoire en parties d'IA contre IA :

| Contre | Parties | Victoires | Durée médiane | Si elle perd : éliminée vers |
|---|---|---|---|---|
| IA alien | 40 | **39 (97,5 %)** | 25,1 min | — |
| IA machine | 39 | 1 (2,6 %) | 22,9 min | 22,7 min, par conquête |
| 3 joueurs (humain, machine, alien) | 117 | 11 (9,4 %) | 27,8 min | 25,9 min |

*Session `eq-races` (`eq-races/sim.mjs`, 297 parties d'IA contre IA, 20 cartes, froid réel ; champ `guide` de `eq-races.json`).*

À trois IA (une par race, 4 parties, `ia-parties.mjs`, sortie `ia-3.out`) : **l'IA machine gagne
4 fois sur 4** ; la partie finit entre 21,6 et 30,3 min. L'IA humaine est éliminée entre 21,6 et
23,9 min, l'IA alien entre 21,0 et 30,3 min.

## Départ : tes 5 à 10 premières minutes

1. **Choisis une planète proche.** Tu apparais à 7 cases du centre ; la planète la plus proche
   est à 2 cases en médiane, 4 au plus dans 9 cas sur 10 (`limites.mjs`). Ton arche va à
   10 cases par minute : quelques secondes de trajet.
2. **Préfère une planète plus près du soleil et plus grande** : elle gèle plus tard (voir
   [limites](limites.md) §1) et a plus de places. **Mais pas brûlante** : à chaleur 0,9, la nourriture ne vaut plus
   que ×0,74 et la population meurt de faim. Minéraux extraits sur une partie (`eq-eco`) :
   30 225 à chaleur 0,4, **40 386 à 0,7**, 26 298 à 0,9. Vise une chaleur de 0,5 à 0,75 (tempérée à chaude).
3. **Le plus fort : loge, creuse, et cherche le forage tout de suite.** Ordre optimisé par la
   session `eq-eco` (objectif : minéraux extraits en 32 min ; planète de 18 places, chaleur
   0,7 ; R = recherche) :

   habitat 2 (0 min) · habitat 3 (0,95) · solaire 2 · mine 2 (2,5) · mine 3 · solaire 3 ·
   mine 4 (4,6) · labo 1 (5,1) · R forage 1 et 2 · mine 5 · R forage 3 · mine 6 (7,7) ·
   solaire 4 · entrepôt 1 (8,1) · solaire 5 · ferme 2 · R forage 4

   **1 304 minéraux/min à 10 min, contre 686 pour l'IA** (champ `guide.depart` de
   `eq-eco.json`, scripts dans `eq-eco/`). Cet ordre ne prépare ni labo 2 ni chantier : ni
   colonie ni vaisseau avant 10 min.
4. **Si tu veux aussi des vaisseaux tôt** (labo 2 et chantier avant 11,5 min), le meilleur
   ordre que j'ai trouvé **sans recherche** (recherche par simulation,
   `depart.mjs`, planète type de 18 places) :

| # | Chantier | Vers |
|---|---|---|
| 1 | Centrale solaire 2 | 0 min |
| 2 | Habitat 2 | 0 min |
| 3 | Habitat 3 | 2 min |
| 4 | Mine 2 | 2,5 min |
| 5 | Mine 3 | 3,5 min |
| 6 | Habitat 4 | 4,5 min |
| 7 | Centrale solaire 3 | 5 min |
| 8 | Mine 4 | 5,5 min |
| 9 | Labo 1 | 6 min |
| 10 | Chantier spatial 1 | 6,5 min |
| 11 | Centrale solaire 4 | 7 min |
| 12 | Labo 2 | 7,5 min |
| 13 | Mine 5 | 8 min |
| 14 | Ferme 2 | 8 min |

| Ordre | Minéraux/min à 10 min | à 12 min | à 20 min | Habitants à 15 min |
|---|---|---|---|---|
| Mon ordre (ci-dessus, sans recherche) | **835** | 854 | 857 | 111 |
| Ordre de l'IA | 720 | 830 | 855 | 80 |
| Le moins cher d'abord | 522 | 611 | — | 81 (6 min de pénurie) |

*Scripts `depart.mjs` (sortie `depart-human.out`) et `depart-check.mjs` (`depart-check.out`).*

*Les deux mesures n'utilisent pas la même planète (chaleur 0,7 chez `eq-eco`, 0,59 ici) : les
chiffres de l'IA diffèrent un peu entre les deux.*

5. **Attention vers 14 min** : avec mon ordre sans recherche, la nourriture et l'énergie passent dans le
   rouge après 15 min (−39 nourriture/min, −21 énergie/min) ; sans rien faire, 92 s de
   pénurie et 17 habitants morts avant 20 min, et l'avance sur l'IA disparaît. La planète est
   pleine : **déconstruis un niveau** (un habitat, par exemple) pour mettre une ferme et une
   centrale, ou **colonise**.
6. **Le labo après 3 ou 4 mines, pas avant** : il ouvre le forage (voir plus bas), le meilleur
   placement du jeu. Mais le construire en premier retarde la première colonie de 1,5 à 4 min et
   coûte 25 à 50 % du score à 20 min (mesure `eq-rythme`, `eq-rythme/departs.mjs`).

## Investissements rentables

« Remboursé » : temps pour que les minéraux en plus paient le prix. Mesuré sur la planète de
l'IA à 5, 10 et 18 min, en ajoutant un seul niveau (scripts `roi.mjs`, `roi-tech.mjs`).

| Investissement | Prix | Minéraux en plus / min | Remboursé en |
|---|---|---|---|
| Forage profond 1 (techno) | 150 | +35 à +98 | **1,7 à 4,8 min** |
| Forage profond 2 | 255 | +74 | 3,5 min |
| Mine (niveau 4 à 7) | 202 à 683 | +134 à +276 | **2,5 à 3,8 min** |
| Forage profond 3 | 433 | +74 | 6 min |
| Forage profond 4 | 736 | +74 | 10 min |
| Habitat (niveau 3 à 6) | 179 à 734 | +20 à +34 | 10 à plus de 15 min |
| Forage profond 5 | 1 252 | +74 | plus de 15 min |
| Ferme, centrale solaire, agronomie | — | 0 tant qu'il ne manque rien | seulement en cas de pénurie |

À retenir :

- **Forage 1 et 2 d'abord** : moins de 4 min pour se rembourser, et la recherche ne dure que
  3 à 4 secondes avec un labo 2 (`roi-tech.mjs`). Le labo 1 coûte 200, le labo 2 360.
- **Puis des mines**, tant qu'il y a des bras : chaque mine emploie 10 habitants.
- **Ferme et centrale** ne rapportent rien quand le stock suffit ; elles évitent la panne. Une
  mine de plus consomme jusqu'à 64 d'énergie par minute (mesuré) : surveille le solde.
- **Forage 5** ne se rembourse pas en 15 min.

**Sur toute une partie** (session `eq-tech`, 16 parties d'IA, ressources gagnées de 10 à 29 min
pour un niveau acheté à 10 min, divisées par son prix ; champ `guide` de `eq-tech.json`) :

| Forage 1 | Forage 2 | Forage 3 | Agronomie 1 | Forage 4 | Agronomie 2 | Forage 5 | Agronomie 3 | Agronomie 4 et 5 |
|---|---|---|---|---|---|---|---|---|
| ×12,8 | ×7,5 | ×4,4 | ×3,5 | ×2,6 | ×2,0 | ×1,5 | ×1,2 | jamais remboursé |

L'agronomie vaut moins que son chiffre : chez les IA, la nourriture humaine est en surplus 95 %
du temps (`eq-tech`). Forage 5 doit être acheté avant 18,5 min pour se rembourser.

**Bâtiments, d'après `eq-eco`** (prix / gain de production, toutes ressources) : mine 1 à 5
remboursée en 0,6 à 1,5 min (0,9 à 2,3 en comptant son énergie), solaire 2 à 5 en 1,5 à 3 min,
ferme 2 à 5 en 1,2 à 2,5 min de nourriture, mine 6 à 9 en 1,9 à 4 min ; l'habitat ne produit
rien : seulement quand la population touche le plafond.

**Technologies militaires** (`eq-tech`, `eq-combat`) : un niveau d'attaque ou de coque ne vaut
qu'environ +5 % de flotte. Le niveau 3 n'est rentable qu'au-delà de 15 600 à 31 800 de vaisseaux
de guerre construits dans la partie ; les niveaux 4 et 5 ne le sont pour aucune race. Les IA
construisent en médiane 4 400 (humains), 28 500 (machines), 4 100 (aliens) de vaisseaux.

## Défendre

Seuils exacts pour une planète de 15 niveaux ordinaires et *k* niveaux de canons **et** de
bouclier (`defense.mjs`, tableau complet dans [limites](limites.md) §4) :

| *k* | Prix de ta défense | Il faut à l'ennemi au moins… (prix du lot le moins cher) |
|---|---|---|
| 0 | 0 | 8 frégates, 12 drones ou 5 dards (dès 1 560) |
| 1 | 270 | 12 frégates, 18 drones ou 9 dards (dès 2 340) |
| 2 | 675 | 17 frégates, 24 drones ou 12 dards (dès 3 120) |
| 3 | 1 282 | 22 frégates, 31 drones ou 15 dards (dès 4 030) |
| 4 | 2 192 | 26 frégates, 37 drones ou 17 dards (dès 4 810) |
| 6 | 5 608 | 35 frégates, 50 drones ou 24 dards (dès 6 500) |

- **Deux ou trois niveaux de chaque, c'est le bon dosage** : au-delà de *k* = 6, ta défense
  coûte plus que la flotte qui la prend.
- **Des frégates posées valent mieux que les hauts niveaux** : 6 frégates (1 200) posées sur
  une planète *k* = 2 font passer le seuil de 17 à 27 frégates ennemies.
- Tes technologies (blindage, canons à masse) renforcent tes vaisseaux, **pas** tes canons ni
  ton bouclier.
- **Pour que l'IA ne t'attaque pas** (mesure `eq-ia`, planète à 10 niveaux ordinaires) : rien à
  10 min ; 1 niveau de canon à 15 min ; à 20 min, 2 boucliers contre une IA humaine, 5 contre
  une IA machine ; à 25 min, 5 et 8. Détails : [questions](questions.md), q-04.
- L'IA n'attaque pas avant 10 min. Vers 11 à 13 min, sa planète mère humaine a ⚔ 48 / ◇ 400 :
  11 frégates ou 3 croiseurs la prennent (`ia-cibles.mjs`).

## Attaquer et gagner

**Débloquer** (`deblocage.mjs`) : la frégate demande labo 1 et 2, chantier 1, propulsion 1 et
blindage 1, soit **1 310** en tout. Le croiseur : canons à masse 2 en plus, soit **2 390**.
L'arche coloniale (colonies) : **1 870**.

| Vaisseau | ⚔ | ◇ | Vitesse | Portée d'un plein | Prix | 10 au chantier 1 |
|---|---|---|---|---|---|---|
| Frégate | 12 | 30 | 17,5 cases/min | 40 cases | 150 min. + 50 én. | 27 s |
| Croiseur | 40 | 120 | 12,5 cases/min | 40 cases | 470 min. + 180 én. | 87 s |
| Arche coloniale | 0 | 40 | 10 cases/min | 40 cases | 360 min. | 48 s |

- **Contre une planète peu défendue, le croiseur est le moins cher** : 2 croiseurs (1 300)
  prennent une planète sans défense, 3 croiseurs prennent la planète mère d'une IA humaine à
  12 min (`ia-cibles.mjs`).
- **Flotte contre flotte, à prix égal** (`eq-tech`, `eq-combat`) : le croiseur bat la frégate,
  le léviathan bat le dard ; le destroyer perd contre le drone d'assaut.
- **Les lourds ne perdent rien contre une défense faible** : une flotte qui abat la défense en
  1 ou 2 passes ne perd aucun vaisseau si l'attaque de la défense × les passes reste sous la
  coque d'un de ses vaisseaux ; les lourds sont ainsi intouchables par les défenses d'IA
  vues en partie (⚔ 45 à 70) (`eq-combat`).
- **Conquérir**, pas seulement « Attaquer » : la conquête prend la planète (et ses places). Il
  faut abattre la défense **et** les vaisseaux posés en un seul combat.
- **Le plus vite possible** (`eq-tech/rush.mjs`, meilleur ordre trouvé, vaisseau fini, minutes
  depuis la fondation) : **1re frégate à 7,8 min** avec solaire, mine, labo 1, labo 2,
  propulsion 1, blindage 1, chantier ; 1re arche à 9,5 min ; 1er croiseur à 11,5 min. L'IA
  humaine commande sa première frégate vers 14,2 min et ne fait jamais de croiseur.
- **Colonise tôt** (`eq-eco`, `eq-eco/q-colonies.mjs`) : une colonie fondée à 8 min extrait
  26 671 minéraux jusqu'à son gel, à 16 min 14 459 ; son colonisateur se rembourse en 1 à
  2,5 min. Toute colonie fondée plus de 3 min avant son gel vaut le coup.
- **Après 18 min, il ne reste que 2 planètes libres** sur la carte (médiane, `eq-combat`) :
  pour grandir, il faut conquérir. Prendre une colonie d'IA coûte moins cher qu'une arche
  (390 à 1 020 de flotte, 0 perte avec des croiseurs).
- **Façon la plus rapide de gagner** (mesure `eq-races`) : **coloniser d'abord, conquérir
  ensuite**. En humains, victoire en 25,2 min en médiane contre 1 IA (17,4 min au plus vite),
  33,2 min contre 3 IA. La stratégie « guerre d'abord » (labo 2 et chantier tout de suite,
  vaisseaux avant les colonies) **perd presque toujours** : chute vers 15,7 min contre 1 IA,
  0 victoire sur 18 contre 3 IA. Tu peux pourtant avoir des frégates 6 min avant l'IA (`eq-tech`).
  L'IA humaine ne défend sa planète mère qu'avec ses bâtiments jusqu'à 13 min au moins :
  11 frégates ou 3 croiseurs la prennent à 12 min (`ia-cibles.mjs`).
- **Contre 1 IA humaine** (mesure `eq-ia`, `eq-ia/sim.mjs`, 5 parties par ligne, joueur limité à
  3 ordres toutes les 3 s comme l'IA) : jeu économique puis conquêtes dès 10 min, 4 victoires
  sur 5 en 24,5 min en médiane (20,1 au mieux) ; attaque rapide de frégates, 4 sur 5 en 25 min
  (15,3 au mieux : 1re frégate à 12,3 min, 3 frégates décollent à 12,75 min vers la planète mère
  de l'IA). Contre 3 IA : 1 victoire sur 5, en 33,4 min. **Ce qui marche : frapper la planète
  mère de l'IA avant ses premiers vaisseaux de guerre** (vers 14,2 min pour l'IA humaine). *Non
  confirmé face à un vrai joueur (peu de parties ; l'attaque rapide perd dans la mesure
  `eq-races`, mais gagne dans celle d'`eq-ia`, qui ne part que si le combat est gagné).*

## Pièges

- **« Le moins cher d'abord »** : 6 min de pénurie dans les 15 premières minutes, et 37 % de
  minéraux en moins à 10 min que mon ordre sans recherche.
- **Mine sans bras** : une mine de plus que d'habitants (10 par niveau) ne rapporte rien.
- **Oublier la nourriture après 14 min** : la population meurt, la production suit.
- **Monter la défense très haut** : chaque niveau coûte 1,5 fois le précédent ; l'ennemi
  n'a besoin que de 4 à 5 frégates de plus par niveau.
- **Rester sur une seule planète pleine** : sans colonie, plus rien à construire après 9 min.
- **Jouer la tortue** (défenses et évacuation, sans attaquer) : 0 victoire sur 5 contre 1 IA,
  chute vers 18 à 25 min (`eq-ia`).

## Non confirmé

- Les ordres de départ sont les meilleurs **trouvés** (recherche locale d'`eq-eco` et la mienne,
  400 essais) sur une planète type ; ce n'est pas forcément le meilleur possible, ni sur une
  autre planète.
- Les taux de victoire sont ceux de l'IA contre l'IA : un vrai joueur joue autrement.
- La façon la plus rapide de gagner a été mesurée avec des joueurs scriptés (`eq-races`,
  `eq-ia`), pas avec un vrai joueur, et les deux mesures ne s'accordent pas sur l'attaque
  rapide.
