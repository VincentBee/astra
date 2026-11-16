import { isObj } from './is-obj.js';

// La case visée (D-360) : deux nombres, sinon le rapport retombe sur sa clé, comme un ancien rapport.
export const cleanCell = (c) => (isObj(c) && Number.isFinite(c.x) && Number.isFinite(c.y) ? { x: c.x, y: c.y } : undefined);
