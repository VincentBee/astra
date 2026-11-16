export function covers(stock, cost) {
  return Object.entries(cost).every(([r, v]) => (stock[r] || 0) + 1e-9 >= v);
}
