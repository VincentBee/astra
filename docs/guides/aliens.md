# ✦ Guide des aliens

Une poignée de psioniques, chacun très fort. Pas de mines : ils arrachent les minéraux par la
pensée. Chaque psionique mange et consomme de l'énergie, et il en naît peu.

*Chiffres mesurés sur le commit `15ca511`, le 2026-11-04 vers 23:55 UTC. Scripts dans
`~/.claude/swarm-runs/astra-audit-2026-11-05/guides/` (voir [README](README.md)). Minutes
réelles depuis le départ.*

## En bref

| Forces | Faiblesses |
|---|---|
| Les pouvoirs : environ **+45 % de minéraux** à 10 et 14 min | Économie la plus lente au départ (650 minéraux/min à 12 min au mieux, sans pouvoirs) |
| La défense la plus dure du jeu (le dôme) | Défense chère : chaque niveau coûte 1,6 fois le précédent |
| Vaisseaux à longue portée (50 cases) et dards solides | Vaisseaux lents (léviathan 10 cases/min) et chers |

En parties d'IA contre IA (script `ia-parties.mjs`, 3 parties par duel) : **l'IA alien a perdu
ses 6 parties**, contre l'IA humaine (fin entre 20,6 et 27,8 min) et contre l'IA machine (fin
entre 17,0 et 19,8 min). L'ordre de construction de l'IA alien est aussi le plus éloigné du
meilleur ordre trouvé (ci-dessous) : un joueur fait beaucoup mieux qu'elle.

À trois IA (une par race, 4 parties, `ia-parties.mjs`, sortie `ia-3.out`) : **l'IA machine gagne
4 fois sur 4** ; la partie finit entre 21,6 et 30,3 min. L'IA humaine est éliminée entre 21,6 et
23,9 min, l'IA alien entre 21,0 et 30,3 min.

## Départ : tes 5 à 10 premières minutes

1. **Choisis une planète proche** (2 cases en médiane depuis ton point d'apparition), plutôt
   **près du soleil** (elle gèle plus tard) et **grande** (plus de places).
2. **Sanctuaire en premier, puis prismes et amplificateur.** Le meilleur ordre trouvé
   (`depart.mjs`, planète type de 18 places, **sans pouvoirs**) :

| # | Chantier | Vers |
|---|---|---|
| 1 | Sanctuaire 1 | 0 min |
| 2 | Prisme psionique 2 | 0,6 min |
| 3 | Prisme psionique 3 | 1,5 min |
| 4 | Amplificateur psychique 1 | 2,3 min |
| 5 | Sanctuaire 2 | 3,7 min |
| 6 | Amplificateur psychique 2 | 4,6 min |
| 7 | Sanctuaire 3 | 6,5 min |
| 8 | Bassin de songe (labo) 1 | 7,1 min |
| 9 | Ruche nourricière 2 | 7,3 min |
| 10 | Amplificateur psychique 3 | 8,3 min |
| 11 | Prisme psionique 4 | 8,7 min |
| 12 | Couveuse astrale (chantier) 1 | 9,2 min |
| 13 | Amplificateur psychique 4 | 10,5 min |
| 14 | Bassin de songe 2 | 11,1 min |

*Minutes de lancement mesurées (`depart-logs.mjs`, sortie `depart-logs.out`).*

| Ordre (sans pouvoirs) | Minéraux/min à 10 min | à 12 min | à 20 min | Psioniques à 15 min |
|---|---|---|---|---|
| Meilleur trouvé (ci-dessus) | **553** | 650 | 650 | 5 |
| Ordre de l'IA | 331 | 331 | 411 | 4,5 |
| Le moins cher d'abord | 241 | 252 | — | 3 |

*Scripts `depart.mjs` (`depart-alien.out`) et `depart-check.mjs` (`depart-check.out`) : pas
de famine ni de panne jusqu'à 20 min avec cet ordre.*

3. **Pourquoi l'IA fait moins bien** : elle monte d'abord ruche et prismes (nourriture et
   énergie), et son premier amplificateur n'arrive qu'à 6,5 min. Or l'amplificateur multiplie
   ce que rapportent **tous** les psioniques.
4. **Il te reste 2 places sur 18** à 15 min : de quoi mettre épines 1 et dôme 1 sans rien
   perdre en production (`depart-variantes.out`).
5. **Déclenche tes pouvoirs à chaque recharge** (voir plus bas).

## Les pouvoirs

Arrachement toutes les 72 s, transe toutes les 144 s (pendant 48 s). Mesure sur l'ordre de
l'IA, pouvoirs déclenchés dès qu'ils sont prêts, en gardant 60 d'énergie (`pouvoirs.mjs`,
sortie `pouvoirs.out`) :

| Pouvoirs | Minéraux gagnés à 10 min | à 14 min |
|---|---|---|
| Aucun | 2 410 | 3 743 |
| Arrachement seul | 3 443 (+43 %) | 5 406 (+44 %) |
| Transe seule | 3 303 (+37 %) | 5 338 (+43 %) |
| Les deux | **3 555 (+48 %)** | **5 557 (+48 %)** |

- **Les deux pouvoirs ensemble rapportent à peine plus qu'un seul** : ils se disputent
  l'énergie. Si l'énergie est juste, garde l'arrachement.
- L'arrachement ne marche pas si l'entrepôt de minéraux est plein : dépense avant.
- Après 14 min, la planète de 18 places est pleine et l'entrepôt plafonne : les pouvoirs ne
  servent que si tu dépenses (vaisseaux, colonies).

## Investissements rentables

« Remboursé » : temps pour que les minéraux en plus paient le prix. Mesuré sur la planète de
l'IA à 5, 10 et 18 min, un seul niveau ajouté, **sans pouvoirs** (`roi.mjs`, `roi-tech.mjs`) :

