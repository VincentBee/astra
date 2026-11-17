// Point d'entrée de l'interface (ancien js/app.js) : tout ce qui s'exécute au chargement,
// dans le même ordre qu'avant, un module par effet (écouteur, init). L'ordre des imports
// ci-dessous EST l'ordre d'exécution : un module d'effet n'importe jamais un autre module
// d'effet, seulement des fonctions, des constantes et l'état.

// Les autres modules d'abord, dans l'ordre des imports de l'ancien app.js : ils s'évaluent
// avant tout le reste, comme avant.
import '../../session/index.js';
import '../../reseau/save/index.js';
import '../../reseau/tablock/index.js';
import '../../reseau/invite/index.js';
import '../../reseau/scanner/index.js';
import '../../regles/game/index.js';
import '../sky/index.js';
import '../spark/index.js';
import '../aim/index.js';
import '../icons/index.js';
import '../galaxy/index.js';
import '../../regles/tech/index.js';
import '../../regles/trade/index.js';
import '../../regles/report/index.js';
import '../finish/index.js';
import '../back/index.js';
import '../../ia/bot/index.js';
import '../../regles/fleet/index.js';

import './outils/branchements/icones.js';
import './outils/branchements/galaxie.js';
import './planete/entete/branchements/observe-hauteurs.js';
import './planete/entete/branchements/defilement.js';
import './outils/branchements/console-astra.js';

// ---------------------------------------------------------------------------
// Utilitaires d'interface
// ---------------------------------------------------------------------------
import './outils/branchements/sauvegarde-impossible.js';
import './outils/branchements/ecran-allume.js';
import './outils/branchements/camera-annuler.js';

// ---------------------------------------------------------------------------
// Accueil
// ---------------------------------------------------------------------------
import './accueil/branchements/nom-retenu.js';
import './outils/branchements/reglages-ouvrir.js';
import './outils/branchements/reglages-fermer.js';
import './outils/branchements/reglages-ciel.js';
import './accueil/branchements/boutons-aller.js';
import './accueil/branchements/historique-parties.js';
import './partie/branchements/sauver-en-quittant.js';
import './accueil/branchements/creer.js';
import './accueil/branchements/contre-ia.js';
import './rejoindre/branchements/rejoindre.js';

// ---------------------------------------------------------------------------
// Rejoindre (joueur)
// ---------------------------------------------------------------------------
import './rejoindre/branchements/scanner-invitation.js';
import './rejoindre/branchements/coller-invitation.js';
import './rejoindre/branchements/autre-invitation.js';
import './rejoindre/branchements/copier-reponse.js';
import './rejoindre/branchements/partager-reponse.js';
import './partie/branchements/compteur-rendus.js';
import './rejoindre/branchements/rejoindre-encore.js';

// ---------------------------------------------------------------------------
// Invitations (tout le monde peut inviter)
// ---------------------------------------------------------------------------
import './invitation/branchements/joueurs-ouvrir.js';
import './invitation/branchements/joueurs-fermer.js';
import './invitation/branchements/inviter.js';
import './invitation/branchements/invitation-fermer.js';
import './invitation/branchements/copier-lien.js';
import './invitation/branchements/partager-lien.js';
import './invitation/branchements/scanner-reponse.js';
import './invitation/branchements/coller-reponse.js';

// ---------------------------------------------------------------------------
// Partie
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Choix de la race, à l'arrivée dans la partie (définitif)
// ---------------------------------------------------------------------------
import './race/branchements/choix.js';
import './race/branchements/valider.js';

// ---------------------------------------------------------------------------
import './planete/branchements/deplier-carte.js';
import './planete/branchements/pouvoirs.js';
import './planete/branchements/recherches.js';
import './planete/branchements/vaisseaux.js';

// ---------------------------------------------------------------------------
// Historique des ressources : un mini-graphe discret dans chaque tuile
// ---------------------------------------------------------------------------
import './fenetres/branchements/clic-fond.js';
import './fenetres/branchements/echap.js';
import './planete/branchements/batiments.js';

// ---------------------------------------------------------------------------
// Journal en jeu (D-110) : mes combats vus de mon côté (carnet du téléphone),
// puis les lignes du journal partagé qui me nomment.
// ---------------------------------------------------------------------------
import './journal/branchements/ouvrir.js';
import './journal/branchements/ouvrir-tout.js';
import './journal/branchements/fermer.js';
import './journal/branchements/absence.js';
import './partie/branchements/bandeau-menace.js';
import './partie/branchements/bandeau-fin.js';
import './partie/branchements/fin-fermer.js';
import './partie/branchements/fin-carte.js';
import './planete/branchements/fil-attente.js';
import './flotte/branchements/liste-flottes.js';

