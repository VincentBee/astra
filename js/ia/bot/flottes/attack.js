import { stateAt, distance, fortOf } from '../../../regles/game/index.js';
import { fleetTank, fleetBurn, countShips, armed, battle, fleetSpeed, tripMs, MAX_FLEETS } from '../../../regles/fleet/index.js';
import { MIN } from '../donnees/min.js';
import { PEACE_MS } from '../donnees/peace-ms.js';
import { aimedTargets } from './aimed-targets.js';
import { canJoin } from './can-join.js';

/**
 * Attaque : quand les vaisseaux de guerre posés sur une de mes planètes battent à coup sûr la
 * défense d'une planète adverse (calcul du combat avec ce que le jeu en montre), ils décollent
 * et partent la conquérir. Sans cible à leur portée, ils restent posés et défendent. Une
 * planète déjà visée par une de mes flottes de conquête ne l'est pas une 2e fois : les
 * vaisseaux partent la rejoindre (`joinFleet`), ou visent une autre planète (D-280).
 */
export function attack(ctx, mine) {
  const { s, p, now } = ctx;
  if ((p.fleets || []).length >= MAX_FLEETS || !(now - s.startedAt >= PEACE_MS)) return;
  const targets = [];
  for (const o of Object.values(s.state.players)) {
    if (o.id === p.id || !o.race) continue;
    for (const pl of s.livePlanets(o, now)) {
      const st = stateAt(pl.planet, now);
      targets.push({ o, pl, st, fort: fortOf(o.race, st.levels, st.pop) });
    }
  }
  if (!targets.length) return;
  const aimed = aimedTargets(p);
  for (const base of mine) {
    if (ctx.left < 2) return;
    const st = stateAt(base.planet, now);
    const ships = Object.fromEntries(Object.entries(st.ships || {}).filter(([k, n]) => n > 0 && k !== 'colony' && k !== 'cargo'));
    if (!countShips(ships) || !armed(p.race, ships, st.tech)) continue;
    const speed = fleetSpeed(p.race, ships, st.tech);
    const tank = fleetTank(p.race, ships);
    const burn = fleetBurn(p.race, ships);
    const options = targets
      .map((t) => {
        const d = distance(base.cell, t.pl.cell);
        const arrive = now + tripMs(base.cell, t.pl.cell, speed);
        return { ...t, d, arrive };
      })
      // Assez de carburant pour l'aller, de l'énergie pour faire le plein, et la cible tiendra jusqu'à l'arrivée.
      .filter((t) => burn * t.d <= Math.min(tank, Math.floor(st.stock.energy || 0)) && s.frostOf(t.pl.cell) > t.arrive + MIN)
      .map((t) => {
        const res = battle({ race: p.race, ships, tech: st.tech }, { race: t.o.race, ships: t.st.ships || {}, tech: t.st.tech, fort: t.fort });
        // Une victoire nette : il reste au moins la moitié de la flotte (la cible peut se renforcer en route).
        const kept = countShips(res.attLeft) / countShips(ships);
        return { ...t, won: res.won && kept >= 0.5, kept };
      })
      .filter((t) => t.won)
      // Les planètes qui tiendront le plus longtemps d'abord, puis les plus proches.
      .sort((a, b) => s.frostOf(b.pl.cell) - s.frostOf(a.pl.cell) - (b.d - a.d) * 20_000);
    for (const t of options) {
      // Déjà visée par une de mes flottes de conquête (D-280) : jamais une 2e conquête, ces
      // vaisseaux la rejoignent en renfort, ou bien visent la cible suivante.
      const g = aimed.get(`${t.o.id}:${t.pl.key}`);
      if (g && !canJoin(ctx, base, g, { speed, tank, burn, energy: st.stock.energy })) continue;
      const d = g ? distance(base.cell, g.to) : t.d;
      const fuel = Math.min(tank, Math.floor(st.stock.energy || 0), Math.ceil(burn * d * 2) + 2);
      let id = null;
      ctx.order(() => (id = s.takeOff(base.key, ships, {}, fuel)));
      if (!id) break;
      if (g) ctx.order(() => s.joinFleet(id, g.id));
      else ctx.order(() => s.moveFleet(id, { ...t.pl.cell }, 'conquer'));
      return;
    }
  }
}