| Investissement | Prix | Minéraux en plus / min | Remboursé en |
|---|---|---|---|
| Écho tellurique 1 (techno) | 210 | +19 à +56 | 3,8 à 11 min |
| Amplificateur (niveau 1 et 2) | 220 et 374 | +48 et +64 | **4,7 et 6 min** |
| Sanctuaire (niveau 2 et 3) | 418 et 793 | +57 et +71 | 8,3 et 11,7 min |
| Écho tellurique 2 | 357 | +32 | 11,3 min |
| Amplificateur 4 | 1 080 | +80 | 13,7 min |
| Sanctuaire 4, écho 3 à 5 | 606 à 1 753 | +32 à +99 | plus de 15 min |
| Ruche, prisme, symbiose | — | 0 tant qu'il ne manque rien | seulement en cas de pénurie |

À retenir :

- **Les deux premiers amplificateurs sont le meilleur placement** des aliens.
- **Un sanctuaire, c'est une naissance de plus** : il paie lentement (8 à 12 min), car un
  psionique met du temps à naître, puis mange 17,5 de nourriture et 17,5 d'énergie par minute
  (7 par heure de jeu, `js/game.js`).
- **L'écho tellurique paie moins** que le forage des autres races : il ne renforce pas
  l'arrachement (seulement l'extraction continue).
- Avant chaque naissance, vérifie que les soldes de nourriture et d'énergie dépassent
  +17,5 par minute.

## Défendre

Les aliens ont la défense la plus dure. Seuils exacts pour une planète de 15 niveaux
ordinaires, 4 psioniques et *k* niveaux d'épines **et** de dôme (`defense.mjs`, tableau complet
dans [limites](limites.md) §4) :

| *k* | Prix de ta défense | Il faut à l'ennemi au moins… (lot le moins cher) |
|---|---|---|
| 0 | 0 | 2 croiseurs, 12 drones ou 5 dards (dès 1 300) |
| 1 | 540 | 15 frégates, 21 drones ou 11 dards (dès 2 730) |
| 2 | 1 404 | 22 frégates, 32 drones ou 15 dards (dès 4 160) |
| 3 | 2 785 | 30 frégates, 42 drones ou 20 dards (dès 5 460) |
| 4 | 4 995 | 37 frégates, 52 drones ou 25 dards (dès 6 760) |
| 6 | 14 193 | 51 frégates, 72 drones ou 35 dards (dès 9 360) |

- **Un ou deux niveaux de chaque suffisent souvent** : à *k* = 2, il faut déjà 3 fois plus
  d'attaque que contre une planète nue. Au-delà de *k* = 4, la défense coûte plus que la
  flotte qui la prend (*k* = 6 : 14 193 contre 9 360).
- **Les épines mordent plus avec plus de psioniques** (+1 d'attaque par psionique et par
  niveau).
- **Des dards posés comptent** : 6 dards posés sur la planète *k* = 2 font passer le seuil de
  22 à 36 frégates ennemies (`defense.mjs`).
- Tes technologies renforcent tes vaisseaux, **pas** tes épines ni ton dôme.

## Attaquer et gagner

**Débloquer** (`deblocage.mjs`) : le dard demande bassin 1 et 2, couveuse 1, lévitation 1 et
dard psionique 1, soit **1 726**. Le léviathan : carapace chitineuse 2 en plus, soit
**3 211**. La graine-ruche (colonies) : **2 263**.

| Vaisseau | ⚔ | ◇ | Vitesse | Portée d'un plein | Prix | 10 à la couveuse 1 |
|---|---|---|---|---|---|---|
| Dard | 18 | 40 | 17,5 cases/min | 50 cases | 260 min. + 80 nourr. | 45 s |
| Léviathan | 60 | 200 | 10 cases/min | 50 cases | 900 min. + 270 nourr. | 156 s |
| Graine-ruche | 0 | 60 | 10 cases/min | 50 cases | 390 min. + 120 nourr. | 68 s |

- **Le dard est ton meilleur attaquant** : 5 dards (1 700) prennent une planète sans
  défense ; il a la plus longue portée des chasseurs.
- **Le léviathan est trop lent pour poursuivre**, mais contre une planète il vaut à peu près
  le dard à prix égal (`defense.out`).
- Tes vaisseaux coûtent de la **nourriture** : prévois des ruches avant de lancer un lot.
- **Façon la plus rapide de gagner contre l'IA** : *non confirmé, en attente de la mesure de
  la session `eq-ia` (joueur scripté)*.

## Pièges

- **Ruches et prismes d'abord** (ce que fait l'IA) : 40 % de minéraux en moins à 10 min que
  le meilleur ordre.
- **« Le moins cher d'abord »** : moins de la moitié des minéraux du meilleur ordre à 10 min
  (241 contre 553 par minute).
- **Laisser naître sans nourriture ni énergie** : les psioniques dépérissent et l'extraction
  s'arrête avec eux.
- **Oublier les pouvoirs** : environ un tiers de tes minéraux perdus.
- **Défense très haute** : épines 8 et dôme 8 coûtent 37 744 ; 92 drones (11 960) les
  prennent quand même.

## Non confirmé

- Le meilleur ordre a été cherché **sans pouvoirs** ; avec les pouvoirs, l'ordre idéal peut
  être un peu différent.
- Le « meilleur ordre » vient d'une recherche locale (400 essais) sur une planète type.
- 3 parties par duel d'IA : peu. Les taux de victoire de `eq-races` sont attendus.
- La façon la plus rapide de gagner contre l'IA attend la mesure de `eq-ia`.
