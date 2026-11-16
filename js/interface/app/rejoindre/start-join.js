import { $ } from '../outils/dollar.js';
import { show } from '../outils/show.js';
import { useOffer } from './use-offer.js';

export function startJoin(prefill) {
  $('join-step-1').hidden = false;
  $('join-step-2').hidden = true;
  $('join-error').hidden = true;
  $('offer-input').value = prefill || '';
  show('join');
  if (prefill) useOffer(prefill);
}
