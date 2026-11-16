/**
 * Ce que chaque race construit, cherche et arme. `steps` : niveaux à atteindre dans l'ordre
 * (le manque d'énergie, de nourriture ou de logement passe avant, voir chooseBuilding) ;
 * au-delà, l'IA monte tour à tour sa production et ses défenses. `techs` : une clé par
 * niveau voulu, dans l'ordre.
 */
export const PLAYBOOK = {
  human: {
    energy: 'solar', food: 'farm', house: 'habitat', prod: ['mine'], defense: ['cannon', 'shield'],
    steps: [['mine', 2], ['solar', 2], ['farm', 2], ['habitat', 2], ['mine', 3], ['lab', 1], ['solar', 3], ['mine', 4], ['lab', 2], ['yard', 1], ['habitat', 3], ['mine', 5], ['cannon', 1], ['farm', 3], ['store', 1], ['yard', 2], ['cannon', 2], ['shield', 1]],
    techs: ['forage', 'propulsion', 'propulsion', 'colonies', 'blindage', 'forage', 'agro', 'armement', 'armement', 'blindage', 'forage', 'armement', 'blindage', 'agro', 'forage', 'armement'],
  },
  machine: {
    energy: 'reactor', food: null, house: null, prod: ['drill', 'nexus'], defense: ['turret', 'shield'],
    steps: [['reactor', 2], ['drill', 2], ['reactor', 3], ['drill', 3], ['lab', 1], ['reactor', 4], ['drill', 4], ['lab', 2], ['yard', 1], ['nexus', 1], ['reactor', 5], ['drill', 5], ['turret', 1], ['store', 1], ['yard', 2], ['turret', 2], ['shield', 1]],
    techs: ['quantique', 'ions', 'supra', 'ions', 'replication', 'essaim', 'quantique', 'coque', 'coque', 'essaim', 'supra', 'quantique', 'coque', 'essaim'],
  },
  alien: {
    energy: 'prism', food: 'hive', house: 'sanctuary', prod: ['amplifier'], defense: ['spines', 'dome'],
    steps: [['hive', 2], ['prism', 2], ['sanctuary', 1], ['hive', 3], ['prism', 3], ['lab', 1], ['sanctuary', 2], ['amplifier', 1], ['lab', 2], ['yard', 1], ['hive', 4], ['prism', 4], ['spines', 1], ['store', 1], ['sanctuary', 3], ['yard', 2], ['dome', 1]],
    techs: ['echo', 'levitation', 'levitation', 'ponte', 'symbiose', 'dard', 'echo', 'carapace', 'carapace', 'dard', 'echo', 'carapace', 'dard', 'symbiose'],
  },
};
