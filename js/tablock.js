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

const CHANNEL = 'astra.tabs';
export const WAIT = 2000; // ms : au-delà, l'ancien onglet est tenu pour gelé

/**
 * Prend la partie `gid` pour cet onglet ; la promesse se résout quand cet onglet l'a (l'ancien a
 * sauvé et lâché, ou le délai de secours est passé). Renvoie une poignée :
 * - `onyield()` (à fixer) : un autre onglet demande la main ; sauver, puis s'arrêter. Le verrou
 *   est lâché juste après ;
 * - `onlost()` (à fixer) : le verrou a été pris de force (cet onglet était gelé) ; ne plus rien
 *   sauver ;
 * - `release()` : rend la partie (fin de partie dans cet onglet).
 */
export async function holdGame(gid, { locks = globalThis.navigator?.locks, Channel = globalThis.BroadcastChannel, wait = WAIT } = {}) {
  const h = { onyield: null, onlost: null, release() {} };
  if (!gid || typeof locks?.request !== 'function') return h;
  const name = `astra.game.${gid}`;
  let free;
  const held = new Promise((r) => (free = r));
  let done = false;
  let owner = null; // la demande qui tient le verrou
  let ch = null;
  try {
    ch = typeof Channel === 'function' ? new Channel(CHANNEL) : null;
    ch?.unref?.(); // Node (tests) : le canal ne garde pas le processus en vie
  } catch {}
  const close = () => {
    try {
      ch?.close();
    } catch {}
  };
  h.release = () => {
    done = true;
    free();
    close();
  };
  const request = (opts) =>
    new Promise((granted, refused) => {
      const id = {};
      let p;
      try {
        p = locks.request(name, opts, () => {
          owner = id;
          granted(true);
          return held;
        });
      } catch (e) {
        return refused(e);
      }
      p.catch((e) => {
        if (owner !== id) return granted(false); // demande abandonnée avant d'avoir le verrou
        if (done) return;
        done = true; // pris de force par un autre onglet : plus rien à sauver ici
        close();
        h.onlost?.();
      });
    });
  if (ch) {
    ch.onmessage = (e) => {
      if (e.data?.type !== 'take' || e.data.gid !== gid || !owner || done) return;
      done = true;
      try {
        h.onyield?.(); // sauver, puis s'arrêter
      } catch {}
      free(); // ensuite seulement, le verrou part
      close();
    };
  }
  try {
    ch?.postMessage({ type: 'take', gid });
  } catch {}
  const ctl = typeof AbortController === 'function' ? new AbortController() : null;
  let timer;
  const late = new Promise((r) => (timer = setTimeout(r, wait, 'late')));
  let first;
  try {
    first = await Promise.race([request(ctl ? { signal: ctl.signal } : {}), late]);
  } catch {
    clearTimeout(timer);
    return h; // verrou refusé : pas de verrou, comme avant
  }
  clearTimeout(timer);
  if (first !== true && !owner) {
    ctl?.abort(); // l'attente polie est abandonnée…
    try {
      await request({ steal: true }); // …et le verrou est pris de force
    } catch {}
  }
  return h;
}
