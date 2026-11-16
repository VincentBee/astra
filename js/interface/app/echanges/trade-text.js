import { fmt } from '../../../game.js';
import { TRADE_NAMES, TRADE_RES } from '../../../trade.js';

/** « 100 minéraux, 20 carburant », ou « rien ». */
export function tradeText(a) {
  const parts = TRADE_RES.filter((r) => a?.[r]).map((r) => `${fmt(a[r])} ${TRADE_NAMES[r].toLowerCase()}`);
  return parts.length ? parts.join(', ') : 'rien';
}
