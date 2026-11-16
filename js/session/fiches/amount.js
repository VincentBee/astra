/** Quantité reçue : un nombre fini et au moins 0, sinon 0. */
export const amount = (v) => (Number.isFinite(v) ? Math.max(0, v) : 0);
