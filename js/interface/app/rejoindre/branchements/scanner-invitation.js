import { $ } from '../../outils/dollar.js';
import { scan } from '../../outils/scan.js';
import { joinError } from '../join-error.js';
import { useOffer } from '../use-offer.js';

$('btn-scan-offer').onclick = async () => {
  try {
    useOffer(await scan());
  } catch (e) {
    if (e?.name !== 'AbortError') joinError(e.message);
  }
};
