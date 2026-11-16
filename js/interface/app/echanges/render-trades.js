import { ic } from '../../icons/index.js';
import { etat } from '../etat.js';
import { clock } from '../outils/clock.js';
import { $ } from '../outils/dollar.js';
import { esc } from '../outils/esc.js';
import { tradeText } from './trade-text.js';

/** Sur la carte : les offres qu'on me fait (accepter / refuser) et celles que j'attends. */
export function renderTrades(me, now) {
  if (!me) return;
  const incoming = etat.session.incomingOffers().map(
    ({ from, offer }) => `<div class="card trade"><p><strong>${esc(from.name)}</strong> te propose : il donne ${esc(tradeText(offer.give))}, il demande ${esc(tradeText(offer.want))}. <span class="mono" data-left="${Number(offer.expires) || 0}"></span></p>
      <div class="fi-actions"><button class="primary small" data-accept="${esc(from.id)}:${esc(offer.id)}" title="Accepter" aria-label="Accepter">${ic('check')}</button>
      <button class="secondary small" data-refuse="${esc(from.id)}:${esc(offer.id)}" title="Refuser" aria-label="Refuser">${ic('close')}</button></div></div>`,
  );
  const mine = (me.offers || []).map((o) => {
    const to = etat.session.state.players[o.to.pid];
    return `<div class="card trade mine"><p>Échange proposé à ${esc(to?.name || '?')} : tu donnes ${esc(tradeText(o.give))}, tu demandes ${esc(tradeText(o.want))}. <span class="mono" data-left="${Number(o.expires) || 0}"></span></p></div>`;
  });
  // HTML stable (redessiner sous le doigt ferait rater le toucher sur « Accepter ») ;
  // seuls les comptes à rebours changent.
  const html = [...incoming, ...mine].join('');
  $('trades').hidden = !html;
  if ($('trades').dataset.html !== html) {
    $('trades').innerHTML = html;
    $('trades').dataset.html = html;
  }
  for (const el of $('trades').querySelectorAll('[data-left]')) {
    const left = Number(el.dataset.left) - now;
    el.textContent = left > 0 ? clock(left) : 'expiré, en attente de réponse';
  }
}
