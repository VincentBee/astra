import { isObj } from './is-obj.js';
import { MAX_AMOUNT } from './max-amount.js';

export function cleanAmounts(o) {
  if (!isObj(o)) return {};
  return Object.fromEntries(
    Object.entries(o)
      .filter(([k, v]) => !['__proto__', 'constructor', 'prototype'].includes(k) && Number.isFinite(v) && v > 0)
      .map(([k, v]) => [k, Math.min(v, MAX_AMOUNT)]),
  );
}
