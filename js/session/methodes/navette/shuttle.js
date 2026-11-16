import { moving } from '../../../regles/fleet/index.js';
import { SHUTTLE_MAX_STOPS } from '../../constantes/shuttle-max-stops.js';

/**
 * Navette, à chaque passage : enchaîne les escales dues à `now`, chacune à son heure (D-555).
 * Après une longue absence, tous les allers-retours de l'absence se font ici, l'un après
 * l'autre, pas un seul. Renvoie true si ma fiche a changé.
 */
export function shuttle(p, f, now) {
  let changed = false;
  for (let i = 0; i < SHUTTLE_MAX_STOPS && f.order?.kind === 'shuttle' && !moving(f, now) && p.fleets.includes(f); i++) {
    if (!this.shuttleStop(p, f, now)) break;
    changed = true;
  }
  return changed;
}
