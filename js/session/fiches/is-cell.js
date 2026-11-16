import { isObj } from './is-obj.js';

export const isCell = (c) => isObj(c) && Number.isFinite(c.x) && Number.isFinite(c.y);
