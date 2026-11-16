import { TEMPO } from '../../../tech.js';
import { secs } from '../temps/secs.js';

/**
 * Pouvoirs psychiques des aliens. Tous les textes de durée (description, journal,
 * toast, carte) se calculent depuis `duration` et `cooldown` (#75).
 */
export const POWERS = {
  lift: {
    name: 'Arrachement télékinésique',
    desc: 'Arrache d’un coup au sol de la planète 40 minéraux par psionique.',
    cooldown: 180_000 / TEMPO,
    cost: (pop) => ({ minerals: 0, energy: 30 * Math.ceil(pop) }),
  },
  trance: {
    name: 'Transe collective',
    cooldown: 360_000 / TEMPO,
    duration: 120_000 / TEMPO,
    get desc() {
      return `L’extraction télékinésique double pendant ${secs(this.duration)}.`;
    },
    cost: (pop) => ({ minerals: 0, energy: 25 * Math.ceil(pop) }),
  },
};
