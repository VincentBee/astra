import { startBuild, RACES, sameCell, usedPlaces } from '../../../regles/game/index.js';

export function build(key, where = 'home') {
    if (!this.canAct) return;
    const p = this.state.players[this.me];
    if (!p?.planet) return this.ontoast?.('Choisis d’abord ta race.');
    const pl = this.myPlanet(where);
    if (!pl) return;
    if (this.queuedBehind(pl)) return this.toPlan('planBuild', key, where);
    // Les places sont celles de la carte, pas celles de la fiche (qu'on pourrait effacer ou gonfler).
    // Une planète d'avant la place garde au moins ce qu'elle a déjà bâti.
    const w = this.planets.find((x) => sameCell(x, pl.cell));
    if (w?.places) pl.planet.places = Number.isFinite(pl.planet.places) ? w.places : Math.max(w.places, usedPlaces(pl.planet.levels));
    this.settleLog(p, pl);
    const err = startBuild(pl.planet, key, this.now());
    if (err) return this.ontoast?.(err);
    const b = RACES[p.race].buildings[key];
    this.touch(this.addLog(`${p.name} lance ${b.name} niv. ${pl.planet.queue.level} sur ${pl.name}.`));
    this.changed();
  }
