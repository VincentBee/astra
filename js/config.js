// Serveurs réseau utilisés pour établir les connexions.
//
// STUN : sert seulement à découvrir son adresse publique (indispensable en
// 4G/5G). Celui de Cloudflare est gratuit et illimité ; il ne voit pas le jeu.
//
// TURN (optionnel) : relais pour les connexions que les opérateurs bloquent
// (CGNAT). À ajouter seulement si des joueurs n'arrivent pas à se connecter :
//   { urls: 'turn:turn.example.com:3478', username: '…', credential: '…' }
export const ICE_SERVERS = [{ urls: 'stun:stun.cloudflare.com:3478' }];

/**
 * Relais Nostr du rendez-vous automatique (js/rendezvous.js). `null` : les
 * relais publics gratuits choisis par Trystero. Pour tester avec ses propres
 * relais : localStorage['astra.relays'] = 'wss://relais1,wss://relais2'.
 */
export function relayUrls() {
  try {
    const v = localStorage.getItem('astra.relays');
    return v ? v.split(',').map((s) => s.trim()).filter(Boolean) : null;
  } catch {
    return null;
  }
}

/** Temps max d'attente pour collecter les adresses réseau avant d'afficher un QR. */
export const ICE_GATHER_TIMEOUT_MS = 3500;
