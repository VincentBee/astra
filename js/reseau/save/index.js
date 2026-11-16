// Sauvegarde de la partie sur le téléphone, et fusion de deux copies.
//
// Chaque téléphone enregistre sa copie de la partie à chaque changement.
// Comme tout se calcule à partir du temps écoulé (production, chantiers),
// la partie « continue » même quand personne n'est connecté : celui qui la
// reprend, même le lendemain, retrouve tout à jour.
//
// Quand deux copies se retrouvent (deux joueurs ont avancé chacun de leur
// côté), on les fusionne joueur par joueur : pour chacun, on garde la copie
// où il a agi le plus récemment (`actAt`). Chacun garde ainsi sa propre
// progression. Le journal est l'union des deux.

export { onSaveFailed } from './alerte/on-save-failed.js';
export { saveGame } from './partie/save-game.js';
export { loadGame } from './partie/load-game.js';
export { listGames } from './partie/list-games.js';
export { selectGame } from './partie/select-game.js';
export { forgetGame } from './partie/forget-game.js';
export { loadIdentity } from './identite/load-identity.js';
export { identityFor } from './identite/identity-for.js';
export { savedGame } from './partie/saved-game.js';
export { saveIdentity } from './identite/save-identity.js';
export { mergeStates } from './partie/merge-states.js';
export { describeSave } from './partie/describe-save.js';
