import { $ } from '../../outils/dollar.js';
import { useOffer } from '../use-offer.js';

$('btn-offer-ok').onclick = () => useOffer($('offer-input').value);
