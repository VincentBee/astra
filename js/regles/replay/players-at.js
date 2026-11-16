/** Les fiches de tous les joueurs à l'image `i` (la dernière connue de chacun). */
export function playersAt(frames, i) {
  const out = {};
  for (let j = 0; j <= i && j < frames.length; j++) out[frames[j].pid] = frames[j].fiche;
  return out;
}
