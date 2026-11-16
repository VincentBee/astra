import { ALERT_NAMES } from './alert-names.js';

export function alertText(a) {
  if (a.kind === 'short') return `${ALERT_NAMES.short[a.res]} · besoins couverts à ${Math.floor(a.eff * 100)} %`;
  const min = Math.ceil(a.left / 60_000);
  return `${ALERT_NAMES.deficit[a.res]} · vide dans ${min > 1 ? `${min} min` : 'moins d’une minute'}`;
}
