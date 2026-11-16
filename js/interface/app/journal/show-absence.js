import { etat } from '../etat.js';
import { AWAY_MS } from './away-ms.js';
import { openJournal } from './open-journal.js';

/** Au retour (reprise ou appli revenue au premier plan) : le résumé, s'il y a du neuf. */
export function showAbsence(gone) {
  const j = etat.session?.journal;
  if (!etat.session?.state || gone < AWAY_MS || !j || !j.list.some((e) => e.n > etat.awayFrom)) return;
  const min = Math.round(gone / 60_000);
  const text = min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')}`;
  openJournal({ n: etat.awayFrom, since: etat.session.now() - gone, text });
}
