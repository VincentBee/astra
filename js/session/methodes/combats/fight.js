import { SOIL } from '../../../game.js';
import { battle, stopAt, moving, countShips, salvage, applyLosses, fleetCargo } from '../../../fleet.js';
import { MAX_EFFECTS } from '../../constantes/max-effects.js';
import { techOf } from '../../outils/tech-of.js';
import { de } from '../../textes/de.js';
import { lootText } from '../../textes/loot-text.js';

/**
 * Combat entre ma flotte et celle d'un autre joueur, au contact. Je
 * calcule avec ce que je sais de la sienne ; son téléphone appliquera ses
 * pertes en lisant mon rapport (un identifiant neuf par combat).
 * `onward` : ma flotte (agressive) garde ensuite son trajet et son ordre.
 */
export function fight(p, f, enemy, target, now, onward = false) {
  // Combat dans le passé : le prochain passage cherche les autres rencontres à partir de là.
  if (now < (this.scanAt ?? Infinity)) this.scanAt = now;
  const res = battle({ race: p.race, ships: f.ships, tech: techOf(p) }, { race: enemy.race, ships: target.ships, tech: enemy.planet?.tech || {} });
  const take = res.won ? salvage(p.race, res.attLeft, target.cargo, f.cargo) : {};
  // Lui aussi a pu livrer ce combat de son côté, sans avoir encore lu mon rapport (poursuite
  // mutuelle) : c'est le même combat, chacun ne compte alors ses pertes qu'une fois. `sim` dit
  // que je n'avais pas encore lu son rapport sur ce combat, `engaged` garde trace de mes combats.
  // `ack` : ses rapports sur nos deux flottes que j'avais déjà lus. Un de ses combats absent de
  // cette liste, il l'a livré sans que je le sache : le même combat que le mien.
  const mine = [f.id, ...(f.absorbed || [])];
  const theirs = [target.id, ...(target.absorbed || [])];
  const ack = (p.engaged || []).filter((g) => g.got && theirs.includes(g.fleet) && mine.includes(g.by)).map((g) => g.got);
  const id = this.newId(8);
  p.engaged = [...(p.engaged || []), { fleet: target.id, by: f.id, at: now, id }].slice(-20);
  // `lost` : mes pertes, pour son rapport de combat (il ne les connaît pas autrement).
  p.effects = [...(p.effects || []), { id, to: enemy.id, fleet: target.id, by: f.id, sim: true, ack, at: now, ships: res.defLost, lost: res.attLost, take, rep: res.report }].slice(-MAX_EFFECTS);
  const loot = lootText(take);
  const wiped = !countShips(res.attLeft);
  this.note(p, {
    at: now, kind: 'combat', who: enemy.name, mine: countShips(res.attLost), theirs: countShips(res.defLost), loot,
    rep: res.report, side: 'a', noLoot: res.won && !loot ? (fleetCargo(p.race, res.attLeft) > SOIL.reduce((t, r) => t + (f.cargo?.[r] || 0), 0) ? 'empty' : 'full') : undefined,
    tone: res.won ? 'good' : wiped ? 'bad' : 'even',
    text: res.won ? `Ta flotte détruit une flotte ${de(enemy.name)}.` : wiped ? `Ta flotte est détruite par ${enemy.name}.` : `Combat de flottes indécis contre ${enemy.name}.`,
  });
  this.addLog(
    res.won
      ? `${p.name} détruit une flotte ${de(enemy.name)}${loot ? ` et récupère ${loot}` : ''}.`
      : countShips(res.attLeft)
        ? `Combat indécis entre ${p.name} et ${enemy.name}.`
        : `${p.name} perd une flotte contre ${enemy.name}.`,
  );
  this.ontoast?.(res.won ? 'Flotte ennemie détruite !' : countShips(res.attLeft) ? 'Combat indécis.' : 'Flotte perdue.');
  if (!onward) f.order = null;
  if (!applyLosses(f, p.race, techOf(p), res.attLost, null, now)) {
    p.fleets = p.fleets.filter((x) => x.id !== f.id);
    return true;
  }
  if (!onward && moving(f, now)) stopAt(f, p.race, techOf(p), now);
  f.cargo = Object.fromEntries(SOIL.map((r) => [r, (f.cargo?.[r] || 0) + (take[r] || 0)]));
  return true;
}
