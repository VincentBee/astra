import { moving } from '../../../../regles/fleet/index.js';
import { cellName } from '../cell-name.js';

/**
 * Navette en cours (D-550), en clair : où elle va ou pourquoi elle attend, et ce qu'elle a déjà
 * livré. « Navette Kepler → Rigel · vers Rigel, chargée · 3 livraisons ».
 */
export function shuttleText(f, now) {
  const o = f.order;
  const a = cellName(o.a);
  const b = cellName(o.b);
  const step =
    o.wait === 'a' ? `attend sur ${a} : rien à charger`
    : o.wait === 'b' ? `attend sur ${b} : entrepôt plein`
    : moving(f, now) ? (o.go === 'b' ? `vers ${b}, chargée` : `retour vers ${a}`)
    : `escale sur ${o.go === 'b' ? b : a}`;
  const n = o.trips || 0;
  return `Navette ${a} → ${b} · ${step} · ${n} livraison${n > 1 ? 's' : ''}`;
}
