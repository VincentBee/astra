# Guide des races

Principes, ordres de construction et pièges pour chaque race, puis les flottes et le voyage spatial (en fin de guide).

Les ordres viennent d’une recherche par simulation (règles de `js/game.js`) : on joue des milliers d’ordres possibles et on garde les meilleurs à un horizon donné, en écartant ceux qui provoquent une famine ou une panne juste après. Les heures sont approximatives : elles supposent qu’on lance chaque chantier dès qu’il est payable. « Le moins cher d’abord » sert de repère. **À refaire si l’équilibrage change.**

> Ces ordres datent d’avant les gisements, la recherche et les vaisseaux : ils supposent une extraction sans limite et ne comptent ni labo ni chantier naval. Sur une planète au gisement maigre, l’extraction plafonne plus tôt.
>
> Le carburant des flottes ne change pas ces ordres : il ne coûte de l’énergie qu’au moment où l’on fait le plein. Si tu comptes faire voler des flottes, prévois une ou deux centrales de plus (voir « Flottes et voyage »).

## ◆ Humains

Tout part de la population. Au départ, 8 habitants pour 15 postes : mines et fermes tournent à moitié. Loger et alimenter avant de creuser.

### Principes

- Habitat d’abord : plus de place, c’est plus d’habitants, donc plus d’ouvriers et plus d’impôt.
- Chaque niveau de mine demande 10 ouvriers et du courant. Une mine sans bras ni énergie ne rapporte presque rien.
- La réserve de nourriture tient longtemps, puis la famine arrive d’un coup : une ferme nourrit environ 30 habitants, deux environ 70. Ajoute une ferme avant d’atteindre ce seuil.
- Garde un solde d’énergie positif : une centrale solaire après chaque mine ou presque.
- Entrepôt quand un chantier coûte plus de 1 000 (vers 20 à 25 min).

### Ordres de construction

#### Mines rapides

*Prendre l’avance dans les 12 premières minutes.*

| # | Chantier | Quand |
|---|---|---|
| 1 | Habitat 2 | tout de suite |
| 2 | Centrale solaire 2 | vers 1 min |
| 3 | Mine 2 | vers 3 min |
| 4 | Mine 3 | vers 6 min |
| 5 | Mine 4 | vers 9 min |
| 6 | Centrale solaire 3 | vers 11 min |

Puis enchaîne sur « Production ».

**Résultat :** ≈ 110 minéraux/min à 12 min, contre 55 en construisant le moins cher d’abord.

#### Production

*Le plus de minéraux à 30 min.*

| # | Chantier | Quand |
|---|---|---|
| 1 | Centrale solaire 2 | tout de suite |
| 2 | Habitat 2 | vers 1 min |
| 3 | Habitat 3 | vers 6 min |
| 4 | Mine 2 | vers 8 min |
| 5 | Centrale solaire 3 | vers 10 min |
| 6 | Mine 3 | vers 12 min |
| 7 | Mine 4 | vers 13 min |
| 8 | Habitat 4 | vers 15 min |
| 9 | Centrale solaire 4 | vers 17 min |
| 10 | Ferme hydroponique 2 | vers 17 min |
| 11 | Mine 5 | vers 19 min |
| 12 | Centrale solaire 5 | vers 21 min |
| 13 | Mine 6 | vers 23 min |
| 14 | Entrepôt 1 | vers 23 min |
| 15 | Mine 7 | vers 25 min |
| 16 | Habitat 5 | vers 27 min |
| 17 | Mine 8 | vers 29 min |

Ensuite : mine, solaire, et une ferme dès que le solde de nourriture baisse.

**Résultat :** ≈ 540 minéraux/min et 90 habitants à 30 min, contre 180 et 65.

#### Peuplement

*La plus grande population à 30 min (la puissance de demain).*

| # | Chantier | Quand |
|---|---|---|
| 1 | Habitat 2 | tout de suite |
| 2 | Habitat 3 | vers 3 min |
| 3 | Centrale solaire 2 | vers 5 min |
| 4 | Mine 2 | vers 7 min |
| 5 | Habitat 4 | vers 11 min |
| 6 | Mine 3 | vers 13 min |
| 7 | Centrale solaire 3 | vers 14 min |
| 8 | Mine 4 | vers 16 min |
| 9 | Habitat 5 | vers 18 min |
| 10 | Centrale solaire 4 | vers 19 min |
| 11 | Mine 5 | vers 21 min |
| 12 | Mine 6 | vers 23 min |
| 13 | Ferme hydroponique 2 | vers 23 min |
| 14 | Centrale solaire 5 | vers 24 min |
| 15 | Ferme hydroponique 3 | vers 24 min |
| 16 | Habitat 6 | vers 27 min |
| 17 | Mine 7 | vers 29 min |
| 18 | Centrale solaire 6 | vers 30 min |

