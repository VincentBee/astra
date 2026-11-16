export function pay(planet, cost) {
  for (const [r, v] of Object.entries(cost)) planet.stock[r] -= v;
}
