/** Nombre fini, sinon 0 (#76). Ne change rien à un stock valide. */
export const num = (v) => (Number.isFinite(v) ? v : 0);
