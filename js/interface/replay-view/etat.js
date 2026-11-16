/** État partagé du module (variables réassignées lues par plusieurs fichiers, règle 5 du plan). */
export const etat = {
  film: null, // { frames, log, at: [index de la fiche de chaque joueur, par image], start, end, scores }
  t: 0,
  playing: false,
  last: 0,
  raf: 0,
  // Lecture coupée le temps de glisser le curseur (ou la courbe) : elle reprend quand on lâche.
  resume: false,
  shownLog: -1,
};
