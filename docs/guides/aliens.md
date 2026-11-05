# ✦ Guide des aliens

Une poignée de psioniques, chacun très fort. Pas de mines : ils arrachent les minéraux par la
pensée. Chaque psionique mange et consomme de l'énergie, et il en naît peu.

*Chiffres mesurés sur le commit `15ca511`, le 2026-11-04 vers 23:55 UTC. Scripts dans
`~/.claude/swarm-runs/astra-audit-2026-11-05/guides/` (voir [README](README.md)). Minutes
réelles depuis le départ.*

## En bref

| Forces | Faiblesses |
|---|---|
| Les pouvoirs : **+45 % à +90 % de minéraux** à 10 min, +24 % sur toute la partie | Économie la plus lente au départ (650 minéraux/min à 12 min au mieux, sans pouvoirs) |
| La défense la plus dure du jeu (le dôme) | Défense chère : chaque niveau coûte 1,6 fois le précédent |
| Vaisseaux à longue portée (50 cases) et dards solides | Vaisseaux lents (léviathan 10 cases/min) et chers |

Taux de victoire en parties d'IA contre IA :

| Contre | Parties | Victoires | Durée médiane | Si elle perd : éliminée vers |
|---|---|---|---|---|
| IA humaine | 40 | 1 (2,5 %) | 25,1 min | 24,9 min, par conquête |
| IA machine | 39 | 0 | 18,9 min | 18,9 min, par conquête |
| 3 joueurs (humain, machine, alien) | 117 | 5 (4,3 %) | 27,8 min | 24,2 min |

