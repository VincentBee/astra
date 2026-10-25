# Astra P2P — prototype

Jeu de conquête spatiale entre téléphones, en pair à pair. Aucun serveur de jeu : le site est un dossier de fichiers statiques, chaque téléphone garde une copie complète de la partie, et les joueurs se connectent directement en WebRTC après un échange de QR codes. **La partie continue même quand tout le monde est déconnecté, et n'importe qui peut la reprendre, même le lendemain.**

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
4. Fenêtre A : « Il est à distance ? Colle la réponse reçue » → coller → **Valider**. Le joueur entre directement dans la partie.

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
| `js/save.js` | Sauvegarde de la partie sur le téléphone et fusion de deux copies |
| `js/session.js` | Une partie vue d'un téléphone : rôle de MJ ou de joueur, copie de l'état, connexions entre joueurs, relève du MJ |
| `js/peer.js` | WebRTC : offre/réponse sans serveur de signalisation, canal de données |
| `js/invite.js` | Code d'invitation compact (≈150 car.) et dessin du QR code |
| `js/clock.js` | Synchronisation d'horloge façon NTP |
| `js/scanner.js` | Lecture de QR par la caméra (jsQR) |
| `js/config.js` | Serveurs STUN/TURN |
| `sw.js`, `manifest.json` | Appli installable et utilisable hors ligne |

- **Pas de validation** : le MJ montre son QR puis scanne la réponse du joueur ; ce geste vaut accord, et une invitation ne sert qu'une fois. Le joueur entre dès que la connexion est établie (8 joueurs au plus).
- **Invitation** : le MJ génère une offre WebRTC. Seul l'essentiel est gardé (identifiants ICE, empreinte de chiffrement, adresses), packé en binaire : un QR de version 6 à 8, lisible d'un écran à l'autre. Le SDP complet est reconstruit à l'arrivée.
- **Topologie** : chaque joueur est connecté au MJ **et** aux autres joueurs. Le MJ fait les présentations : quand quelqu'un arrive, il relaie les offres WebRTC entre lui et chaque joueur déjà présent.
- **Relève du MJ** : le MJ du moment valide les ordres et diffuse l'état ; tout le monde en garde une copie. S'il disparaît (plus de nouvelles depuis 6 s), le plus ancien joueur encore en ligne devient MJ et reprend depuis sa copie. Resté seul, un joueur continue la partie.
- **Ancienneté et époques** : l'ancienneté est l'ordre d'arrivée dans la partie. Chaque changement de MJ ouvre une nouvelle époque ; en cas de désaccord, l'époque la plus récente gagne, puis le plus ancien. Un MJ ne peut s'annoncer que lui-même (pas de rumeur relayée).
- **Temps réel** : seuls les événements circulent (chantier lancé à T, fini à T+x). Chaque téléphone anime ressources et comptes à rebours localement, sur l'heure du MJ.
- **Univers** : onglet « Univers », grille de 20 × 20 où chaque commandant a sa planète mère et un vaisseau. Flèches à l'écran (maintien pour avancer) ou au clavier, un pas toutes les 150 ms au plus. Le vaisseau bouge tout de suite à l'écran ; le MJ valide chaque pas et le diffuse, et la position se recale si un pas est refusé.
- **Sauvegarde et reprise** : chaque téléphone enregistre sa copie de la partie à chaque changement (et quand l'appli passe en arrière-plan). Tout se calcule à partir du temps écoulé, donc la partie « continue » sans personne : celui qui la reprend (« Reprendre la partie » à l'accueil) retrouve production et chantiers à jour, devient MJ et invite les autres.
- **Fusion des copies** : si plusieurs joueurs ont repris la partie chacun de son côté, la copie de celui qui arrive est fusionnée avec celle du MJ, joueur par joueur : pour chacun, on garde la copie où il a agi le plus récemment. Le journal est l'union des deux.
- **Écran verrouillé** : un joueur sans nouvelles depuis 30 s est considéré parti (6 s pour le MJ, pour que la relève reste rapide). L'horloge se recale au réveil du téléphone.
- **Reconnexion** : un joueur qui perd la connexion scanne une invitation du MJ du moment. Un secret gardé sur son téléphone (dont le MJ ne connaît que l'empreinte SHA-256) prouve que c'est bien lui : il revient sans validation et retrouve sa planète.
- **Horloge** : monotone (`performance.now`), elle ne saute pas si le téléphone recale son heure. Un nouveau MJ fige son décalage pour que l'heure de la partie continue sans à-coup.
- **Débogage** : `astra.session` dans la console du navigateur.
- **Écran allumé** : l'appli le demande au téléphone (Wake Lock) pendant la partie.

## Réseau

- **Même Wi-Fi ou partage de connexion du MJ** : fonctionne sans Internet.
- **4G/5G, de n'importe où** : le STUN gratuit de Cloudflare (`js/config.js`) fournit l'adresse publique. Si un joueur n'arrive pas à se connecter (CGNAT de certains opérateurs), il faut ajouter un relais TURN dans `js/config.js`.
- Les Wi-Fi invités (hôtel, bar) bloquent souvent les échanges entre appareils : utiliser le partage de connexion.

## Limites du prototype

- **Partie coupée en deux** : si le groupe se scinde (réseau), chaque côté continue de son côté et les deux parties ne fusionnent pas. En revenant, on reprend la partie du MJ dont on scanne l'invitation.
- La fusion garde la dernière progression de chaque joueur, mais pas les deux versions d'un même joueur s'il a joué sur deux copies à la fois. Avec des combats entre joueurs (à venir), les conflits seront plus délicats à fusionner.
- La sauvegarde est sur le téléphone : vider les données du navigateur ou changer de téléphone fait perdre sa copie (les autres ont la leur).
- Une copie apportée par un joueur est crue sur parole : entre amis seulement.
- Une invitation ne sert qu'une fois, et seul le MJ du moment peut inviter ; reconnexion par un nouveau scan.
- Chaque joueur a la partie complète : un joueur curieux peut tout lire dans la console (pas de brouillard de guerre possible).
- Contenu de jeu minimal : 4 bâtiments et des déplacements, pas encore de flottes ni de combats.
- Testé dans Chromium (connexion, scan de QR par caméra simulée, temps réel, reconnexion, relève du MJ à 3 joueurs, joueur resté seul, reprise après départ de tous, fusion de deux copies jouées séparément). Pas encore testé sur de vrais iPhone et Android en 4G.

## Licences des bibliothèques incluses

`vendor/qrcode.mjs` (qrcode-generator, MIT) et `vendor/jsQR.js` (jsQR, Apache 2.0) : voir `vendor/README.txt`.
