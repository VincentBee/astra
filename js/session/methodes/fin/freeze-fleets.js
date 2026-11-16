import { countShips, fleetPos } from '../../../regles/fleet/index.js';
import { de } from '../../textes/de.js';
import { shipsText } from '../../textes/ships-text.js';

/**
 * Le froid détruit mes flottes qu'il a atteintes (D-163). `all` faux (avant les arrivées) : une
 * flotte qui atteint sa destination avant le froid y arrive d'abord (elle s'y pose, fonde…).
 * Sans planète, mon dernier colonisateur gelé m'élimine, à l'heure du gel.
 */
export function freezeFleets(p, now, all) {
  const dead = (p.fleets || [])
    .map((f) => ({ f, at: this.fleetFrostAt(f) }))
    .filter(({ f, at }) => at <= now && (all || !f.order || f.order.kind === 'chase' || at < f.arrive) && !(this.fleetKillAt(p, f, now) < at)) // détruite au combat avant : le rapport s'applique
    .sort((a, b) => a.at - b.at);
  if (!dead.length) return false;
  const pts = this.scoreOf(p); // points d'avant le gel : ce qui départage s'il est éliminé
  for (const { f, at } of dead) {
    if (!p.fleets.includes(f)) continue; // disparue avec son joueur, éliminé plus tôt dans ce passage (D-180)
    p.fleets = p.fleets.filter((x) => x !== f);
    const pos = fleetPos(f, at);
    const where = `[${Math.round(pos.x)}:${Math.round(pos.y)}]`;
    const n = countShips(f.ships);
    this.addLog(`Le froid détruit une flotte ${de(p.name)} en ${where} (${shipsText(n)}).`);
    this.ontoast?.(`Le froid a détruit ta flotte en ${where}.`, 6000);
    this.note(p, { at, kind: 'fleet', tone: 'bad', text: `Le froid a détruit ta flotte en ${where} (${shipsText(n)}).` });
    const stuck = !p.home && p.out == null && Number.isFinite(p.since) && !(p.fleets || []).some((g) => g.ships?.colony > 0);
    if (stuck && f.ships?.colony > 0) {
      this.addLog(`${p.name} n’a plus de colonisateur pour fonder sa planète : ${p.name} est éliminé.`);
      this.eliminate(p, at, pts);
      this.ontoast?.('Le froid a pris ton dernier colonisateur : tu es éliminé.', 8000);
      this.note(p, { at, kind: 'planet', tone: 'bad', text: 'Le froid a pris ton dernier colonisateur : tu es éliminé.' });
    }
  }
  return true;
}
