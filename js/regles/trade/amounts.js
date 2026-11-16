import { TRADE_RES } from './trade-res.js';

/** Quantités propres : entiers positifs, ressources connues. */
export function amounts(x) {
  return Object.fromEntries(TRADE_RES.map((r) => [r, Math.max(0, Math.floor(Number(x?.[r]) || 0))]));
}
