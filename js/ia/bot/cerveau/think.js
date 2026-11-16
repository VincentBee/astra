import { stateAt } from '../../../game.js';
import { moving } from '../../../fleet.js';
import { ownName } from './own-name.js';
import { pickRace } from './pick-race.js';
import { beaten } from '../colonisation/beaten.js';
import { launchColonizer } from '../colonisation/launch-colonizer.js';
import { sendColonizer } from '../colonisation/send-colonizer.js';
import { BUDGET } from '../donnees/budget.js';
import { attack } from '../flottes/attack.js';
import { steerFleet } from '../flottes/steer-fleet.js';
import { evacuate } from '../planetes/evacuate.js';
import { planBuilding } from '../planetes/plan-building.js';
import { planResearch } from '../planetes/plan-research.js';
import { planShips } from '../planetes/plan-ships.js';
import { usePowers } from '../planetes/use-powers.js';

/**
 * Un passage de réflexion de l'IA `s` (une Session). Donne au plus `budget` ordres, chacun
 * vérifié d'avance. Renvoie le nombre d'ordres donnés.
 */
export function think(s, budget = BUDGET) {
  if (!s.state || s.status !== 'playing') return 0;
  const p = s.state.players[s.me];
  if (!p) return 0;
  const ctx = { s, p, now: s.now(), left: budget, done: 0 };
  const order = (fn) => {
    if (ctx.left <= 0) return false;
    ctx.left--;
    ctx.done++;
    return fn() !== false;
  };
  ctx.order = order;
  // Même nom qu'un joueur arrivé avant (deux téléphones ont ajouté une IA chacun) : elle en prend un libre (D-480).
  if (s.beforeStart) {
    const name = ownName(s, p);
    if (name !== p.name) order(() => s.rename(name));
  }
  if (!p.race) {
    order(() => s.chooseRace(pickRace(s)));
    return ctx.done;
  }
  if (!s.canAct) return ctx.done;
  if (!Number.isFinite(p.ready) && !p.home && !Number.isFinite(p.since)) {
    order(() => s.ready());
    return ctx.done;
  }
  // Sans planète mère : envoyer le colonisateur de départ (ou celui qui a trouvé la place prise).
  // Un colonisateur adverse arrivera avant lui (D-490) : il change de cap tout de suite.
  if (!p.home) {
    for (const f of p.fleets || []) {
      if (f.ships.colony && !f.order && !moving(f, ctx.now)) sendColonizer(ctx, f, true);
      else if (f.ships.colony && beaten(ctx, f)) sendColonizer(ctx, f, true);
    }
    return ctx.done;
  }
  const mine = s.planetsOf(p).filter((pl) => s.frostOf(pl.cell) > ctx.now);
  for (const pl of mine) {
    if (ctx.left <= 0) break;
    const st = stateAt(pl.planet, ctx.now);
    evacuate(ctx, pl, st);
    planBuilding(ctx, pl, st);
    planResearch(ctx, pl, st);
    planShips(ctx, pl, st);
    usePowers(ctx, pl, st);
    launchColonizer(ctx, pl, st);
  }
  for (const f of [...(p.fleets || [])]) {
    if (ctx.left <= 0) break;
    steerFleet(ctx, f);
  }
  if (ctx.left > 0) attack(ctx, mine);
  return ctx.done;
}
