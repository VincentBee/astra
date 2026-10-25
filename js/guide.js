// Guide par race : principes, ordres de construction et pièges.
//
// Les ordres viennent d'une recherche par simulation (règles de js/game.js) :
// on joue des milliers d'ordres possibles et on garde les meilleurs à un
// horizon donné, en écartant ceux qui provoquent une famine ou une panne juste
// après. Les heures sont approximatives : elles supposent qu'on lance chaque
// chantier dès qu'il est payable. « Le moins cher d'abord » sert de repère.
// À refaire si l'équilibrage change.

export const GUIDE = {
  human: {
    intro:
      'Tout part de la population. Au départ, 8 habitants pour 15 postes : mines et fermes tournent à moitié. Loger et alimenter avant de creuser.',
    principles: [
      'Habitat d’abord : plus de place, c’est plus d’habitants, donc plus d’ouvriers et plus d’impôt.',
      'Chaque niveau de mine demande 10 ouvriers et du courant. Une mine sans bras ni énergie ne rapporte presque rien.',
      'La réserve de nourriture tient longtemps, puis la famine arrive d’un coup : une ferme nourrit environ 30 habitants, deux environ 70. Ajoute une ferme avant d’atteindre ce seuil.',
      'Garde un solde d’énergie positif : une centrale solaire après chaque mine ou presque.',
      'Entrepôt quand un chantier coûte plus de 1 000 (vers 20 à 25 min).',
    ],
    strategies: [
      {
        name: 'Mines rapides',
        goal: 'Prendre l’avance dans les 12 premières minutes.',
        steps: [['habitat', 2, 0], ['solar', 2, 1], ['mine', 2, 3], ['mine', 3, 6], ['mine', 4, 9], ['solar', 3, 11]],
        then: 'Puis enchaîne sur « Production ».',
        result: '≈ 110 minéraux/min à 12 min, contre 55 en construisant le moins cher d’abord.',
      },
      {
        name: 'Production',
        goal: 'Le plus de minéraux à 30 min.',
        steps: [
          ['solar', 2, 0], ['habitat', 2, 1], ['habitat', 3, 6], ['mine', 2, 8], ['solar', 3, 10], ['mine', 3, 12],
          ['mine', 4, 13], ['habitat', 4, 15], ['solar', 4, 17], ['farm', 2, 17], ['mine', 5, 19], ['solar', 5, 21],
          ['mine', 6, 23], ['store', 1, 23], ['mine', 7, 25], ['habitat', 5, 27], ['mine', 8, 29],
        ],
        then: 'Ensuite : mine, solaire, et une ferme dès que le solde de nourriture baisse.',
        result: '≈ 540 minéraux/min et 90 habitants à 30 min, contre 180 et 65.',
      },
      {
        name: 'Peuplement',
        goal: 'La plus grande population à 30 min (la puissance de demain).',
        steps: [
          ['habitat', 2, 0], ['habitat', 3, 3], ['solar', 2, 5], ['mine', 2, 7], ['habitat', 4, 11], ['mine', 3, 13],
          ['solar', 3, 14], ['mine', 4, 16], ['habitat', 5, 18], ['solar', 4, 19], ['mine', 5, 21], ['mine', 6, 23],
          ['farm', 2, 23], ['solar', 5, 24], ['farm', 3, 24], ['habitat', 6, 27], ['mine', 7, 29], ['solar', 6, 30],
        ],
        then: 'Ensuite : une ferme vite (la nourriture repasse dans le rouge vers 32 min), puis habitat et ferme ensemble.',
        result: '≈ 110 habitants et 440 minéraux/min à 30 min, contre 65 et 180.',
      },
    ],
    traps: [
      'Mine, mine, mine d’entrée : pas assez d’ouvriers ni de courant. Dix minutes de pénurie, et un tiers de production en moins à 20 min.',
      'Oublier les fermes : la population grandit sur la réserve, puis meurt de faim et emporte la production avec elle.',
    ],
  },

  machine: {
    intro:
      'Tout est affaire de courant. Une foreuse consomme les deux tiers de ce que produit un réacteur du même niveau, et les chantiers coûtent aussi de l’énergie : il faut un solde positif pour en accumuler.',
    principles: [
      'Alterne foreuses et réacteurs, en gardant un solde d’énergie positif.',
      'Si l’énergie tombe à zéro, les chantiers qui en coûtent deviennent impossibles : seul un réacteur (payé en minéraux) relance la machine.',
      'Nœud de calcul vers 10 min : chaque niveau fait baisser la consommation des foreuses de 12 %.',
      'Banque de stockage quand un chantier dépasse 1 000 (vers 15 min).',
    ],
    strategies: [
      {
        name: 'Cadence',
        goal: 'Le plus de minéraux à 20 min.',
        steps: [
          ['reactor', 2, 0], ['drill', 2, 0], ['drill', 3, 2], ['reactor', 3, 3], ['reactor', 4, 5], ['drill', 4, 7],
          ['reactor', 5, 9], ['nexus', 1, 10], ['drill', 5, 12], ['drill', 6, 13], ['drill', 7, 15], ['store', 1, 16],
        ],
        then: 'Ensuite : réacteur dès que le solde d’énergie passe sous +10/min, foreuse sinon.',
        result: '≈ 450 minéraux/min à 20 min, contre 270 en construisant le moins cher d’abord.',
      },
      {
        name: 'Long terme',
        goal: 'Le plus de minéraux à 40 min.',
        steps: [
          ['drill', 2, 0], ['reactor', 2, 0], ['reactor', 3, 2], ['drill', 3, 4], ['drill', 4, 5], ['reactor', 4, 7],
          ['drill', 5, 9], ['reactor', 5, 10], ['nexus', 1, 11], ['drill', 6, 13], ['reactor', 6, 15], ['store', 1, 15],
          ['reactor', 7, 18], ['drill', 7, 20], ['nexus', 2, 21], ['drill', 8, 23], ['drill', 9, 26], ['store', 2, 28],
          ['reactor', 8, 29], ['store', 3, 31], ['drill', 10, 36],
        ],
        then: 'Un niveau de calcul toutes les 3 ou 4 foreuses.',
        result: '≈ 840 minéraux/min à 40 min, contre 560.',
      },
    ],
    traps: [
      'Deux foreuses de suite au départ : l’énergie tombe à zéro et la 3e foreuse ne se paie plus jamais. Panne jusqu’au prochain réacteur.',
      'Vider l’énergie dans un gros chantier : les foreuses s’arrêtent le temps de la reconstituer.',
    ],
  },

  alien: {
    intro:
      'Au départ, personne ne peut naître : le sanctuaire est vide. Chaque psionique rapporte beaucoup, mais mange et consomme de l’énergie. Chaque naissance se prépare.',
    principles: [
      'Sanctuaire en tout premier : chaque niveau permet une naissance, et une naissance prend environ 8 min.',
      'Chaque psionique consomme 7 nourriture et 7 énergie par minute : avant qu’il naisse, vérifie que les deux soldes dépassent +7.',
      'Les prismes paient tout : la vie des psioniques, l’amplificateur et les pouvoirs. On en construit beaucoup.',
      'L’amplificateur multiplie l’extraction de tous les psioniques : plus ils sont nombreux, plus il rapporte.',
      'Arrachement à chaque recharge si l’énergie le permet. Transe quand l’énergie déborde.',
    ],
    strategies: [
      {
        name: 'Éveil',
        goal: 'Le plus de minéraux à 20 min, avec l’arrachement seulement.',
        steps: [
          ['sanctuary', 1, 0], ['prism', 2, 1], ['prism', 3, 4], ['amplifier', 1, 5], ['prism', 4, 6], ['sanctuary', 2, 8],
          ['amplifier', 2, 10], ['prism', 5, 11], ['amplifier', 3, 13], ['sanctuary', 3, 16], ['amplifier', 4, 18], ['hive', 2, 19],
        ],
        then: 'Ensuite : ruche avant le 5e psionique, puis sanctuaire et amplificateur.',
        result: '≈ 220 minéraux/min et 4 psioniques à 20 min, contre 80 et 3.',
      },
      {
        name: 'Transe',
        goal: 'Arrachement et transe à chaque recharge, sur 25 min.',
        steps: [
          ['sanctuary', 1, 0], ['prism', 2, 1], ['prism', 3, 4], ['prism', 4, 5], ['sanctuary', 2, 7], ['amplifier', 1, 7],
          ['prism', 5, 10], ['amplifier', 2, 11], ['prism', 6, 13], ['amplifier', 3, 14], ['sanctuary', 3, 16], ['prism', 7, 18],
          ['store', 1, 19], ['hive', 2, 19], ['amplifier', 4, 19], ['amplifier', 5, 23],
        ],
        then: 'Plus de prismes que les autres stratégies : ils paient les pouvoirs.',
        result: 'Score ≈ 80 à 25 min, contre 18 en construisant le moins cher d’abord.',
      },
      {
        name: 'Essaim',
        goal: 'Le plus de psioniques à 30 min.',
        steps: [
          ['sanctuary', 1, 0], ['prism', 2, 1], ['prism', 3, 4], ['prism', 4, 5], ['hive', 2, 6], ['sanctuary', 2, 7],
          ['sanctuary', 3, 12], ['prism', 5, 13], ['amplifier', 1, 13], ['amplifier', 2, 15], ['prism', 6, 16], ['store', 1, 17],
          ['amplifier', 3, 19], ['sanctuary', 4, 22], ['prism', 7, 23], ['prism', 8, 25], ['amplifier', 4, 27], ['amplifier', 5, 29],
        ],
        then: 'Avec les deux pouvoirs à chaque recharge.',
        result: '≈ 5,6 psioniques (la puissance de 670 humains) à 30 min, contre 3.',
      },
    ],
    traps: [
      'Amplificateur en premier : il coûte et consomme de l’énergie, et sans sanctuaire il n’amplifie que deux psioniques.',
      'Laisser naître sans nourriture ni énergie : les psioniques dépérissent et l’extraction s’arrête avec eux.',
    ],
  },
};
