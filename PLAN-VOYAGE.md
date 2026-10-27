# Plan : voyage spatial façon RTS

Les flottes deviennent des unités qu'on pilote sur la carte 20 × 20 : on les fait décoller, on les déplace de case en case, on les arrête, on les fait rentrer. Elles ont un réservoir d'énergie, peuvent tomber en panne, se battre entre elles, se regrouper et faire des échanges.

## Choix validés

| Sujet | Choix |
|---|---|
| Déplacement | Toucher une case, même vide. Rappel, changement de cap, stationnement libre. |
| Carburant | Un réservoir par flotte, rempli en énergie. À sec : la flotte reste bloquée, à secourir. |
| Plein | Sur ses planètes ; entre ses propres flottes sur la même case ; avec un autre joueur par échange (flotte ou planète). |
| Mes flottes | Transférer carburant, cargaison et vaisseaux ; fusionner ; scinder. |
| Échange entre joueurs | Proposition + accord. Les deux parties sur la même case. Contre quelque chose ou contre rien. |
| Combat en route | Ordre d'attaque sur une flotte ennemie (poursuite). Pas de combat automatique. |
| Vision | Portée de détection autour de ses planètes et flottes. 7ᵉ technologie « Détection » par race. |

## Choix par défaut (non tranchés, à changer si besoin)

