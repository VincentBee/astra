import { sameCell, UNIVERSE } from '../../../game.js';
import { SHIPS } from '../../../tech.js';
import { moveTo, ORDERS, armed } from '../../../fleet.js';
import { techOf } from '../../outils/tech-of.js';
import { de } from '../../textes/de.js';

/**
 * Envoie une de mes flottes sur une case. `kind` vient de ordersAt :
 * move, dock, colonize ou attack.
 */
export function moveFleet(id, cell, kind = 'move') {
  if (!this.canAct) return false;
  const p = this.state.players[this.me];
  const f = this.myFleet(id);
  if (!f || this.locked(id)) return false;
  if (cell.x < 0 || cell.y < 0 || cell.x >= UNIVERSE.w || cell.y >= UNIVERSE.h) return false;
  const here = this.planetsAt(cell)[0];
  const w = this.planets.find((x) => sameCell(x, cell));
  // Brouillard (D-190) : un refus ne doit pas dire ce que je ne vois pas. Hors de portée,
  // l'ordre part et l'arrivée tranche (« déjà prise », ou personne à attaquer). La décision
  // ne lit que la partie (`seesCell`), pas mes souvenirs (`intel`) : le replay la refait pareil.
  const live = this.over || this.seesCell(cell, this.now());
  let order = null;
  if (kind !== 'move' && kind !== 'dock' && w && this.frostOf(w) <= this.now()) return this.refuse(`${w.name} est gelée.`); // D-450
  if (kind === 'dock') {
    if (here?.owner.id !== this.me) return this.refuse('Ce n’est pas une de tes planètes.');
    order = { kind, key: here.key };
  } else if (kind === 'attack' || kind === 'conquer') {
    if (here ? here.owner.id === this.me : !w || live) return this.refuse('Aucune planète adverse ici.');
    if (!armed(p.race, f.ships, techOf(p))) return this.refuse('Cette flotte n’a pas d’armes : elle ne peut pas attaquer.');
    // Libre en vrai, mais hors de ma vue : personne à viser, la flotte restera en orbite.
    order = here ? { kind, pid: here.owner.id, key: here.key } : { kind, pid: null, key: null };
  } else if (kind === 'colonize') {
    if (!w || (here && live)) return this.refuse('Cette planète n’est pas libre.');
    if (!f.ships.colony) return this.refuse(`Il faut un vaisseau colonisateur (${SHIPS[p.race].colony.name}) pour coloniser.`);
    if (!p.home && w.kind && w.kind !== 'planet') return this.refuse(`${w.name} est trop petit pour une planète mère : vise une planète.`);
    order = { kind, world: w.id };
  }
  const err = moveTo(f, p.race, techOf(p), cell, order, this.now());
  if (err) return this.refuse(err);
  if (f.stranded) this.ontoast?.('Pas assez de carburant : la flotte tombera en panne en route.');
  // Au journal, seulement les ordres qui comptent : les simples déplacements le noieraient.
  const who = here && live && here.owner.id !== this.me ? ` (${here.owner.name})` : ''; // hors de vue, pas de nom (D-190)
  // Marquée de la flotte : la cible ne la lit que si elle voit la flotte (D-210, `showsLog`).
  this.touch(order ? this.addLog(`La flotte ${de(p.name)} ${ORDERS[order.kind].verb} ${here ? here.name : w.name}${who}.`, { pid: this.me, fleet: f.id }) : null);
  this.changed();
  return true;
}
