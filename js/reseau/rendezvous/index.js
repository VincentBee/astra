// Point de rendez-vous automatique des joueurs d'une même partie, sans
// serveur à nous : Trystero publie les offres WebRTC sur des relais Nostr
// publics et gratuits (des serveurs de messagerie ouverts à tous). Chaque
// téléphone de la partie s'y annonce ; ceux qui se trouvent se connectent
// directement entre eux, comme après un scan.
//
// - Le salon est propre à la partie et protégé par sa clé (`state.key`),
//   transmise au premier scan : les offres sont chiffrées avec, et seuls les
//   joueurs de la partie peuvent se connecter.
// - Les relais ne voient passer que quelques messages chiffrés à l'arrivée ;
//   le jeu, lui, circule directement entre téléphones.
// - Sans Internet (même Wi-Fi sans connexion), le rendez-vous ne marche pas :
//   le QR code reste là pour ça.

export { Rendezvous } from './rendezvous.js';
