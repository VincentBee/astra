import { startDemolish, RACES } from '../../../regles/game/index.js';

/** Déconstruit un niveau d'un bâtiment, pour libérer sa place. */
export function demolish(key, where = 'home') {
  if (!this.canAct) return;
  const p = this.state.players[this.me];
  const pl = this.myPlanet(where);
  if (!pl) return;
  const err = startDemolish(pl.planet, key, this.now());
  if (err) return this.ontoast?.(err);
  const b = RACES[p.race].buildings[key];
  this.touch(this.addLog(`${p.name} déconstruit ${b.name} (niv. ${pl.planet.queue.level + 1} → ${pl.planet.queue.level}) sur ${pl.name}.`));
  this.changed();
}
