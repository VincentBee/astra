import { TECHS } from '../../../regles/tech/index.js';
import { PLAYBOOK } from '../donnees/playbook.js';

/**
 * Prochaine technologie voulue que ce labo peut chercher maintenant (ou null : on attend). Une
 * recherche en cours ou au fil, ici ou sur une autre planète, ne se demande pas deux fois (D-421).
 */
export function chooseTech(ctx, pl, st) {
  const race = ctx.p.race;
  const tech = st.tech || {};
  const lab = st.levels.lab || 0;
  if (!lab || st.research) return null;
  const busy = new Set();
  for (const x of ctx.s.planetsOf(ctx.p)) {
    if (x.planet.research) busy.add(x.planet.research.key);
    for (const it of x.planet.plan || []) if (it?.tech) busy.add(it.tech);
  }
  const want = {};
  for (const key of PLAYBOOK[race].techs) {
    want[key] = (want[key] || 0) + 1;
    if ((tech[key] || 0) >= want[key] || busy.has(key)) continue;
    const T = TECHS[race][key];
    if ((tech[key] || 0) >= T.max) continue;
    // Il manque un niveau de labo : on passe à la suivante (le labo viendra avec les étapes).
    if ((T.req.lab || 0) > lab) continue;
    if (Object.entries(T.req).some(([k, n]) => k !== 'lab' && (tech[k] || 0) < n)) continue;
    return key;
  }
  return null;
}
