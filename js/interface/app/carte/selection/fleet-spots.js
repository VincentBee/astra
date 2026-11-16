import { fleetPos, moving } from '../../../../fleet.js';
import { etat } from '../../etat.js';

/**
 * Où dessiner chaque flotte (en cases) : sur son trajet si elle roule ;
 * à l'arrêt, posée en couronne autour du centre de sa case pour ne cacher
 * ni la planète ni les autres flottes. Le toucher utilise les mêmes places.
 * [{ p, f, x, y, ang, moving }]
 */
export function fleetSpots(now) {
  const out = [];
  const parked = new Map(); // « x:y » -> nombre de flottes déjà placées sur la case
  const eyes = etat.session.eyes(now);
  for (const p of Object.values(etat.session.state.players)) {
    for (const f of etat.session.fleetsOf(p)) { // avec la flotte de départ d'un joueur hors ligne (D-163)
      if (!etat.session.sees(p, f, now, eyes)) continue; // hors de ma portée de détection
      if (moving(f, now)) {
        const pos = fleetPos(f, now);
        out.push({ p, f, x: pos.x, y: pos.y, ang: Math.atan2(f.to.y - f.from.y, f.to.x - f.from.x), moving: true });
        continue;
      }
      const key = `${f.to.x}:${f.to.y}`;
      const i = parked.get(key) || 0;
      parked.set(key, i + 1);
      const a = -Math.PI / 4 + i * 1.1;
      out.push({ p, f, x: f.to.x + 0.36 * Math.cos(a), y: f.to.y + 0.36 * Math.sin(a), ang: -Math.PI / 2, moving: false });
    }
  }
  return out;
}
