/**
 * Lots lancés au plus par la règle automatique dans un même calcul de stateAt (D-530, D-531).
 * Le fil s'arrête à PLAN_MAX lancements ; la règle, elle, n'a pas de fin : sans limite, une
 * fiche datée de très loin (D-175) ferait des milliers de lots à chaque affichage. stateAt
 * s'arrête alors de compter la règle et dit où (`autoFull`) ; `settle`, lui, écrit la planète
 * par morceaux de AUTO_MAX lots : le propriétaire ne perd aucun lot.
 */
export const AUTO_MAX = 1000;
