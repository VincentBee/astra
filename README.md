# Astra P2P — prototype

Jeu de conquête spatiale entre téléphones, en pair à pair. Aucun serveur de jeu : le site est un dossier de fichiers statiques, le téléphone du maître du jeu (MJ) garde l'état officiel, et les joueurs s'y connectent directement en WebRTC après un échange de QR codes.

JS vanilla, modules ES, aucune étape de build.

## Tester

### Sur ordinateur (deux onglets)
```sh
cd astra-p2p
python3 -m http.server 8080
```
Ouvre http://localhost:8080 dans **deux fenêtres de navigateur différentes** (ou une fenêtre normale + une privée) :
1. Fenêtre A : ton nom → **Créer une partie**.
2. **Copier le lien** et l'ouvrir dans la fenêtre B.
3. Fenêtre B : **Copier la réponse**.
4. Fenêtre A : « Il est à distance ? Colle la réponse reçue » → coller → **Valider**, puis **Accepter**.

### Sur téléphones
La caméra et l'installation sur l'écran d'accueil exigent du **https**. Il faut donc mettre le dossier en ligne sur un hébergeur statique gratuit :

- **Cloudflare Pages** : dashboard → Workers & Pages → Créer → Pages → « Upload assets » → glisser le dossier.
- **Netlify** : glisser le dossier sur https://app.netlify.com/drop.
- **GitHub Pages** : pousser le dossier dans un dépôt, puis Settings → Pages → branche `main`.

Ensuite : le MJ crée la partie, le joueur scanne le QR avec l'appareil photo de son téléphone (le lien ouvre l'appli), puis le MJ scanne le QR de réponse avec **Scanner sa réponse**. À distance, on s'envoie le lien et la réponse par message.

## Comment ça marche

| Fichier | Rôle |
|---|---|
| `js/game.js` | Règles pures (port de `game.rs`), en vitesse ×60 : une « heure » de jeu = une minute |
| `js/host.js` | MJ : état officiel, validation des ordres, journal, diffusion aux joueurs |
| `js/client.js` | Joueur : reçoit l'état, envoie ses ordres, se synchronise sur l'horloge du MJ |
| `js/peer.js` | WebRTC : offre/réponse sans serveur de signalisation, canal de données |
| `js/invite.js` | Code d'invitation compact (≈150 car.) et dessin du QR code |
| `js/clock.js` | Synchronisation d'horloge façon NTP |
| `js/scanner.js` | Lecture de QR par la caméra (jsQR) |
| `js/config.js` | Serveurs STUN/TURN |
| `sw.js`, `manifest.json` | Appli installable et utilisable hors ligne |

- **Invitation** : le MJ génère une offre WebRTC. Seul l'essentiel est gardé (identifiants ICE, empreinte de chiffrement, adresses), packé en binaire : un QR de version 6 à 8, lisible d'un écran à l'autre. Le SDP complet est reconstruit à l'arrivée.
- **Topologie** : en étoile, chaque joueur est connecté au MJ seulement.
- **Temps réel** : seuls les événements circulent (chantier lancé à T, fini à T+x). Chaque téléphone anime ressources et comptes à rebours localement, sur l'heure du MJ.
- **Univers** : onglet « Univers », grille de 20 × 20 où chaque commandant a sa planète mère et un vaisseau. Flèches à l'écran (maintien pour avancer) ou au clavier, un pas toutes les 150 ms au plus. Le vaisseau bouge tout de suite à l'écran ; le MJ valide chaque pas et le diffuse, et la position se recale si un pas est refusé.
- **Reconnexion** : un joueur qui perd la connexion scanne une nouvelle invitation ; le MJ voit « veut revenir » et il retrouve sa planète.
- **Écran allumé** : l'appli le demande au téléphone (Wake Lock) pendant la partie.

## Réseau

- **Même Wi-Fi ou partage de connexion du MJ** : fonctionne sans Internet.
- **4G/5G, de n'importe où** : le STUN gratuit de Cloudflare (`js/config.js`) fournit l'adresse publique. Si un joueur n'arrive pas à se connecter (CGNAT de certains opérateurs), il faut ajouter un relais TURN dans `js/config.js`.
- Les Wi-Fi invités (hôtel, bar) bloquent souvent les échanges entre appareils : utiliser le partage de connexion.

## Limites du prototype

- Si le MJ ferme l'appli ou que son écran s'éteint longtemps, la partie s'arrête pour tout le monde (pas de MJ de secours, pas de sauvegarde).
- Une invitation ne sert qu'une fois ; reconnexion manuelle (nouveau scan).
- Contenu de jeu minimal : 4 bâtiments et des déplacements, pas encore de flottes ni de combats.
- Testé dans Chromium (connexion, scan de QR par caméra simulée, temps réel, reconnexion). Pas encore testé sur de vrais iPhone et Android en 4G.

## Licences des bibliothèques incluses

`vendor/qrcode.mjs` (qrcode-generator, MIT) et `vendor/jsQR.js` (jsQR, Apache 2.0) : voir `vendor/README.txt`.
