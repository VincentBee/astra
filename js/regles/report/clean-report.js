import { isObj } from './is-obj.js';
import { num } from './num.js';
import { counts } from './counts.js';
import { SHIPS, SHIP_KEYS } from '../tech/index.js';

/** Déroulé reçu d'un autre téléphone, nettoyé (ou undefined s'il est inutilisable). */
export function cleanReport(r) {
  if (!isObj(r) || !isObj(r.a) || !isObj(r.d) || !Array.isArray(r.rounds)) return undefined;
  const side = (s) => {
    const out = {
      race: typeof s.race === 'string' && Object.hasOwn(SHIPS, s.race) ? s.race : null,
      ships: counts(s.ships, SHIP_KEYS),
      bonus: { attack: num(s.bonus?.attack, 100) || 1, hull: num(s.bonus?.hull, 100) || 1 },
      fire: num(s.fire),
      hull: num(s.hull),
      hullLeft: num(s.hullLeft),
    };
    if (isObj(s.fort)) out.fort = { attack: num(s.fort.attack), hull: num(s.fort.hull) };
    return out;
  };
  return {
    a: side(r.a),
    d: side(r.d),
    rounds: r.rounds.slice(0, 4).filter(isObj).map((x) => ({ a: num(x.a), d: num(x.d), aLost: counts(x.aLost), dLost: counts(x.dLost) })),
  };
}
