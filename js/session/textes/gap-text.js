/** « 40 s », « 10 min », « 3 h » : un écart d'horloge, pour un joueur. */
export const gapText = (ms) => {
  const sec = Math.round(Math.abs(ms) / 1000);
  return sec < 120 ? `${sec} s` : sec < 7200 ? `${Math.round(sec / 60)} min` : `${Math.round(sec / 3600)} h`;
};
