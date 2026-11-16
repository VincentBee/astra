/**
 * Estimation du fil, pour l'affichage seulement : quand chaque élément du fil
 * devrait commencer et finir, si la production reste celle d'aujourd'hui
 * (ce qui est déjà lancé compris). Deux passes : 10 min à la seconde près,
 * puis 6 h, plus grossière. Renvoie, dans l'ordre du fil,
 * [{ item, lane, key, level, count, cost, start, end, why }] : `key` est le
 * bâtiment, la technologie ou le vaisseau ; `level` le niveau visé (bâtiment,
 * recherche) ; `count` le nombre de vaisseaux. `start` vaut null si rien
 * n'arrive dans les 6 h, et `why` dit ce qui bloque quand on le sait.
 */
export const FORECAST_AUTO = 60;
