import { fmt } from '../../../game.js';
import { TRADE_NAMES, TRADE_RES } from '../../../trade.js';
import { etat } from '../etat.js';
import { $ } from '../outils/dollar.js';
import { toast } from '../outils/toast.js';

export function openTradeSheet(t) {
  const mine = etat.session.tradeHoldings(etat.session.me, t.from);
  const theirs = etat.session.tradeHoldings(t.pid, t.ref);
  if (!mine || !theirs) return toast('Les deux parties doivent être arrêtées sur la même case.');
  etat.tradeSheet = t;
  $('trade-title').textContent = `Échange avec ${t.name}`;
  const grid = (key, have) =>
    TRADE_RES.map((r) => `<label>${TRADE_NAMES[r]} (${fmt(have[r])})<input type="number" inputmode="numeric" min="0" value="0" data-${key}="${r}"></label>`).join('');
  $('trade-give').innerHTML = grid('tgive', mine);
  $('trade-want').innerHTML = grid('twant', theirs);
  $('sheet-trade').hidden = false;
}
