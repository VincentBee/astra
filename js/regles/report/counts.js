import { isObj } from './is-obj.js';
import { KEYS } from './keys.js';

export function counts(o, keys = KEYS) {
  if (!isObj(o)) return {};
  return Object.fromEntries(keys.filter((k) => Number.isFinite(o[k]) && o[k] > 0).map((k) => [k, Math.min(Math.floor(o[k]), 1e7)]));
}
