/** Case où attend une flotte arrêtée (une flotte en panne peut être entre deux cases). */
export const parkedCell = (f) => ({ x: Math.round(f.to.x), y: Math.round(f.to.y) });
