/**
 * Première ressource du prix `cost` qui manque au stock et ne peut plus monter
 * avec la production actuelle (D-270), ou null. `f()` donne les flux de l'état
 * (`flows` sur une seconde de jeu), calculés seulement s'il manque quelque
 * chose. « Ne peut plus monter » : solde ≤ 0, ou demande pas couverte (famine
 * pour la nourriture, panne pour l'énergie : tout ce qui rentre est mangé).
 */
export function starved(cost, stock, f) {
  let fl = null;
  for (const [r, v] of Object.entries(cost)) {
    if ((stock[r] || 0) + 1e-9 >= v) continue;
    fl ||= f();
    const short = (r === 'food' && fl.effF < 1) || (r === 'energy' && fl.effE < 1);
    if (short || !(fl.net[r] > 1e-9)) return r;
  }
  return null;
}
