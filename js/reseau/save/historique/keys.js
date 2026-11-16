import { GAME_KEY } from '../constantes.js';

/** Les gid des clés `astra.save.<gid>` présentes (si le navigateur sait les énumérer). */
export function keys() {
  const out = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(GAME_KEY)) out.push(k.slice(GAME_KEY.length));
    }
  } catch {}
  return out;
}
