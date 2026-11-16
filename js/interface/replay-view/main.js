// Écran du replay : la partie sauvegardée sur ce téléphone, rejouée depuis
// les journaux d'ordres (js/replay.js), à regarder comme un film.
// Rien n'est écrit : la sauvegarde et la partie en cours ne bougent pas.

import { MIN } from './constantes/min.js';
import { render } from './dessin/render.js';
import { etat } from './etat.js';
import { frameAt } from './film/frame-at.js';
import { load } from './film/load.js';
import { pause } from './lecture/pause.js';
import { play } from './lecture/play.js';
import { release } from './lecture/release.js';
import { scrub } from './lecture/scrub.js';
import { seek } from './lecture/seek.js';
import { $ } from './outils/dom.js';

$('rp-play').onclick = () => {
  if (!etat.film) return;
  etat.resume = false;
  if (etat.playing) pause();
  else play();
};

// Curseur : une minute de partie par cran (flèches du clavier comprises).
$('rp-time').oninput = (e) => {
  const v = Number(e.target.value);
  scrub(v >= Number(e.target.max) ? etat.film.end : etat.film.start + v * MIN);
};

$('rp-time').onchange = $('rp-time').onpointerup = $('rp-time').onpointercancel = release;

// Précédent / suivant : on saute à l'événement, la lecture continue si elle tournait.
$('rp-prev').onclick = () => {
  const i = frameAt(etat.t - 1);
  seek(i >= 0 ? etat.film.frames[i].t : etat.film.start);
};

$('rp-next').onclick = () => {
  const i = frameAt(etat.t);
  seek(etat.film.frames[i + 1]?.t ?? etat.film.end);
};

// Toucher ou glisser sur la courbe : aller à ce moment de la partie.
$('rp-score').onpointerdown = $('rp-score').onpointermove = (e) => {
  if (!etat.film || (e.type === 'pointermove' && !e.buttons)) return;
  if (e.type === 'pointerdown') e.currentTarget.setPointerCapture?.(e.pointerId);
  const r = e.currentTarget.getBoundingClientRect();
  const x = (e.clientX - r.left - 44) / Math.max(1, r.width - 52);
  scrub(etat.film.start + Math.min(1, Math.max(0, x)) * (etat.film.end - etat.film.start));
};

$('rp-score').onpointerup = $('rp-score').onpointercancel = release;

window.addEventListener('resize', () => etat.film && render());

load();
