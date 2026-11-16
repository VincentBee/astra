import { cleanReport } from '../../regles/report/index.js';
import { cleanAmounts } from './clean-amounts.js';
import { cleanCell } from './clean-cell.js';

export const cleanEffect = (e) => {
  const out = { ...e, ships: cleanAmounts(e.ships), take: cleanAmounts(e.take), ack: Array.isArray(e.ack) ? e.ack.filter((x) => typeof x === 'string').slice(0, 20) : [], rep: cleanReport(e.rep) };
  const cell = cleanCell(e.cell);
  if (cell) out.cell = cell;
  else delete out.cell;
  return out;
};
