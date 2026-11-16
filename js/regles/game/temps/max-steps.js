/**
 * Nombre de pas au plus par calcul (D-175). Sans lui, une planète datée de très
 * loin (une fiche reçue avec `at = 0`) demandait des millions de pas et figeait
 * la page. Il ne joue qu'au-delà de MAX_STEPS × 2 h de jeu (≈ 26,7 h réelles) :
 * une partie normale garde exactement ses pas d'avant.
 */
export const MAX_STEPS = 2000;
