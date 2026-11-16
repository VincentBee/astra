import { stateAt } from '../../../regles/game/index.js';
import { holdings } from '../../../regles/trade/index.js';

/** Ce que possède une partie, vu de mon téléphone (pour remplir la fenêtre d'échange). */
export function tradeHoldings(pid, ref) {
  const p = this.state.players[pid];
  const now = this.now();
  const s = this.tradeSide(p, ref, now);
  if (!s) return null;
  if (s.side.planet) {
    const st = stateAt(s.side.planet, now).stock;
    return { minerals: Math.floor(st.minerals || 0), food: Math.floor(st.food || 0), fuel: Math.floor(st.energy || 0) };
  }
  return holdings(s.side, p.race, now);
}
