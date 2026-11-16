import { drawQr, inviteLink } from '../../../invite.js';
import { etat } from '../etat.js';
import { $ } from '../outils/dollar.js';

export async function openInviteSheet() {
  $('sheet-invite').hidden = false;
  if (!etat.connecting) $('invite-status').textContent = '';
  $('answer-input').value = '';
  $('offer-qr').hidden = true;
  $('offer-wait').hidden = false;
  let code;
  try {
    code = await etat.session.openInvite();
  } catch (e) {
    $('offer-wait').textContent = e.message;
    return;
  }
  // null : fenêtre fermée ou invitation relancée pendant la préparation (#70), rien à dessiner.
  if (!code) return;
  etat.offerCode = code;
  drawQr($('offer-qr'), inviteLink(etat.offerCode, etat.session.state?.gid));
  $('offer-qr').hidden = false;
  $('offer-wait').hidden = true;
}
