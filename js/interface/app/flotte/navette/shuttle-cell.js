/** « 4:15 » (valeur d'une liste de la fenêtre Navette) → { x: 4, y: 15 }. */
export const shuttleCell = (v) => {
  const [x, y] = String(v).split(':').map(Number);
  return { x, y };
};
