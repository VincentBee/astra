import { FROST } from '../../../regles/game/index.js';
import { fleetPos } from '../../../regles/fleet/index.js';
import { FROST_STEP } from '../../constantes/frost-step.js';

/**
 * Heure à laquelle le froid atteint une flotte et la détruit (D-163), Infinity : jamais. Calculée
 * sur son segment (from, to, depart, arrive), donc la même sur tous les téléphones, même si son
 * propriétaire est hors ligne. En vol, on regarde sa position toutes les secondes (FROST_STEP) :
 * la première où sa case est gelée. Arrêtée, c'est l'heure du gel de sa case, frostOf(case).
 */
export function fleetFrostAt(f) {
  const start = this.startedAt;
  if (start == null || !f?.from || !f?.to || !Number.isFinite(FROST.delayMs)) return Infinity;
  const key = `${this.state.gid}|${start}|${FROST.delayMs}|${FROST.durationMs}|${f.depart}|${f.arrive}|${f.from.x},${f.from.y}|${f.to.x},${f.to.y}`;
  const memo = (this.fleetFrostMemo ||= new WeakMap()).get(f);
  if (memo?.key === key) return memo.t;
  const rest = Math.max(f.arrive, this.frostOf(fleetPos(f, f.arrive)));
  let t = rest;
  for (let s = Math.max(f.depart, start + FROST.delayMs); s < Math.min(f.arrive, rest); s += FROST_STEP) {
    if (this.frostOf(fleetPos(f, s)) <= s) {
      t = s;
      break;
    }
  }
  this.fleetFrostMemo.set(f, { key, t });
  return t;
}
