// Transforme une description WebRTC (offre ou réponse) en code court
// transportable par QR code ou par lien, et inversement.
//
// Une description SDP fait 500 à 1 000 caractères, dont l'essentiel est
// prévisible. On n'en garde que ce qui varie (identifiants ICE, empreinte
// DTLS, rôle, adresses), packé en binaire puis en base64url : environ 150
// caractères, soit un QR code assez simple pour être lu d'un écran à l'autre.
// Le SDP complet est reconstruit à l'arrivée.
//
// Format du code : "<o|a>2.<base64url>"  (o = offre de l'hôte, a = réponse de l'invité)
// Le lien d'invitation met ce code après le "#", qui n'est jamais envoyé au
// site qui héberge l'appli, et la partie de l'hôte avant (`?g=<gid>`, D-260).

export { encode } from './encode.js';
export { decode } from './decode.js';
export { inviteLink } from './lien/invite-link.js';
export { inviteGid } from './lien/invite-gid.js';
export { drawQr } from './qr/draw-qr.js';
