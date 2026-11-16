import { MIN } from '../constantes/min.js';
import { drawMap } from './draw-map.js';
import { drawScores } from './draw-scores.js';
import { renderLog } from './render-log.js';
import { renderPlayers } from './render-players.js';
import { etat } from '../etat.js';
import { frameAt } from '../film/frame-at.js';
import { playersAt } from '../film/players-at.js';
import { clockText } from '../outils/clock-text.js';
import { $ } from '../outils/dom.js';
import { elapsedText } from '../outils/elapsed-text.js';

export function render() {
  const i = frameAt(etat.t);
  const players = playersAt(i);
  $('rp-clock').textContent = clockText(etat.t);
  $('rp-elapsed').textContent = elapsedText(etat.t - etat.film.start);
  $('rp-time').value = String(Math.round((etat.t - etat.film.start) / MIN));
  $('rp-time').style.setProperty('--pct', `${((etat.t - etat.film.start) / Math.max(1, etat.film.end - etat.film.start)) * 100}%`);
  $('rp-time').setAttribute('aria-valuetext', `${clockText(etat.t)}, ${elapsedText(etat.t - etat.film.start)}`);
  $('rp-play').textContent = etat.playing ? '❚❚' : '▶';
  $('rp-play').setAttribute('aria-label', etat.playing ? 'Pause' : 'Lecture');
  drawMap(players);
  drawScores();
  renderPlayers(players);
  renderLog();
}
