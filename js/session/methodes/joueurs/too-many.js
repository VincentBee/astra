import { MAX_PLAYERS } from '../../constantes/max-players.js';

/**
 * Plus de 8 joueurs : deux téléphones séparés ont rempli chacun leur lobby, puis se sont
 * retrouvés (D-480). La partie ne part pas tant qu'il en reste trop : seul le téléphone qui
 * fait jouer une IA peut la retirer (D-399).
 */
export function tooMany() {
  return this.roster.length > MAX_PLAYERS;
}
