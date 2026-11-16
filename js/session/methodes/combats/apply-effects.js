import { settle, sameCell } from '../../../game.js';
import { countShips } from '../../../fleet.js';
import { lootText } from '../../textes/loot-text.js';

/**
 * Dégâts qu'un autre joueur m'a infligés : il les a inscrits dans sa
 * fiche (je suis le seul à écrire la mienne), je les applique une fois.
 */
export function applyEffects(p, now) {
  p.applied ||= [];
  let any = false;
  // Mes rapports déjà appliqués par leur cible : je peux les oublier.
  const pending = (p.effects || []).filter((e) => !this.state.players[e.to]?.applied?.includes(e.id));
  if (pending.length !== (p.effects || []).length) {
    p.effects = pending;
    any = true;
  }
  const live = new Set();
  // Tous les rapports qui me visent, dans l'ordre de leur heure (D-360) : pas dans l'ordre des
  // joueurs de ma copie, qui changerait d'un téléphone à l'autre (une prise plus tardive lue
  // avant un pillage plus ancien). À égalité : par joueur, puis dans l'ordre de sa fiche.
  const todo = [];
  for (const other of Object.values(this.state.players)) {
    if (other.id === this.me) continue;
    (other.effects || []).forEach((e, i) => {
      if (e.to !== this.me) return;
      live.add(e.id);
      if (!p.applied.includes(e.id)) todo.push({ other, e, i });
    });
  }
  todo.sort((a, b) => (a.e.at || 0) - (b.e.at || 0) || (a.other.id < b.other.id ? -1 : a.other.id > b.other.id ? 1 : 0) || a.i - b.i);
  for (const { other, e } of todo) {
    p.applied = [...p.applied, e.id];
    any = true;
    if (this.goneBy(other, e.at)) continue; // livré après sa mort : ses flottes n'existaient plus (D-180)
    if (e.fleet && this.fleetHit(p, other, e, now)) continue;
    // La planète visée, par sa case (D-360) : la clé « home » a pu changer de planète depuis
    // (ma planète mère gelée ou prise, une colonie l'a remplacée). Un ancien rapport sans case : par sa clé.
    const pl = e.fleet ? this.dockedPlanet(p, e.fleet) : e.cell ? this.planetsOf(p).find((x) => sameCell(x.cell, e.cell)) : this.planetOf(p, e.key);
    // Planète perdue avant que je lise le rapport, ou reprise après le combat : il ne touche rien.
    const since = pl && (pl.key === 'home' ? p.claimAt || p.rank || 0 : pl.planet.claimAt || 0);
    if (!pl || since > e.at) {
      this.missedEffect(p, other, e);
      continue;
    }
    if (e.capture) {
      this.note(p, {
        at: e.at, kind: 'combat', who: other.name, planet: pl.name, capture: true, mine: countShips(e.ships), theirs: e.lost ? countShips(e.lost) : null,
        pillaged: lootText(e.take || {}), rep: e.rep, side: 'd', tone: 'bad', text: `${other.name} prend ${pl.name}.`,
      });
      this.losePlanet(p, pl.key, e.at, `prise par ${other.name}`);
      continue;
    }
    settle(pl.planet, now);
    pl.planet.ships ||= {};
    for (const [k, n] of Object.entries(e.ships || {})) pl.planet.ships[k] = Math.max(0, (pl.planet.ships[k] || 0) - n);
    for (const [r, v] of Object.entries(e.take || {})) pl.planet.stock[r] = Math.max(0, (pl.planet.stock[r] || 0) - v);
    const lost = countShips(e.ships);
    const loot = lootText(e.take || {});
    const ships = lost ? `${lost} vaisseau${lost > 1 ? 'x' : ''} perdu${lost > 1 ? 's' : ''}` : 'aucun vaisseau perdu';
    this.addLog(`${pl.name} (${p.name}) est attaquée par ${other.name} : ${ships}${loot ? `, ${loot} pillés` : ''}.`);
    this.ontoast?.(`${other.name} attaque ${pl.name} !`);
    const harm = lost > 0 || !!loot;
    this.note(p, {
      at: e.at, kind: 'combat', who: other.name, planet: pl.name, mine: lost, theirs: e.lost ? countShips(e.lost) : null, pillaged: loot,
      rep: e.rep, side: 'd', tone: harm ? 'bad' : 'good', text: harm ? `${other.name} attaque ${pl.name}.` : `${pl.name} repousse ${other.name}.`,
    });
  }
  // Un rapport que son auteur a effacé ne reviendra pas (sa fiche ne fait
  // qu'avancer) : je n'ai plus besoin de me souvenir que je l'ai appliqué.
  // Couper cette liste par la fin ferait au contraire réappliquer un
  // rapport encore présent chez son auteur.
  const applied = p.applied.filter((id) => live.has(id));
  if (applied.length !== p.applied.length) {
    p.applied = applied;
    any = true;
  }
  return any;
}