Ensuite : une ferme vite (la nourriture repasse dans le rouge vers 32 min), puis habitat et ferme ensemble.

**Résultat :** ≈ 110 habitants et 440 minéraux/min à 30 min, contre 65 et 180.

### Pièges

- Mine, mine, mine d’entrée : pas assez d’ouvriers ni de courant. Dix minutes de pénurie, et un tiers de production en moins à 20 min.
- Oublier les fermes : la population grandit sur la réserve, puis meurt de faim et emporte la production avec elle.

## ⬢ Machines

Tout est affaire de courant. Une foreuse consomme les deux tiers de ce que produit un réacteur du même niveau, et les chantiers coûtent aussi de l’énergie : il faut un solde positif pour en accumuler.

### Principes

- Alterne foreuses et réacteurs, en gardant un solde d’énergie positif.
- Si l’énergie tombe à zéro, les chantiers qui en coûtent deviennent impossibles : seul un réacteur (payé en minéraux) relance la machine.
- Nœud de calcul vers 10 min : chaque niveau fait baisser la consommation des foreuses de 12 %.
- Banque de stockage quand un chantier dépasse 1 000 (vers 15 min).

### Ordres de construction

#### Cadence

*Le plus de minéraux à 20 min.*

| # | Chantier | Quand |
|---|---|---|
| 1 | Réacteur à fusion 2 | tout de suite |
| 2 | Foreuse automatisée 2 | tout de suite |
| 3 | Foreuse automatisée 3 | vers 2 min |
| 4 | Réacteur à fusion 3 | vers 3 min |
| 5 | Réacteur à fusion 4 | vers 5 min |
| 6 | Foreuse automatisée 4 | vers 7 min |
| 7 | Réacteur à fusion 5 | vers 9 min |
| 8 | Nœud de calcul 1 | vers 10 min |
| 9 | Foreuse automatisée 5 | vers 12 min |
| 10 | Foreuse automatisée 6 | vers 13 min |
| 11 | Foreuse automatisée 7 | vers 15 min |
| 12 | Banque de stockage 1 | vers 16 min |

Ensuite : réacteur dès que le solde d’énergie passe sous +10/min, foreuse sinon.

**Résultat :** ≈ 450 minéraux/min à 20 min, contre 270 en construisant le moins cher d’abord.

#### Long terme

*Le plus de minéraux à 40 min.*

| # | Chantier | Quand |
|---|---|---|
| 1 | Foreuse automatisée 2 | tout de suite |
| 2 | Réacteur à fusion 2 | tout de suite |
| 3 | Réacteur à fusion 3 | vers 2 min |
| 4 | Foreuse automatisée 3 | vers 4 min |
| 5 | Foreuse automatisée 4 | vers 5 min |
| 6 | Réacteur à fusion 4 | vers 7 min |
| 7 | Foreuse automatisée 5 | vers 9 min |
| 8 | Réacteur à fusion 5 | vers 10 min |
| 9 | Nœud de calcul 1 | vers 11 min |
| 10 | Foreuse automatisée 6 | vers 13 min |
| 11 | Réacteur à fusion 6 | vers 15 min |
| 12 | Banque de stockage 1 | vers 15 min |
| 13 | Réacteur à fusion 7 | vers 18 min |
| 14 | Foreuse automatisée 7 | vers 20 min |
| 15 | Nœud de calcul 2 | vers 21 min |
| 16 | Foreuse automatisée 8 | vers 23 min |
| 17 | Foreuse automatisée 9 | vers 26 min |
| 18 | Banque de stockage 2 | vers 28 min |
| 19 | Réacteur à fusion 8 | vers 29 min |
| 20 | Banque de stockage 3 | vers 31 min |
| 21 | Foreuse automatisée 10 | vers 36 min |

Un niveau de calcul toutes les 3 ou 4 foreuses.

