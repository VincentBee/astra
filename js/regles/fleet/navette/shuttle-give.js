import { SOIL } from '../../game/index.js';

/**
 * Ce que la flotte pose sur B : toute sa cargaison, dans la place qui reste
 * dans l'entrepôt (`caps`). Ce qui ne rentre pas reste dans les soutes (D-554).
 */
export function shuttleGive(stock, caps, cargo) {
  return Object.fromEntries(SOIL.map((r) => [r, Math.max(0, Math.min(Math.floor(cargo?.[r] || 0), Math.floor((caps?.[r] ?? Infinity) - (stock?.[r] || 0))))]));
}
