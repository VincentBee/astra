import { scanQr } from '../../../scanner.js';
import { etat } from '../etat.js';
import { $ } from './dollar.js';

export async function scan() {
  etat.scanAbort?.abort(); // un scan déjà ouvert s'arrête avant le nouveau
  const ctl = new AbortController();
  etat.scanAbort = ctl;
  $('scanner').hidden = false;
  try {
    // scanQr rejette avec AbortError dès « Annuler », même avant que la caméra soit prête (#42).
    return await scanQr($('scanner-video'), { signal: ctl.signal });
  } finally {
    if (etat.scanAbort === ctl) {
      $('scanner').hidden = true;
      etat.scanAbort = null;
    }
  }
}