**Résultat :** ≈ 840 minéraux/min à 40 min, contre 560.

### Pièges

- Deux foreuses de suite au départ : l’énergie tombe à zéro et la 3e foreuse ne se paie plus jamais. Panne jusqu’au prochain réacteur.
- Vider l’énergie dans un gros chantier : les foreuses s’arrêtent le temps de la reconstituer.

## ✦ Aliens

Au départ, personne ne peut naître : le sanctuaire est vide. Chaque psionique rapporte beaucoup, mais mange et consomme de l’énergie. Chaque naissance se prépare.

### Principes

- Sanctuaire en tout premier : chaque niveau permet une naissance, et une naissance prend environ 8 min.
- Chaque psionique consomme 7 nourriture et 7 énergie par minute : avant qu’il naisse, vérifie que les deux soldes dépassent +7.
- Les prismes paient tout : la vie des psioniques, l’amplificateur et les pouvoirs. On en construit beaucoup.
- L’amplificateur multiplie l’extraction de tous les psioniques : plus ils sont nombreux, plus il rapporte.
- Arrachement à chaque recharge si l’énergie le permet. Transe quand l’énergie déborde.

### Ordres de construction

#### Éveil

*Le plus de minéraux à 20 min, avec l’arrachement seulement.*

| # | Chantier | Quand |
|---|---|---|
| 1 | Sanctuaire 1 | tout de suite |
| 2 | Prisme psionique 2 | vers 1 min |
| 3 | Prisme psionique 3 | vers 4 min |
| 4 | Amplificateur psychique 1 | vers 5 min |
| 5 | Prisme psionique 4 | vers 6 min |
| 6 | Sanctuaire 2 | vers 8 min |
| 7 | Amplificateur psychique 2 | vers 10 min |
| 8 | Prisme psionique 5 | vers 11 min |
| 9 | Amplificateur psychique 3 | vers 13 min |
| 10 | Sanctuaire 3 | vers 16 min |
| 11 | Amplificateur psychique 4 | vers 18 min |
| 12 | Ruche nourricière 2 | vers 19 min |

Ensuite : ruche avant le 5e psionique, puis sanctuaire et amplificateur.

**Résultat :** ≈ 220 minéraux/min et 4 psioniques à 20 min, contre 80 et 3.

#### Transe

*Arrachement et transe à chaque recharge, sur 25 min.*

| # | Chantier | Quand |
|---|---|---|
| 1 | Sanctuaire 1 | tout de suite |
| 2 | Prisme psionique 2 | vers 1 min |
| 3 | Prisme psionique 3 | vers 4 min |
| 4 | Prisme psionique 4 | vers 5 min |
| 5 | Sanctuaire 2 | vers 7 min |
| 6 | Amplificateur psychique 1 | vers 7 min |
| 7 | Prisme psionique 5 | vers 10 min |
| 8 | Amplificateur psychique 2 | vers 11 min |
| 9 | Prisme psionique 6 | vers 13 min |
| 10 | Amplificateur psychique 3 | vers 14 min |
| 11 | Sanctuaire 3 | vers 16 min |
| 12 | Prisme psionique 7 | vers 18 min |
| 13 | Réserve organique 1 | vers 19 min |
| 14 | Ruche nourricière 2 | vers 19 min |
| 15 | Amplificateur psychique 4 | vers 19 min |
| 16 | Amplificateur psychique 5 | vers 23 min |

Plus de prismes que les autres stratégies : ils paient les pouvoirs.

**Résultat :** Score ≈ 80 à 25 min, contre 18 en construisant le moins cher d’abord.

#### Essaim

*Le plus de psioniques à 30 min.*

| # | Chantier | Quand |
|---|---|---|
| 1 | Sanctuaire 1 | tout de suite |
| 2 | Prisme psionique 2 | vers 1 min |
| 3 | Prisme psionique 3 | vers 4 min |
| 4 | Prisme psionique 4 | vers 5 min |
| 5 | Ruche nourricière 2 | vers 6 min |
| 6 | Sanctuaire 2 | vers 7 min |
| 7 | Sanctuaire 3 | vers 12 min |
| 8 | Prisme psionique 5 | vers 13 min |
| 9 | Amplificateur psychique 1 | vers 13 min |
| 10 | Amplificateur psychique 2 | vers 15 min |
| 11 | Prisme psionique 6 | vers 16 min |
| 12 | Réserve organique 1 | vers 17 min |
| 13 | Amplificateur psychique 3 | vers 19 min |
| 14 | Sanctuaire 4 | vers 22 min |
| 15 | Prisme psionique 7 | vers 23 min |
| 16 | Prisme psionique 8 | vers 25 min |
| 17 | Amplificateur psychique 4 | vers 27 min |
| 18 | Amplificateur psychique 5 | vers 29 min |

