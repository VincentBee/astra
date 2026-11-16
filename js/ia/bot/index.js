// Joueurs IA (D-151). Une IA est un joueur comme un autre : sa propre Session, sa propre fiche,
// qu'elle est seule à écrire, avec les mêmes ordres que l'interface (chooseRace, ready,
// planBuild, research, buildShips, takeOff, moveFleet…). Elle tourne sur le téléphone de
// celui qui l'a ajoutée (l'hôte), reliée à sa Session par un lien en mémoire qui a la même
// interface qu'un lien WebRTC (js/peer.js) : les fiches voyagent comme entre deux téléphones,
// la partie se sauvegarde et se rejoue comme d'habitude, les autres téléphones reçoivent la
// fiche de l'IA de proche en proche (par l'hôte).
//
// Le cerveau (`think`) est pur côté interface : il lit l'état de sa Session et donne au plus
// quelques ordres par passage, seulement ceux qui passeront (un ordre refusé s'inscrit quand
// même au journal de la fiche). Il ne triche pas sur les règles ; il lit la défense des
// planètes adverses comme le menu « Conquérir … · défense ⚔ ◇ » la montre à un joueur.

export { THINK_MS } from './donnees/think-ms.js';
export { PEACE_MS } from './donnees/peace-ms.js';
export { think } from './cerveau/think.js';
export { chooseBuilding } from './planetes/choose-building.js';
export { LINK } from './lien/link.js';
export { copyRec } from './lien/copy-rec.js';
export { localPair } from './lien/local-pair.js';
export { addBot } from './hote/add-bot.js';
export { editableBot } from './hote/editable-bot.js';
export { removeBot } from './hote/remove-bot.js';
export { renameBot } from './hote/rename-bot.js';
export { setBotRace } from './hote/set-bot-race.js';
export { wakeBots } from './hote/wake-bots.js';