- **Carburant = énergie** (les 3 races en ont, entrepôt de 1 000 au départ).
- **Scinder** une flotte est possible, pas seulement fusionner.
- **Offre d'échange** valable 5 min (au lieu de 10 : la flotte qui propose est bloquée pendant ce temps, et on ne peut pas annuler, voir § 6).
- **Combat de flottes** calculé par le téléphone de l'attaquant (comme les attaques de planète aujourd'hui).
- **Après un combat**, les survivants restent sur place (plus de retour automatique). Bouton « Rentrer ».
- **Plein** par bouton explicite (on voit ce que ça coûte), pas automatique.
- **Défense d'une planète** : seuls les vaisseaux posés (`planet.ships`) défendent, comme aujourd'hui. Une flotte en orbite est une cible à part. *Conséquence :* on peut garer sa flotte en orbite pour qu'elle ne participe pas à une défense perdue d'avance (et l'attaquant peut aussi viser cette flotte directement).
- **A attaque B pendant que B attaque A** : deux combats calculés chacun de leur côté. Acceptée comme limite du prototype (pas d'arbitre), notée dans le README.

## 1. Modèle de flotte

Aujourd'hui une flotte est un trajet (`mission`, `from`, `to`, `depart`, `arrive`) qui disparaît à l'arrivée. Elle devient une entité qui vit dans `p.fleets` jusqu'à ce qu'on la pose ou qu'elle soit détruite.

```js
{
  id, ships, cargo,          // inchangé
  origin,                    // planète de départ (pour « Rentrer »)
  // Segment courant : la position se calcule toujours avec fleetPos(f, now).
  from, to, depart, arrive,  // parquée : from === to, arrive === depart
  fuel,                      // carburant au moment `depart`
  stranded,                  // true si le segment s'arrête à cause d'une panne
  order,                     // { kind: 'move' | 'colonize' | 'attack' | 'chase' | 'dock', target }
  absorbed: [],              // ids des flottes fusionnées dedans (voir § 4)
}
```

- On garde `from/to/depart/arrive` : `fleetPos` marche sans changement, et un vieux téléphone affiche encore les flottes des autres. Dans `drawMap()`, retirer `if (f.arrive <= now && p.id === session.me) continue;`, qui cacherait mes flottes parquées.
- Une flotte dont tous les vaisseaux sont détruits est supprimée (cargaison et carburant perdus).
- `MAX_FLEETS` (12) compte désormais les flottes vivantes, pas seulement celles en route. Le passer à 16.
- **Migration** dans `normalize()` (`js/session.js`) : une ancienne flotte reçoit `fuel` = réservoir plein et un `order` déduit de `mission` (`transport` → `dock`, `colonize`, `attack`, `return` → `dock` sur `origin`).

## 2. Ordres

Tout changement d'ordre suit la même règle : calculer la position et le carburant **maintenant**, puis ouvrir un nouveau segment depuis ce point.

| Ordre | Effet |
|---|---|
| Décoller | Nouveau `launch()` sans destination : vaisseaux + cargaison + carburant quittent la planète, la flotte est parquée sur sa case. |
| Aller à une case | Segment vers la case (entière). |
| Stop | Segment terminé là où est la flotte (position arrondie à la case la plus proche, pour que « même case » ait un sens). |
| Rentrer | Aller à `origin`, puis se poser. |
| Se poser | Sur une de mes planètes : vaisseaux → `planet.ships`, cargaison et carburant restant → stock. La flotte disparaît. |
| Coloniser | Ordre sur une case de planète libre, effet à l'arrivée (code actuel de `arrive()`). |
| Attaquer une planète | Ordre sur une case de planète ennemie, combat à l'arrivée (code actuel), puis les survivants restent en orbite. |
| Poursuivre une flotte | Voir § 5. |

**Fichiers :** `js/fleet.js` (fonctions pures : `launch`, `moveTo`, `stopAt`, `posAt`), `js/session.js` (`sendFleet` remplacé par `takeOff`, `order(fleetId, …)`, `arrive()` adapté, `tick()`).

## 3. Carburant

- Nouveaux champs par vaisseau dans `SHIPS` (`js/tech.js`) : `tank` (contenance) et `burn` (énergie par case). Une flotte : `tank` = somme, `burn` = somme.
- Couleur de race : machines sobres, aliens gourmands, humains au milieu.
- **Cible d'équilibrage** (pas de chiffres figés) : un cargo seul fait un aller-retour d'un bord à l'autre de la carte avec un plein ; un plein de flotte moyenne coûte quelques minutes de production d'énergie en début de partie. Le réservoir total d'une grosse flotte peut dépasser l'entrepôt : le plein partiel est donc permis (on remplit avec ce qu'on a).
- **La panne se décide au moment de l'ordre**, pas pendant le trajet : si `fuel` ne couvre pas la distance, le segment est coupé au point de panne (`to` et `arrive` tronqués, `stranded: true`). Comme c'est écrit dans le segment, tous les téléphones voient la même chose.
- Une flotte à sec ne bouge plus. Elle peut recevoir du carburant (§ 4 ou § 6) puis repartir.
- Planète : bouton « Faire le plein » quand la flotte est parquée sur une de mes planètes (prend `stock.energy`). Attention : cette énergie alimente aussi les bâtiments (`effE`, `js/game.js:418`). Un gros plein peut ralentir mines et foreuses, et chez les machines il concurrence les chantiers. C'est voulu, mais à surveiller à l'équilibrage.
- Le carburant n'est consommé qu'en mouvement (pas de coût à l'arrêt).

## 4. Entre mes flottes

Condition : les deux flottes sont **parquées sur la même case** (une flotte qui passe ne compte pas). Effet immédiat, tout se passe dans ma fiche.

- **Transférer** : carburant, cargaison, vaisseaux, dans la limite des soutes et réservoirs.
- **Fusionner** : une seule flotte reste, elle hérite de tout. Ses `absorbed` reçoivent l'id de l'autre (et ses propres `absorbed`). Sans ça, un adversaire qui attaque la flotte absorbée verrait ses dégâts s'évaporer : fusionner servirait à esquiver.
- **Scinder** : choisir des vaisseaux, de la cargaison et du carburant à mettre dans une nouvelle flotte.

## 5. Combat entre flottes

- Ordre « Poursuivre » sur une flotte ennemie visible. Mon téléphone vise le **point d'interception** (où sera la cible quand j'arrive, calculable sur son segment en ligne droite), pas sa position actuelle : sinon une cible aussi rapide n'est jamais rattrapée.
- Il ne refait mon segment que quand le segment connu de la cible change (son `depart` ou son `to`), pas à chaque `tick()` : chaque nouveau segment modifie ma fiche et la renvoie à tout le monde.
- **Contact** quand la distance ≤ 0,5 case : combat avec `battle()` (inchangé). Je l'inscris dans `p.effects` avec `fleet: <id cible>` au lieu de `key`, et un **identifiant neuf par effet** (`rid()`) : aujourd'hui l'effet reprend l'id de la flotte, donc le 2ᵉ combat d'une même flotte serait ignoré par `applied`.
- Le butin : les survivants prennent la cargaison de la flotte vaincue, dans la limite de leurs soutes (règle de `plunder`).
- Le téléphone du défenseur applique l'effet dans `applyEffects()` : il cherche la flotte par `id`, puis dans les `absorbed`. Si la flotte a été posée entre-temps, les pertes s'appliquent aux vaisseaux de la planète où elle s'est posée : la fiche garde pour ça `p.docked: { fleetId: planetKey }` (les 60 derniers). Si elle n'existe plus du tout, l'effet est ignoré.
- **Cible plus rapide** : la poursuite peut ne jamais aboutir. Elle s'arrête si la cible sort de ma portée de détection, ou par l'ordre Stop.
- La poursuite coûte du carburant comme un déplacement.
- **Limite (pas d'arbitre)** : je calcule avec une copie qui peut dater de quelques secondes ; si la cible a changé de cap sans que je le sache, je peux la toucher là où elle n'est plus. Même règle qu'aujourd'hui : l'attaquant fait foi.
- Relever les plafonds `effects.slice(-20)` → `-60` et `applied.slice(-60)` → `-200`, sinon des dégâts peuvent se perdre.

## 6. Échange entre joueurs

Chaque joueur n'écrit que sa propre fiche : l'offre vit chez le proposant, la réponse chez celui qui accepte.

```js
// Fiche du proposant
offers: [{ id, from: { fleet | planet }, to: { pid, fleet | planet }, give: {...}, want: {...}, at, expires }]
// Fiche de celui qui répond
answers: [{ offer, pid, ok, at }]
```

- **Parties** : une flotte ou une planète de chaque côté (on peut échanger depuis l'orbite d'une planète adverse). Même case, à l'arrêt, au moment de proposer et d'accepter.
- `give` / `want` : minéraux, nourriture, énergie (cargaison ou planète), **carburant**, ou rien (don).
- **Séquestre** : ce que je donne quitte ma flotte ou ma planète dès que je propose. Rien ne peut donc manquer au moment de l'échange.
- **Pas d'annulation.** Sinon B pourrait accepter une offre déjà annulée (l'annulation pas encore reçue) et devrait tout défaire. Règle unique, sans conflit : une acceptation datée avant `expires` est valable, point. B connaît `expires` et vérifie lui-même.
- **Accepter** (téléphone de B) : vérifier que B a ce qui est demandé, et la place en soute et en réservoir pour ce qu'il reçoit ; retirer `want`, ajouter `give`, écrire la réponse.
- **Appliquer** (téléphone de A, dans `tick()`) : lire la réponse ; si acceptée, ajouter `want` à la flotte ou planète de départ ; si refusée, rendre le séquestre ; sans réponse, le rendre à `expires + 60 s` (marge pour l'écart d'heure entre téléphones).
- Une offre en attente bloque la flotte qui propose (elle ne peut pas bouger) jusqu'à la réponse ou l'expiration.
- Notification (toast) quand on reçoit une offre ; liste des offres dans la fiche de la flotte ou de la planète.

## 7. Détection

- 7ᵉ technologie par race dans `TECHS` (`js/tech.js`), niveaux 1 à 5, nom propre à chaque race (ex. Radar profond, Réseau de capteurs, Clairvoyance). Effet : +1 case de portée par niveau. À coder à part (nouveau champ `range`) : le `bonus` actuel est multiplicatif (`js/tech.js:210`), une portée en cases est additive.
- Portée de base : 3 cases autour de mes planètes, 2 autour de mes flottes.
- **Filtrage à l'affichage seulement** : `drawMap()` et les listes de cibles cachent les flottes ennemies hors de portée. Les planètes restent toutes visibles (la carte se calcule à partir de l'identifiant de la partie).
- Limite connue : un joueur qui ouvre la console voit tout (déjà dans le README).

## 8. Interface carte

- Le toucher de la carte ne regarde aujourd'hui que les planètes (`d < 1.2`). Ajouter avant : le test des flottes (les miennes d'abord).
- **Flotte sélectionnée** : contour lumineux, panneau en bas avec carburant, vaisseaux, cargaison, ordre en cours et boutons (Stop, Rentrer, Se poser, Plein, Transférer, Fusionner, Scinder, Échanger, Poursuivre).
- Flotte sélectionnée + toucher une case = ordre « Aller ». Sur une planète libre avec colonisateur, ou une planète ennemie : demander Coloniser / Attaquer / Juste y aller.
- Plusieurs flottes sur une case : petite liste pour choisir.
- Trajet en pointillés, point de panne marqué d'une croix, jauge de carburant sous le triangle.
- Le bouton « Envoyer une flotte » de la planète devient « Faire décoller ».

## 9. Lots

Chaque lot se livre seul (une PR chacun) et laisse le jeu jouable.

1. **Mouvement libre** ✅ : modèle de flotte, migration, décoller / aller / stop / rentrer / se poser, sélection et ordres sur la carte. Sans carburant. Fait aussi en avance : un id neuf par combat, plafonds `effects` / `applied` relevés, version par fiche (§ 10). Pas fait : sortir la carte dans `js/map.js` (le code ajouté reste lisible dans `js/app.js`), choix dans une liste quand plusieurs flottes sont sur la même case (on touche plusieurs fois pour passer de l'une à l'autre).
2. **Carburant** ✅ : `tank` et `burn`, panne au moment de l'ordre, plein sur planète, affichage. En plus : choix forcé avec avertissement « panne en route » quand le réservoir ne suffit pas, carburant rendu au stock en se posant (ou donné à la colonie fondée), carburant figé et borné après des pertes au combat (`setShips`). Une flotte en panne ne peut pas encore être secourue : il faut le lot 3 (transfert entre mes flottes) ou le lot 5 (échange).
3. **Mes flottes** ✅ : transférer, fusionner (avec `absorbed`), scinder. « Même case » = case arrondie de deux flottes arrêtées (une flotte en panne peut être entre deux cases). Les flottes sont nommées « Flotte 1, 2… » d'après leur rang : les numéros changent après une fusion. Une flotte est « à sec » (grisée) dès que son réservoir est vide à l'arrêt.
4. **Combat de flottes** ✅ : poursuite, contact, effets par flotte, plafonds relevés (déjà fait au lot 1). Contact vérifié aussi à l'instant de mon arrivée (appli en arrière-plan). Une flotte sans armes ne peut pas poursuivre. La poursuite ne s'arrête pas encore quand la cible sort de la portée de détection : à brancher au lot 6.
5. **Échanges** ✅ : offres, séquestre, réponses, notifications. Fonctions pures dans `js/trade.js`. La place en soute de qui reçoit compte ce qu'il donne dans le même échange. Si la flotte qui propose est détruite avant la réponse, son séquestre est perdu ; si elle s'est posée, ce qu'elle reçoit va à sa planète. Au plus 10 offres en attente par joueur. Retour du séquestre sans réponse : seulement quand la fiche de l'autre a bougé après `expires + 60 s` sans accepter, ou au bout de 30 min (l'autre refuse tout seul une offre expirée). `moving()` ignore les segments immobiles figés dans le futur proche par un téléphone en avance.
6. **Détection** ✅ : technologie et filtrage. Portée en cases à vol d'oiseau, halo dessiné sur la carte (un seul tracé : les zones qui se recouvrent ne s'assombrissent pas). La poursuite s'arrête hors de portée (reste du lot 4). La liste des commandants ne compte que les flottes adverses visibles. Pas de changement de format des fiches.
7. **Documentation et équilibrage** : README (règles et limites), GUIDE.md (le coût du carburant change l'équilibrage, les ordres de construction sont à refaire).

## 10. Versions mélangées

Un téléphone pas à jour ne connaît pas les nouveaux champs, et le service worker garde l'ancienne appli en cache. Ajouter une `version` **dans chaque fiche joueur** (c'est la fiche que `mergeStates`, `js/save.js:42`, fusionne ; un champ global serait écrasé) : si un téléphone voit une fiche d'une version plus récente que la sienne, un bandeau lui demande de recharger l'appli. Monter le nom du cache dans `sw.js` à chaque lot.

## 11. Tests (preuve pour chaque PR)

- Pas de framework de test dans le repo. `js/fleet.js` est pur et en modules ES (Node 24 installé, qui les détecte tout seul) : un script Node (dans le scratchpad, pas commité) teste les fonctions pures : segment, panne tronquée, plein partiel, fusion avec `absorbed`, scission, combat de flottes, séquestre et règle d'acceptation.
- Test dans le navigateur avec deux fenêtres (méthode du README) : décoller, se déplacer, panne, plein, poursuite et combat, échange accepté / refusé / expiré, portée de détection.
- Captures d'écran jointes à la PR.

## Risques

- **Poursuite imprécise** entre téléphones : acceptée, même règle que les attaques actuelles.
- **Équilibrage** du carburant : à régler en jouant, probablement plusieurs passes.
- **Taille de `js/app.js`** (1 300 lignes) : sortir la carte et le panneau de flotte dans `js/map.js` pendant le lot 1.
