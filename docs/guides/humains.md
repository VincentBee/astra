# ◆ Guide des humains

Une population qui travaille dans les mines et les fermes. Plus d'habitants, plus de bras,
plus de minéraux.

*Chiffres mesurés sur le commit `15ca511`, le 2026-11-04 vers 23:50 UTC. Scripts dans
`~/.claude/swarm-runs/astra-audit-2026-11-05/guides/` (voir [README](README.md)). Minutes
réelles depuis le départ.*

## En bref

| Forces | Faiblesses |
|---|---|
| Le croiseur est le vaisseau d'attaque le moins cher du jeu contre une planète peu défendue (2 croiseurs, 1 300, prennent une planète sans défense) | Il faut des habitants pour faire tourner les mines : on démarre lentement |
| Défense polyvalente (canons qui tirent, bouclier qui encaisse) | La planète est pleine vers 9 min (18 places) |
| La recherche de minéraux (forage) se rembourse en 2 à 4 min | Famine si on oublie la nourriture : la population meurt et la production avec |

En parties d'IA contre IA (script `ia-parties.mjs`, 3 parties par duel) : l'IA humaine **perd
3 fois sur 3 contre l'IA machine** (éliminée entre 15,9 et 20,0 min) et **gagne 3 fois sur 3
contre l'IA alien** (partie finie entre 20,6 et 27,8 min).

À trois IA (une par race, 4 parties, `ia-parties.mjs`, sortie `ia-3.out`) : **l'IA machine gagne
4 fois sur 4** ; la partie finit entre 21,6 et 30,3 min. L'IA humaine est éliminée entre 21,6 et
23,9 min, l'IA alien entre 21,0 et 30,3 min.

## Départ : tes 5 à 10 premières minutes

1. **Choisis une planète proche.** Tu apparais à 7 cases du centre ; la planète la plus proche
   est à 2 cases en médiane, 4 au plus dans 9 cas sur 10 (`limites.mjs`). Ton arche va à
   10 cases par minute : quelques secondes de trajet.
2. **Préfère une planète plus près du soleil et plus grande** : elle gèle plus tard (voir
   [limites](limites.md) §1) et a plus de places. Le climat change peu la production : de
   ×0,9 à ×1,1 pour les minéraux.
3. **Loge d'abord, creuse ensuite.** Le meilleur ordre trouvé (recherche par simulation,
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
| Meilleur trouvé (ci-dessus) | **835** | 854 | 857 | 111 |
| Ordre de l'IA | 720 | 830 | 855 | 80 |
| Le moins cher d'abord | 522 | 611 | — | 81 (6 min de pénurie) |

*Scripts `depart.mjs` (sortie `depart-human.out`) et `depart-check.mjs` (`depart-check.out`).*

4. **Attention vers 14 min** : avec cet ordre, la nourriture et l'énergie passent dans le
   rouge après 15 min (−39 nourriture/min, −21 énergie/min) ; sans rien faire, 92 s de
   pénurie et 17 habitants morts avant 20 min, et l'avance sur l'IA disparaît. La planète est
   pleine : **déconstruis un niveau** (un habitat, par exemple) pour mettre une ferme et une
   centrale, ou **colonise**.
5. **Le labo tôt** : il ouvre le forage (voir plus bas), le meilleur placement du jeu.

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
- **Forage 5** ne se rembourse pas avant le froid.

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
- **Conquérir**, pas seulement « Attaquer » : la conquête prend la planète (et ses places). Il
  faut abattre la défense **et** les vaisseaux posés en un seul combat.
- **Façon la plus rapide de gagner** : *non confirmé, en attente de la mesure de la session
  `eq-ia` (joueur scripté contre l'IA)*. Ce qu'on sait déjà : l'IA humaine ne défend sa planète
  mère qu'avec ses bâtiments jusqu'à 13 min au moins (aucun vaisseau posé, `ia-parties.mjs`).

## Pièges

- **« Le moins cher d'abord »** : 6 min de pénurie dans les 15 premières minutes, et 37 % de
  minéraux en moins à 10 min que le meilleur ordre.
- **Mine sans bras** : une mine de plus que d'habitants (10 par niveau) ne rapporte rien.
- **Oublier la nourriture après 14 min** : la population meurt, la production suit.
- **Monter la défense très haut** : chaque niveau coûte 1,5 fois le précédent ; l'ennemi
  n'a besoin que de 4 à 5 frégates de plus par niveau.
- **Rester sur une seule planète pleine** : sans colonie, plus rien à construire après 9 min.

## Non confirmé

- Le « meilleur ordre » est le meilleur trouvé par une recherche locale (400 essais) sur une
  planète type, pour les minéraux à 12 min ; ce n'est pas forcément le meilleur possible, ni
  sur une autre planète.
- Les parties d'IA (3 par duel) sont peu nombreuses ; les taux de victoire de la session
  `eq-races` (plus de parties) sont attendus.
- La façon la plus rapide de gagner contre l'IA attend la mesure de `eq-ia`.
