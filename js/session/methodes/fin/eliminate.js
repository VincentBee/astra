import { de } from '../../textes/de.js';

/**
 * Le joueur `p` est éliminé à l'heure `at` (D-180), quelle qu'en soit la cause (planète prise,
 * planète gelée, plus de colonisateur) : `pts` départage le classement (ses points d'avant la
 * chute). Toutes ses flottes, à quai ou en vol, disparaissent à cette heure : plus de combat,
 * de pillage ni de prise après sa mort. Les autres téléphones ne les voient plus dès qu'ils
 * savent qu'il est mort (`sees`, par `deadAt`), même s'il est hors ligne.
 */
export function eliminate(p, at, pts) {
  p.out = at;
  p.deathPts = pts;
  const n = (p.fleets || []).length;
  p.fleets = [];
  if (n) this.addLog(`Les flottes ${de(p.name)} disparaissent avec lui (${n} flotte${n > 1 ? 's' : ''}).`);
}
