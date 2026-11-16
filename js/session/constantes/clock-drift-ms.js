/**
 * Changement d'heure (D-166, choix de Claude) : si l'heure commune d'un joueur s'écarte de plus de
 * 10 s de la mienne (ou de l'écart de référence, s'il n'a pas encore l'heure commune), son heure a
 * changé. La mesure (battement de cœur) est juste à 1 s près.
 */
export const CLOCK_DRIFT_MS = 10_000;
