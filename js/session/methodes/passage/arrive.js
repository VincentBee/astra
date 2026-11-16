import { newPlanet, settle, sameCell, SOIL, fortOf } from '../../../regles/game/index.js';
import { battle, plunder, moving, countShips, fuelAt, together, merge, applyLosses, fleetCargo } from '../../../regles/fleet/index.js';
import { MAX_EFFECTS } from '../../constantes/max-effects.js';
import { RAID_COOLDOWN_MS } from '../../constantes/raid-cooldown-ms.js';
import { techOf } from '../../outils/tech-of.js';
import { de } from '../../textes/de.js';
import { lootText } from '../../textes/loot-text.js';

/** Arrivée d'une de mes flottes qui avait un ordre à exécuter. */
export function arrive(p, f) {
    const order = f.order;
    f.order = null; // quoi qu'il arrive, la flotte attend ensuite en orbite
    const drop = () => (p.fleets = p.fleets.filter((x) => x.id !== f.id));
    const now = this.now();

    if (order.kind === 'dock') {
      const pl = this.planetOf(p, order.key);
      if (!pl || !sameCell(pl.cell, f.to) || this.ownerAt(pl.cell)?.id !== this.me) {
        this.addLog(`La flotte ${de(p.name)} ne trouve pas où se poser : elle reste en orbite.`);
        return true;
      }
      this.settleLog(p, pl, now);
      pl.planet.ships ||= {};
      for (const [k, n] of Object.entries(f.ships)) pl.planet.ships[k] = (pl.planet.ships[k] || 0) + n;
      for (const [r, v] of Object.entries(f.cargo || {})) pl.planet.stock[r] = (pl.planet.stock[r] || 0) + v;
      pl.planet.stock.energy = (pl.planet.stock.energy || 0) + Math.floor(fuelAt(f, p.race, now)); // le carburant restant retourne au stock
      const docked = { ...(p.docked || {}) };
      const wid = this.planets.find((x) => sameCell(x, pl.cell))?.id || pl.key; // l'identifiant de la planète, pas « home » (D-360)
      for (const id of [f.id, ...(f.absorbed || [])]) docked[id] = wid;
      p.docked = Object.fromEntries(Object.entries(docked).slice(-60));
      drop();
      const loot = lootText(f.cargo || {});
      this.addLog(`La flotte ${de(p.name)} se pose sur ${pl.name}${loot ? ` avec ${loot}` : ''}.`);
      return true;
    }

    if (order.kind === 'join') {
      // La flotte à rejoindre, ou celle qui l'a absorbée entre-temps.
      const g = (p.fleets || []).find((x) => x !== f && (x.id === order.fleet || x.absorbed?.includes(order.fleet)));
      if (g && together(f, g, now) && !this.locked(g.id) && !this.locked(f.id)) {
        merge(f, g, p.race, now);
        drop();
        this.addLog(`Une flotte ${de(p.name)} en rejoint une autre en [${g.to.x}:${g.to.y}] : elles fusionnent.`);
        return true;
      }
      // Elle arrive ici, ou un échange la retient : on l'attend.
      if (g && ((moving(g, now) && sameCell(g.to, f.to)) || (together(f, g, now) && (this.locked(g.id) || this.locked(f.id))))) {
        f.order = order;
        return false;
      }
      this.addLog(`Une flotte ${de(p.name)} ne trouve plus la flotte à rejoindre : elle reste en [${f.to.x}:${f.to.y}].`);
      return true;
    }

    if (order.kind === 'colonize' && !p.home && !p.out) return this.found(p, f, order);

    if (order.kind === 'colonize') {
      const w = this.planets.find((x) => x.id === order.world);
      // Prise par un joueur arrivé après moi (son téléphone est passé avant le mien) : je
      // fonde quand même, et son téléphone lui rendra sa flotte (checkClaim).
      if (!w || !f.ships.colony || this.takenBefore(w, f.arrive)) {
        this.addLog(`${w?.name || 'La planète'} est déjà prise : la flotte ${de(p.name)} reste en orbite.`);
        return true;
      }
      if (this.frostOf(w) <= f.arrive) {
        this.addLog(`${w.name} est gelée : la flotte ${de(p.name)} reste en orbite.`);
        return true;
      }
      const colony = newPlanet(p.race, f.arrive, w);
      colony.stock = { minerals: 0, food: 0, ...f.cargo, energy: Math.floor(fuelAt(f, p.race, now)) };
      colony.tech = { ...techOf(p) };
      colony.claimAt = f.arrive;
      const ships = { ...f.ships, colony: f.ships.colony - 1 };
      if (!ships.colony) delete ships.colony;
      colony.ships = ships;
      p.colonies = { ...(p.colonies || {}), [w.id]: colony };
      // Un combat contre cette flotte que je n'ai pas encore lu retombera sur la colonie.
      const docked = { ...(p.docked || {}) };
      for (const id of [f.id, ...(f.absorbed || [])]) docked[id] = w.id;
      p.docked = Object.fromEntries(Object.entries(docked).slice(-60));
      drop();
      this.addLog(`${p.name} fonde une colonie sur ${w.name}.`);
      this.ontoast?.(`Colonie fondée sur ${w.name} !`);
      return true;
    }

    if (order.kind === 'attack' || order.kind === 'conquer') {
      // La planète a pu changer de main pendant le trajet (D-200) : on vise son propriétaire
      // d'aujourd'hui, pas celui de l'ordre, dont la fiche la montre encore tant qu'il n'a pas lu le rapport de prise.
      const enemy = this.ownerAt(f.to);
      const pl = enemy && this.planetsOf(enemy).find((x) => sameCell(x.cell, f.to));
      const was = this.state.players[order.pid];
      const gone = was && this.planetOf(was, order.key);
      const here = this.planets.find((x) => sameCell(x, f.to))?.name || gone?.name || `[${f.to.x}:${f.to.y}]`;
      if (!pl) {
        this.addLog(`Plus personne n'habite ${here} : la flotte ${de(p.name)} reste en orbite.`);
        return true;
      }
      // Gelée pendant le trajet (D-450) : la planète est perdue, il n'y a plus rien à piller ni à prendre.
      if (this.frostOf(pl.cell) <= f.arrive) {
        this.addLog(`${pl.name} est gelée : la flotte ${de(p.name)} reste en orbite.`);
        return true;
      }
      if (enemy.id === this.me) {
        // Déjà à moi (une autre de mes flottes l'a prise juste avant) : elle s'y pose.
        f.order = { kind: 'dock', key: pl.key };
        return this.arrive(p, f);
      }
      // Un ordre sans cible (pid null : planète vue libre, D-190) n'a pas d'ancien propriétaire à citer.
      if (order.pid && enemy.id !== order.pid) this.addLog(`${enemy.name} a pris ${pl.name}${was ? ` à ${was.name}` : ''} entre-temps : la flotte ${de(p.name)} l'attaque.`);
      // Je calcule le combat avec ce que je sais du défenseur à l'heure de l'arrivée ;
      // son téléphone appliquera ses pertes en lisant mon rapport.
      const def = this.defenseAt(p, enemy, pl, f.arrive);
      // La planète se défend avec ses vaisseaux posés et sa défense (ses bâtiments : canons, boucliers…).
      const fort = fortOf(enemy.race, def.levels, def.pop);
      const res = battle({ race: p.race, ships: f.ships, tech: techOf(p) }, { race: enemy.race, ships: def.ships, tech: def.tech, fort });
      if (!res.won) this.addLog(`La défense de ${pl.name} (${enemy.name}) repousse ${de(p.name)}.`);
      // Un pillage par planète toutes les 2 min au plus : sinon, des attaques à la chaîne depuis
      // l'orbite (trajet de 0 case) vidaient tout, malgré la règle « la moitié au plus ».
      const spot = `${enemy.id}:${pl.cell.x}:${pl.cell.y}`; // par case : la clé change quand une colonie devient planète mère (D-360)
      const recent = (p.raided?.[spot] || 0) > f.arrive - RAID_COOLDOWN_MS;
      const take = res.won && !recent ? plunder(p.race, res.attLeft, def.stock, f.cargo) : {};
      if (res.won && !recent) p.raided = Object.fromEntries([...Object.entries(p.raided || {}).filter(([, t]) => t > f.arrive - RAID_COOLDOWN_MS), [spot, f.arrive]]);
      // Conquête : vaisseaux et défense abattus, sur une planète que le froid n'a pas prise, elle change de main.
      const w = this.planets.find((x) => sameCell(x, pl.cell));
      const capture = order.kind === 'conquer' && res.won && !!w && this.frostOf(w) > f.arrive;
      // Un identifiant par combat : une même flotte peut attaquer plusieurs fois.
      // Le rapport vise la case (D-360) : la clé « home » change de planète si l'autre perd sa planète mère avant de le lire.
      const effect = { id: this.newId(8), to: enemy.id, key: pl.key, cell: { ...pl.cell }, at: f.arrive, ships: res.defLost, lost: res.attLost, take, rep: res.report };
      if (capture) effect.capture = true;
      p.effects = [...(p.effects || []), effect].slice(-MAX_EFFECTS);
      if (capture) return this.capture(p, f, w, pl, enemy, res, take, now);
      const loot = lootText(take);
      this.addLog(
        res.won
          ? `${p.name} remporte le combat sur ${pl.name} (${enemy.name})${loot ? ` et pille ${loot}` : ''}.`
          : `${p.name} perd le combat sur ${pl.name} (${enemy.name}).`,
      );
      this.ontoast?.(res.won ? `Victoire sur ${pl.name} !` : `Défaite sur ${pl.name}.`);
      this.note(p, {
        at: f.arrive, kind: 'combat', who: enemy.name, planet: pl.name, mine: countShips(res.attLost), theirs: countShips(res.defLost), loot,
        rep: res.report, side: 'a', noLoot: res.won && !loot ? (recent ? 'cooldown' : fleetCargo(p.race, res.attLeft) > SOIL.reduce((t, r) => t + (f.cargo?.[r] || 0), 0) ? 'empty' : 'full') : undefined,
        cooldown: res.won && recent ? RAID_COOLDOWN_MS : undefined,
        tone: res.won ? 'good' : 'bad',
        text: res.won ? `Victoire sur ${pl.name} (${enemy.name}).` : `Défaite sur ${pl.name} (${enemy.name}) : sa défense te repousse.`,
      });
      // Les soutes perdues emportent leur cargaison, comme en combat entre flottes.
      if (!applyLosses(f, p.race, techOf(p), res.attLost, null, now)) return drop(), true;
      f.cargo =Object.fromEntries(SOIL.map((r) => [r, (f.cargo?.[r] || 0) + (take[r] || 0)]));
      return true;
    }
    return true;
  }