// ---------------------------------------------------------------------------
// Décollage d'une flotte
// ---------------------------------------------------------------------------
import './flotte/decollage/branchements/ouvrir.js';
import './flotte/decollage/branchements/fermer.js';
import './flotte/decollage/branchements/saisie.js';
import './flotte/decollage/branchements/decoller.js';

// ---------------------------------------------------------------------------
// Univers : la carte des planètes, vue principale de la partie
// ---------------------------------------------------------------------------
import './partie/branchements/retour-carte.js';
import './planete/branchements/onglets.js';
import './planete/branchements/onglets-clavier.js';
import './planete/branchements/oubli-onglet.js';
import './alertes/branchements/ouvrir.js';
import './alertes/branchements/liste.js';
import './carte/fiche/branchements/voir-planete.js';

// ---------------------------------------------------------------------------
// Zoom de la carte (D-117) : pincer ou molette pour zoomer, glisser pour se déplacer,
// boutons + / − / vue entière. `zoom.x`, `zoom.y` : coin haut-gauche de la partie vue, en cases.
// ---------------------------------------------------------------------------
import './carte/zoom/branchements/plus.js';
import './carte/zoom/branchements/moins.js';
import './carte/zoom/branchements/tout-voir.js';
import './carte/zoom/branchements/doigt-pose.js';
import './carte/zoom/branchements/doigt-glisse.js';
import './carte/zoom/branchements/doigt-leve.js';
import './carte/zoom/branchements/doigt-annule.js';
import './carte/zoom/branchements/molette.js';
import './carte/zoom/branchements/zoom-initial.js';
import './carte/selection/branchements/toucher-carte.js';
import './carte/menu/branchements/choix.js';
import './carte/menu/branchements/echap.js';
import './carte/menu/branchements/clic-dehors.js';
import './flotte/pilotage/branchements/vignettes.js';
import './flotte/pilotage/branchements/arreter.js';
import './flotte/pilotage/branchements/posture.js';
import './flotte/pilotage/branchements/ravitailler.js';
import './flotte/pilotage/branchements/rentrer.js';
import './flotte/pilotage/branchements/se-poser.js';
import './flotte/pilotage/branchements/fermer.js';

// ---------------------------------------------------------------------------
// Échanges entre joueurs
// ---------------------------------------------------------------------------
import './echanges/branchements/partenaires.js';
import './echanges/branchements/echange-fermer.js';
import './echanges/branchements/echanger.js';
import './echanges/branchements/offres.js';
import './echanges/branchements/a-cote.js';
import './echanges/branchements/separer.js';
import './echanges/branchements/transfert-fermer.js';
import './echanges/branchements/transferer.js';
// Navette (D-556) : réglée depuis la fiche de la flotte
import './flotte/navette/branchements/ouvrir.js';
import './flotte/navette/branchements/fermer.js';
import './flotte/navette/branchements/changer-a.js';
import './flotte/navette/branchements/lancer.js';
import './flotte/navette/branchements/arreter.js';
import './depart/branchements/pret.js';
import './depart/branchements/ma-flotte.js';
import './depart/branchements/inviter.js';
import './depart/branchements/ajouter-ia.js';
import './depart/branchements/joueurs.js';
import './depart/branchements/ia-race.js';
import './depart/branchements/ia-fermer.js';
import './depart/branchements/ia-enregistrer.js';
import './depart/branchements/ia-retirer.js';
import './carte/fiche/branchements/pi-auto-less.js';
import './carte/fiche/branchements/pi-auto-more.js';
import './carte/fiche/branchements/pi-auto-stop.js';
import './carte/fiche/branchements/chantier.js';
import './carte/fiche/branchements/decoller.js';
import './carte/fiche/branchements/fermer.js';
import './carte/fiche/branchements/coloniser.js';

// ---------------------------------------------------------------------------
// Démarrage : lien d'invitation dans l'adresse ?
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Lecture seule (D-139) : index.html?view montre une partie enregistrée par un scénario de test,
// image par image, avec le vrai écran du jeu. La page qui l'embarque (le rapport du test, même
// origine) envoie chaque image par postMessage : { astraView: { state, me, t, intel, selected, view } }.
// Pas de réseau, pas de sauvegarde, horloge arrêtée à l'heure de l'image, rien n'est écrit.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// « Retour » pendant une partie en cours (D-417) : une entrée d'historique « garde » au-dessus
// de la page ; un retour la consomme et on demande « Quitter la partie en cours ? ». Une fenêtre
// ouverte se ferme d'abord. Le lobby et l'écran de fin laissent le retour faire comme avant.
// ---------------------------------------------------------------------------
import './retour/branchements/garde-historique.js';
import './retour/branchements/quitter-fermer.js';
import './retour/branchements/rester.js';
import './retour/branchements/quitter.js';
import './partie/branchements/demarrage.js';
