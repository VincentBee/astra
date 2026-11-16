import { sameCell } from '../../../game.js';
import { countShips, fuelAt, fuelNeed } from '../../../fleet.js';
import { shipsText } from '../../textes/ships-text.js';

/**
 * Ce qu'une de mes flottes peut faire en arrivant sur `cell` :
 * [{ kind, label, short }]. `kind` est ce qu'on passe à moveFleet ;
 * « move » y va simplement et attend en orbite. `short` : le carburant ne
 * suffit pas, la flotte tombera en panne avant d'arriver.
 */
export function ordersAt(id, cell) {
  const f = this.myFleet(id);
  if (!f) return [];
  const w = this.planets.find((x) => sameCell(x, cell));
  const here = this.planetsAt(cell)[0];
  // Brouillard (D-124, D-190) : hors de ma portée, le menu ne sait que ce que je sais.
  const known = this.knownOwner(cell);
  const me0 = this.state.players[this.me];
  const out = [];
  // Gelée (D-450) : plus une cible, ni à attaquer, ni à conquérir, ni à coloniser. Le froid
  // se calcule pareil sur tous les téléphones : le dire ne trahit rien du brouillard.
  const frozen = this.frostOf(cell) <= this.now();
  if (here?.owner.id === this.me) out.push({ kind: 'dock', label: `Se poser sur ${here.name}` });
  else if (frozen) {
    // Rien d'autre que d'y aller (et d'y geler, D-163).
  } else if (!known.live && known.owner) {
    // Vue autrefois : son propriétaire retenu, pas son état (ni défense, ni estimation).
    const name = w?.name || 'la planète';
    const tail = ' · hors de portée : défense inconnue';
    out.push({ kind: 'attack', label: `Attaquer ${name} (${known.owner.name})${tail}` });
    out.push({ kind: 'conquer', label: `Conquérir ${name}${tail}` });
  } else if (here && known.live) {
    // Les deux ordres livrent le même combat : défense de la planète et vaisseaux posés.
    const a = this.assaultView(id, here.owner, here.key);
    const ships = a.ships === null ? '? vaisseaux' : `${shipsText(countShips(a.ships))} posé${countShips(a.ships) > 1 ? 's' : ''}`;
    const odds = { win: 'victoire probable', unsure: 'victoire incertaine', lose: 'bataille perdue' }[a.odds];
    const tail = ` · défense ⚔ ${a.fort.attack} ◇ ${a.fort.hull} + ${ships} · ${odds}`;
    out.push({ kind: 'attack', label: `Attaquer ${here.name} (${here.owner.name})${tail}`, odds: a.odds });
    out.push({ kind: 'conquer', label: `Conquérir ${here.name}${tail}`, odds: a.odds });
  }
  else if (w && f.ships.colony && !me0.home) {
    if (!w.kind || w.kind === 'planet') out.push({ kind: 'colonize', label: `Fonder ta planète mère sur ${w.name}` });
  } else if (w && f.ships.colony) out.push({ kind: 'colonize', label: `Coloniser ${w.name}` });
  out.push({ kind: 'move', label: w || (here && known.live) ? 'Juste y aller (orbite)' : 'Y aller' });
  const me = this.state.players[this.me];
  const now = this.now();
  const short = fuelNeed(f, me.race, cell, now) > fuelAt(f, me.race, now) + 1e-9;
  return out.map((o) => ({ ...o, short }));
}
