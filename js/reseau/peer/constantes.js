/**
 * Un message ne doit pas dépasser 256 Ko (a=max-message-size, js/invite.js) :
 * au-delà de cette taille de texte (3 octets au plus par caractère), on
 * l'envoie en morceaux, recollés à l'arrivée.
 */
export const PART = 60_000;

/** Un message ne dépasse pas 200 morceaux (12 Mo) : bien plus qu'une partie entière. */
export const MAX_PARTS = 200;
