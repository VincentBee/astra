import { etat } from './etat.js';

export const loadLib = () =>
  (etat.lib ??= import(etat.failures ? `../../../vendor/trystero-nostr.mjs?r=${etat.failures}` : '../../../vendor/trystero-nostr.mjs').catch((e) => {
    etat.lib = null;
    etat.failures++;
    throw e;
  }));
