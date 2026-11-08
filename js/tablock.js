// Une partie ne se joue que dans un seul onglet à la fois (D-430, #49).
//
// Deux onglets (ou l'appli installée et un onglet Chrome, qui partagent le même stockage) qui
// reprennent la même partie la feraient avancer chacun de son côté, IA comprises, et le dernier
// fermé écraserait la sauvegarde de l'autre. Chaque onglet qui ouvre une partie prend donc un
// verrou du navigateur à son nom (navigator.locks). Le dernier onglet ouvert le prend à l'autre
// (`steal`) : l'ancien en est prévenu et s'arrête sans plus rien sauver.
//
// Navigateur sans navigator.locks (Safari avant 15.4) : pas de verrou, comme avant.

/**
 * Prend la partie `gid` pour cet onglet. `onLost()` est appelé si un autre onglet la prend
 * ensuite. Renvoie `release()`, qui la rend (fin de partie dans cet onglet).
 */
export function holdGame(gid, onLost, locks = globalThis.navigator?.locks) {
  if (!gid || typeof locks?.request !== 'function') return () => {};
  let release;
  const held = new Promise((r) => (release = r));
  let done = false;
  try {
    locks
      .request(`astra.game.${gid}`, { steal: true }, () => held)
      .catch((e) => {
        // AbortError : un autre onglet a pris la partie. Autre refus : pas de verrou, comme avant.
        if (!done && e?.name === 'AbortError') onLost();
      });
  } catch {}
  return () => {
    done = true;
    release();
  };
}
