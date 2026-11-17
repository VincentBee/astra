// Navette (D-550) : une flotte avec des soutes fait des allers-retours entre deux de mes planètes.
// Elle charge sur A les ressources choisies, autant que ses soutes le permettent, les pose sur B,
// revient à vide, et recommence. L'ordre reste sur la flotte (`order.kind = 'shuttle'`), comme une
// jonction qui attend (D-159) : `go` dit l'escale visée ('a' ou 'b'), `wait` qu'elle y attend
// (rien à charger sur A, entrepôt plein sur B), `trips` et `sent` ce qu'elle a déjà livré.
import { SOIL, RES_INFO, sameCell, distance } from '../../../regles/game/index.js';
import { SHIPS } from '../../../regles/tech/index.js';
import { moveTo, moving, fuelAt, fuelNeed, fleetBurn, fleetTank, freeze as freezeFleet } from '../../../regles/fleet/index.js';
import { techOf } from '../../outils/tech-of.js';
import { de } from '../../textes/de.js';

/**
 * Met ma flotte `id` en navette de la planète `a` vers la planète `b` (deux cases), pour les
 * ressources `res` (minéraux, nourriture). Sans `a` : arrête la navette, la flotte finit son
 * trajet et attend en orbite. Ailleurs qu'en A ou B, elle part d'abord vers A.
 */
export function shuttleFleet(id, a, b, res) {
  if (!this.canAct) return false;
  const p = this.state.players[this.me];
  const f = this.myFleet(id);
  if (!f) return this.refuse('Flotte introuvable.');
  if (a == null) {
    if (f.order?.kind !== 'shuttle') return false;
    const log = this.endShuttle(p, f, 'à la demande de son joueur');
    f.order = null;
    this.touch(log);
    this.changed();
    return true;
  }
  if (this.locked(id)) return false;
  const now = this.now();
  const A = this.shuttlePlanet(p, a, now);
  const B = this.shuttlePlanet(p, b, now);
  if (!A || !B) return this.refuse('Une navette va entre deux de tes planètes.');
  if (sameCell(A.cell, B.cell)) return this.refuse('Choisis deux planètes différentes.');
  const kinds = Array.isArray(res) ? SOIL.filter((r) => res.includes(r)) : [];
  if (!kinds.length || res.some((r) => !SOIL.includes(r))) return this.refuse('Choisis ce qu’elle transporte : minéraux ou nourriture.');
  // Il faut au moins un cargo (D-551) : les autres vaisseaux ont un peu de soute, pas assez pour une navette.
  if (!(f.ships.cargo > 0)) return this.refuse(`Une navette demande au moins un cargo (${SHIPS[p.race].cargo.name}).`);
  if (fleetBurn(p.race, f.ships) * distance(A.cell, B.cell) > fleetTank(p.race, f.ships) + 1e-9) return this.refuse(`Ses réservoirs sont trop petits pour aller de ${A.name} à ${B.name}.`);
  // Arrêtée sur A ou B : l'escale se fait tout de suite. En route vers A ou B (une navette qu'on
  // règle autrement) : elle garde son trajet. Ailleurs : elle part d'abord vers A.
  const go = moving(f, now) ? null : sameCell(f.to, A.cell) ? 'a' : sameCell(f.to, B.cell) ? 'b' : null;
  const keep = moving(f, now) && !f.stranded ? (sameCell(f.to, A.cell) ? 'a' : sameCell(f.to, B.cell) ? 'b' : null) : null;
  if (!go && !keep && fuelNeed(f, p.race, A.cell, now) > fuelAt(f, p.race, now) + 1e-9) return this.refuse(`Pas assez de carburant pour rejoindre ${A.name}.`);
  const before = f.order?.kind === 'shuttle' ? f.order : null;
  const order = { kind: 'shuttle', a: { ...A.cell }, b: { ...B.cell }, res: kinds, go: go || keep || 'a', trips: before?.trips || 0, sent: { ...(before?.sent || {}) } };
  this.tickLogs = []; // la première escale, tout de suite si elle est déjà en A ou en B : ses entrées partent avec ma fiche
  if (go) {
    // Déjà arrêtée sur l'escale : son trajet devient immobile maintenant (pas d'escale datée d'avant l'ordre).
    freezeFleet(f, p.race, now);
    f.order = order;
  } else if (keep) {
    f.order = order;
  } else {
    const err = moveTo(f, p.race, techOf(p), A.cell, order, now);
    if (err) {
      this.tickLogs = null;
      return this.refuse(err);
    }
  }
  const names = kinds.map((r) => RES_INFO[r].name.toLowerCase()).join(' et ');
  this.addLog(`La flotte ${de(p.name)} fait la navette de ${A.name} vers ${B.name} (${names}).`, { pid: this.me, fleet: f.id });
  if (go) this.shuttle(p, f, now);
  const logs = this.tickLogs;
  this.tickLogs = null;
  this.touch(logs);
  this.changed();
  return true;
}
