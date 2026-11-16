// Une partie ne se joue que dans un seul onglet à la fois (D-430, #49).
//
// Deux onglets (ou l'appli installée et un onglet Chrome, qui partagent le même stockage) qui
// reprennent la même partie la feraient avancer chacun de son côté, IA comprises, et le dernier
// fermé écraserait la sauvegarde de l'autre. Chaque onglet qui joue une partie tient donc un
// verrou du navigateur à son nom (navigator.locks).
//
// Le dernier onglet ouvert prend la main, sans rien perdre :
//   1. il demande « rends la main » sur un BroadcastChannel, puis attend le verrou ;
//   2. l'onglet qui joue sauvegarde son état le plus récent, s'arrête, puis lâche le verrou ;
//   3. le nouveau a le verrou : il ne lit la sauvegarde qu'à ce moment-là.
// Délai de secours (`WAIT`) : si l'ancien ne répond pas (gelé en arrière-plan), le nouveau prend
// le verrou de force (`steal`). L'ancien, s'il se réveille, l'apprend (AbortError) et s'arrête
// sans plus rien sauver : il ne peut pas écrire après le nouveau.
//
// Navigateur sans navigator.locks (Safari avant 15.4) : pas de verrou, comme avant.

export { WAIT } from './wait.js';
export { holdGame } from './hold-game.js';
