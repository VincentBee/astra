# Décisions

Chaque choix fait sur Astra (règle du jeu, conception, outil, façon de travailler), numéroté
**D-001, D-002…** dans l'ordre des dates. Les demandes elles-mêmes sont dans
[historique/journal.md](historique/journal.md).

**Heures : toutes en UTC.** Paris = UTC+1 depuis le 25 oct 2026 (heure d'hiver). `git log`
mélange `+0000` (11 commits faits depuis Claude Code sur le web, le 25 oct) et `+0100` (24 commits
locaux). Piège : le commit `1eeb2c1` est daté 2026-10-28 23:14:27Z, soit le 29 oct à 00:14 à Paris.

## Comment lire

- **Qui** : *Vincent* (il a tranché), *Claude (défaut)* (choix de Claude sans question, jamais
  contesté ensuite), *déduit* (aucun transcript : reconstruit depuis les commits et le README).
- **Statut** : *en vigueur*, *remplacée par D-xxx*, *modifiée par D-xxx* (une partie seulement
  change), *en cours* (pas encore commité).
- **Source** : identifiant court du transcript Claude Code (voir le tableau des sessions dans
  [journal.md](historique/journal.md#sessions-et-transcripts)), heure UTC, commit.
- « non confirmé » = affirmation qu'aucune preuve directe n'appuie.
- Pour ajouter une décision : voir la règle dans [CLAUDE.md](../CLAUDE.md).

---

## 25 octobre 2026 — prototype (sessions web A et B, sans transcript)

Ces décisions sont **déduites** des commits `a4553ee` → `0b30d7d` et du README d'origine.
Aucune conversation ne les prouve.

**D-001 — Site statique, sans serveur de jeu, WebRTC après QR**
- 2026-10-25 14:41. Créer le jeu.
- Choix : site statique en JS vanilla, modules ES, sans build ; les téléphones se parlent en
  WebRTC après un échange de QR codes ; installable (service worker).
- Qui : déduit. Source : `a4553ee` (corps du commit, README d'origine). Statut : en vigueur.

**D-002 — Règles « port de `game.rs` », vitesse ×60**
- 2026-10-25 14:41. Choix : règles reprises d'un `game.rs` (origine inconnue, absent du dépôt),
  une heure de jeu = une minute réelle.
- Qui : déduit. Source : README (`js/game.js`). Statut : **modifiée par D-083** (`SPEED = 60 ×
  TEMPO`, une heure de jeu = 24 s), voir [regles.md](architecture/regles.md) §4.1.

**D-003 — Un maître du jeu (MJ) fait foi, réseau en étoile**
- 2026-10-25 14:41. Choix : le téléphone du MJ garde l'état officiel.
- Qui : déduit. Source : `a4553ee`. Statut : **remplacée par D-005, puis par D-010**.

**D-004 — Déplacements synchronisés par le MJ**
- 2026-10-25 15:15. Choix : un pas par vaisseau toutes les 150 ms au plus ; le joueur affiche ses
  pas tout de suite puis se recale sur le MJ.
- Qui : déduit. Source : `07ca31a`. Statut : **remplacée par D-010 et D-017** (déplacement
  retiré).

**D-005 — Relève du MJ**
- 2026-10-25 16:33. Choix : chaque téléphone a une copie complète ; le plus ancien joueur
  reprend après 6 s ; époques ; retour par secret local (empreinte SHA-256).
- Alternative : partie arrêtée si le MJ part (limite du README d'avant).
- Qui : déduit. Source : `0b46f73`. Statut : **remplacée par D-010** (le secret local reste).

**D-006 — Les deux scans valent accord**
- 2026-10-25 17:02. Choix : plus de bouton Accepter / Refuser ; 8 joueurs au plus ; invitation à
  usage unique.
- Alternative : Accepter / Refuser (version d'avant).
- Qui : déduit. Source : `0e51073`. Statut : en vigueur.

**D-007 — Sauvegarde locale et reprise**
- 2026-10-25 17:33. Choix : sauvegarde dans `localStorage` à chaque changement ; reprise même le
  lendemain avec rattrapage du temps ; fusion des copies (la plus récente action par joueur gagne).
- Qui : déduit. Source : `be72dbb`. Statut : en vigueur (détails dans
  [reseau.md](architecture/reseau.md)).

**D-008 — Hébergement sur GitHub Pages**
- 2026-10-25 17:39. Choix : https://vincentbee.github.io/astra/ (d'où le fichier `.nojekyll`).
- Alternatives citées dans le README : Cloudflare Pages, Netlify.
- Qui : déduit. Source : `ed9e2b8`, README. Statut : en vigueur.

**D-009 — Reconnexion sans rescanner (Trystero, relais Nostr)**
- 2026-10-25 18:26. Choix : le QR ne sert qu'à la première arrivée ; ensuite rendez-vous sur des
  relais Nostr publics, dans un salon propre à la partie.
- Alternative : rescanner un QR à chaque fois.
- Qui : déduit. Source : `5d88672`. Statut : en vigueur.

**D-010 — Plus de maître du jeu : tous au même niveau**
- 2026-10-25 18:44. Choix : chaque joueur est le seul à écrire sa fiche ; la plus récente gagne ;
  propagation de proche en proche ; tout le monde peut inviter. Relève, époques et synchro
  d'horloge supprimées.
- Alternatives : D-003 puis D-005, abandonnées en 4 h.
- Qui : déduit. Source : `562e3fe`, README « Tous au même niveau ». Statut : en vigueur (c'est le
  principe de [reseau.md](architecture/reseau.md) §1).

**D-011 — Trois races et trois ressources**
- 2026-10-25 19:20. Choix : humains, machines, aliens ; minéraux, nourriture, énergie ; race
  choisie à l'arrivée.
- Alternative : métal, cristal, deutérium (version d'avant, citée dans le README).
- Qui : déduit. Source : `4cfde66`. Statut : en vigueur.

**D-012 — Départ serré, l'ordre de construction compte**
- 2026-10-25 21:38. Choix : entrepôts limités, économie exigeante ; guide par race.
- Qui : déduit. Source : `0b30d7d`. Statut : en vigueur (le guide devient `GUIDE.md` en D-014).

## 25–26 octobre 2026 — session `aeb160d5` « Lancer le projet en local »

**D-013 — `.claude/launch.json` n'est jamais commité**
- 2026-10-25 21:41 (première fois). Contexte : ce fichier sert seulement à lancer le jeu en local
  pour les tests de Claude.
- Choix : le garder hors du dépôt. Répété à chaque commit du voyage (« sans .claude/launch.json »),
  le 28/10 à 15:12 et 23:14.
- Qui : Claude (défaut), puis Vincent le redit lui-même dans ses demandes de commit.
- Source : `aeb160d5` 22:07:26 ; `c0608c0a` 22:13:02 ; `a034c14e` 23:16:59 → 23:54:42 ;
  `01be156b` 15:12:58 ; `24884c06` 15:12:02 ; `f4afbcd0` 23:14:35. Statut : en vigueur.
- Fusion de : hist-a D-A9 (une ligne), hist-b DB-01, hist-c D-C28.

**D-014 — Le guide sort du jeu et devient `GUIDE.md`**
- 2026-10-25 21:46. Demande : « le guide doit etre dans le code, pas dans l'interface, fait un
  chips ».
- Choix : retirer onglet, bouton et fenêtre du guide ; contenu dans `GUIDE.md` ; `js/guide.js`
  supprimé.
- Alternatives : garder les données dans `js/guide.js` en commentaire ; pastilles d'aide
  (« chips ») dans l'interface.
- Qui : Vincent (réponse « Retirer de l'UI, doc » à 21:46:56). Le sens de « chips » n'a jamais
  été expliqué (**non confirmé**).
- Source : `aeb160d5` 21:46:36 → 21:46:56 ; commit `8dfd5e2`. Statut : en vigueur.

**D-015 — Gisements : minéraux et nourriture**
- 2026-10-25 21:51. Question : quelles ressources s'épuisent sur une planète ?
- Choix : minéraux et nourriture ; l'énergie reste sans limite.
- Alternatives : minéraux seulement ; les trois.
- Qui : Vincent. Source : `aeb160d5` 21:51:02 → 21:53:23 ; `40cdb51`. Statut : en vigueur.

**D-016 — Sens de « limite min / max » d'un gisement**
- 2026-10-25 21:53. Choix (formulé par Vincent) : chaque planète a une production de base ; une
  fois le gisement vide, on est limité à cette production ; sans exploitation, le gisement se
  remplit jusqu'à un maximum.
- Alternatives : « tirage + plafond » ; « plancher + plafond ».
- Qui : Vincent (réponse libre). Source : `aeb160d5` 21:53:23 ; `40cdb51`. Statut : en vigueur.

**D-017 — Plus de déplacement aux flèches sur la carte**
- 2026-10-25 21:55. Demande : « tu peux retirer le deplacement dans la map, il ne servait qu'a
  demontrer le temps reel du multijoueur ».
- Choix : pavé, flèches et vaisseaux sur la carte retirés.
- Qui : Vincent. Source : `aeb160d5` 21:55 ; `40cdb51`. Statut : en vigueur (les flottes
  pilotables reviennent autrement en D-026 à D-031).

**D-018 — Choix techniques par défaut de la session `aeb160d5`**
- 2026-10-25 22:07–22:11. Claude, sans question :
  - 14 planètes vides tirées de façon déterministe depuis l'id de la partie, sans échange réseau ;
    si deux joueurs veulent la même planète, le premier l'emporte ;
  - journal du jeu dans la console du navigateur (`[Astra hh:mm:ss] …`) ; la demande vient de
    Vincent, le format de Claude ;
  - mini-graphes : fenêtre de 10 min, relevé toutes les 5 s, gardés au rechargement ;
  - régénération des gisements baissée (minéraux 15–45/min, nourriture 8–25/min), nouvelles
    parties seulement ; anciennes planètes sans gisement : sans limite.
- Qui : Claude (défaut). Source : `aeb160d5` 22:07:26, 22:11:44 ; `40cdb51`.
- Statut : en vigueur, sauf la régénération, **modifiée par D-060** (gisements ×10).

**D-019 — Tout ce qui est produit est pris à la planète**
- 2026-10-25 22:10. Contexte : Claude avait laissé hors gisement le revenu de base, l'impôt
  humain et l'arrachement alien.
- Choix : tout gain du joueur est prélevé sur le gisement ; l'arrachement ne dépasse ni le
  gisement ni la place en entrepôt (vérifié : 30,11 gagnés = 30,11 pris).
- Alternative : des revenus hors gisement.
- Qui : Vincent. Source : `aeb160d5` 22:10:56, 22:11:44 ; `40cdb51`. Statut : en vigueur.

**D-020 — Les vaisseaux servent à coloniser, transporter et combattre**
- 2026-10-25 22:13. Claude proposait : flotte sans action / exploiter d'autres planètes /
  coloniser.
- Choix : les trois (« colonisation, transport de ressources entre planette, et combat »).
- Qui : Vincent. Source : `aeb160d5` 22:05:56 → 22:13:26 ; `1f11f6f`. Statut : en vigueur.

**D-021 — Recherche : un labo par race et un arbre de technologies par race**
- 2026-10-25 22:13. Choix : labo propre à chaque race sur la planète mère, arbre de 6
  technologies par race, une recherche à la fois, valable pour toutes les planètes ; chantier
  naval par planète ; 4 vaisseaux par race (cargo, chasseur, lourd, colonisateur).
- Alternative : recherches et vaisseaux depuis les bâtiments existants.
- Qui : Vincent pour le principe ; nombres, noms et chiffres par Claude.
- Source : `aeb160d5` 22:13:26, bilan 2026-10-26 00:45:04 ; `1f11f6f`.
- Statut : en vigueur, **modifiée par D-031** : une 7ᵉ technologie par race (détection : Radar
  profond, Réseau de capteurs, Clairvoyance) ajoutée le 2026-10-27 à 23:49:51 (`796e0ad`, vérifié
  avec `git show`).

**D-022 — Combat sans arbitre : le téléphone de l'attaquant calcule**
- 2026-10-26 00:45. Contexte : aucun serveur pour arbitrer.
- Choix : l'attaquant calcule le combat sur sa copie (parfois ancienne) de la fiche du défenseur ;
  le défenseur applique les pertes ensuite, même hors ligne. Limite assumée : un attaquant tricheur
  peut gonfler ses victoires (écrit dans le README).
- Qui : Claude (défaut). Confirmé pour le voyage le 2026-10-27 22:50:37 (D-032, validé par
  Vincent).
- Source : `aeb160d5` 00:45:04 ; `1f11f6f` (origine) ; `a034c14e` 22:45–22:50 (confirmation).
- Statut : en vigueur. Fusion de : hist-a D-A7 (origine) et hist-c D-C16 (confirmation).

**D-023 — Pousser directement sur `main`, sans pull request**
- 2026-10-26 06:52 (première fois). Contexte : trois commits locaux pas encore poussés ; Claude
  proposait une PR.
- Choix : `git push origin HEAD:main`. Ensuite : chaque lot du voyage, les correctifs du 28/10,
  l'arbre des technologies, le replay et le design sont poussés sur `main` sans PR. Claude a
  proposé « J'ouvre la PR ? » au moins 9 fois dans `f4afbcd0` ; Vincent ne l'a jamais pris.
- Seule exception : la PR #1 (D-063).
- Qui : Vincent (« push en direct », « commit et push sur main », « Commite seulement, sans PR. »).
- Source : `aeb160d5` 06:52:06 ; `a034c14e` ; `3bf65a87` 08:18:16 ; `24884c06` 15:08:53 ;
  `01be156b` 15:11:50 ; `f4afbcd0` 23:14:05 ; `gh pr list` (une seule PR). Statut : en vigueur.
- Fusion de : hist-a D-A8, hist-b DB-10, hist-c D-C27.

## 27 octobre 2026 — tests par robots, voyage spatial

**D-024 — Chercher les bugs par simulation sans navigateur (« swarm bug 1 »)**
- 2026-10-27 22:15. Choix : le « cerveau » du jeu (`game.js`,
  `tech.js`, `fleet.js`) tourne sous Node sans navigateur ; 4 angles + contre-expertise + synthèse ;
  scripts hors du dépôt ; réseau réel et interface hors périmètre.
- Alternative : tester par le navigateur et le vrai réseau.
- Qui : plan de Claude, validé par Vincent (« oui », 22:15:55).
- Source : `c0608c0a` 22:15:10, 22:15:55. Statut : appliquée (étude finie).

**D-025 — Cadrer par des questions avant de coder**
- 2026-10-27 22:33. Demande : « questionne moi pour cadrer la demande ». Ensuite : plan écrit
  (`PLAN-VOYAGE.md`), puis lots.
- Qui : Vincent. Source : `a034c14e` 22:33:50. Statut : en vigueur comme façon de travailler.

**D-026 — Le voyage spatial améliore la carte actuelle**
- 2026-10-27 22:38. Choix : améliorer le voyage actuel, sur la carte unique.
- Alternatives : plusieurs systèmes solaires ; explorer l'inconnu.
- Qui : Vincent (`AskUserQuestion`). Source : `a034c14e` 22:38:13 ; `PLAN-VOYAGE.md` § Choix
  validés. Statut : en vigueur.

**D-027 — Voyager coûte du carburant**
- 2026-10-27 22:38. Alternative : juste du temps. Qui : Vincent. Source : idem. Statut : en
  vigueur.

**D-028 — Flottes pilotées comme dans un jeu de stratégie en temps réel**
- 2026-10-27 22:38. Choix (réponse libre de Vincent) : « oui rappel ou changement de cap possible
  / meme stationnement si on veux, comme ti c'etait une unité sur un plan 2d qui se deplace comme
  dans un rts ».
- Alternative : trajet figé. Qui : Vincent. Source : idem. Statut : en vigueur.

**D-029 — Interception possible en route**
- 2026-10-27 22:38. Alternative : combat seulement sur une planète. Qui : Vincent. Source : idem.
  Statut : en vigueur.

**D-030 — Ordres, réservoir, rencontre, vision**
- 2026-10-27 22:40. Choix : toucher des cases ; un réservoir par flotte ; à la rencontre,
  « ordre d'attaque ou possibilite d'echange de ressources » (pas de combat automatique) ;
  « portée de detection qui s'ameliore avec une recherche de detection ».
- Alternatives : point libre ; payé à chaque ordre ; combat automatique ; tout visible.
- Qui : Vincent. Source : `a034c14e` 22:40:16. Statut : en vigueur.

**D-031 — Échange, plein, panne, recherche de détection**
- 2026-10-27 22:44. Choix : échange par proposition + accord ; plein sur ses planètes, entre ses
  flottes sur une même case (transfert, fusion), ou par échange ; une flotte à sec reste bloquée
  et doit être secourue ; une technologie de détection par race.
- Alternatives : don simple ; ravitailleur ; avance au ralenti ; techno + bâtiment radar.
- Qui : Vincent. Source : `a034c14e` 22:44:47 ; `796e0ad` (détection). Statut : en vigueur.

**D-032 — Choix par défaut du voyage proposés par Claude**
- 2026-10-27 22:45 → 22:50. Choix : carburant = énergie ; on peut scinder une flotte ; combat
  calculé par l'attaquant (D-022) ; offre d'échange de 10 min.
- Qui : Claude, validé par Vincent : « Oui, fais le plan détaillé avec ces choix par défaut. »
  (22:50:37).
- Source : `a034c14e` ; `PLAN-VOYAGE.md` § Choix par défaut.
- Statut : en vigueur, sauf l'offre de 10 min, **remplacée par D-034**.

**D-033 — Ne pas corriger dans « swarm bug 1 » : envoyer le rapport à « swarm bug 2 »**
- 2026-10-27 22:42 → 2026-10-28 08:25. Claude proposait « Oui, corrige B1 et B3 » dans la même
  session.
- Choix : Vincent ne prend pas l'option et fait envoyer l'artefact « Playtest Astra » à la session
  « swarm bug 2 » (`3bf65a87`).
- Qui : Vincent. Source : `c0608c0a` 22:42:46, 08:25:30. Statut : appliquée.

**D-034 — Offre d'échange de 5 min, non annulable**
- 2026-10-27 22:57. Contexte : une annulation pourrait croiser un « oui » en route.
- Choix : offre de 5 min au lieu de 10, sans bouton annuler.
- Alternative : 10 min annulable.
- Qui : Claude ; Vincent enchaîne « code le lot 1 » sans objection.
- Source : `a034c14e` 22:57:08 ; `PLAN-VOYAGE.md` § 6. Statut : en vigueur (`OFFER_MS` 5 min).

**D-035 — Le voyage en 7 lots, commit et push après chaque lot**
- 2026-10-27 22:57. Choix : le jeu marche après chaque lot.
- Qui : Claude (plan), Vincent (validation lot par lot). Source : `PLAN-VOYAGE.md` § 9 ;
  commits `838eb25` → `a8a229d`. Statut : appliquée.

**D-036 — Limites acceptées du pair à pair**
- 2026-10-27 (lot 1). Choix : poursuite imprécise ; si A attaque B pendant que B attaque A, deux
  combats ; seuls les vaisseaux posés défendent une planète.
- Alternative : un arbitre (impossible sans serveur).
- Qui : Claude, sans objection. Source : `PLAN-VOYAGE.md` § Choix par défaut, § Risques ; README
  « Pas d'arbitre ». Statut : en vigueur, **modifiée par D-095** : une planète se défend aussi
  avec ses bâtiments (défense `fortOf`) ; une flotte en orbite ne défend toujours pas.

**D-037 — Test par une équipe de 8 robots qui trouvent sans réparer (« swarm bug 2 »)**
- 2026-10-27 23:29. Choix : 6 testeurs (économie, combat, flottes, règles, multi-node,
  multi-navigateur), 1 vérificateur, 1 synthèse ; on trouve, on ne répare pas ; scripts hors du
  dépôt.
- Qui : Claude (plan), Vincent (« Oui, lance les 8 agents. », 23:29:51).
- Source : `3bf65a87` 23:29:27. Statut : appliquée.

**D-038 — Consommation des machines doublée**
- 2026-10-27 23:54 (lot 7). Choix : portée de 30 cases gardée, consommation doublée ; un plein de
  5 chasseurs ≈ 3 min de production au lieu de 1,4.
- Qui : Claude sur simulation ; commité à la demande de Vincent.
- Source : `a8a229d` ; `GUIDE.md`. Statut : **modifiée par D-062** (+20 % d'autonomie des machines ;
  d'où le commentaire « 30 cases » devenu faux, voir [regles.md](architecture/regles.md) §18).

**D-039 — Le plein de carburant reste le défaut au décollage**
- 2026-10-27 23:57. Choix : toute l'énergie disponible par défaut.
- Alternative : plafonner à la moitié du stock (recommandé par Claude).
- Qui : Vincent : « Non, garde le plein par défaut comme maintenant. »
- Source : `a034c14e` 23:57:26. Statut : en vigueur. `PLAN-VOYAGE.md` § Bilan le dit encore
  « ouvert » : c'est périmé.

## 28 octobre 2026

**D-040 — Corriger seulement la cause racine CR-1, avec un test**
- 2026-10-28 08:10. Choix : corriger le pillage en double, en repartant de `main` à jour ; commit
  sans PR.
- Alternatives : tout corriger ; ouvrir une PR.
- Qui : Vincent. Source : `3bf65a87` 08:10:36, 08:10:55, 08:18:16 ; `da8147b`. Statut : appliquée.

**D-041 — Corriger les bugs encore présents du rapport « swarm bug 1 »**
- 2026-10-28 10:44. Choix : un commit par bug, directement sur `main`.
- Qui : Vincent. Source : `3bf65a87` 10:44:33 ; `4fe8d64`, `7d74d2a`, `e812b61`, `2ebe3fb`.
  Statut : appliquée.

**D-042 — Ce qui n'est pas corrigé après les rapports du 28 au matin**
- 2026-10-28 10:55. Non corrigé : équilibrage E1–E15 (« choix de jeu, c'est à toi de décider ») ;
  B2, B9, B10 (gros chantier, non confirmés) ; B5 (seuls les vaisseaux à quai défendent) ; B19
  (réécrire la fiche d'un autre : accepté « entre amis ») ; B7 (dépassement d'entrepôt borné) ;
  B15 non corrigé ; B18 non vérifié.
- Qui : Claude, sans objection (Vincent répond « Oui, pousse »).
- Source : `3bf65a87` 10:55:49. Statut : en vigueur ; une partie de l'équilibrage est reprise en
  D-060.

**D-043 — L'arbre des technologies sur une page à part**
- 2026-10-28 14:07. Choix : `technologies.html`, hors du jeu, qui lit les vraies données
  (`js/tech.js`).
- Alternative : dans le jeu. Qui : Vincent. Source : `24884c06` 14:07:26 ; `8bbd26b`. Statut : en
  vigueur.

**D-044 — Journal des ordres horodatés et moteur de rejeu**
- 2026-10-28 14:07. Contexte : le journal humain (40 lignes) ne permet pas de reconstruire une
  partie.
- Choix : noter chaque ordre dans la fiche du joueur + `js/replay.js` + un test.
- Alternatives : garder le journal humain ; se contenter de la sauvegarde.
- Qui : Vincent (« Oui, ajoute-le »). Source : `01be156b` 13:59:15, 14:07:56 ; `7f5fabe`.
  Statut : en vigueur.

**D-045 — Les ordres refusés sont aussi notés**
- 2026-10-28 14:13. Contexte : petites différences au rejeu (un refus fait avancer l'horloge de
  la planète).
- Alternative : ne noter que les ordres acceptés.
- Qui : Claude (défaut). Source : `01be156b` 14:13:54 ; code dans `7f5fabe` (le message de
  `f6ebbbb` le cite aussi, mais ce commit ne change pas ce code). Statut : en vigueur.

**D-046 — Découper les gros messages réseau en morceaux**
- 2026-10-28 14:15. Contexte : le journal grossit la fiche ; WebRTC limite un message à 256 Ko.
- Alternative : seulement limiter la taille du journal.
- Qui : Claude (défaut). Source : `01be156b` 14:15:04 ; `7f5fabe`. Statut : en vigueur.

**D-047 — Le replay sur une page à part (`replay.html`)**
- 2026-10-28 14:15. Raison : « pour ne rien risquer dans la partie en cours » ; bouton à
  l'accueil.
- Alternative : écran dans le jeu. Qui : Claude (défaut). Source : `01be156b` 14:15:57 ;
  `f6ebbbb`. Statut : en vigueur.

**D-048 — L'arbre des technologies est un vrai graphe, avec tout**
- 2026-10-28 14:24–14:30. Choix : bulles et flèches ; bâtiments, technologies, vaisseaux et
  pouvoirs.
- Alternative : colonnes de cartes (première version).
- Qui : Vincent (« j'aurais voulus un graph », « fait apparaintre tout dans les arbres… »).
- Source : `24884c06` 14:24:20, 14:30:52 ; `66b2876`. Statut : en vigueur.

**D-049 — Chaque entrée du journal sait ce que le joueur avait reçu des autres**
- 2026-10-28 14:28. Choix : chaque entrée note combien d'entrées des autres le joueur connaissait ;
  le rejeu redonne à chacun ce qu'il voyait.
- Alternative : supposer tout le monde connecté (cassait les tests).
- Qui : Claude (défaut). Source : `01be156b` 14:28:11–14:28:45 ; `69d687e`. Statut : en vigueur.

**D-050 — Journal plafonné à 1 500 entrées par joueur**
- 2026-10-28 14:28 / 14:31. Choix : ≈ 57 octets par entrée (≈ 85 Ko) ; au-delà, la partie ne se
  rejoue plus depuis le début ; les parties d'avant ne se rejouent pas (l'écran le dit).
- Alternative : journal sans limite.
- Qui : Claude (défaut). Source : `01be156b` 14:28:58, 14:31:13. Statut : en vigueur
  (`MAX_ORDERS = 1500`).

**D-051 — Fusionner `main` dans la branche avant de pousser**
- 2026-10-28 15:12. Contexte : `main` avait reçu l'arbre des technologies.
- Choix : merge `49b2156`, puis push. Alternative : rebase.
- Qui : Claude (défaut, outil `sync_with_base_branch`). Source : `01be156b` 15:12:05. Statut :
  appliquée.

**D-052 — Des icônes à la place des abréviations de ressources**
- 2026-10-28 17:43. Choix : icônes SVG minéraux, nourriture, énergie (puis habitants), couleur de
  la ressource, nom au survol ; carburant en toutes lettres.
- Qui : Vincent (demande) ; dessins et périmètre par Claude.
- Source : `7ab6169b` 17:46:51, 17:55:17 ; `061744b`. Statut : en vigueur (redessinées en D-064).

**D-053 — Un soleil central de taille aléatoire, traversable**
- 2026-10-28 17:56. Choix : 2×2, 3×3 ou 4×4, tiré depuis le code de la partie ; décalé d'une
  demi-case pour le 3×3 ; les flottes le traversent ; les planètes d'anciennes parties placées
  dessus sont déplacées.
- Proposé par Claude, sans réponse : faire bloquer le passage.
- Qui : Vincent (taille), Claude (défaut) pour le reste. Source : `7ab6169b` 17:59:05 ; `061744b`.
  Statut : en vigueur.

**D-054 — Climat selon la distance au soleil (premiers chiffres)**
- 2026-10-28 18:02. Demande : plus chaud près du centre, effet sur nourriture, minéraux, énergie.
- Choix : brûlant ×1,4 énergie ×1,2 minéraux ×0,6 nourriture ; tempéré ×1,0 / ×1,0 / ×1,3 ;
  glacé ×0,6 / ×0,8 / ×0,6.
- Qui : Claude (« Ces chiffres sont mon choix »). Source : `7ab6169b` 18:04:55. Statut :
  **remplacée par D-060** pour les chiffres (climat adouci).

**D-055 — Interface la plus condensée possible**
- 2026-10-28 18:15. Choix : cartes d'une ligne, description derrière ⓘ, textes courts,
  statistiques en icônes, aide de la carte derrière « ? » ; puis onglets Bâtiments / Recherche /
  Flottes, croix ✕ pour fermer, bulle d'aide au survol. Avant (17:53) : invitation par une icône
  dans un coin au lieu d'une fenêtre ouverte d'office.
- Qui : Vincent (demande) ; mise en forme par Claude.
- Source : `7ab6169b` 17:53, 18:20:28, 19:22:37 ; `061744b`. Statut : en vigueur ; l'icône
  d'invitation est **remplacée par D-071**.

**D-056 — Des places sur les planètes, et des mini-planètes**
- 2026-10-28 18:45. Choix : un niveau de bâtiment = une place ; 12–22 places ; astéroïdes et
  comètes de 4–8 places, colonisables mais pas comme départ.
- Qui : Vincent (demande) ; chiffres de Claude. Source : `7ab6169b` 19:03:45 ; `061744b`.
  Statut : **remplacée par D-058** pour les chiffres.

**D-057 — Ce qui reste non corrigé après le premier tour de bugs**
- 2026-10-28 19:03. Non corrigé : un tricheur peut inventer un combat dans sa fiche ou mentir dans
  un échange (signer les fiches = « gros chantier ») ; plusieurs attaquants qui ne se voient pas
  peuvent piller plus que le stock ; déficit d'énergie des humains loin du soleil laissé à Vincent.
- Qui : Claude (défaut), pas de réponse de Vincent. Source : `7ab6169b` 19:03:45. Statut : en
  vigueur ; le cas « échange accepté plus de 30 min après » est **corrigé par D-061**.

**D-058 — Places revues**
- 2026-10-28 19:32. Contexte : une colonie humaine sur petite comète n'avait aucune place libre.
- Choix : planètes 14–22, astéroïdes 7–10, comètes 6–8 (avec minéraux) ; places calculées depuis
  la carte, pas depuis la fiche (anti-triche) ; niveaux négatifs ignorés ; tirage uniforme.
- Qui : Claude, d'après un robot. Source : `7ab6169b` 19:32:33, 19:35:49 ; `061744b`. Statut : en
  vigueur.

**D-059 — Limites d'affichage défensives**
- 2026-10-28 19:35. Choix : noms à 16 caractères ; couleurs de joueur filtrées ; gros nombres
  abrégés (« 118 k ») ; Échap ou fond pour fermer toute fenêtre ; boutons à icône nommés pour les
  lecteurs d'écran.
- Qui : Claude, d'après un robot. Source : `7ab6169b` 19:35:49. Statut : en vigueur.

**D-060 — Équilibrage des races (deuxième tour)**
- 2026-10-28 19:41. Constat d'un robot : après 2–4 h, sol vide et même production pour tous ; on
  gagnait au score avec seulement des entrepôts.
- Choix : gisements ×10 (quantité et repousse, nouvelles parties) ; entrepôts retirés du score ;
  humains renforcés (mine 30 → 36, impôt 0,2 → 0,4 minéral par habitant) ; climat adouci (énergie
  ×0,8–×1,2, minéraux ×0,9–×1,1) ; pouvoirs aliens (arrachement 60 → 40, transe 40 → 25 par
  psionique) ; la transe refuse un sol vide.
- Qui : Claude. Il avait dit (19:22) qu'il montrerait les chiffres avant, « car c'est une question
  de goût de jeu », puis les a appliqués (19:41) en les jugeant « vrais problèmes de jeu ».
  Validation par Vincent seulement implicite (commit + PR #1) : **non confirmé** comme accord
  explicite.
- Source : `7ab6169b` 19:22:37, 19:41:56, 19:43:16 ; `061744b`. Statut : en vigueur.

**D-061 — Règles anti-triche et tolérance d'horloge**
- 2026-10-28 19:48–19:54. Choix : deux combats sont « le même » seulement si aucun rapport ne
  connaissait l'autre ; une planète de départ datée d'avant une fiche qui ne la montrait pas est
  refusée (remplace la règle des 30 min) ; avance d'horloge tolérée 10 min → 1 jour ; échange
  accepté très en retard conclu après coup depuis la planète mère.
- Qui : Claude. Source : `7ab6169b` 19:48:15, 19:54:37 ; `061744b`. Statut : en vigueur (voir
  `recordOk`, `backdated` dans [reseau.md](architecture/reseau.md)).

**D-062 — Pas d'attaque sans armes, pillage limité, coûts des vaisseaux**
- 2026-10-28 19:55. Constat : des cargos sans armes vidaient une planète sans défense (97 % en
  5 attaques).
- Choix : une flotte sans armes ne peut pas attaquer ni gagner un 0 contre 0 ; une planète n'est
  pillée qu'une fois toutes les 2 minutes ; frégate humaine 200 → 150 minéraux + 50 énergie ; cargo
  humain 150 → 110 + 40 énergie ; croiseur 700 → 470 + 180 énergie ; drone machine 110 + 50 → 90 +
  40 énergie ; léviathan 1000 + 300 nourriture → 900 + 270 ; machines +20 % d'autonomie.
- Laissé à Vincent (non tranché) : une flotte en orbite de sa propre planète ne la défend pas ;
  une planète sans vaisseau posé n'a aucune défense ; humains encore un peu en retard.
- Qui : Claude. Source : `7ab6169b` 19:55:11, 19:58:27 ; `061744b`. Statut : en vigueur.

**D-063 — Un seul commit et une PR pour la session des icônes (PR #1)**
- 2026-10-28 21:11. Claude proposait « commit + PR » à chaque fin de tour ; Vincent a attendu la
  fin.
- Choix : un commit `061744b`, branche poussée, [VincentBee/astra#1](https://github.com/VincentBee/astra/pull/1).
  Fusionnée par Vincent sur GitHub à 21:14:24 (`gh pr view 1` : mergedBy VincentBee ; merge
  `9ec0e0c`).
- Qui : Vincent. Source : `7ab6169b` 21:11:00, 21:12:39. Statut : appliquée (seule PR du projet).

**D-064 — Icônes SVG maison, chacune avec un nom**
- 2026-10-28 21:42–21:46. Demande : design « plus minimaliste, plus carré, moins d'arrondi, plus
  d'icônes, moins de texte ».
- Choix : `js/icons.js` ; chaque icône garde un nom (infobulle et lecteur d'écran) ; angles droits.
- Alternatives : emojis seuls ; garder les textes.
- Qui : Vincent (style), Claude (défaut) pour la mise en œuvre. Source : `f4afbcd0` 21:42:26,
  21:46:28 ; `1eeb2c1`. Statut : en vigueur.

**D-065 — Les questions d'explication vont dans des sessions filles en lecture seule**
- 2026-10-28 21:45 et 22:33. Choix : sessions `f278ecb8` et `a090eacb`, modèle Sonnet, sans
  worktree ; la session mère continue le design.
- Qui : Vincent (« dans un thread ») ; modalités par Claude. Source : `f4afbcd0` 21:45:03,
  21:45:16, 22:33:15, 22:33:22. Statut : façon de travailler.

**D-066 — Historique des 10 dernières parties, sans confirmation avant « Créer »**
- 2026-10-28 21:47. Choix : plus de « appuie encore une fois » ; l'ancienne partie va dans
  l'historique (reprendre, revoir, oublier) ; l'identité du joueur est gardée par partie.
- Qui : Vincent (demande) ; le nombre 10 et les boutons par Claude.
- Source : `f4afbcd0` 21:47:41, 21:50:00 ; `1eeb2c1`. Statut : en vigueur (`KEEP = 10`).

**D-067 — Parallaxe : pas au doigt, mais à l'accéléromètre**
- 2026-10-28 22:15–22:16. Choix : le glissé du doigt ne bouge pas les étoiles (sinon elles
  sautent à chaque tap) ; parallaxe par l'accéléromètre.
- Alternative : suivre le doigt. Qui : Claude (recommandation), Vincent choisit l'accéléromètre.
- Source : `f4afbcd0` 22:15:19, 22:16:01 ; `1eeb2c1`. Statut : en vigueur.

**D-068 — Accéléromètre sur iPhone**
- 2026-10-28 22:17. Choix : autorisation « Mouvement » au premier tap ; position de repos qui
  s'adapte ; mouvement lissé ; fond fixe si « réduire les animations ».
- Qui : Claude (défaut). Testé avec des événements simulés seulement (**non confirmé** sur un vrai
  iPhone). Source : `f4afbcd0` 22:15:08, 22:17:00. Statut : en vigueur.

**D-069 — Choix de race par icônes, Humains par défaut**
- 2026-10-28 22:21. Choix : 3 icônes, une seule fiche visible (Humains d'abord), « Choix
  définitif » retiré, bouton « Commencer la partie » / « Rejoindre la partie ».
- Qui : Vincent (demande) ; défaut Humains par Claude. Source : `f4afbcd0` 22:19:37, 22:21:39.
  Statut : en vigueur.

**D-070 — « Biomasse » sur la planète, « Nourriture » chez le joueur**
- 2026-10-28 22:37. Alternative : un seul nom partout. Qui : Vincent. Source : `f4afbcd0`
  22:37:46, 22:38:13. Statut : en vigueur.

**D-071 — Une fenêtre « Joueurs » ouverte par le compteur 👥**
- 2026-10-28 22:40. Choix : en ligne + latence, « Inviter un joueur », classement ; la liste sous
  la carte et le bouton d'invitation de la barre sont retirés.
- Qui : Vincent (demande) ; suppressions par Claude. Source : `f4afbcd0` 22:40:01, 22:41:20.
  Statut : en vigueur.

**D-072 — Atténuer ce qu'on ne peut pas toucher sur la carte**
- 2026-10-28 22:46. Choix : étoiles de fond et quadrillage atténués ; astéroïdes et comètes
  laissés (on peut les sélectionner).
- Qui : Claude (défaut). Source : `f4afbcd0` 22:46:39. Statut : en vigueur.

**D-073 — Blocs collants de l'écran planète**
- 2026-10-28 22:58 → 23:03. Choix : empilement mesuré en JS ; au défilement, le nom puis les
  gisements sont recouverts ; à la fin restent stocks + onglets.
- Alternative : tout garder visible (≈ 340 px sur 812). Qui : Vincent. Source : `f4afbcd0`
  22:57:41, 23:01:14, 23:02:59, 23:03:50. Statut : en vigueur.

**D-074 — Onglet « Pouvoirs » pour les Aliens seulement**
- 2026-10-28 23:03. Alternative : pouvoirs mélangés aux bâtiments. Qui : Vincent. Source :
  `f4afbcd0` 23:01:56, 23:03:50. Statut : en vigueur.

**D-075 — Plus de barre du haut**
- 2026-10-28 23:08. Choix : seul 👥 reste, à droite de la ligne en dessous. Conséquence acceptée
  de fait : nom et race du joueur ne sont plus affichés à l'écran de jeu (Claude a demandé s'il
  fallait les remettre, sans réponse).
- Qui : Vincent. Source : `f4afbcd0` 23:08:20, 23:08:54. Statut : en vigueur.

**D-076 — Un seul commit pour tout le design**
- 2026-10-28 23:14. Choix : un commit `1eeb2c1`, message en français ; version du cache hors ligne
  augmentée pour que les téléphones se mettent à jour.
- Qui : Claude (défaut). Source : `f4afbcd0` 23:14:35. Statut : appliquée.

## 29 octobre 2026

**D-077 — Évaluer le rythme du jeu avec 4 robots**
- 2026-10-29 06:19. Choix : sim-robots, courbes, interactions, contradicteur ; dépôt en lecture
  seule.
- Qui : Vincent (« Oui, lance ») ; composition par Claude. Source : `26f178b9` 06:19:53, 06:20:09.
  Statut : appliquée (rapport `RAPPORT-RYTHME.md`, non commité).

**D-078 — Une partie dure 20 à 40 minutes, sans temps mort à la fin**
- 2026-10-29 06:43. Question de Claude (06:39) : commencer les changements ou fixer la durée ?
- Choix de Vincent : « il faudrait qu'une partie dure entre 20min et 40min, qu'il n'y ait pas de
  temps mort, surtout à la fin ».
- Alternative écartée : parties de plusieurs heures ou jours.
- Mise en œuvre par Claude (06:44–06:56) : facteur `TEMPO = 2.5` dans `js/tech.js` ; colonisation
  au labo 2, coûts divisés par 2 ; score de tout l'empire ; fin de partie `GOAL = { points: 220,
  capMs: 40 min }` dans `js/game.js` (d'abord 400 points) ; `tests/end.test.mjs`.
- Source : `26f178b9` 06:43:57 → 06:56:28.
- Statut : en vigueur (objectif). Mise en œuvre commitée en `9b37782` (branche
  `claude/swarm-it-game-pacing-1d4502`), détaillée en D-083 à D-097 (numéros décalés d’un cran à la fusion avec `main`, où D-082 était déjà pris). La fin par points
  (`GOAL`) est remplacée par le froid : voir D-086 → D-088. « Pas de temps mort à la fin »
  reste **non confirmé** : les robots de simulation ne se battent pas (D-090).

**D-079 — Noter chaque demande et chaque décision dans `docs/`, règle dans `CLAUDE.md`**
- 2026-10-29 06:35. Demande : « je voudrais que le projet soit documenté entierement, que chaque
  demande et decision qui ont ete prise et qui le seront dans l'avenir soient ecrite dans le
  projet ».
- Choix : `docs/historique/journal.md` (demandes), `docs/decisions.md` (ce fichier),
  `docs/architecture/` (code) ; règle permanente dans `CLAUDE.md` à la racine : noter dans le même
  commit que le changement.
- Alternatives : rien de proposé ; on aurait pu tout mettre dans le README.
- Qui : Vincent (demande) ; structure par Claude. Source : `1df29e6e` 06:35:38. Statut : en vigueur.

**D-080 — Documenter avec une équipe de 8 sessions qui se contre-vérifient**
- 2026-10-29 06:38. Choix : 3 sessions relisent les transcripts, 3 documentent le code, 1 vérifie
  (cherche à réfuter), 1 assemble ; les brouillons restent hors du dépôt.
- Qui : Claude (plan `/swarm-it`), Vincent (« Oui, lance », 06:38:21). Source : `1df29e6e`.
  Statut : appliquée.

**D-081 — Les heures de la doc sont en UTC**
- 2026-10-29. Contexte : `git log` mélange `+0000` et `+0100` ; les transcripts sont en UTC.
- Choix : tout en UTC, dit en tête des fichiers.
- Alternative : heure de Paris. Qui : Claude (défaut, proposé par la session de vérification).
  Statut : en vigueur.

**D-082 — Chaque décision a un test, ou une raison de ne pas en avoir**
- 2026-10-29 07:35. Demande : « je voudrais m'assurer que les tests unitaires couvrent toutes les
  décisions qui ont été prises ».
- Choix : un tableau [architecture/tests-decisions.md](architecture/tests-decisions.md) donne,
  pour chaque D-xxx, le test qui la protège ou la raison (remplacée, en cours, méthode,
  navigateur seulement). Les nouveaux tests vont dans `tests/decisions-<domaine>.test.mjs`, leur
  nom commence par le numéro de la décision, et ils vérifient **ce que dit la doc**, pas ce que
  fait le code. Chaque test est contrôlé par mutation (on casse la règle, le test doit échouer).
  Un écart doc ≠ code est signalé, pas corrigé dans les tests.
- Méthode : 3 sessions `/swarm-it` par domaine (Vincent : « fait une version 3 sessions », au lieu
  des 5 proposées) ; le coordinateur a intégré et refait 7 mutations lui-même.
- Alternatives : 5 ou 8 sessions (vérificateur et intégrateur à part) ; ranger les tests dans les
  fichiers existants.
- Qui : Vincent (demande, nombre de sessions) ; méthode et rangement par Claude (défaut).
  Source : `a961aeb5` 07:35:40 → 08:43:08. Statut : en vigueur.

**D-083 — Un seul réglage de vitesse : `TEMPO = 2.5`**
- 2026-10-29 06:44. Contexte : la production suit `SPEED`, mais les durées (chantiers,
  recherches, vaisseaux, trajets, pouvoirs, pillage) sont écrites en millisecondes ; n'accélérer
  que `SPEED` aurait rendu les chantiers dominants.
- Choix : `TEMPO` dans `js/tech.js` ; `SPEED = 60 × TEMPO` ; toutes ces durées divisées par
  `TEMPO` ; pas d'intégration à 2 h de jeu ; `MIN_TRIP` 5 s → 2 s ; débits affichés × `TEMPO`.
  Les délais d'échange restent en temps humain.
- Alternatives : augmenter `SPEED` seul ; baisser les coûts (mesuré : avance la fin, D-077).
- Qui : Claude (après avis du conseiller). Source : `26f178b9`. Statut : en vigueur (`9b37782`).

**D-084 — Coloniser plus tôt : labo 2, technologie à moitié prix, colonisateur ×0,6**
- 2026-10-29 06:52. Contexte : creux entre « planète mère pleine » et 1ʳᵉ colonie (D-077).
- Choix : réglage testé par l'agent contradicteur (1ʳᵉ colonie à 31-34 min au lieu de 45, au
  tempo d'origine).
- Alternatives : plus de places, revenu de base plus haut (presque sans effet).
- Qui : Claude. Statut : en vigueur (`9b37782`).

**D-085 — Le score compte tout l'empire**
- 2026-10-29 06:55. Contexte : `score` ne comptait que les bâtiments de la planète mère ;
  coloniser ou s'armer ne rapportait rien.
- Choix : `empireScore` = bâtiments de toutes les planètes (hors entrepôts) + recherches +
  vaisseaux, / 100.
- Qui : Claude. Statut : en vigueur ; ne décide plus la victoire, seulement les égalités (D-088).

**D-086 — Fin par course : premier à 220 points, sinon le meilleur à 40 min** — remplacée par D-088
- 2026-10-29 06:56. Choix de Claude (400 points, puis 220 après simulation : fin à 29-31 min).
- Alternative proposée à Vincent : un chrono fixe.
- Statut : **remplacée par D-088** à 07:01 (« le chrono est une mauvaise idée »). `GOAL` retiré
  du code avant le commit.

**D-087 — Les parties d'avant la course n'ont ni fin ni froid**
- 2026-10-29 06:59. Contexte : avec la fin à 40 min après la première installation, toutes les
  vieilles sauvegardes auraient fini dès leur ouverture.
- Choix : champ `since` écrit à l'installation ; sans `since`, pas de course.
- Qui : Claude (signalé par le conseiller). Statut : en vigueur.

**D-088 — Le soleil s'éteint : le froid se resserre du bord vers le soleil**
- 2026-10-29 07:01-07:05. Demande : « il faudrait un mechanisme qui force la fin, comme dans
  PUBG avec la map qui se reduit ». Claude propose le soleil qui gonfle ; Vincent : « elle
  pousse les joueurs sur le bord de la map. Et ne les force pas à se combattre ». Claude propose
  alors le froid du bord vers le centre.
- Choix : une planète que le froid atteint est perdue ; la zone vivable rétrécit vers le soleil.
- Alternatives écartées : chrono (D-086), soleil qui gonfle, bord qui se referme (nébuleuse),
  galaxie qui s'épuise, merveille à construire.
- Qui : Vincent (direction), Claude (règle). Statut : en vigueur (`9b37782`).

**D-089 — Sans planète, éliminé ; le dernier en vie gagne ; une colonie remplace la planète mère**
- 2026-10-29 07:07. Question de Claude : peut-on prendre la planète mère ? Réponse de Vincent :
  « a » (oui, élimination possible).
- Choix : la plus vieille colonie en vie devient planète mère ; sans colonie, `out` ; fin quand
  il reste un joueur en vie (seul : quand le froid a tout pris) ; égalité au meilleur score.
- Alternative écartée : B, seules les colonies se prennent.
- Qui : Vincent. Statut : en vigueur.

**D-090 — Réglage du froid : départ 12 min, durée 24 min, `ease` 2**
- 2026-10-29 07:40. Mesure avec les robots (qui fuient vers le soleil, sans se battre) :
  froid linéaire → les machines gèlent vers 19-21 min avant d'avoir colonisé ; `ease` 2 →
  toutes les races colonisent, fin à 30-35 min.
- Limite : de 30 à 35 min, les robots ont 0 à 1,8 action/min ; l'activité de fin repose sur le
  combat, **non mesuré**.
- Qui : Claude. Statut : en vigueur, à recalibrer en jouant.

**D-091 — Prendre une planète en gagnant avec un colonisateur** — remplacée par D-092
- 2026-10-29 07:10. Choix de Claude. Remplacée à 07:51 : « c'est absurde de pouvoir la prendre
  avec un colonisateur ».

**D-092 — Conquête par le combat : ordre « Conquérir »**
- 2026-10-29 07:51. Demande : « La conquête d'une planète ennemie doit se faire via un combat
  avec des vaisseaux d'attaque. »
- Choix : ordre `conquer` à côté d'`attack` ; il faut battre les vaisseaux posés et la défense
  de la planète ; la planète est rebâtie à neuf pour la race du vainqueur.
- Alternative écartée : conquête automatique à chaque attaque gagnée (on n'aurait plus pu
  seulement piller).
- Qui : Vincent (règle), Claude (ordre séparé). Statut : en vigueur (`9b37782`).

**D-093 — Bâtiments de défense par race**
- 2026-10-29 08:45. Demande : « rajoute des batiments de defences comme des bouclier ou des
  canons de defences ? differencs sur chaque race ».
- Choix : humains canons ⚔ 12 ◇ 40 et bouclier ◇ 150 ; machines tourelles ⚔ 18 ◇ 15 et
  blindage ◇ 90, moins chers ; aliens épines ⚔ 8 + 1/psionique ◇ 60 et dôme ◇ 260. Les autres
  bâtiments donnent ⚔ 2 ◇ 20 par niveau.
- Qui : Vincent (demande), Claude (valeurs). Statut : en vigueur, **valeurs non équilibrées**.

**D-094 — Les défenses prennent une place par niveau**
- 2026-10-29 08:45. Choix par défaut de Claude, expliqué à Vincent à 08:50 (pas contesté) :
  défendre, c'est moins produire.
- Alternative : défenses hors du compte des places. Statut : en vigueur.

**D-095 — La défense compte aussi contre le pillage, et se répare entre deux assauts**
- 2026-10-29 08:45. Choix de Claude : un seul combat (vaisseaux + défense) pour « Attaquer » et
  « Conquérir » ; la défense repart entière à chaque combat.
- Alternative écartée : la défense seulement contre la conquête.
- Statut : en vigueur.

**D-096 — Déconstruire un bâtiment**
- 2026-10-29 08:51. Demande : « il faut pouvoir deconstruire un batiment ».
- Choix : un niveau à la fois, dans le chantier, moitié du temps de construction, moitié du prix
  rendue tout de suite, place libérée à la fin ; bouton dans la carte dépliée, avec confirmation.
- Alternatives : rembourser tout, ou rien ; déconstruire instantanément.
- Qui : Vincent (demande), Claude (règle). Statut : en vigueur.

**D-097 — `FORMAT` 8 et cache `astra-p2p-v52`**
- 2026-10-29. Choix de Claude : nouveaux champs de fiche (`since`, `out`, `over`, `capture`,
  `demolish`) ; un téléphone resté sur l'ancienne version est invité à recharger.
- Statut : en vigueur.

---

## Annexe A — affirmations réfutées (retirées ou corrigées avant assemblage)

Ces affirmations des brouillons étaient fausses. Cinq ont été réfutées par la session de
vérification ; deux par une relecture croisée entre auteurs (code-regles, hist-c).
Leurs auteurs les ont corrigées ; elles ne figurent pas dans la doc sous leur forme fausse.

| Affirmation fausse (brouillon) | Preuve | Ce qui est retenu |
|---|---|---|
| `26f178b9` se termine sans réponse : durée de partie non tranchée (hist-a) | `26f178b9` 2026-10-29 06:43:57 : réponse de Vincent « entre 20min et 40min » | D-078 |
| Merge de la PR #1 par Vincent : déduit, non vu (hist-a, hist-c) | `gh pr view 1` : mergedBy VincentBee, 21:14:24 | D-063 (prouvé) |
| Les ordres refusés sont notés dans `f6ebbbb` (hist-b) | `git show 7f5fabe -- js/session.js` ajoute la ligne ; `f6ebbbb` ne la contient pas | D-045 (`7f5fabe`) |
| `26f178b9` = lancement de cette documentation (hist-c) | `26f178b9` = rythme (06:19:06) ; la doc = `1df29e6e` (06:35:38) | D-077, D-079 |
| `usePower` refuse aussi la transe quand l'entrepôt est plein (code-regles) | `js/game.js:732-734` : l'entrepôt plein bloque seulement l'arrachement | [regles.md](architecture/regles.md) §6 |
| Le commentaire « 3×3 décalé d'une demi-case » de `js/game.js` est périmé (session fille `a090eacb`, via hist-b) | soleil 3×3 sur les cases 8 à 10, centre 9,5 (vérifié par code-regles) | le commentaire est juste |
| `da8147b` à 07:18Z, avant son propre swarm (hist-b) | erreur de fuseau : `da8147b` = 08:18:21Z | journal du 28/10 |

## Annexe B — correspondance avec les numéros des brouillons

Les brouillons (hors dépôt, `~/.claude/swarm-runs/doc-astra-2026-10-29/drafts/`) avaient leurs
propres numéros. Attention : `D-C1`/`D-C2` de hist-a ≠ `D-C01`/`D-C02` de hist-c.

| Final | Brouillon(s) | Final | Brouillon(s) | Final | Brouillon(s) |
|---|---|---|---|---|---|
| D-001 | hist-c D-C01 | D-028 | hist-c D-C12 | D-055 | hist-a D-B4 (+ B2) |
| D-002 | hist-c D-C02 | D-029 | hist-c D-C13 | D-056 | hist-a D-B5 |
| D-003 | hist-c D-C03 | D-030 | hist-c D-C14 | D-057 | hist-a D-B6 |
| D-004 | hist-c D-C04 | D-031 | hist-c D-C15 | D-058 | hist-a D-B7 |
| D-005 | hist-c D-C05 | D-032 | hist-c D-C16 | D-059 | hist-a D-B8 |
| D-006 | hist-c D-C06 | D-033 | hist-b DB-03 | D-060 | hist-a D-B9 |
| D-007 | hist-c D-C07 | D-034 | hist-c D-C17 | D-061 | hist-a D-B10 |
| D-008 | hist-c D-C08 | D-035 | hist-c D-C18 | D-062 | hist-a D-B11 |
| D-009 | hist-c D-C09 | D-036 | hist-c D-C19 | D-063 | hist-a D-B12 |
| D-010 | hist-c D-C09b | D-037 | hist-c D-C21 | D-064 | hist-b DB-13 |
| D-011 | hist-c D-C09c | D-038 | hist-c D-C19b | D-065 | hist-b DB-12 |
| D-012 | hist-c D-C09d | D-039 | hist-c D-C20 | D-066 | hist-b DB-14 |
| D-013 | hist-a D-A9 (ligne), hist-b DB-01, hist-c D-C28 | D-040 | hist-c D-C22 | D-067 | hist-b DB-15 |
| D-014 | hist-a D-A1 | D-041 | hist-c D-C23 | D-068 | hist-b DB-16 |
| D-015 | hist-a D-A2 | D-042 | hist-c D-C24 | D-069 | hist-b DB-17 |
| D-016 | hist-a D-A3 | D-043 | hist-c D-C25 | D-070 | hist-b DB-18 |
| D-017 | hist-a A6 (demande) | D-044 | hist-b DB-04 | D-071 | hist-b DB-19 |
| D-018 | hist-a D-A9 | D-045 | hist-b DB-05 | D-072 | hist-b DB-20 |
| D-019 | hist-a D-A4 | D-046 | hist-b DB-06 | D-073 | hist-b DB-21 |
| D-020 | hist-a D-A5 | D-047 | hist-b DB-07 | D-074 | hist-b DB-22 |
| D-021 | hist-a D-A6 | D-048 | hist-c D-C26 | D-075 | hist-b DB-23 |
| D-022 | hist-a D-A7, hist-c D-C16 (partie) | D-049 | hist-b DB-08 | D-076 | hist-b DB-24 |
| D-023 | hist-a D-A8, hist-b DB-10, hist-c D-C27 | D-050 | hist-b DB-09 | D-077 | hist-a D-C1 |
| D-024 | hist-b DB-02 | D-051 | hist-b DB-11 | D-078 | hist-a D-C2 |
| D-025 | hist-c D-C29 | D-052 | hist-a D-B1 | D-079 | demande du 29/10 (coordinateur) |
| D-026 | hist-c D-C10 | D-053 | hist-a D-B2 | D-080 | plan `1df29e6e` |
| D-027 | hist-c D-C11 | D-054 | hist-a D-B3 | D-081 | verif (fuseaux) |
