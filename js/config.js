// Serveurs réseau utilisés pour établir les connexions.
//
// STUN : sert seulement à découvrir son adresse publique (indispensable en
// 4G/5G). Celui de Cloudflare est gratuit et illimité ; il ne voit pas le jeu.
//
// TURN (optionnel) : relais pour les connexions que les opérateurs bloquent
// (CGNAT). À ajouter seulement si des joueurs n'arrivent pas à se connecter :
//   { urls: 'turn:turn.example.com:3478', username: '…', credential: '…' }
export const ICE_SERVERS = [{ urls: 'stun:stun.cloudflare.com:3478' }];

/** Temps max d'attente pour collecter les adresses réseau avant d'afficher un QR. */
export const ICE_GATHER_TIMEOUT_MS = 3500;
