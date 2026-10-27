# Astra P2P — prototype

Jeu de conquête spatiale entre téléphones, en pair à pair. Aucun serveur de jeu : le site est un dossier de fichiers statiques. Pas de maître du jeu non plus : tous les joueurs sont au même niveau et chacun peut inviter. Chaque téléphone garde une copie complète de la partie, et les joueurs se connectent directement en WebRTC après un échange de QR codes, **une seule fois** : ensuite, ils se retrouvent tout seuls. **La partie continue même quand tout le monde est déconnecté, et n'importe qui peut la reprendre, même le lendemain.**

**Jouer : https://vincentbee.github.io/astra/** (à ouvrir sur chaque téléphone)

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

Ensuite : quelqu'un crée la partie. Pour inviter, n'importe quel joueur appuie sur **Inviter un joueur** ; l'invité scanne le QR avec l'appareil photo de son téléphone (le lien ouvre l'appli), puis l'hôte scanne le QR de réponse avec **Scanner sa réponse**. À distance, on s'envoie le lien et la réponse par message.

## Comment ça marche

| Fichier | Rôle |
|---|---|
| `js/game.js` | Règles pures (port de `game.rs`), en vitesse ×60 : une « heure » de jeu = une minute |
| `js/tech.js` | Arbre des technologies et vaisseaux de chaque race (données pures) |
| `js/fleet.js` | Flottes : décollage, déplacements libres sur la carte, combat sans hasard, pillage |
| `js/save.js` | Sauvegarde de la partie sur le téléphone et fusion de deux copies |
| `js/session.js` | Une partie vue d'un téléphone : copie de l'état, fiches des joueurs, connexions entre joueurs, invitations |
| `js/rendezvous.js` | Reconnexion automatique, sans rescanner : rendez-vous via des relais Nostr publics (Trystero) |
| `js/peer.js` | WebRTC : offre/réponse sans serveur de signalisation, canal de données |
| `js/invite.js` | Code d'invitation compact (≈150 car.) et dessin du QR code |
| `js/scanner.js` | Lecture de QR par la caméra (jsQR) |
| `js/config.js` | Serveurs STUN/TURN, relais du rendez-vous |
| `sw.js`, `manifest.json` | Appli installable et utilisable hors ligne |

- **Tous au même niveau** : pas de maître du jeu. Chaque joueur est le seul à modifier sa propre fiche (sa planète) : il applique ses ordres tout de suite chez lui, puis envoie sa fiche à jour aux autres. Une fiche porte l'heure de sa dernière modification, et la plus récente l'emporte. Comme personne ne modifie la fiche d'un autre, il n'y a jamais de conflit à arbitrer, même quand le groupe a été coupé en deux.
- **Tout le monde invite** : n'importe quel joueur montre son QR puis scanne la réponse de l'invité ; ce geste vaut accord, et une invitation ne sert qu'une fois (8 joueurs au plus).
- **Invitation** : une offre WebRTC dont on ne garde que l'essentiel (identifiants ICE, empreinte de chiffrement, adresses), packé en binaire : un QR de version 6 à 8, lisible d'un écran à l'autre. Le SDP complet est reconstruit à l'arrivée.
- **Topologie** : chacun est connecté à tous les autres. Sans Internet, celui qui invite fait les présentations : il relaie les offres WebRTC entre le nouveau et les joueurs déjà là. Avec Internet, le rendez-vous automatique relie tout le monde.
- **De proche en proche** : un téléphone qui reçoit une fiche plus récente que la sienne la transmet à ses autres voisins ; une partie reliée en chaîne reste donc à jour.
- **Temps réel** : seuls les événements circulent (chantier lancé à T, fini à T+x). Chaque téléphone anime ressources et comptes à rebours localement. L'heure de référence est celle des téléphones, réglée automatiquement par le réseau mobile ou Internet.
- **Races** : en arrivant dans une partie (création, invitation ou reprise d'une ancienne sauvegarde), chaque joueur choisit sa race, définitivement. **Humains** : population qui travaille, mange et grandit selon la nourriture et les habitats. **Machines** : sans population ni nourriture, tout tourne à l'énergie (foreuses gourmandes, batteries, nœud de calcul). **Aliens** : quelques psioniques (chacun vaut 120 humains) qui mangent et consomment de l'énergie, extraient les minéraux par télékinésie et ont deux pouvoirs (arrachement, transe collective).
- **Difficulté et guide** : départ serré (de quoi lancer deux ou trois chantiers, énergie juste à l'équilibre, entrepôts de 1 000), donc l'ordre de construction compte, surtout au début. Le guide des races ([GUIDE.md](GUIDE.md)) donne les principes, des ordres de construction par stratégie et les pièges, trouvés en simulant des milliers d'ordres (à refaire si l'équilibrage change). Il n'est pas affiché dans le jeu.
- **Ressources** : minéraux (constructions), nourriture (population), énergie (bâtiments, et vie des machines). Comme la population varie selon les stocks, l'économie s'intègre par petits pas (300 au plus par calcul, même après une journée).
- **Univers** : la carte (grille de 20 × 20) est l'écran principal. 14 planètes vides y sont tirées au début de la partie, avec un hasard déterminé par l'identifiant de la partie : chaque téléphone calcule les mêmes, sans rien se transmettre. Après sa race, chaque joueur choisit sa planète de départ sur la carte (définitif). Si deux joueurs prennent la même au même moment, le premier choix l'emporte et l'autre téléphone repasse au choix. Toucher sa planète ouvre ses bâtiments ; toucher une autre planète montre ses gisements.
- **Gisements** : chaque planète a un gisement de minéraux et de nourriture, avec un maximum et une production de base tirés au hasard. Mines, foreuses, télékinésie, fermes et ruches y puisent. Tant que le gisement n'est pas vide, on extrait à la vitesse des bâtiments ; une fois vide, on ne tire plus que ce que la planète produit d'elle-même, quels que soient les bâtiments. Quand on extrait moins que cette production, le gisement se remplit jusqu'à son maximum. Tout ce qui entre dans le stock du joueur sort du gisement : revenu de base, impôt humain et arrachement compris. Les planètes d'avant les gisements restent sans limite.
- **Recherche** : chaque race a son arbre de 6 technologies (économie, vitesse, coque, attaque, et celles qui débloquent ses vaisseaux). Il faut d'abord un labo sur la planète mère (Laboratoire, Matrice de recherche ou Bassin de songe) ; une recherche à la fois, plus rapide avec un labo plus grand. Les technologies valent pour toutes les planètes du joueur.
- **Vaisseaux** : un chantier naval par planète (Chantier spatial, Usine orbitale ou Couveuse astrale) construit des lots de vaisseaux propres à la race : un cargo, un chasseur, un vaisseau lourd et un colonisateur. Humains polyvalents, machines bon marché, rapides et fragiles, aliens chers, lents et redoutables. Ils restent à quai sur leur planète jusqu'à ce qu'on les fasse décoller.
- **Flottes** : on fait décoller des vaisseaux (et une cargaison) d'une planète ; la flotte attend en orbite. On la pilote ensuite comme une unité de jeu de stratégie : la toucher sur la carte la sélectionne, toucher une case l'y envoie, même vide. En route, on peut changer de cap, l'arrêter (elle finit sur la case la plus proche) ou la faire rentrer. Sur une planète, on choisit quoi faire à l'arrivée : *se poser* sur une de ses planètes (vaisseaux et cargaison y restent), *coloniser* une planète libre (avec un colonisateur ; le premier arrivé l'emporte, l'autre reste en orbite), *attaquer* une planète adverse (combat sans hasard contre les vaisseaux à quai ; le vainqueur pille jusqu'à la moitié des minéraux et de la nourriture dans la place libre de ses soutes, et les survivants restent en orbite), ou juste y stationner. Les flottes se voient sur toutes les cartes. 16 flottes au plus par joueur.
- **Carburant** : chaque vaisseau a un réservoir et brûle de l'énergie à chaque case parcourue (un plein mène à 40 cases chez les humains, 30 chez les machines, sobres mais à courte portée, 50 chez les aliens, gourmands mais endurants). On remplit au décollage avec l'énergie de la planète (plein partiel permis), puis avec « Faire le plein » en orbite d'une de ses planètes. Si le réservoir ne suffit pas pour un trajet, le jeu prévient et la panne est décidée dès l'ordre : la flotte s'arrête au point où son réservoir se vide, et y reste jusqu'à ce qu'on la ravitaille. En se posant, elle rend son carburant au stock d'énergie. Attention : l'énergie d'un plein manque ensuite aux bâtiments. Chiffres à équilibrer.
- **Entre ses flottes** : deux de ses flottes arrêtées sur la même case peuvent se donner vaisseaux, cargaison et carburant (« Donner… »), fusionner (« Fusionner ici »), et une flotte peut se scinder en deux (« Scinder… »). C'est ainsi qu'on secourt une flotte à sec : on lui amène du carburant. Chaque flotte garde au moins un vaisseau, et les soutes et réservoirs de chacune doivent suffire. Une flotte fusionnée garde la liste des flottes qu'elle a absorbées, pour que les combats futurs qui les visaient la trouvent.
- **Combat entre flottes** : flotte armée sélectionnée, toucher une flotte adverse propose de la poursuivre. La poursuivante vise le point d'interception (là où sera la cible quand elle pourra y être, d'après son trajet) et change de cap dès que la cible en change. Au contact (moins d'une demi-case), combat sans hasard ; le vainqueur récupère la cargaison du vaincu dans la place libre de ses soutes, et la poursuite s'arrête. Une cible plus rapide qui s'éloigne n'est rattrapée qu'à son point d'arrivée ; « Stop » abandonne la poursuite.
- **Sauvegarde et reprise** : chaque téléphone enregistre sa copie de la partie à chaque changement (et quand l'appli passe en arrière-plan). Tout se calcule à partir du temps écoulé, donc la partie « continue » sans personne : celui qui la reprend (« Reprendre la partie » à l'accueil) retrouve production et chantiers à jour.
- **Fusion des copies** : quand deux téléphones se retrouvent, ils échangent leurs copies et gardent, pour chaque joueur, la fiche la plus récente. Chacun garde sa progression, même si tout le monde a joué de son côté.
- **Écran verrouillé** : un joueur sans nouvelles depuis 30 s est considéré hors ligne ; il revient tout seul au réveil.
- **Reconnexion sans rescanner** : le QR ne sert qu'à la première arrivée. Il transmet la clé secrète de la partie, et chaque téléphone s'annonce ensuite dans un salon propre à la partie, sur des relais Nostr publics et gratuits (bibliothèque [Trystero](https://github.com/dmotz/trystero), sans compte). Les joueurs se reconnectent seuls en quelques secondes : écran déverrouillé, appli rouverte, réseau revenu, ou « Reprendre la partie » le lendemain. Les relais ne voient que des offres de connexion chiffrées avec la clé ; le jeu circule ensuite directement entre téléphones.
- **Retour par QR** : sans Internet, on peut toujours revenir en scannant l'invitation de n'importe quel joueur. Un secret gardé sur le téléphone (dont les autres ne connaissent que l'empreinte SHA-256) prouve que c'est bien lui.
- **Débogage** : `astra.session` dans la console du navigateur. Le journal de la partie (arrivées, chantiers, pouvoirs) n'est pas affiché dans le jeu : il s'écrit dans cette console.
- **Écran allumé** : l'appli le demande au téléphone (Wake Lock) pendant la partie.

## Réseau

- **Même Wi-Fi ou partage de connexion d'un joueur** : fonctionne sans Internet (mais la reconnexion automatique, elle, a besoin d'Internet : sinon, on rescanne).
- **Relais du rendez-vous** : par défaut, quelques relais Nostr publics choisis par Trystero. Pour utiliser les siens : `localStorage['astra.relays'] = 'wss://…,wss://…'` dans la console.
- **4G/5G, de n'importe où** : le STUN gratuit de Cloudflare (`js/config.js`) fournit l'adresse publique. Si un joueur n'arrive pas à se connecter (CGNAT de certains opérateurs), il faut ajouter un relais TURN dans `js/config.js`.
- Les Wi-Fi invités (hôtel, bar) bloquent souvent les échanges entre appareils : utiliser le partage de connexion.

## Limites du prototype

- **Partie coupée en deux** : chaque côté continue, et tout se recolle quand ils se retrouvent (au rendez-vous, ou par QR sans Internet).
- **Relais publics** : gratuits mais sans garantie ; s'ils sont tous indisponibles, la reconnexion automatique ne marche plus (le QR, si).
- **Pas d'arbitre** : chacun fait foi pour sa propre fiche, donc un joueur qui bricole son téléphone peut tricher sur sa planète. Entre amis seulement. Combat : c'est le téléphone de l'attaquant qui le calcule à l'arrivée de sa flotte, avec ce qu'il sait alors de la planète attaquée (une copie qui peut dater un peu), et qui inscrit les pertes du défenseur dans sa propre fiche ; le téléphone du défenseur les applique dès qu'il les reçoit, même s'il était hors ligne au moment de l'attaque. Un attaquant tricheur peut donc gonfler ses victoires. Même règle pour les combats entre flottes : le poursuivant calcule avec la dernière copie qu'il a de la flotte visée, qui peut avoir changé de cap entre-temps. Si deux joueurs s'attaquent en même temps, il y a deux combats. Tant que le téléphone du joueur visé n'a pas lu le rapport d'un combat, sa flotte apparaît encore intacte : on ne peut pas la reprendre en chasse d'ici là (sinon ses pertes compteraient deux fois). Une flotte visée qui a fusionné est quand même touchée ; si elle s'est posée, ce sont les vaisseaux de la planète qui encaissent.
- **Heure des téléphones** : un téléphone réglé à la main avec une heure fausse verra les chantiers des autres finir trop tôt ou trop tard (sa propre planète reste juste).
- **Versions mélangées** : chaque fiche porte la version de son format. Un téléphone qui voit la fiche d'un joueur plus à jour lui demande de recharger l'appli. Les téléphones d'avant les flottes pilotées ne sont pas prévenus : ils doivent recharger l'appli à la main. Les flottes d'avant le pilotage libre sont converties toutes seules (leur mission devient l'ordre qui les attend à l'arrivée).
- La sauvegarde est sur le téléphone : vider les données du navigateur ou changer de téléphone fait perdre sa copie (les autres ont la leur).
- Une invitation ne sert qu'une fois.
- Chaque joueur a la partie complète : un joueur curieux peut tout lire dans la console (pas de brouillard de guerre possible).
- Contenu de jeu minimal : 3 races, 6 technologies et 4 vaisseaux chacune, 2 pouvoirs aliens (arrachement, transe), colonies, transport et combat simples (pas de défenses planétaires ni d'espionnage). Équilibrage à affiner.
- Les planètes d'avant les races (métal, cristal, deutérium) repartent de zéro : leur joueur choisit sa race en revenant.
- Testé dans Chromium : invitation par QR, invitation par un joueur qui n'a pas créé la partie, maillage à 3 sans Internet, départ du créateur de la partie, reprise après départ de tous, fusion de copies jouées séparément, reconnexion automatique avec un relais Nostr local. Pas encore testé sur de vrais iPhone et Android en 4G, ni avec les relais Nostr publics.

## Licences des bibliothèques incluses

`vendor/qrcode.mjs` (qrcode-generator, MIT), `vendor/jsQR.js` (jsQR, Apache 2.0) et `vendor/trystero-nostr.mjs` (Trystero 0.26, MIT) : voir `vendor/README.txt`.
