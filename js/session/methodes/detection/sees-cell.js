/** Une case est-elle dans ma portée de détection ? */
export function seesCell(cell, now, eyes = this.eyes(now)) {
  return eyes.some((e) => Math.hypot(cell.x - e.x, cell.y - e.y) <= e.r + 1e-9);
}
