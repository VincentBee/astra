import { SHIPS } from '../../../regles/tech/index.js';
import { maxTech } from '../../outils/max-tech.js';
import { techOf } from '../../outils/tech-of.js';
import { planAhead } from '../../../regles/game/index.js';
import { stateAt } from '../../../regles/game/index.js';
import { shipUnlocked } from '../../../regles/tech/index.js';
import { tooBig } from '../../../regles/game/index.js';
import { shipsCost } from '../../../regles/game/index.js';

/**
 * Achat automatique de vaisseaux sur cette planète (D-530) : `type` et `count` (1 à 50) donnent
 * la règle ; `count` 0 (ou pas de `type`) l'arrête. Pas `null` seul : le rejeu lit un `null`
 * du journal comme un argument absent (js/replay.js). Chantier naval libre, plus aucun lot au fil et stock
 * suffisant, un lot de `count` × `type` part tout seul, encore et encore (game.js stateAt).
 * Une seule règle par planète : la nouvelle remplace l'ancienne. Elle vaut à partir de
 * maintenant : on écrit d'abord la planète, pour ne rien acheter dans le passé.
 */
export function setAutoShips(type, count = 1, where = 'home') {
    if (!this.canAct) return;
    const p = this.state.players[this.me];
    if (!p?.planet) return this.ontoast?.('Choisis d’abord ta race.');
    const pl = this.myPlanet(where);
    if (!pl) return;
    if (!type || count === 0) {
      this.settlePlan(p, pl);
      if (!pl.planet.auto) return this.ontoast?.('Aucun achat automatique sur cette planète.');
      const old = pl.planet.auto;
      delete pl.planet.auto;
      this.touch(this.addLog(`${p.name} arrête l’achat automatique de ${SHIPS[p.race][old.ship]?.name || old.ship} sur ${pl.name}.`));
      return this.changed();
    }
    const S = SHIPS[p.race];
    if (typeof type !== 'string' || !Object.hasOwn(S, type)) return this.ontoast?.('Vaisseau inconnu.');
    if (!(Number.isInteger(count) && count >= 1 && count <= 50)) return this.ontoast?.('Entre 1 et 50 vaisseaux par lot.');
    this.settlePlan(p, pl);
    if (pl.key !== 'home') pl.planet.tech = maxTech(pl.planet.tech, techOf(p));
    const ahead = planAhead(stateAt(pl.planet, pl.planet.at));
    if (!ahead.levels.yard) return this.ontoast?.('Il faut un chantier naval (ou en mettre un au fil).');
    if (!shipUnlocked(p.race, type, ahead.tech)) return this.ontoast?.('Ce vaisseau n’est pas encore recherché (fil compris).');
    // Lot plus cher que l'entrepôt (fil compris) : il ne partirait jamais (comme D-441). Au rejeu, un vieux journal garde son sens.
    const big = !this.replaying && tooBig(p.race, ahead.levels, shipsCost(p.race, type, count));
    if (big) return this.ontoast?.(`${big} pour un lot de ${count} (fil compris).`);
    const old = pl.planet.auto;
    if (old?.ship === type && old?.n === count) return this.ontoast?.('Cet achat automatique est déjà réglé.');
    pl.planet.auto = { ship: type, n: count };
    this.touch(this.addLog(`${p.name} programme l’achat automatique de ${count} × ${S[type].name} sur ${pl.name}.`));
    this.changed();
  }
