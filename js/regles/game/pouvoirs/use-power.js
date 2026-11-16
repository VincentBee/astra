import { lv } from '../outils/lv.js';
import { own } from '../outils/own.js';
import { secs } from '../temps/secs.js';
import { POWERS } from './powers.js';
import { settle } from '../economie/settle.js';
import { covers } from '../construction/covers.js';
import { pay } from '../construction/pay.js';
import { powerReadyAt } from './power-ready-at.js';
import { powerCost } from './power-cost.js';
import { liftGain } from './lift-gain.js';
import { fmt } from '../outils/fmt.js';

/**
 * Déclenche un pouvoir. Renvoie { error }, ou { text, toast } : `text` pour le
 * journal partagé, `toast` pour le joueur. La durée de la transe vient de
 * `POWERS.trance.duration` (jamais écrite en dur).
 */
export function usePower(planet, key, now) {
  if (planet.race !== 'alien') return { error: 'Seuls les aliens ont des pouvoirs psychiques.' };
  const P = own(POWERS, key);
  if (!P) return { error: 'Pouvoir inconnu.' };
  settle(planet, now);
  now = planet.at; // heure qui recule : l'ordre part de l'heure déjà comptée, pas d'avant
  if (powerReadyAt(planet, key) > now) return { error: 'Ce pouvoir se recharge encore.' };
  const cost = powerCost(planet, key);
  if (!covers(planet.stock, cost)) return { error: 'Pas assez d’énergie.' };
  const amp = 1 + 0.25 * lv(planet.levels, 'amplifier');
  const gain = key === 'lift' ? liftGain(planet, amp) : 0;
  // La transe double l'extraction : sur un sol vide, il n'y a rien à doubler.
  if (key === 'trance' && planet.nature?.minerals && planet.reserve.minerals < 1) return { error: 'Le sol est vide : la transe n’extrairait rien de plus.' };
  if (key === 'lift' && gain <= 0) return { error: planet.nature?.minerals && !planet.reserve.minerals ? 'Le sol est vide : rien à arracher.' : 'L’entrepôt de minéraux est plein.' };
  pay(planet, cost);
  planet.powers = { ...(planet.powers || {}), [key]: now + P.cooldown };
  if (key === 'lift') {
    planet.stock.minerals += gain;
    if (planet.nature?.minerals) planet.reserve = { ...planet.reserve, minerals: planet.reserve.minerals - gain };
    return { text: `arrache ${fmt(gain)} minéraux par télékinésie`, toast: `${P.name} : +${fmt(gain)} minéraux` };
  }
  // transe : extraction doublée pendant un temps.
  planet.trance = now + P.duration;
  return { text: `entre en transe collective : extraction doublée ${secs(P.duration)}`, toast: `${P.name} : extraction doublée ${secs(P.duration)}` };
}
