import { fortOf } from '../../../game.js';
import { battle, countShips } from '../../../fleet.js';

/**
 * Ce que ma flotte `id` trouverait sur la planète `key` de `enemy` si elle
 * l'attaquait maintenant : { fort, ships, odds }. `ships` : les vaisseaux
 * posés, ou null hors de ma détection. `odds` vient de `battle` joué avec ce
 * que je vois (win, unsure, lose) : une estimation, la planète peut bâtir ou
 * recevoir des renforts avant l'arrivée.
 */
export function assaultView(id, enemy, key) {
  const me = this.state.players[this.me];
  const f = this.myFleet(id);
  const pl = this.planetOf(enemy, key);
  const now = this.now();
  const def = this.defenseAt(me, enemy, pl, now);
  const fort = fortOf(enemy.race, def.levels, def.pop);
  const seen = this.seesCell(pl.cell, now);
  const res = battle({ race: me.race, ships: f.ships, tech: me.planet.tech }, { race: enemy.race, ships: seen ? def.ships : {}, tech: def.tech, fort });
  // Gagné en perdant plus de la moitié de la flotte, ou sans voir ses vaisseaux : rien n'est sûr.
  const odds = !res.won ? 'lose' : !seen || countShips(res.attLeft) * 2 < countShips(f.ships) ? 'unsure' : 'win';
  return { fort, ships: seen ? def.ships : null, odds };
}
