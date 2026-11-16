import { upgradeCost } from '../../../game.js';
import { PLAYBOOK } from '../donnees/playbook.js';

/**
 * Prochain bâtiment pour cette planète, ou null. D'abord ce qui manque pour vivre (énergie,
 * nourriture, logement), puis les étapes de la race, puis production et défense à tour de rôle.
 * Un bâtiment trop cher pour l'entrepôt fait d'abord monter l'entrepôt. Sur la planète mère
 * (`home`), les dernières places libres vont au labo (niv. 2) et au chantier naval : sans eux,
 * ni colonies ni vaisseaux de guerre.
 */
export function chooseBuilding(race, st, free = Infinity, home = true) {
  const B = PLAYBOOK[race];
  const lv = (k) => (st.levels[k] || 0) + (st.queue?.key === k && !st.queue.demolish ? 1 : 0);
  const f = st.prod;
  const pick = (key) => {
    const cost = upgradeCost(race, key, lv(key));
    // L'entrepôt doit pouvoir contenir le prix (avec un peu de marge).
    if (Object.entries(cost).some(([r, v]) => v > 0.95 * (f.caps[r] ?? Infinity))) return 'store';
    return key;
  };
  const musts = home ? [['lab', 2], ['yard', 1]].filter(([k, n]) => lv(k) < n) : [];
  if (musts.length && free <= musts.reduce((t, [k, n]) => t + n - lv(k), 0)) return pick(musts[0][0]);
  // Énergie : la demande doit être couverte avec une marge, pour le prochain bâtiment.
  if (f.effE < 1 || f.net.energy < 0.12 * f.out.energy + 1) return pick(B.energy);
  if (B.food && (f.effF < 1 || f.net.food < 0.08 * f.out.food + 0.5)) return pick(B.food);
  if (race === 'human' && st.pop > 0.85 * f.popCap) return pick(B.house);
  // Humains : une mine de plus sans bras pour y travailler ne produit rien (la population
  // grandit jusqu'au plafond des habitats : c'est lui qu'on compare).
  const idle = (key) => race === 'human' && key === 'mine' && f.jobs + 10 > 0.9 * f.popCap;
  for (const [key, level] of B.steps) if (lv(key) < level && !idle(key)) return pick(key);
  // Au-delà : la production, puis une défense, en gardant les niveaux proches.
  const pool = [...B.prod, ...B.defense, B.energy].filter((k) => !idle(k));
  if (B.house) pool.push(B.house);
  pool.sort((a, b) => lv(a) - lv(b) || pool.indexOf(a) - pool.indexOf(b));
  return pick(pool[0]);
}
