import { etat } from '../../etat.js';
import { $ } from '../../outils/dollar.js';
import { toast } from '../../outils/toast.js';
import { readTrade } from '../read-trade.js';

$('btn-trade-go').onclick = () => {
  if (!etat.tradeSheet) return;
  const ok = etat.session.proposeTrade(etat.tradeSheet.from, { pid: etat.tradeSheet.pid, ...etat.tradeSheet.ref }, readTrade('tgive'), readTrade('twant'));
  if (!ok) return;
  $('sheet-trade').hidden = true;
  toast('Échange proposé : réponse sous 5 minutes.');
};
