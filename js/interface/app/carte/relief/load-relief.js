import { countShips, fleetBurn, fleetPos, fleetTank, fuelAt } from '../../../../regles/fleet/index.js';
import { frostLine, sameCell, sunFor } from '../../../../regles/game/index.js';
import { drawAlertDot } from '../../alertes/draw-alert-dot.js';
import { myColonizer } from '../../depart/my-colonizer.js';
import { etat } from '../../etat.js';
import { mapPlanets } from '../map-planets.js';
import { mapVeiled } from '../map-veiled.js';
import { fleetSpots } from '../selection/fleet-spots.js';
import { aimRead } from '../visee/aim-read.js';
import { gesture } from '../zoom/gesture.js';
import { zoom } from '../zoom/zoom.js';
import { relief } from './relief.js';
import { reliefNote } from './relief-note.js';

/**
 * Télécharge le module de la carte en 3D (D-563), une seule fois, et lui donne les modules du
 * jeu qui ont un état. Le chemin est lu au moment voulu (`new URL`) : le build ne l'assemble pas
 * dans le jeu, il le réécrit vers dist/js/bassin-3d.js. Un essai raté se retente au suivant
 * (`?r=N`, comme jsQR et Trystero, D-510). Renvoie le module, ou null.
 */
export function loadRelief() {
  if (relief.mod) return Promise.resolve(relief.mod);
  if (!relief.loading) {
    relief.tries += 1;
    const url = new URL('../bassin/index.js', import.meta.url).href;
    relief.failed = false;
    relief.loading = import(relief.tries > 1 ? `${url}?r=${relief.tries}` : url)
      .then((m) => {
        m.installDeps({ etat, zoom, gesture, mapPlanets, mapVeiled, fleetSpots, aimRead, myColonizer, drawAlertDot, countShips, fleetBurn, fleetPos, fleetTank, fuelAt, frostLine, sameCell, sunFor });
        relief.mod = m;
        return m;
      })
      .catch(() => {
        relief.failed = true;
        return null;
      })
      .finally(() => {
        relief.loading = null;
        reliefNote();
      });
  }
  reliefNote();
  return relief.loading;
}
