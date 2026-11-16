import { countShips, applyLosses } from '../../../fleet.js';
import { techOf } from '../../outils/tech-of.js';
import { de } from '../../textes/de.js';
import { lootText } from '../../textes/loot-text.js';
import { shipsText } from '../../textes/ships-text.js';

/**
 * Dégâts visant une de mes flottes : celle-ci, ou celle qui l'a absorbée.
 * Renvoie false si elle n'est plus là (posée entre-temps : les pertes
 * vont alors à la planète où elle s'est posée).
 */
export function fleetHit(p, other, e, now) {
  const f = this.fleetOf(p, e.fleet);
  if (!f) return false;
  // Le même combat, que j'ai livré moi aussi sans avoir lu son rapport : mes pertes sont déjà comptées.
  // Le même combat : un des miens contre sa flotte, qu'il ne connaissait pas encore en livrant le
  // sien (absent de son `ack`). Une revanche, livrée après avoir lu mon rapport, est un autre combat.
  // Chaque combat ne sert qu'une fois.
  const mineIds = [f.id, ...(f.absorbed || [])];
  // (À plus de 30 min d'écart, jamais le même : un rapport lu sans être noté ne doit pas annuler une revanche.)
  const g = e.sim && e.by && (p.engaged || []).find((g) => g.id && g.fleet === e.by && mineIds.includes(g.by) && !(e.ack || []).includes(g.id) && Math.abs((g.at || 0) - e.at) < 30 * 60_000);
  if (g) p.engaged = p.engaged.filter((x) => x !== g);
  // Je garde trace de ce rapport lu : mes prochains combats contre lui le citeront (ack).
  p.engaged = [...(p.engaged || []), { fleet: e.by, by: f.id, at: e.at, got: e.id }].slice(-20);
  const ships = g ? {} : e.ships;
  const lost = countShips(ships);
  // Le même combat que le mien : mon carnet l'a déjà, vu de mon côté.
  const noteHit = (destroyed) =>
    g || this.note(p, {
      at: e.at, kind: 'combat', who: other.name, mine: lost, theirs: e.lost ? countShips(e.lost) : null, pillaged: lootText(e.take || {}),
      rep: e.rep, side: 'd', tone: destroyed ? 'bad' : lost ? 'even' : 'good',
      text: destroyed ? `Ta flotte est détruite par ${other.name}.` : `${other.name} attaque ta flotte.`,
    });
  const pts = this.scoreOf(p); // points d'avant le combat : ce qui départage s'il est éliminé
  if (!applyLosses(f, p.race, techOf(p), ships, e.take, now)) {
    p.fleets = p.fleets.filter((x) => x.id !== f.id);
    this.addLog(`Une flotte ${de(p.name)} est détruite par ${other.name}.`);
    this.ontoast?.(`${other.name} a détruit une de tes flottes !`);
    noteHit(true);
    // Sans planète, mon dernier colonisateur détruit m'élimine à l'heure du combat, celle que les
    // autres téléphones ont calculée sans moi (deadAt, D-163), pas à l'heure où je lis le rapport.
    const stuck = !p.home && p.out == null && Number.isFinite(p.since) && !(p.fleets || []).some((g) => g.ships?.colony > 0);
    if (stuck && f.ships?.colony > 0) {
      this.addLog(`${p.name} n’a plus de colonisateur pour fonder sa planète : ${p.name} est éliminé.`);
      this.eliminate(p, e.at, pts);
      this.ontoast?.(`${other.name} a détruit ton dernier colonisateur : tu es éliminé.`, 8000);
      this.note(p, { at: e.at, kind: 'planet', tone: 'bad', text: `${other.name} a détruit ton dernier colonisateur : tu es éliminé.` });
    }
    return true;
  }
  this.addLog(`Une flotte ${de(p.name)} est attaquée par ${other.name} : ${lost ? `${shipsText(lost)} perdu${lost > 1 ? 's' : ''}` : 'aucun vaisseau perdu'}.`);
  this.ontoast?.(`${other.name} attaque une de tes flottes !`);
  noteHit(false);
  return true;
}
