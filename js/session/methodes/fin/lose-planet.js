import { settle, sameCell } from '../../../regles/game/index.js';

/**
 * Je perds une de mes planètes (gel ou prise) à l'heure `at`. Ma planète
 * mère perdue, ma plus vieille colonie en vie la remplace ; sans colonie,
 * je suis éliminé.
 */
export function losePlanet(p, key, at, why) {
    const pl = this.planetOf(p, key);
    if (!pl) return;
    // Points d'avant la vague : toutes les planètes perdues à la même heure comptent dans `deathPts`.
    if (this.wave?.pid !== p.id || this.wave.at !== at) this.wave = { pid: p.id, at, pts: this.scoreOf(p) };
    if (key !== 'home') {
      const colonies = { ...p.colonies };
      delete colonies[key];
      p.colonies = colonies;
      this.addLog(`${p.name} perd sa colonie ${pl.name} (${why}).`);
      this.ontoast?.(`Colonie ${pl.name} perdue (${why}).`);
      this.note(p, { at, kind: 'planet', tone: 'bad', text: `Colonie ${pl.name} perdue (${why}).` });
      return;
    }
    // Ce qui désignait ma planète mère par « home » (flottes posées, offres d'échange) visait cette
    // planète-là, pas celle qui la remplace : on le réécrit avec son identifiant (D-360).
    const wid = this.planets.find((x) => sameCell(x, pl.cell))?.id;
    if (wid) {
      if (Object.values(p.docked || {}).includes('home')) p.docked = Object.fromEntries(Object.entries(p.docked).map(([k, v]) => [k, v === 'home' ? wid : v]));
      if ((p.offers || []).some((o) => o.from?.planet === 'home')) p.offers = p.offers.map((o) => (o.from?.planet === 'home' ? { ...o, from: { ...o.from, planet: wid } } : o));
    }
    const next = this.livePlanets(p, at)
      .filter((x) => x.key !== 'home')
      .sort((a, b) => (a.planet.claimAt || 0) - (b.planet.claimAt || 0) || (a.key < b.key ? -1 : 1))[0];
    if (!next) {
      p.home = null;
      this.addLog(`${p.name} perd ${pl.name} (${why}) : plus aucune planète, ${p.name} est éliminé.`);
      this.eliminate(p, at, this.wave.pts);
      this.ontoast?.(`${pl.name} perdue (${why}) : tu es éliminé.`, 8000);
      this.note(p, { at, kind: 'planet', tone: 'bad', text: `${pl.name} perdue (${why}) : tu es éliminé.` });
      return;
    }
    const colonies = { ...p.colonies };
    delete colonies[next.key];
    this.settleLog(p, next, at);
    p.colonies = colonies;
    p.home = { ...next.cell };
    p.claimAt = next.planet.claimAt || at;
    p.planet = next.planet;
    this.addLog(`${p.name} perd ${pl.name} (${why}) : ${next.name} devient sa planète mère.`);
    this.ontoast?.(`${pl.name} perdue (${why}) : ${next.name} devient ta planète mère.`);
    this.note(p, { at, kind: 'planet', tone: 'bad', text: `${pl.name} perdue (${why}) : ${next.name} devient ta planète mère.` });
  }
