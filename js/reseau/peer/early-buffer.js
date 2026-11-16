/**
 * Écoute un canal dès sa création et garde les messages arrivés avant qu'on
 * ait branché le Link : sans ça, le tout premier message de l'autre côté
 * (par exemple la demande d'arrivée d'un joueur) peut se perdre.
 */
export function earlyBuffer(channel) {
  const early = [];
  channel.onmessage = (e) => early.push(e.data);
  return early;
}
