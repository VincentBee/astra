import { launch, countShips, MAX_FLEETS } from '../../../regles/fleet/index.js';
import { de } from '../../textes/de.js';
import { shipsText } from '../../textes/ships-text.js';

/** Faire décoller des vaisseaux (avec cargaison et carburant) d'une de mes planètes. */
export function takeOff(fromKey, ships, cargo, fuel) {
    if (!this.canAct) return false;
    const p = this.state.players[this.me];
    const from = this.planetOf(p, fromKey);
    if (!from) {
      this.ontoast?.('Planète introuvable.');
      return false;
    }
    p.fleets ||= [];
    if (p.fleets.length >= MAX_FLEETS) {
      this.ontoast?.(`Pas plus de ${MAX_FLEETS} flottes.`);
      return false;
    }
    this.settleLog(p, from);
    const res = launch(from.planet, { ships, cargo, fuel, at: from.cell, origin: fromKey, id: this.newId(6) }, this.now());
    if (res.error) {
      this.ontoast?.(res.error);
      return false;
    }
    p.fleets.push(res.fleet);
    this.touch(this.addLog(`Une flotte ${de(p.name)} décolle de ${from.name} : ${shipsText(countShips(res.fleet.ships))}.`));
    this.changed();
    return res.fleet.id;
  }
