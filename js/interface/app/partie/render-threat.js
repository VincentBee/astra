import { ic } from '../../../icons.js';
import { threatText } from '../../../session.js';
import { etat } from '../etat.js';
import { $ } from '../outils/dollar.js';
import { esc } from '../outils/esc.js';
import { setHtml } from '../planete/set-html.js';

/**
 * Bandeau rouge (D-133) : la flotte armée adverse la plus pressante, avec le
 * compte à rebours si elle vise une de mes planètes ; il reste tant qu'elle
 * est en vue. Un toucher montre la carte.
 */
export function renderThreat(now) {
  const el = $('threat');
  const list = etat.session.over ? [] : etat.session.threats(now);
  el.hidden = !list.length;
  if (!list.length) return;
  const { main, more } = threatText(list);
  setHtml($('threat-text'), `${ic('attack')} <strong>${esc(main)}</strong>${more ? ` <span class="hint">· ${more}</span>` : ''}`);
}
