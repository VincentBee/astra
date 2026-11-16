/**
 * Version du format des fiches. Chaque téléphone écrit la sienne dans sa
 * fiche : un joueur qui voit une fiche plus récente doit recharger l'appli.
 * 2 : flottes pilotées librement sur la carte.
 * 3 : carburant des flottes.
 * 4 : flottes fusionnées (`absorbed`).
 * 5 : combats entre flottes (effets visant une flotte, `docked`).
 * 6 : échanges entre joueurs (`offers`, `answers`).
 * 7 : journal des ordres (`orders`), messages envoyés en morceaux.
 * 8 : tempo ×2,5, score de tout l'empire, froid, prise de planète, élimination (`out`) et fin (`over`).
 * 9 : départ quand tous les joueurs présents sont prêts (`ready`, `go`), flotte de départ
 *     avec un seul colonisateur qui fonde la planète mère.
 * 10 : recherches et lots de vaisseaux dans le fil d'attente (`plan`, D-158).
 * 11 : heure commune et resynchronisation d'une fiche (`clockFix`, D-165, D-166).
 */
export const FORMAT = 12; // 12 : achat automatique `planet.auto` (D-530)
