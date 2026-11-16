import { moving } from '../../../fleet.js';
import { QUIET_S } from '../constantes/quiet-s.js';
import { etat } from '../etat.js';
import { frameAt } from '../film/frame-at.js';
import { playersAt } from '../film/players-at.js';
import { pause } from './pause.js';
import { seek } from './seek.js';
import { $ } from '../outils/dom.js';

/** Une image par rafraîchissement d'écran pendant la lecture. */
export function step(now) {
  if (!etat.playing) return;
  const speed = Number($('rp-speed').value);
  const dt = Math.min(1, (now - etat.last) / 1000);
  etat.last = now;
  let next = etat.t + dt * speed * 1000;
  // Carte immobile et prochain événement loin : on y saute.
  const i = frameAt(etat.t);
  const anyMoving = playersAt(i).some((p) => (p.fleets || []).some((f) => moving(f, etat.t)));
  const upcoming = etat.film.frames[i + 1]?.t;
  if (!anyMoving && upcoming && upcoming - etat.t > QUIET_S * speed * 1000) next = upcoming - 0.3 * speed * 1000;
  seek(next);
  if (etat.t >= etat.film.end) return pause();
  etat.raf = requestAnimationFrame(step);
}
