// ----- l'IA sur le téléphone de l'hôte ---------------------------------------------------

/**
 * Deux bouts d'un lien en mémoire, avec l'interface d'un lien WebRTC (send, onmessage,
 * onclose, close, route, closed). Chaque message est recopié à l'envoi, comme sur le réseau
 * (JSON), sauf le journal des ordres d'une fiche, dont les entrées sont partagées et gelées
 * (copyRec, D-370) ; il arrive un peu après (jamais pendant l'ordre qui l'envoie).
 */
export const isObj = (x) => !!x && typeof x === 'object' && !Array.isArray(x);