Avec les deux pouvoirs à chaque recharge.

**Résultat :** ≈ 5,6 psioniques (la puissance de 670 humains) à 30 min, contre 3.

### Pièges

- Amplificateur en premier : il coûte et consomme de l’énergie, et sans sanctuaire il n’amplifie que deux psioniques.
- Laisser naître sans nourriture ni énergie : les psioniques dépérissent et l’extraction s’arrête avec eux.

## Flottes et voyage

Une flotte se pilote comme une unité : on la fait décoller, on touche une case pour l’y envoyer, on peut l’arrêter, la faire rentrer, la poser. Elle brûle son carburant (de l’énergie) à chaque case.

### Par race

Chiffres sans technologie. « Coût du plein » : en minutes de production d’énergie vers 20 min de jeu, en construisant le moins cher d’abord avec une centrale dès que le solde d’énergie passe sous +10/min (simulation sur les règles de `js/game.js`).

| Race | Portée d’un plein | Vitesse (chasseur · lourd) | Plein de 5 chasseurs | Coût du plein |
|---|---|---|---|---|
| ◆ Humains | 40 cases | 7 · 5 cases/min | 200 | ≈ 6 min |
| ⬢ Machines | 30 cases | 9 · 6 cases/min | 150 | ≈ 3 min |
| ✦ Aliens | 50 cases | 7 · 4 cases/min | 500 | ≈ 7 min |

- **Humains** : l’énergie est rare au début (+30/min vers 20 min). Un plein se prépare : une centrale solaire de plus avant la première expédition.
- **Machines** : rapides et peu chères à faire voler, mais à courte portée. Attention : l’énergie fait aussi tourner les foreuses et paie les chantiers. Un plein qui vide le stock arrête tout jusqu’au prochain réacteur.
- **Aliens** : lents et gourmands, mais une flotte pleine traverse la carte deux fois. Le stock d’énergie monte vite chez eux : on peut voyager loin.

### Principes

- **Plein partiel** : au décollage, on choisit combien d’énergie mettre. Le panneau de la flotte affiche son autonomie en cases.
- **Panne** : si le réservoir ne suffit pas, le jeu prévient (« panne en route ») avant le départ, et une croix marque l’endroit où la flotte s’arrêtera. Une flotte à sec ne bouge plus.
- **Secours** : amène une autre de tes flottes sur sa case, puis « Donner… » du carburant. Un cargo plein sert de ravitailleur.
- **Rentrer** rend le carburant restant au stock de la planète : rien n’est perdu.
- **Poursuite** : une flotte vise là où sera la cible, pas là où elle est. Une cible plus rapide qui s’éloigne n’est rattrapée qu’à son arrivée, et la poursuite s’arrête si elle sort de ta vue.
- **Détection** : tu ne vois les flottes adverses qu’à 3 cases de tes planètes et 2 de tes flottes. La 7ᵉ technologie ajoute 1 case par niveau, et elle est peu chère : un niveau ou deux tôt évitent les surprises.
- **Échanges** : une flotte arrêtée à côté d’une flotte (ou de la planète) d’un autre joueur peut lui proposer un échange de minéraux, nourriture ou carburant. Ta part et ta flotte restent bloquées jusqu’à la réponse : l’offre expire au bout de 5 min, mais sans nouvelles de l’autre téléphone, elles peuvent attendre jusqu’à 30 min.

### Pièges

- Décoller avec tout le stock d’énergie dans les réservoirs : les bâtiments manquent de courant juste après (surtout les machines).
- Poursuivre avec un croiseur ou un léviathan : trop lents pour rattraper des chasseurs.
- Garer une flotte loin de tes planètes sans détection : tu ne verras pas venir l’attaque.
- Proposer un échange depuis ta seule flotte armée : elle reste bloquée jusqu’à la réponse.
