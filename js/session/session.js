// Une partie vue depuis un téléphone. Tous les téléphones sont au même
// niveau : pas de maître du jeu, chacun garde une copie complète de la partie
// et chacun peut inviter de nouveaux joueurs.
//
// Comment rester d'accord sans arbitre : chaque joueur est le seul à écrire
// sa propre fiche (sa planète). Il applique ses ordres tout de
// suite chez lui, puis envoie sa fiche à jour aux autres. Une fiche porte
// l'heure de sa dernière modification (`actAt`) : entre deux versions de la
// même fiche, la plus récente l'emporte. Comme personne n'écrit la fiche d'un
// autre, il n'y a jamais de conflit, même si le groupe a été coupé en deux.
//
// Les fiches se propagent de proche en proche : un téléphone qui reçoit une
// fiche plus récente que la sienne la transmet à ses autres voisins.
//
// Reconnexion sans rescanner : tous les téléphones de la partie se donnent
// rendez-vous via des relais publics (js/rendezvous.js). En se retrouvant,
// deux téléphones échangent leurs copies et gardent, pour chaque joueur, la
// fiche la plus récente.

export class Session {
  constructor(name) {
    this.name = name;
    this.me = null;
    this.state = null; // { gid, key, players: {}, log: [] }
    this.links = new Map(); // pid -> Link
    // Heure commune (D-165) : clockOff = heure commune − heure du téléphone au moment de l'ancrage ;
    // clockSynced : j'ai l'heure commune (créateur de la partie, ou reprise d'un joueur qui l'a) ;
    // clockEpoch : change à chaque correction, pour que les autres recommencent leurs mesures.
    this.clockOff = 0;
    this.clockSynced = false;
    this.clockEpoch = 0;
    this.clockRef = {}; // pid -> écart de référence de son horloge sur la mienne (joueur sans heure commune)
    this.clockVotes = {}; // pid -> { drift, rec } : ce joueur me dit que mon heure a changé (D-166)
    this.clockTrust = {}; // pid -> sa dernière fiche reçue quand son heure était juste (D-166)
    this.clockPending = {}; // pid -> fiche reçue avant que son heure soit mesurée
    this.status = 'idle'; // idle | answering | waiting | playing | failed | refused
    this.invite = null;
    this.dialing = new Map(); // pid -> offre en cours vers ce joueur
    this.onchange = null;
    this.ontoast = null;
    this.timers = [];
    this.onlost = null; // la partie a été ouverte dans un autre onglet (D-430)
    this.lost = false;
    this.hold = null; // verrou de la partie dans cet onglet (js/tablock.js)
    this.ended = false;
  }
}
