// Haut de l'écran de la planète : nom, gisements et stocks se collent sous la
// barre au même endroit, le suivant recouvrant le précédent ; les onglets se
// collent sous les stocks. À la fin, on voit toujours les stocks et les onglets.
export const [BAR, ...STICKY] = ['.topbar', '.planet-head', '#soil-zone', '#resources'].map((q) => document.querySelector(q));

export const TABS = document.querySelector('.tabs');
