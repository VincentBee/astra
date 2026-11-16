/**
 * Une partie est « en cours » : partie (`startedAt`), pas finie (`over`), écran de jeu affiché.
 * Le lobby (avant le départ) et l'écran de fin n'en sont pas.
 */
export function playing({ status, startedAt, over, gameShown }) {
  return status === 'playing' && startedAt != null && !over && !!gameShown;
}
