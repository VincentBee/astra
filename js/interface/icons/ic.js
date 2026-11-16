import { PATHS } from './paths.js';

/** Icône à insérer en HTML, décorative : le bouton qui la porte se nomme lui-même. */
export const ic = (name) =>
  `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="${PATHS[name]}"/></svg>`;
