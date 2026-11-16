import { sameCell } from '../../../game.js';
import { isCell } from '../../fiches/is-cell.js';

/**
 * La fiche `rec` revendique-t-elle une planète mère avec une date d'avant
 * la fiche `ours` qui ne l'avait pas ? (Une colonie, elle, est datée de
 * l'arrivée de sa flotte, qui peut précéder la dernière fiche : pas ici.)
 */
export function backdated(ours, rec) {
  // Une de ses colonies devenue planète mère (l'ancienne est perdue) garde sa date : ce n'est pas une installation.
  if (isCell(rec.home) && Object.keys(ours.colonies || {}).some((id) => sameCell(this.planets.find((w) => w.id === id), rec.home))) return false;
  // Planète mère fondée par un colonisateur : datée de son arrivée, que la fiche montrait déjà en route.
  if (isCell(rec.home) && (ours.fleets || []).some((f) => f.order?.kind === 'colonize' && sameCell(f.to, rec.home) && Math.abs(f.arrive - rec.claimAt) < 1)) return false;
  // Marge d'une minute : plusieurs ordres dans la même milliseconde font avancer l'heure de la fiche d'un cran chacun.
  return isCell(rec.home) && !sameCell(rec.home, ours.home) && Number.isFinite(rec.claimAt) && rec.claimAt < (ours.actAt || 0) - 60_000;
}
