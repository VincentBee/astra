import { usePower, POWERS } from '../../../regles/game/index.js';

/** Pouvoir psychique (aliens), sur une de mes planètes. */
export function power(key, where = 'home') {
  if (!this.canAct) return;
  const p = this.state.players[this.me];
  const pl = p?.planet && this.myPlanet(where);
  if (!pl) return;
  const res = usePower(pl.planet, key, this.now());
  if (res.error) return this.ontoast?.(res.error);
  this.touch(this.addLog(`${p.name} ${res.text}.`));
  this.ontoast?.(res.toast || `${POWERS[key].name} !`);
  this.changed();
}
