import { SOIL } from '../../game/index.js';

/**
 * Ce que la flotte charge sur A : les ressources choisies (`res`, du sol),
 * autant que la place libre dans ses soutes (`room`) et le stock le
 * permettent, en parts égales tant qu'il en reste de chaque (D-553). Des
 * entiers, jamais plus que le stock.
 */
export function shuttleTake(stock, room, res) {
  const take = Object.fromEntries(SOIL.map((r) => [r, 0]));
  const have = (r) => Math.max(0, Math.floor(stock?.[r] || 0)) - take[r];
  let left = Math.max(0, Math.floor(room));
  let open = SOIL.filter((r) => res.includes(r) && have(r) > 0);
  while (left > 0 && open.length) {
    const share = Math.max(1, Math.floor(left / open.length));
    for (const r of open) {
      const v = Math.min(share, have(r), left);
      take[r] += v;
      left -= v;
    }
    open = open.filter((r) => have(r) > 0);
  }
  return take;
}
