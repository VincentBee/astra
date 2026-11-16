import { distance } from '../../../regles/game/index.js';
import { fleetSpeed, tripMs } from '../../../regles/fleet/index.js';
import { ahead } from './ahead.js';
import { rivalColonizers } from './rival-colonizers.js';
import { MIN } from '../donnees/min.js';

// ----- colonisation -----------------------------------------------------------------

/**
 * Planètes libres qu'un colonisateur parti de `from` peut prendre : pas encore à quelqu'un,
 * pas visées par un autre de mes colonisateurs, ni par un colonisateur adverse qui y arrivera
 * avant celui-ci (D-490), et qui ne gèleront pas avant longtemps. Les meilleures d'abord :
 * celles que le froid prendra le plus tard (près du soleil), sans aller trop loin. `home` :
 * planète mère, seulement une vraie planète. `ships` : la flotte qui part (sa vitesse).
 */
export function colonyTargets(ctx, from, home = false, ships = { colony: 1 }) {
  const { s, p, now } = ctx;
  const aimed = new Set((p.fleets || []).filter((f) => f.order?.kind === 'colonize').map((f) => f.order.world));
  const rivals = rivalColonizers(ctx);
  const speed = fleetSpeed(p.race, ships, p.planet?.tech || {});
  return s.planets
    .filter((w) => (!home || !w.kind || w.kind === 'planet') && !aimed.has(w.id) && !s.ownerAt(w) && s.frostOf(w) - now > 4 * MIN)
    .filter((w) => !ahead(rivals.get(w.id), now + tripMs(from, w, speed), p.id))
    .map((w) => ({ w, score: Math.min(s.frostOf(w) - now, 60 * MIN) / MIN - 0.6 * distance(from, w) + (w.places || 0) / 4 }))
    .sort((a, b) => b.score - a.score || (a.w.id < b.w.id ? -1 : 1))
    .map((x) => x.w);
}
