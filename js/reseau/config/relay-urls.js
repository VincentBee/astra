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
