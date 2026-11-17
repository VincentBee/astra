import { SOIL, sameCell, settle, stateAt } from '../../../regles/game/index.js';
import { moveTo, fuelAt, fuelNeed, fleetCargo, refuel, shuttleTake, shuttleGive } from '../../../regles/fleet/index.js';
import { techOf } from '../../outils/tech-of.js';
import { SHUTTLE_MIN_DROP } from '../../constantes/shuttle-min-drop.js';

/**
 * Une escale de navette : sur A, charger puis partir vers B ; sur B, décharger puis revenir
 * vers A. L'heure de l'escale est celle de l'arrivée (`f.arrive`), ou `now` si la flotte
 * attendait déjà. Attendre ne change rien à ma fiche (sauf la première fois, `wait`) : un
 * passage sans changement n'est pas noté au journal d'ordres, le rejeu ne le refait pas.
 * Renvoie true si ma fiche a changé.
 */
export function shuttleStop(p, f, now) {
  const o = f.order;
  const t = o.wait ? now : Math.min(now, f.arrive);
  const stop = (why) => {
    this.endShuttle(p, f, why);
    f.order = null;
    return true;
  };
  const A = this.shuttlePlanet(p, o.a, t);
  const B = this.shuttlePlanet(p, o.b, t);
  if (!A || !B) {
    const lost = this.planets.find((w) => sameCell(w, A ? o.b : o.a))?.name || 'une de ses planètes';
    return stop(`${lost} n’est plus à ${p.name}`);
  }
  if (!(f.ships.cargo > 0)) return stop('plus aucun cargo');
  if (this.offerHolds(f.id)) return false; // un échange la retient : elle reprend après la réponse
  const here = o.go === 'a' ? A : B;
  if (!sameCell(f.to, here.cell)) return stop(`elle n’est pas arrivée sur ${here.name}`);
  const held = SOIL.reduce((x, r) => x + (f.cargo?.[r] || 0), 0);
  const pause = (w) => {
    if (o.wait === w) return false;
    f.order = { ...o, wait: w };
    return true;
  };
  let next;
  if (o.go === 'a') {
    // Charger : ce que les soutes peuvent prendre, sans rien laisser des ressources choisies.
    const s = stateAt(A.planet, Math.max(t, A.planet.at || 0));
    const take = shuttleTake(s.stock, fleetCargo(p.race, f.ships) - held, o.res);
    const got = SOIL.reduce((x, r) => x + take[r], 0);
    const room = fleetCargo(p.race, f.ships) - held;
    // Rien à charger : elle attend sur A. En attente, elle ne part qu'avec un vrai lot
    // (SHUTTLE_MIN_DROP, ou des soutes pleines) : pas un voyage pour une unité (D-553).
    if (!held && (!got || (o.wait === 'a' && got < Math.min(room, SHUTTLE_MIN_DROP)))) return pause('a');
    // Le plein d'abord : si le trajet vers B ne tient pas, rien n'est pris sur A.
    refuel(A.planet, f, p.race, t);
    if (fuelNeed(f, p.race, B.cell, t) > fuelAt(f, p.race, t) + 1e-9) return stop(`pas assez d’énergie sur ${A.name} pour le plein`);
    if (got) {
      settle(A.planet, t);
      for (const r of SOIL) A.planet.stock[r] = Math.max(0, (A.planet.stock[r] || 0) - take[r]);
      f.cargo = Object.fromEntries(SOIL.map((r) => [r, (f.cargo?.[r] || 0) + take[r]]));
    }
    next = { from: A, to: B, go: 'b' };
  } else {
    // Décharger : tout ce qui rentre dans l'entrepôt de B ; le reste attend dans les soutes.
    if (held) {
      const s = stateAt(B.planet, Math.max(t, B.planet.at || 0));
      const give = shuttleGive(s.stock, s.prod.caps, f.cargo);
      const put = SOIL.reduce((x, r) => x + give[r], 0);
      // Entrepôt plein : elle attend sur B, chargée. En attente, elle ne pose qu'un vrai lot
      // (SHUTTLE_MIN_DROP, ou tout le reste) : pas une unité à chaque passage (D-554).
      if (!put || (o.wait === 'b' && put < Math.min(held, SHUTTLE_MIN_DROP))) return pause('b');
      settle(B.planet, t);
      for (const r of SOIL) B.planet.stock[r] = (B.planet.stock[r] || 0) + give[r];
      f.cargo = Object.fromEntries(SOIL.map((r) => [r, (f.cargo?.[r] || 0) - give[r]]));
      const sent = { ...(o.sent || {}) };
      for (const r of SOIL) if (give[r]) sent[r] = (sent[r] || 0) + give[r];
      // Une livraison compte quand les soutes sont vides : un reste posé plus tard n'en fait pas une autre.
      f.order = { ...o, trips: (o.trips || 0) + (put === held ? 1 : 0), sent };
      delete f.order.wait;
      if (put < held) {
        f.order.wait = 'b'; // une partie ne rentre pas : elle attend la place, avec le reste
        return true;
      }
    }
    next = { from: B, to: A, go: 'a' };
  }
  // Plein sur la planète de l'escale (sur A, déjà fait avant de charger), puis le trajet suivant, s'il tient dans le réservoir.
  if (next.from === B) refuel(B.planet, f, p.race, t);
  if (fuelNeed(f, p.race, next.to.cell, t) > fuelAt(f, p.race, t) + 1e-9) return stop(`pas assez d’énergie sur ${next.from.name} pour le plein`);
  const order = { ...f.order, go: next.go };
  delete order.wait;
  const err = moveTo(f, p.race, techOf(p), next.to.cell, order, t);
  if (err) return stop(err);
  return true;
}
