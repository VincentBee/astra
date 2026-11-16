import { SHIPS } from '../../regles/tech/index.js';

/** Une ligne de journal par vaisseau reçu par l'achat automatique (D-530), pas une par lot. */
export function autoLog(session, p, pl, done) {
  const got = {};
  for (const d of done) if (d.auto && d.kind === 'yard') got[d.type] = (got[d.type] || 0) + d.count;
  for (const [type, n] of Object.entries(got)) session.addLog(`${p.name} reçoit ${n} × ${SHIPS[p.race][type].name} sur ${pl.name} (achat auto).`);
}
