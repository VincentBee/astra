// Icônes de l'interface (24 × 24, trait fin, couleur du texte).
// Un dessin remplace un mot : le sens reste dans title / aria-label.
const PATHS = {
  up: 'M12 19V5M6 11l6-6 6 6',
  wait: 'M12 7v5l3 2M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z',
  done: 'M5 12l5 5 9-10',
  play: 'M7 4l13 8-13 8z',
  none: 'M5 5l14 14M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z',
  close: 'M6 6l12 12M18 6 6 18',
  back: 'M19 12H5M11 18l-6-6 6-6',
  stop: 'M6 6h12v12H6z',
  home: 'M3 11l9-8 9 8M5 9.5V21h14V9.5',
  dock: 'M12 3v11M7 9l5 5 5-5M4 20h16',
  fuel: 'M4 21V4h9v17M2 21h13M4 10h9M13 8h3l3 3v6.5a1.5 1.5 0 0 1-3 0V14h-3',
  split: 'M12 3v8M12 11l-6 6v4M12 11l6 6v4',
  merge: 'M6 3v4l6 6 6-6V3M12 13v8',
  give: 'M4 12h14M13 6l6 6-6 6',
  trade: 'M4 8h15l-4-4M20 16H5l4 4',
  fleet: 'M12 3l7 18-7-4-7 4z',
  attack: 'M4 4l10 10M4 4h4M4 4v4M13 17l4-4M15 19l5 1-1-5',
  build: 'M3 21h18M5 21V10l7-5 7 5v11M10 21v-6h4v6',
  research: 'M9 3h6M10 3v6l-5.5 9.5A1.7 1.7 0 0 0 6 21h12a1.7 1.7 0 0 0 1.5-2.5L14 9V3M7 15h10',
  copy: 'M9 9h11v11H9zM15 9V4H4v11h5',
  share: 'M12 15V3M7 8l5-5 5 5M5 13v8h14v-8',
  scan: 'M3 8V3h5M16 3h5v5M21 16v5h-5M8 21H3v-5M7 12h10',
  plus: 'M12 5v14M5 12h14',
  join: 'M14 3h6v18h-6M3 12h12M11 8l4 4-4 4',
  replay: 'M3 12a9 9 0 1 0 2.6-6.4M3 3v5h5',
  journal: 'M5 3h11l3 3v15H5zM8 9h8M8 13h8M8 17h5',
  users: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21c0-3.9 3.1-7 7-7s7 3.1 7 7M16 3.5a4 4 0 0 1 0 7M22 21c0-3.2-1.8-5.8-5-6.6',
  planet: 'M12 5a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM2.5 16.5c1.5 2 19-5.5 19-9.5',
  power: 'M12 3l2.2 6.8L21 12l-6.8 2.2L12 21l-2.2-6.8L3 12l6.8-2.2z',
  check: 'M5 12l5 5 9-10',
  alert: 'M12 3 2 20h20zM12 10v4.5M12 17v.5',
  invite: 'M9 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 20c0-3.9 3.1-7 7-7s7 3.1 7 7M19 8v6M16 11h6',
  trophy: 'M8 4h8v5a4 4 0 0 1-8 0zM8 6H4.5v1A3.5 3.5 0 0 0 8 10.5M16 6h3.5v1a3.5 3.5 0 0 1-3.5 3.5M12 13v4M9 17h6v3H9z',
  // Vaisseaux, par type (SHIP_KEYS)
  cargo: 'M4 8l8-4 8 4v8l-8 4-8-4zM4 8l8 4 8-4M12 12v8',
  fighter: 'M12 3l3 9 5 4H4l5-4zM9 20h6',
  heavy: 'M12 2l7 5v9l-7 6-7-6V7zM12 8v8M8.5 10l3.5 2 3.5-2',
  colony: 'M6 21V4h11l-2 4 2 4H6',
};

/** Icône à insérer en HTML, décorative : le bouton qui la porte se nomme lui-même. */
export const ic = (name) =>
  `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="${PATHS[name]}"/></svg>`;

/** Remplace dans le HTML statique chaque <i data-ic="nom"></i> par son icône. */
export function fillIcons(root = document) {
  for (const el of root.querySelectorAll('i[data-ic]')) el.outerHTML = ic(el.dataset.ic);
}