*Session `eq-races` (`eq-races/sim.mjs`, 297 parties d'IA contre IA, 20 cartes, froid réel ; champ `guide` de `eq-races.json`).* L'ordre de construction de l'IA alien est aussi le plus éloigné du
meilleur ordre trouvé (ci-dessous) : un joueur fait beaucoup mieux qu'elle.

À trois IA (une par race, 4 parties, `ia-parties.mjs`, sortie `ia-3.out`) : **l'IA machine gagne
4 fois sur 4** ; la partie finit entre 21,6 et 30,3 min. L'IA humaine est éliminée entre 21,6 et
23,9 min, l'IA alien entre 21,0 et 30,3 min.

## Départ : tes 5 à 10 premières minutes

1. **Choisis une planète proche** (2 cases en médiane depuis ton point d'apparition), plutôt
   **chaude mais pas brûlante** (elle gèle plus tard, mais trop près du soleil la nourriture
   baisse) et **grande** (plus de places). Minéraux extraits sur une partie (`eq-eco`) :
   24 456 à chaleur 0,4, **34 066 à 0,7**, 28 294 à 0,9.
2. **Le plus fort : prismes, pouvoirs, amplificateurs, et la recherche.** Ordre optimisé par
   la session `eq-eco` (objectif : minéraux extraits en 32 min ; planète de 18 places,
   chaleur 0,7 ; R = recherche ; pouvoirs dès qu'ils sont prêts, sauf la transe quand
   l'entrepôt est presque plein) :

   prisme 2 · ruche 2 · transe · prisme 3 · arrachement · sanctuaire 1 (1,1 min) ·
   amplificateur 1 (1,8) · prisme 4 · amplificateur 2 (3,2) · sanctuaire 2 (3,6) ·
   amplificateur 3 (4,9) · bassin 1 (5,1) · R écho 1 à 3 · prisme 5 · R symbiose 1 et 2 ·
   sanctuaire 3 (7,7) · amplificateur 4 (8,8) · réserve 1 · R écho 4

   **854 minéraux/min à 10 min, contre 435 pour l'IA** (champ `guide.depart` de
   `eq-eco.json`, scripts dans `eq-eco/`). Cet ordre ne prépare ni bassin 2 ni couveuse : ni
   colonie ni vaisseau avant 10 min.
3. **Sans pouvoirs ni recherche, avec bassin 2 et couveuse avant 11,5 min**, le meilleur ordre
   que j'ai trouvé
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
| Mon ordre (ci-dessus, sans pouvoirs ni recherche) | **553** | 650 | 650 | 5 |
| Ordre de l'IA | 331 | 331 | 411 | 4,5 |
| Le moins cher d'abord | 241 | 252 | — | 3 |

*Scripts `depart.mjs` (`depart-alien.out`) et `depart-check.mjs` (`depart-check.out`) : pas
de famine ni de panne jusqu'à 20 min avec cet ordre.*

*Les deux mesures n'utilisent pas la même planète (chaleur 0,7 chez `eq-eco`, 0,59 ici) : les
chiffres de l'IA diffèrent un peu entre les deux.*

4. **Pourquoi l'IA fait moins bien** : elle monte d'abord ruche et prismes (nourriture et
   énergie), et son premier amplificateur n'arrive qu'à 6,5 min. Or l'amplificateur multiplie
   ce que rapportent **tous** les psioniques.
5. **Il te reste 2 places sur 18** à 15 min : de quoi mettre épines 1 et dôme 1 sans rien
   perdre en production (`depart-variantes.out`).
6. **Déclenche tes pouvoirs à chaque recharge** (voir plus bas).

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

Une autre mesure, sur une planète type où les minéraux sont retirés au fur et à mesure (pas de
plafond d'entrepôt ; session `eq-tech`, `eq-tech/powers.out`) : **arrachement +55 %, transe
+35 %, les deux +90 %** à 10 min, pour environ 158 d'énergie par minute. À titre de
comparaison, écho tellurique 5 (3 957 de recherches) ne donne que +48 %. **Les pouvoirs sont le
meilleur investissement des aliens.**

- **Quand l'énergie est juste** (ma mesure, ordre de l'IA), les deux ensemble rapportent à
  peine plus qu'un seul : ils se disputent l'énergie. Garde alors l'arrachement.
- **Quand l'énergie suffit** (mesure `eq-tech`), les deux ensemble presque doublent tes
  minéraux.
- Par point d'énergie, la transe rapporte plus ; par minute, l'arrachement rapporte plus
  (voir [questions](questions.md), q-21).
- **Sur toute une partie, le gain baisse** : +24 % avec les deux pouvoirs sur 32 min (mesure
  `eq-eco`, `eq-eco/q-pouvoirs-absence.mjs`), car l'entrepôt se remplit et la planète est
  pleine vers 13 à 14 min. Le gros du gain est au début.
- **Ne lance jamais la transe entrepôt plein** : le surplus est perdu (l'IA le fait, `eq-eco`).
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
  +17,5 par minute. Un psionique met environ 3,3 min à naître (`eq-eco`).

**Sur toute une partie** (session `eq-tech`, 16 parties d'IA, ressources gagnées de 10 à 29 min
pour un niveau acheté à 10 min, divisées par son prix ; champ `guide` de `eq-tech.json`) :

| Écho 1 | Symbiose 1 | Écho 2 | Symbiose 2 | Écho 3 | Symbiose 3 | Écho 4 | Symbiose 4 | Écho et symbiose 5 |
|---|---|---|---|---|---|---|---|---|
| ×5,0 | ×5,0 | ×3,0 | ×2,9 | ×1,7 | ×1,7 | ×1,0 | ×1,0 | jamais remboursé |

Écho 4 et symbiose 4 ne se remboursent que s'ils sont achetés avant 10,5 min.

**Bâtiments, d'après `eq-eco`** : prisme et ruche 2 à 5 remboursés en 1,2 à 2,8 min (en énergie
et nourriture), amplificateur 1 à 3 en 1,3 à 6 min **avec pouvoirs** (2,7 à 7,8 sans),
sanctuaire 2 et 3 en 4,1 à 7,4 min s'il va avec un prisme, amplificateur 4 et 5 en 7 et 12 min
avec pouvoirs ; amplificateur 6 et plus, sanctuaire 4 et plus seul : jamais avant le gel.

**Technologies militaires** (`eq-tech`, `eq-combat`) : un niveau d'attaque ou de coque ne vaut
qu'environ +5 % de flotte. Le niveau 3 n'est rentable qu'au-delà de 15 600 à 31 800 de vaisseaux
de guerre construits dans la partie ; les niveaux 4 et 5 ne le sont pour aucune race. Les IA
construisent en médiane 4 400 (humains), 28 500 (machines), 4 100 (aliens) de vaisseaux.

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
- **Flotte contre flotte, à prix égal** (`eq-tech`, `eq-combat`) : le croiseur bat la frégate,
  le léviathan bat le dard ; le destroyer perd contre le drone d'assaut.
- **Les lourds ne perdent rien contre une défense faible** : une flotte qui abat la défense en
  1 ou 2 passes ne perd aucun vaisseau si l'attaque de la défense × les passes reste sous la
  coque d'un de ses vaisseaux ; les lourds sont ainsi intouchables par les défenses d'IA
  vues en partie (⚔ 45 à 70) (`eq-combat`).
- Tes vaisseaux coûtent de la **nourriture** : prévois des ruches avant de lancer un lot.
- **Le plus vite possible** (`eq-tech/rush.mjs`, meilleur ordre trouvé, sans pouvoirs, vaisseau
  fini, minutes depuis la fondation) : **1er dard à 10,1 min** avec prisme, amplificateur,
  bassin 1 et 2, sanctuaire, lévitation 1, ruche, dard 1, couveuse ; 1re graine-ruche à
  11,9 min ; 1er léviathan à 18,1 min. L'IA alien commande son premier dard vers 22,4 min
  et ne fait jamais de léviathan.
- **Colonise tôt** (`eq-eco`, `eq-eco/q-colonies.mjs`) : une colonie fondée à 8 min extrait
  22 571 minéraux jusqu'à son gel, à 16 min 13 264 ; son colonisateur se rembourse en 1 à
  2,5 min. Toute colonie fondée plus de 3 min avant son gel vaut le coup.
- **Après 18 min, il ne reste que 2 planètes libres** sur la carte (médiane, `eq-combat`) :
  pour grandir, il faut conquérir. Avec des léviathans, prendre une colonie d'IA ne coûte
  aucune perte (`eq-combat`).
- **Façon la plus rapide de gagner** (mesure `eq-races`) : les aliens gagnent rarement entre IA
  (1 victoire en 30,5 min contre 1 IA, médiane 33,6 min pour 5 victoires contre 3 IA). Comme pour
  les autres races, **coloniser d'abord bat la guerre d'abord**. Le meilleur départ (plus haut)
  donne presque 2 fois la production de l'IA alien : un joueur fait bien mieux qu'elle
  (*non confirmé face à un vrai joueur*).

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
- Les taux de victoire sont ceux de l'IA contre l'IA : un vrai joueur joue autrement.
- La façon la plus rapide de gagner a été mesurée avec des joueurs scriptés (`eq-races`), pas
  avec un vrai joueur.
