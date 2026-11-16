import { etat } from '../etat.js';
import { $ } from '../outils/dom.js';
import { esc } from '../outils/esc.js';

export function renderLog() {
  // Les entrées jusqu'à l'instant affiché, la plus récente en haut.
  let n = 0;
  while (n < etat.film.log.length && etat.film.log[n].at <= etat.t) n++;
  if (n === etat.shownLog) return;
  etat.shownLog = n;
  const colors = Object.fromEntries(etat.film.frames.map((f) => [f.pid, f.fiche.color]));
  const time = (at) => new Date(at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  $('rp-log').innerHTML =
    etat.film.log
      .slice(Math.max(0, n - 40), n)
      .reverse()
      .map((l) => `<li><span class="mono hint">${time(l.at)}</span> <span class="dot" style="background:${esc(colors[l.pid] || '#8d95b3')}"></span> ${esc(l.text)}</li>`)
      .join('') || '<li class="hint">Rien encore.</li>';
}
