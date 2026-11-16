import { sameCell } from '../../../regles/game/index.js';
import { de } from '../../textes/de.js';

/**
 * Un rapport de combat qui ne trouve plus sa planète (gelée ou prise avant que je le lise) :
 * il ne touche rien, et mon carnet dit pourquoi, en nommant la planète vraiment attaquée (D-360).
 */
export function missedEffect(p, other, e) {
  if (e.fleet && !p.docked?.[e.fleet]) {
    // Ni la flotte ni une planète où elle se serait posée : déjà détruite (froid, autre combat).
    this.addLog(`Rapport de ${other.name} sans effet : la flotte ${de(p.name)} visée n’existe plus.`);
    return;
  }
  const w = e.cell ? this.planets.find((x) => sameCell(x, e.cell)) : e.fleet && p.docked?.[e.fleet] && this.planets.find((x) => x.id === p.docked[e.fleet]);
  const name = w?.name || 'une planète perdue';
  const what = e.capture ? 'la prise' : 'l’attaque';
  this.addLog(`Rapport de ${other.name} sans effet : ${name} n’est plus à ${p.name} (${what} ne touche rien).`);
  this.note(p, { at: e.at, kind: 'planet', tone: 'even', text: `${other.name} attaque ${name}, déjà perdue : sans effet.` });
}
