import { etat } from '../etat.js';
import { $ } from '../outils/dollar.js';
import { toast } from '../outils/toast.js';
import { closeInviteSheet } from './close-invite-sheet.js';
import { openInviteSheet } from './open-invite-sheet.js';
import { setInviteBusy } from './set-invite-busy.js';

export async function useAnswer(text) {
  if (etat.connecting) return;
  setInviteBusy(true);
  $('invite-status').textContent = 'Connexion en cours…';
  try {
    await etat.session.acceptAnswer(text);
    $('invite-status').textContent = '';
    closeInviteSheet();
    toast('Joueur connecté.');
  } catch (e) {
    if (e.used || /connexion/i.test(e.message)) {
      // L'invitation est consommée : on en prépare une neuve, à faire rescanner.
      await openInviteSheet();
      $('invite-status').textContent = e.used
        ? 'Cette invitation avait déjà servi. Nouvelle invitation prête : le joueur doit rescanner ce QR code, puis te montrer sa nouvelle réponse.'
        : 'La connexion n’a pas abouti. Nouvelle invitation prête : le joueur doit rescanner ce QR code. Si ça recommence en 4G, essayez sur le même Wi-Fi ou le partage de connexion.';
    } else {
      $('invite-status').textContent = e.message;
    }
  } finally {
    setInviteBusy(false);
  }
}
