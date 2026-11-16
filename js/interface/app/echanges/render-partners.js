import { ic } from '../../icons/index.js';
import { etat } from '../etat.js';
import { esc } from '../outils/esc.js';

/** Les autres joueurs sur la même case que `fromRef` : un bouton « Proposer un échange » pour chacun. */
export function renderPartners(box, fromRef) {
  const list = fromRef ? etat.session.tradePartners(fromRef) : [];
  const html = list.length
    ? `<p class="hint">Ici :</p>${list
        .map(
          (x) => `<div class="row"><span>${esc(x.name)}</span>
            <button class="secondary small" data-trade='${esc(JSON.stringify({ from: fromRef, pid: x.pid, ref: x.ref, name: x.name }))}' title="Proposer un échange" aria-label="Proposer un échange à ${esc(x.name)}">${ic('trade')}</button></div>`,
        )
        .join('')}`
    : '';
  box.hidden = !html;
  if (box.dataset.html !== html) {
    box.innerHTML = html;
    box.dataset.html = html;
  }
}
