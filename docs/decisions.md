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
- Statut : en vigueur, sauf la régénération, **modifiée par D-060** (gisements ×10), et le journal
  en console, **modifié par D-110** (journal visible dans le jeu ; la console n'en garde qu'une
  copie pour déboguer).

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
  avec `git show`). **Modifiée par D-098** (2026-10-30) : la recherche n'est plus réservée à la
  planète mère.

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
- Source : `f4afbcd0` 22:15:19, 22:16:01 ; `1eeb2c1`. Statut : remplacée par D-137 (plus de parallaxe).

**D-068 — Accéléromètre sur iPhone**
- 2026-10-28 22:17. Choix : autorisation « Mouvement » au premier tap ; position de repos qui
  s'adapte ; mouvement lissé ; fond fixe si « réduire les animations » (modifiée par D-112 :
  ce fond fixe est désormais une seule image, et chacun peut le choisir).
- Qui : Claude (défaut). Testé avec des événements simulés seulement (**non confirmé** sur un vrai
  iPhone). Source : `f4afbcd0` 22:15:08, 22:17:00. Statut : remplacée par D-137 (plus de parallaxe,
  plus d'accéléromètre).

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

**D-087 — Les parties d'avant la course n'ont ni fin ni froid** — modifiée par D-120
- 2026-10-29 06:59. Contexte : avec la fin à 40 min après la première installation, toutes les
  vieilles sauvegardes auraient fini dès leur ouverture.
- Choix : champ `since` écrit à l'installation ; sans `since`, pas de course.
- Qui : Claude (signalé par le conseiller). Statut : modifiée par D-120 (2026-10-31) : la course
  part au départ commun (`go`) ; `since` est écrit quand la flotte de départ apparaît. Une partie
  sans `go` ni `since` n'a toujours ni fin ni froid.

**D-088 — Le soleil s'éteint : le froid se resserre du bord vers le soleil**
- 2026-10-29 07:01-07:05. Demande : « il faudrait un mechanisme qui force la fin, comme dans
  PUBG avec la map qui se reduit ». Claude propose le soleil qui gonfle ; Vincent : « elle
  pousse les joueurs sur le bord de la map. Et ne les force pas à se combattre ». Claude propose
  alors le froid du bord vers le centre.
- Choix : une planète que le froid atteint est perdue ; la zone vivable rétrécit vers le soleil.
- Alternatives écartées : chrono (D-086), soleil qui gonfle, bord qui se referme (nébuleuse),
  galaxie qui s'épuise, merveille à construire.
- Qui : Vincent (direction), Claude (règle). Statut : en vigueur (`9b37782`).

**D-089 — Sans planète, éliminé ; le dernier en vie gagne ; une colonie remplace la planète mère** — modifiée par D-120 (un joueur qui n'a pas encore fondé sa planète reste en vie tant qu'il a un colonisateur) et par D-142 (seul et éliminé : personne ne gagne)
- 2026-10-29 07:07. Question de Claude : peut-on prendre la planète mère ? Réponse de Vincent :
  « a » (oui, élimination possible).
- Choix : la plus vieille colonie en vie devient planète mère ; sans colonie, `out` ; fin quand
  il reste un joueur en vie (seul : quand le froid a tout pris) ; égalité au meilleur score.
- Alternative écartée : B, seules les colonies se prennent.
- Qui : Vincent. Statut : en vigueur, modifiée par D-102 (départage d'une mort simultanée).

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
- Qui : Vincent (règle), Claude (ordre séparé). Statut : en vigueur (`9b37782`), modifiée par D-200 (à l'arrivée, la cible est le propriétaire actuel de la case).

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

**D-098 — Recherche sur toute planète qui a un labo**
- 2026-10-30 10:29. Demande : « ce doit etre possible de faire une recherche sur n'importe quel
  planet avec un labo, en accord avec le niveau du labo ». Modifie D-021 (planète mère seulement).
- Choix : chaque planète avec un labo lance ses recherches ; les prérequis de labo et la durée
  viennent du labo de cette planète, le prix est payé par son stock. Une recherche à la fois par
  planète, et pas la même technologie sur deux planètes à la fois. Une technologie trouvée vaut
  pour tout l'empire (la planète mère la reçoit, puis toutes les colonies).
- Alternatives écartées : une seule recherche à la fois pour tout l'empire ; refuser la recherche
  en colonie et seulement l'expliquer à l'écran.
- Qui : Vincent (règle) ; Claude (une recherche par planète, même technologie interdite en
  double). Pas de nouveau `FORMAT` (le champ `research` existait déjà sur chaque planète) ; cache
  `astra-p2p-v53`.
- Source : session `defa0982`. Statut : en vigueur.

**D-099 — Des recherches humaines coûtent aussi de la nourriture**
- 2026-10-30 10:53. Demande : « Certaines recherches devraient couter de la nouriture aussi ».
  Session `074fcd56`.
- Choix : chez les humains, **Agronomie** coûte 120 minéraux + 40 nourriture (au niveau 1) et
  **Arches coloniales** 400 minéraux + 120 nourriture. Les deux touchent aux vivres et aux colons.
  Les aliens payaient déjà leurs recherches en nourriture ; les machines n'en ont pas, rien ne
  change pour elles. La nourriture compte dans la durée de recherche (un peu plus longue).
  Cache `astra-p2p-v56` (v53 à v55 pris par D-098, D-100 et D-101).
- Alternatives écartées : de la nourriture sur toutes les recherches humaines ; en ajouter aux
  machines (elles n'en produisent pas).
- Qui : Vincent (demande), Claude (lesquelles et combien). Statut : en vigueur.

**D-100 — Comportement en voyage : passif ou agressif**
- 2026-10-30 10:59. Demande : « Avoir des comportement de voyage: passif, agressif ».
- Choix (Claude, par défaut) : un champ `stance` par flotte, à part de l'ordre (une flotte qui
  va se poser peut être agressive). **Passive** (au décollage, à la scission, et pour les
  flottes d'avant) : ne combat que sur ordre, comme avant. **Agressive** : à chaque passage,
  combat la flotte ennemie visible la plus proche **au contact** (`CONTACT` = 0,5 case, la règle
  de la poursuite), en route comme à l'arrêt (une flotte arrêtée garde sa case), puis **reprend
  son trajet et son ordre**. Refusé pour une flotte sans armes. Une fusion garde le
  comportement de la flotte qui reçoit. Elle n'attaque ni planètes ni vaisseaux posés : ça reste
  « Attaquer » / « Conquérir ».
- Alternatives écartées : poursuivre toute flotte ennemie vue dans le rayon de détection (plus
  proche de ce qu'on attend d'« agressif », mais elle quitterait sa route ; suite possible) ;
  s'arrêter après le combat comme la poursuite ; un mode « fuite » pour la flotte passive.
- Limite **non confirmée** : comme la poursuite, le contact n'est regardé qu'à l'heure du
  passage ; un téléphone en arrière-plan (passages ralentis) peut laisser deux flottes se
  croiser sans combat.
- Pas de nouveau `FORMAT` : un téléphone d'avant ignore le champ (ses flottes restent
  passives) ; cache `astra-p2p-v54` (D-098 avait pris v53 ; D-099 est pris par la recette, pas encore fusionnée).
- Qui : Vincent (demande), Claude (règle). Statut : en vigueur.

**D-101 — Vitesse de flotte = vaisseau le plus lent, affichée au joueur**
- 2026-10-30 10:54. Demande : « Notion de rapidite de flotte avec le vaiseau le plus lent ».
- Contexte : la règle existait déjà dans le code (`fleetSpeed`, héritée du portage, D-002), mais le
  joueur ne voyait ni la vitesse de sa flotte ni le vaisseau qui la freine.
- Choix : garder la règle ; l'afficher à l'écran de décollage (« Vitesse 7,0 cases/min, celle du
  plus lent : Colonisateur ») et dans la fiche de flotte ; test dédié ; cache `astra-p2p-v55`.
- Alternatives écartées : vitesse moyenne pondérée ; vaisseaux rapides qui partent devant
  (la flotte se scinderait d'elle-même).
- Qui : Vincent (demande), Claude (affichage, maintien de la règle). Statut : en vigueur.

**D-102 — Points : ce que le joueur a maintenant ; mort simultanée départagée par les points d'avant la chute** (modifie D-089)
- 2026-10-30 11:47. Constat : quand les derniers joueurs gèlent à la même seconde, le vainqueur
  était tiré par l'ordre des identifiants (tous à 0 point), et pas « au meilleur score » (D-089).
  Demande : « il faut que les points reflete ce que le joueur possede a un instant T Si on détruit
  tout ce que le joueur possède, alors il retombe à 0 points ».
- Choix : `scoreOf` reste ce que le joueur possède **maintenant** (tout perdu : 0, sauf les
  flottes encore en vol). Pour départager, `losePlanet` garde dans la fiche `deathPts` : les
  points **juste avant la vague** de pertes qui l'élimine (toutes les planètes perdues à la même
  heure comptent). `ranking` trie les joueurs tombés à la même heure par `deathPts` (ou par
  `scoreOf` si leur fiche n'a pas encore vu la chute : elle a encore ses planètes, donc les mêmes
  points).
- Alternatives écartées : afficher un score figé à la mort (contraire à la demande) ; prendre
  les points au moment de l'élimination seulement (une planète perdue juste avant, à la même
  heure, ne compterait plus) ; changer le départage de `Session.over` (inutile si tous les
  téléphones calculent le même gagnant).
- Effet connu : le rejeu d'une **ancienne** sauvegarde où un joueur est éliminé dit « replay
  approché » (la fiche rejouée a `deathPts`, l'ancienne non). Pas de nouveau `FORMAT` (un
  téléphone d'avant ignore le champ, et départage comme avant) ; cache `astra-p2p-v57` (v55 et v56 pris par `main`).
- Limite **non confirmée** : un téléphone dont la copie d'un rival est en retard (il n'a pas
  reçu ses derniers chantiers) calcule pour lui moins de points et peut écrire un autre gagnant
  à la même heure ; `Session.over` départage alors encore par l'ordre des identifiants.
- Qui : Vincent (points au présent) ; Claude (`deathPts` pour départager). Source : session
  `a7cb8a19`. Statut : en vigueur.

**D-103 — Courbe des points de chaque joueur, dans le replay**
- 2026-10-30 11:47. Demande : « Rajoute aussi un graphe qui montre l'évolution des points par
  joueur durant la partie ».
- Choix (Claude, par défaut) : une section « Points » dans `replay.html`, calculée à partir des
  images du rejeu (`scoreSeries`, `js/replay.js`) : une courbe en escalier par joueur, à sa
  couleur, un trait à l'instant affiché, la légende donne les points à cet instant ; toucher la
  courbe y emmène le replay. Rien de nouveau n'est envoyé entre téléphones.
- Alternatives écartées : noter les points dans la fiche pendant la partie pour une courbe en
  direct (la fiche grossit et voyage à chaque changement, et le rejeu ne la referait pas) ; une
  bibliothèque de graphiques (le projet n'a ni build ni dépendance).
- Limite : une partie qui ne se rejoue pas (début du journal perdu) n'a pas de courbe.
- Qui : Vincent (demande), Claude (forme). Source : session `a7cb8a19`. Statut : en vigueur.

**D-104 — Lien vers la courbe des points à la fin de la partie**
- 2026-10-30 12:13. Question de Claude : ajouter un lien vers la courbe dans le bandeau
  « partie finie » ? Réponse de Vincent : « Oui, ajoute le lien ».
- Choix : le bandeau de course, partie finie, ajoute « Voir la courbe des points »
  (`replay.html#points`) ; le replay s'ouvre alors à la fin de la partie, sur la courbe. La partie
  est déjà sauvegardée (`pagehide` appelle `save`), le replay lit cette sauvegarde.
- Alternatives écartées : une courbe en direct dans l'écran de jeu (voir D-103) ; un lien aussi
  pour un joueur éliminé en cours de partie (la partie n'est pas finie).
- Qui : Vincent (lien), Claude (place et comportement). Cache `astra-p2p-v57`. Source : session
  `a7cb8a19`. Statut : en vigueur.

**D-105 — Fil de construction par planète**
- 2026-10-30 12:24. Demande : « Je voudrais un système de fil de construction par planète.
  Comme ça, dès que les ressources sont disponibles, cela lance la construction suivante. Avec
  des estimations de quand elles le seront en fonction de la production. »
- Choix (Claude, par défaut) :
  - Un champ `plan` par planète : liste de noms de bâtiments, **8 au plus** (`PLAN_MAX`). Le
    chantier reste unique (`queue`) ; le fil attend derrière.
  - **Le lancement est calculé dans `stateAt`**, pas dans `tick()` : chantier libre, il reste une
    place, et le stock couvre le prix du premier → il se lance à l'heure où le stock suffit (au
    pas de calcul près, 1 s quand le jeu est ouvert, 48 s au plus après une longue absence). Le
    fil avance donc **aussi téléphone fermé** : au retour, le rattrapage enchaîne tout. `tick()`
    écrit (`settle`) dès qu'un lancement est dû, et le journal dit « … (fil) ».
  - Un élément sans place reste en tête et bloque le fil (rien n'est jeté tout seul) ; le joueur
    le retire avec ×.
  - Deux nouveaux ordres, `planBuild` et `unplan` (journal, rejeu). **`build` ne change pas** :
    un vieux journal contient des `build` refusés (chantier occupé), qui deviendraient des ajouts
    au fil au rejeu. `planBuild` refuse si les places ne suffiront pas (bâties + chantier + fil).
  - Interface : chantier occupé, fil non vide ou stock trop court, le bouton d'un bâtiment
    devient « + niveau » et ajoute au fil ; sinon il construit tout de suite, comme avant.
  - Estimations (`planForecast`, affichage seulement, rien dans la fiche) : le même `stateAt`,
    projeté 10 min (à la seconde près) puis 6 h plus loin, avec la production d'aujourd'hui
    (chantier, recherches et vaisseaux déjà lancés compris). Au-delà : « plus de 6 h », ou la
    raison connue (« Plus de place », « Entrepôt trop petit »).
- Alternatives écartées : lancer le suivant dans `tick()` seulement (plus simple, mais rien
  n'avance téléphone fermé) ; faire de `build` un ajout au fil quand le chantier est occupé
  (casse le rejeu des vieux journaux) ; jeter un élément bloqué ; un fil pour la recherche et le
  chantier naval (pas demandé).
- Limites **non confirmées** : l'estimation suppose que rien ne change (population qui grandit
  ou meurt, ordres à venir, transe) ; un autre ordre qui dépense le stock (recherche, vaisseaux)
  repousse le fil. Les autres joueurs voient le même calcul pour l'affichage, sans le vérifier.
- Pas de nouveau `FORMAT` : un téléphone d'avant ignore `plan` (son fil ne se lance pas chez lui,
  mais rien ne casse) ; cache `astra-p2p-v57` (v55 et v56 pris par D-101 et D-099 ; D-101 prise par la vitesse de flotte, d'où D-105).
- Qui : Vincent (demande), Claude (règle). Statut : en vigueur, **modifiée par D-158** (recherches et vaisseaux au fil, 12 éléments, règle d'ordre entre chantiers).

**D-106 — Construire et faire décoller des vaisseaux depuis la carte**
- 2026-10-30 12:15. Demandes : « Je voudrais pouvoir créer des vaisseaux depuis la carte, en
  fonction des capacités de production des planètes. », puis « il doit etre possible de faire
  decoller des vaiseau depuis la carte ».
- Choix (Claude, par défaut) :
  - **Toucher une de mes planètes ouvre sa fiche sur la carte**, au lieu d'ouvrir directement
    l'écran des bâtiments ; le bouton « Bâtiments » de la fiche y mène toujours (un toucher de
    plus pour les bâtiments).
  - La fiche a une partie **Chantier** : une ligne par vaisseau **déjà recherché** (les autres
    sont cachés), avec son prix, sa durée par unité, ce qui est à quai, et **« jusqu'à N »** : le
    plus grand lot que le stock de cette planète peut payer (`shipsAffordable`, au plus 50, la
    taille maximale d'un lot). Boutons ×1, ×5 et ×N. Sans chantier naval, sans vaisseau
    recherché, ou chantier occupé : une ligne l'explique.
  - Bouton **Décoller** (s'il y a des vaisseaux à quai) : ouvre le formulaire de décollage
    habituel pour **cette** planète (mère ou colonie) ; la flotte part en orbite et reste
    sélectionnée sur la carte, comme avant.
  - Même règle de bouton actif que l'onglet Flottes (`canBuildShips`), pour que les deux écrans
    ne divergent pas. Aucune règle de jeu ne change : mêmes ordres `buildShips` et `takeOff`.
- Alternatives écartées : un appui long sur sa planète pour la fiche (peu découvrable au
  doigt) ; afficher aussi les vaisseaux pas encore recherchés (déjà dans l'onglet Flottes) ;
  faire de chaque lot terminé une flotte en orbite (évoqué puis retiré par Vincent).
- Pas de nouveau `FORMAT` ; cache `astra-p2p-v59` (D-101 à D-105 et les caches v55 à v58 pris par `main` pendant le travail : renumérotée D-106).
- Qui : Vincent (demande), Claude (forme). Statut : en vigueur.

**D-107 — Liste de mes flottes sous la carte, pour leur donner des ordres vite**
- 2026-10-30 10:40. Demande : « Sur la map, avoir la list des flottes ppur leur donner des ordres
  rapidement ».
- Choix : une rangée de boutons (`#map-fleets`) juste sous la carte, au-dessus de la fiche de
  flotte ; un bouton par flotte : nom, statut, compte à rebours ; bord rouge si attaque, conquête
  ou poursuite ; grisé si à sec. Toucher = sélectionner (comme toucher le triangle) ; retoucher =
  relâcher. La rangée défile sur le côté si elle déborde.
- Alternatives : liste verticale (pousse la fiche de flotte loin sous la carte) ; fenêtre
  `.sheet` (un toucher de plus) ; liste dans l'onglet Flottes de la planète (existe déjà, mais
  oblige à quitter la carte).
- Qui : Vincent (demande) ; forme choisie par Claude (défaut). Source : `1d5bf2da`. Statut :
  **modifiée par D-108** (grille au lieu d'une rangée). Cache `astra-p2p-v60` (v53 à v59 pris sur `main`).

**D-108 — La liste des flottes devient une grille, avec les vaisseaux en icônes**
- 2026-10-30 11:20. Demande : « il faudrait plutôt une grille. Avec un bref récapitulatif du
  contenu de la flotte avec des icônes et le nombre de vaisseaux correspondants ».
- Choix : grille de cases (`auto-fill`, 150 px minimum : 2 colonnes sur un téléphone). Chaque
  case : nom et compte à rebours, puis une icône par type de vaisseau avec son nombre (nom du
  vaisseau en infobulle), puis le statut sur une ligne coupée par « … ». Quatre icônes ajoutées
  à `js/icons.js` : `cargo` (caisse), `fighter` (chasseur), `heavy` (coque blindée), `colony`
  (drapeau). La cargaison n'est pas montrée (la fiche de flotte la donne).
- Alternatives : garder la rangée qui défile (on ne voyait qu'une flotte et demie) ; liste
  verticale d'une colonne (prend plus de hauteur).
- Qui : Vincent (grille, icônes, nombres) ; dessin des icônes et taille des cases par Claude
  (défaut). Source : `1d5bf2da`. Statut : en vigueur.
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

**D-109 — Combats de flottes quand aucun téléphone ne regarde**
- 2026-10-30 11:25. Contexte : question « Si tous les joueurs sont hors ligne au moment du contact
  des flottes, comment cela se passe-t-il ? » ; réponse : le contact n'était regardé qu'à l'heure
  du passage, donc un croisement de flottes agressives était perdu, et une poursuite finissait en
  « cible perdue de vue ». Puis « Oui, corrige ».
- Choix : à chaque passage, chercher sur le trajet depuis le passage précédent le premier instant
  où deux flottes entrent au contact (`firstContact`, calcul exact) et livrer le combat daté de cet
  instant, si la cible était visible alors. Fenêtre notée dans le journal d'ordres pour le rejeu.
- Choix de Claude, par défaut : seulement l'entrée au contact (un contact en cours a été vu) ; pas
  de recherche avant le segment actuel de chaque flotte (l'ancien n'est plus connu) ; au lancement,
  la fenêtre part de la dernière modification de ma fiche ; les pertes de la cible restent
  appliquées par son téléphone à la lecture du rapport, comme avant.
- Alternatives écartées : regarder à pas fixes sur l'absence (rate les croisements rapides, coûte
  cher après des heures) ; garder l'historique des segments de chaque flotte (fiches plus lourdes).
- Qui : Vincent (corriger), Claude (méthode). Source : session `e67321a7`. Statut : en vigueur.
- Tests : `tests/fleet.test.mjs`, section « Rencontres que personne n'a regardées ».

**D-110 — Rapport de combat et journal visibles dans le jeu ; messages à la file**
- 2026-10-30 14:03. Contexte : tâche 1.4 collée par Vincent : pertes, butin et planètes perdues
  n'étaient écrits que dans la console (D-018, décidé avant les combats) ; en jeu, un seul message
  de 3,2 s, écrasé par le suivant (« tu es éliminé » aussi). Demandé : revoir D-018, un journal
  dans le jeu filtré sur moi avec les combats en tête, un résumé « pendant ton absence », une file
  de messages.
- Choix :
  - **Carnet de combats propre au téléphone** (`session.journal`, 100 entrées) : chaque combat vu
    de mon côté (mes pertes, ses pertes, butin pris ou pillé, planète prise) et chaque planète
    perdue, daté de l'heure du combat. Il est rangé avec la sauvegarde (`saveGame`), pas dans la
    fiche : il ne part pas sur le réseau et le rejeu ne le touche pas. Écrit par la session
    elle-même, donc aussi pendant le rattrapage à la reprise (avant que l'écran existe).
  - **Les rapports `effects` portent `lost`** (pertes de l'attaquant) : le défenseur connaît ainsi
    les pertes des deux côtés. Champ facultatif, sans changer `FORMAT` ; un rapport d'une ancienne
    version donne « Ses pertes : ? ».
  - **Fenêtre Journal** (bouton à côté du compteur de joueurs, pastille du nombre d'entrées non
    lues) : « Combats et planètes » en tête, puis « Ce qui me concerne » = les lignes du journal
    partagé qui me nomment (20 au plus).
  - **Résumé « Pendant ton absence »** : la même fenêtre, limitée à ce qui est neuf, ouverte au
    retour après 2 min ou plus d'absence (reprise d'une partie : tout le non-lu ; appli revenue au
    premier plan : ce qui est arrivé depuis qu'elle a été cachée), seulement s'il y a un combat ou
    une perte.
  - **Messages à la file** : un à la fois, dans l'ordre, aucun n'en efface un autre ; 6 en attente
    au plus ; doublons ignorés ; quand d'autres attendent, chacun reste au moins 2 s ; « tu es
    éliminé » reste 8 s. Appli cachée : pas de message (le carnet garde l'essentiel).
  - La console garde une copie du journal partagé, pour déboguer (D-018 modifiée).
- Choix de Claude, par défaut : tout ce qui précède dans le détail (taille du carnet, 2 min, 6
  messages, 8 s, filtre par le nom du joueur, une file plutôt qu'une pile de messages).
- Alternatives écartées : afficher le journal partagé tel quel (40 lignes de tout le monde, texte
  seul, coupé à 120 caractères, pas de pertes adverses) ; mettre le carnet dans la fiche (plus
  lourde pour tous, inutile aux autres) ; plusieurs messages empilés à l'écran (cachent la carte).
- Limites : le filtre « ce qui me concerne » cherche mon nom dans le texte (un autre nom qui
  contient le mien passerait) ; l'ouverture au retour au premier plan n'a pas été testée dans le
  navigateur (seulement la reprise d'une partie).
- Qui : Vincent (demande), Claude (méthode). Source : session `caf0e31a`. Statut : en vigueur.
- Tests : `tests/journal.test.mjs`.
**D-111 — Alertes de famine et de panne d'énergie, et diagnostic des planètes**
- 2026-10-30 14:11. Contexte : point 1.6 de la recette (`a-humain-01`, `a-alien-10`) : une
  colonie qui meurt de faim ou manque d'énergie ne prévient pas, sauf si l'on est sur son écran.
  Vincent ajoute une icône de diagnostic sur la carte (toutes les planètes, qui déroule les
  problèmes au toucher) et la même sur la planète (cette planète seulement).
- Choix : `planetAlerts(race, stateAt(...))` (`js/game.js`) donne, pour la nourriture et
  l'énergie que la race utilise, une **pénurie** (`effF` ou `effE` < 1 : famine, panne) ou une
  **baisse** (solde < −0,5 par heure de jeu, le seuil déjà utilisé par les tuiles, avec le temps
  avant d'être vide). Sur mes planètes vivantes : pastille sur la carte, toast à l'apparition,
  ligne dans un bandeau `#alert-line`, icône `#alerts-btn` qui suit le compteur de joueurs.
- Choix de Claude, par défaut : pastille **rouge** pour une pénurie, **orange** pour une baisse
  (un solde négatif avec un entrepôt plein est courant, ce serait du bruit en rouge) ; la ligne
  du bandeau ne montre que les pénuries, de tout l'empire, dans les deux vues ; les minéraux ne
  sont jamais vitaux ; le toast n'annonce que ce qui apparaît, un problème parti depuis moins de
  10 s ne se réannonce pas ; à la reprise d'une partie, les problèmes déjà là sont annoncés une
  fois (c'est la plainte d'origine) ; dans la liste de la carte, le nom de la planète ouvre sa vue.
- Alternatives écartées : tout en rouge ; un toast à chaque passage (répète sans fin) ; une
  ligne dans le bandeau du froid `#race` (caché dans les parties d'avant la course).
- Qui : Vincent (demande, icône), Claude (seuils, couleurs, détails). Source : session
  `b4653aec`. Statut : en vigueur.
- Tests : `tests/alerts.test.mjs`.

**D-112 — Réglage « Fond » : étoiles animées, fixes ou absentes**
- 2026-10-30. Contexte : Vincent demande d'estimer ce que coûte la parallaxe et de pouvoir la
  retirer. Mesure (Chrome, téléphone simulé 390 × 844, densité 3, processeur ralenti × 4) : en
  animé, 3 calques de 2 × 2 écrans ≈ 142 Mo de surface de calque (estimation : la part
  réellement gardée en mémoire graphique dépend du navigateur, **non mesurée**), 3 images de
  12 Mo, 103 ms de dessin au lancement, et jusqu'à 180 écritures de style par seconde tant que
  le téléphone bouge (le ciel est recomposé à chaque image). En fixe : 1 image, 12 Mo, 38 ms,
  rien ensuite. Sans étoiles : rien.
- Choix : un réglage « Fond » (accueil et fenêtre Joueurs ; rangé dans la fenêtre Réglages par
  D-114), gardé dans `astra.sky` :
  `anime` (par défaut, comme avant), `fixe` (les 3 couches dans une seule image immobile, sans
  capteurs), `aucun` (dégradé CSS seul). Changement immédiat, sans recharger. « Réduire les
  animations » donne aussi le rendu fixe (une image au lieu de 3 calques). En animé, la
  position est arrondie au pixel de l'écran : un tremblement plus petit ne redessine plus rien
  (environ 2 fois moins d'écritures avec un capteur bruité simulé).
- Alternatives écartées : retirer la parallaxe pour tous ; fixe par défaut ; détecter
  « téléphone faible » ou « batterie faible » (pas d'API fiable sur iPhone).
- Qui : Claude (défaut : animé reste le défaut, 3 choix). Source : session `0a3a42f6`.
- Statut : en vigueur, modifiée par D-114 (emplacement) et D-137 (plus de choix « animé »). Effet sur la batterie d'un vrai
  téléphone : **non confirmé**.

**D-113 — Cache `astra-p2p-v63`**
- 2026-10-30. Choix de Claude : `index.html`, `style.css`, `js/app.js`, `js/galaxy.js` et
  `js/icons.js` (D-114) changent ; nouvelle version de cache pour que les téléphones les récupèrent.
- Statut : en vigueur.

**D-114 — Une fenêtre « Réglages », ouverte par une roue crantée**
- 2026-10-30 16:40. Demande de Vincent : « Les réglages utilisateurs doivent être bien rangés dans
  l'application et ne pas prendre trop de place. Ils doivent être accessibles avec un icône de roue
  crantée. »
- Choix : une seule fenêtre `#sheet-settings` (comme les autres `.sheet`), avec le réglage « Fond »
  (D-112) ; elle s'ouvre par une roue crantée (icône `gear`, sans texte) en haut à droite de
  l'accueil et dans la rangée de boutons du jeu (entre le diagnostic et le compteur de joueurs).
  Les deux listes « Fond » de l'accueil et de la fenêtre Joueurs sont retirées. Les futurs
  réglages de l'appareil iront dans cette fenêtre.
- Choix de Claude, par défaut : le dessin de la roue (8 dents, trou central) ; la place des
  boutons ; la fenêtre en bas d'écran comme les autres.
- Alternatives écartées : garder une liste sur chaque écran (prend de la place) ; mettre les
  réglages dans la fenêtre Joueurs (mal rangé).
- Qui : Vincent (demande), Claude (forme). Source : session `0a3a42f6`. Statut : en vigueur.

**D-115 — Mes planètes dans la grille sous la carte, avec Construire et Décoller**
- 2026-10-31 11:00. Demande de Vincent : « Je voudrais que sur la vue map, il y ait avec les
  flottes la liste des planètes dans la grille et qu'on puisse, depuis cet endroit, créer de
  nouveaux vaisseaux ou faire décoller des vaisseaux déjà créés. »
- Choix : la grille `#map-fleets` (D-107, D-108) commence par une case par planète à moi (mère
  puis colonies), suivie des flottes. La case montre le nom, les vaisseaux à quai (une icône par
  type et son nombre, comme les flottes), le lot en chantier et son compte à rebours. Deux
  boutons-icônes : **+** ouvre la fiche de la planète sur son chantier (×1, ×5, ×N de D-106) ;
  **Décoller** ouvre directement le formulaire de décollage de cette planète. Toucher ailleurs sur
  la case ouvre la fiche, comme toucher la planète sur la carte. La grille s'affiche dès qu'on a
  une planète, même sans flotte.
- Choix de Claude, par défaut : les planètes avant les flottes (elles ne bougent pas, les flottes
  vont et viennent en fin de liste) ; bord vert pour les distinguer des flottes (bord bleu ou
  rouge) ; icône « + » plutôt que la maison, déjà prise par « Bâtiments » ; **+** caché sans
  chantier naval (la case dit « 🔒 » et le nom du bâtiment) et **Décoller** caché sans vaisseau à
  quai ; la construction reste dans la fiche de la planète (D-106) au lieu de boutons ×1/×5 dans
  la case, trop petite sur un téléphone (2 colonnes).
- Alternatives écartées : une liste séparée des planètes sous la grille des flottes ; des boutons
  de construction dans chaque case ; une case qui sélectionne la planète sans rien ouvrir.
- Qui : Vincent (la demande), Claude (la forme). Source : session `012yisg4`.
- Statut : en vigueur. Vérifié dans Chromium (390 × 844) : construire depuis la case, compte à
  rebours, décollage, flotte en orbite. Sur un vrai téléphone : **non confirmé**.

**D-116 — Cache `astra-p2p-v64`**
- 2026-10-31. Choix de Claude : `index.html`, `style.css`, `js/app.js` (D-115, D-117) et
  `js/icons.js` (D-117) changent ; nouvelle version de cache pour que les téléphones les
  récupèrent. Une seule version pour les deux demandes, faites sur la même branche.
- Statut : en vigueur.

**D-117 — Carte zoomable**
- 2026-10-31 11:15. Demande de Vincent : « Je veux aussi que la carte soit zoomable. »
- Choix : zoom de 1 (toute la carte, 20 cases) à 4 (5 cases de large). Pincer à deux doigts ou
  molette pour zoomer (autour des doigts ou du curseur) ; glisser à un doigt ou à la souris pour
  se déplacer ; boutons +, − et « vue entière » en haut à droite de la carte. Un geste qui a
  bougé de plus de 8 px n'est pas un toucher (pas d'ordre envoyé par erreur en se déplaçant).
  Les cases, les traits et les noms grossissent avec le zoom. Choisir une flotte dans la grille
  sous la carte recentre la vue sur elle si elle est hors champ.
- Choix de Claude, par défaut : zoom maximal 4 ; facteur 1,6 par bouton ; le zoom n'est pas
  gardé d'une ouverture à l'autre ; la molette zoome toujours (sans touche Ctrl), comme sur une
  carte en ligne ; pas de double toucher pour zoomer (il retarderait chaque toucher simple).
- Alternatives écartées : zoom du navigateur (agrandit toute la page, pas la carte) ; agrandir
  le canvas dans un cadre qui défile (le défilement se bat avec les touchers) ; un curseur de
  zoom (prend de la place).
- Qui : Vincent (la demande), Claude (la forme). Source : session `012yisg4`.
- Statut : en vigueur. Vérifié dans Chromium (390 × 844) : boutons, molette autour du curseur,
  glisser à la souris sans ouvrir de fiche, pincement simulé jusqu'au zoom 4, toucher d'une
  planète juste une fois zoomé. Pincement sur un vrai téléphone : **non confirmé**.

**D-118 — Curseur du temps dans le replay, à la minute près, sans arrêter la lecture**
- 2026-10-31 11:40. Demande de Vincent : « Je voudrais que les replay ai un slider pour aller a
  n'importe quel moment d'une partie en cours de visionnage ».
- Constat : `replay.html` avait déjà un curseur (`#rp-time`, D-047), mais sur 1 000 crans (une
  partie de 3 jours : un cran ≈ 4 min 20), rendu comme un champ de saisie (bordure et marges du
  style des `input`), et le toucher arrêtait la lecture pour de bon.
- Choix : le curseur compte en minutes de partie (`max` = durée en minutes) : n'importe quelle
  minute est atteignable, au doigt ou aux flèches du clavier (une minute par appui). Glisser
  pendant la lecture la met en pause le temps du geste, puis elle reprend du nouveau moment
  quand on lâche ; à l'arrêt, le curseur déplace seulement. Même chose pour la courbe des
  points (D-103). Précédent / Suivant ne coupent plus la lecture. Sous le curseur : « Début » et
  la durée totale ; la piste est colorée jusqu'à l'instant affiché ; gros pouce carré (22 px)
  pour le doigt.
- Choix de Claude, par défaut : reprendre la lecture en lâchant (plutôt que rester en pause) ;
  cran d'une minute (plus fin ne sert à rien : les ordres sont espacés de minutes et le pouce
  ne vise pas mieux qu'un pixel, soit ≈ 3 min pour 20 h de partie) ; pas de marques
  d'événements sur la piste (la courbe des points montre déjà où ça bouge).
- Alternatives écartées : garder 1 000 crans ; un curseur en heures ; des marques de combats
  sur la piste ; un champ pour taper une heure.
- Qui : Vincent (la demande), Claude (la forme). Source : session `012yisfz`.
- Statut : en vigueur. Vérifié dans Chromium (390 × 844, partie de robots de 20 h) : glissé
  pendant la lecture (pause puis reprise à +12 h), flèche du clavier (+1 min). Sur un vrai
  téléphone : **non confirmé**.

**D-119 — Cache `astra-p2p-v65`**
- 2026-10-31. Choix de Claude : `replay.html`, `js/replay-view.js` et `style.css` changent
  (D-118) ; nouvelle version de cache pour que les téléphones les récupèrent.
- Statut : en vigueur.

**D-120 — La partie part quand tous les joueurs présents sont prêts ; chacun commence avec une seule flotte, un colonisateur, pour fonder sa planète mère**
- 2026-10-31 12:40. Demande de Vincent : « Il faudrait que la partie commence quand tous les
  joueurs presents soient pret, il faut aussi que les joueurs aient uniquenent une flotte avec un
  colonisateur pour prendre leur premiere planete ».
- Contexte : jusqu'ici, la course (et le froid, D-087) partait à la première installation d'un
  joueur (`since`), et chaque joueur s'installait d'un toucher (`claimPlanet`, « S'installer »)
  sur la planète de son choix, à l'instant.
- Choix :
  - **Prêt** : après sa race, chaque joueur se dit prêt (ordre `ready`, champ `ready` de sa
    fiche) ; il peut revenir sur « plus prêt » tant que la partie n'est pas partie. Quand un
    téléphone voit prêts tous les joueurs **présents** (lui, et ceux en ligne avec lui), il donne
    le départ (ordre `begin`, champ `go`). Le départ est le plus petit `go` vu, partout le même ;
    le froid compte depuis lui. Sans arbitre, comme la fin de partie (`over`).
  - **Absent** : un joueur hors ligne ne bloque pas le départ ; à son retour, il se dit prêt et
    entre tout de suite, avec sa flotte à cette heure-là (le froid, lui, a déjà avancé).
  - **Flotte de départ** : un seul colonisateur de sa race, le plein fait, sans cargaison, sur un
    cercle de 7 cases autour du soleil ; les joueurs prêts au départ y sont à égale distance les
    uns des autres, jamais sur une planète. Aucune planète, aucun autre vaisseau.
  - **Planète mère** : le colonisateur, envoyé sur une planète libre (pas un petit corps), la
    fonde à son arrivée, avec les bâtiments et le stock de départ de sa race (comme
    l'installation d'avant) ; le carburant restant est perdu, pour un départ égal. Le premier
    arrivé l'emporte ; le perdant garde son colonisateur en orbite. Plus de colonisateur avant
    d'avoir fondé sa planète : éliminé.
  - `FORMAT` 9 : un téléphone d'avant compterait le départ autrement, il est prié de recharger.
- Choix de Claude, par défaut : « présent » = en ligne avec mon téléphone ; rayon de 7 cases
  (assez loin du soleil pour que le froid laisse ≈ 17 min de marge au départ, assez près pour
  atteindre toute planète avec un plein) ; carburant restant perdu à la fondation ; un joueur
  arrivé après le départ entre seul, sans attendre ; « S'installer » remplacé dans la fiche de
  la planète par « Y envoyer mon colonisateur » ; `claimPlanet` gardé pour les parties d'avant
  et les tests, mais refusé à un joueur qui a `ready`.
- Alternatives écartées : un hôte qui lance la partie (il n'y a plus de maître du jeu, D-010) ;
  attendre tous les joueurs de la partie, même hors ligne (un absent bloquerait tout le monde) ;
  un compte à rebours après le dernier prêt ; cases de départ tirées au hasard (inégales) ;
  ajouter le carburant restant au stock (avantage aux départs proches d'une planète) ; donner
  aussi des cargos ou des chasseurs au départ (la demande dit « uniquement »).
- Qui : Vincent (la demande), Claude (la forme). Source : session `012yisg3`.
- Statut : en vigueur, modifiée par D-163 (le froid détruit les flottes : un joueur sans planète
  meurt quand il perd son dernier colonisateur au froid). 11 tests (`tests/start.test.mjs`), contrôlés par mutation. Vérifié dans
  Chromium (390 × 844), seul et à deux avec une vraie invitation WebRTC. Équilibre des cases de
  départ (une planète peut être plus proche de l'un que de l'autre) : **non confirmé**.

**D-121 — Cache `astra-p2p-v66`**
- 2026-10-31. Choix de Claude : `index.html`, `js/app.js`, `js/session.js` et `style.css`
  changent (D-120) ; nouvelle version de cache pour que les téléphones les récupèrent.
- Statut : en vigueur.

**D-122 — Rapport de combat détaillé : le déroulé et le « pourquoi »**
- 2026-10-31. Contexte : Vincent : « Il faut que les rapports de combat soient plus détaillés
  et que l'on puisse comprendre pourquoi on a perdu ou gagné. » Le carnet (D-110) ne disait que
  le résultat, les pertes de chaque camp et le butin.
- Choix :
  - `battle` (`js/fleet.js`) renvoie aussi `report` : pour chaque camp, les vaisseaux au départ,
    les multiplicateurs de technologie (attaque, coque), le feu et la coque totaux, la défense de
    la planète, la coque restante ; puis chaque passe (feu de chaque camp, pertes par type,
    défense comprise). Le calcul du combat ne change pas.
  - Le déroulé voyage dans le rapport que l'attaquant écrit pour le défenseur (`effects[].rep`) :
    les deux carnets ont **le même** déroulé, chacun le lit de son côté (`side` : `'a'` ou
    `'d'`). Nettoyé à la réception (`cleanReport`) comme toute donnée d'un autre téléphone ;
    il ne sert qu'à l'affichage.
  - Nouveau module pur `js/report.js` : `explainBattle(rep, side)` donne l'issue, une phrase
    « pourquoi » (feu par passe contre coque, nombre de passes, part de la coque adverse
    détruite), puis ce qui a pesé : rapport de forces feu × coque (et, en cas de défaite, à peu
    près combien de vaisseaux armés il aurait fallu : racine du rapport, modèle de Lanchester,
    **approché**), défense de la planète (part de la coque, tombée ou intacte), technologies,
    vaisseaux sans armes qui prennent leur part des coups, absence de butin (pillage trop
    récent, soutes pleines, rien à prendre) ; et une phrase par passe.
  - Fenêtre Journal : sous chaque combat, la phrase « pourquoi » visible tout de suite ;
    « Détail du combat » à déplier : ce qui a pesé, un tableau des forces de chaque camp
    (vaisseau, nombre, ⚔, ◇, pertes ; défense « tient » ou « abattue »), les passes.
- Choix de Claude, par défaut : le déroulé est stocké brut et expliqué à l'affichage (le texte
  peut s'améliorer sans toucher aux sauvegardes) ; l'adversaire est nommé « l'adversaire »
  dans les phrases ; les anciens combats du carnet, sans déroulé, restent affichés comme avant.
- Alternatives écartées : que le défenseur recalcule le combat (il ne connaît pas la flotte
  adverse ni ses technologies à l'heure du combat) ; envoyer le texte tout fait (plus lourd,
  figé, et un pair pourrait y écrire n'importe quoi) ; une fenêtre à part pour chaque combat
  (le carnet existe déjà) ; montrer les dégâts vaisseau par vaisseau (trop long sur téléphone).
- Qui : Vincent (la demande), Claude (la forme). Source : session `012yisg3`.
- Statut : en vigueur. 7 tests (`tests/report.test.mjs`), dont un contrôlé par mutation (rapport
  envoyé sans déroulé). Vérifié dans Chromium (390 × 844) avec des combats injectés dans le
  carnet. Justesse du conseil « il t'aurait fallu environ N fois plus » : **non confirmé**
  (estimation, la défense d'une planète ne grandit pas avec la flotte).

**D-123 — Cache `astra-p2p-v67`**
- 2026-10-31. Choix de Claude : nouveau fichier `js/report.js` (ajouté à la liste du service
  worker) et `js/app.js`, `js/fleet.js`, `js/session.js`, `style.css` changent (D-122).
- Statut : en vigueur.

**D-124 — Brouillard sur les planètes des autres, et souvenir de leur propriétaire**
- 2026-10-31. Contexte : la détection (§8.6 des règles) ne cachait que les flottes ;
  toutes les planètes des autres restaient visibles, avec leur propriétaire et leurs vaisseaux
  à quai. Demande de Vincent : « on ne doit pas pouvoir voir la planète ennemie. Si on découvre
  une planète ennemie dans notre champ de vision, on se rappelle à quel joueur elle appartient ».
- Choix : hors de ma portée de détection, une planète des autres paraît libre (le corps céleste
  reste dessiné : l'univers est le même pour tous) ; une planète mère hors de l'univers n'est pas
  dessinée. Dans ma portée, je vois son vrai propriétaire et je le retiens (`intel`, propre au
  téléphone, sauvegardé). Hors de portée ensuite : son propriétaire d'alors, en pâle, avec
  « vue il y a … » ; pas son état (vaisseaux à quai, gisements actuels). Le souvenir ne change
  qu'en la revoyant (prise entre-temps : on l'ignore). Mes planètes : toujours vues. Partie
  finie : tout est révélé.
- Choix de Claude, par défaut : souvenir local (comme le carnet de combats, D-110) plutôt que
  dans ma fiche partagée ; découverte à chaque passage (`tick`) même carte fermée ; « Y envoyer
  mon colonisateur » reste possible vers une planète qui paraît libre (c'est le jeu du
  brouillard). Toujours un filtre d'affichage, pas un secret (la copie contient tout).
- Alternatives écartées : cacher aussi le corps céleste (l'univers est déterministe, le cacher
  n'apprendrait rien) ; un souvenir qui suit le propriétaire en direct (ce serait voir sans
  voir) ; partager les découvertes entre joueurs (pas d'alliances).
- Non traité : la fenêtre Joueurs montre toujours le nombre de planètes et de vaisseaux à quai
  de chacun.
- Qui : Vincent (la règle), Claude (la forme). Source : cette session.
- Statut : en vigueur, précisée par D-190 (le menu d'ordres d'une flotte suit aussi le brouillard). 3 tests (`tests/fog.test.mjs`). Rendu dans le navigateur : non confirmé.

**D-125 — Cache `astra-p2p-v68`**
- 2026-10-31. Choix de Claude : `js/app.js`, `js/session.js`, `js/save.js` changent (D-124).
- Statut : en vigueur.

**D-126 — Viser sur la carte : aimant du doigt, menu au doigt, glisser une flotte vers sa cible**
- 2026-10-31 15:15 (non confirmé). Demande de Vincent : « Améliore la sélection et l'utilisation des planètes
  et des flottes dans la map. J'ai du mal des fois à déplacer les flottes vers l'endroit que je
  veux et il faut souvent que je fasse plusieurs clics. Trouve un système plus naturel et plus
  efficace. »
- Constat (lecture du code) : à zoom 1, une case fait ~17 px ; la case visée était la case
  arrondie sous le doigt (un toucher à côté d'une planète envoyait la flotte dans le vide) ;
  flottes empilées : chaque toucher passait à la suivante, sans dire laquelle ; flotte
  sélectionnée, toucher sa planète d'orbite pouvait reprendre une autre flotte au lieu de viser
  la planète ; plusieurs ordres possibles : les boutons s'affichaient dans la fiche de la
  flotte, **sous la grille des planètes et des flottes**, souvent hors de l'écran.
- Choix :
  1. **Aimant** (`js/aim.js`) : le doigt a une portée fixe à l'écran (18 px, au moins 0,6 case
     zoomé) ; l'objet le plus proche (planète, une de mes flottes, flotte adverse vue) est visé,
     plus la case arrondie.
  2. **Pas de devinette** : si d'autres objets sont presque aussi près (moins de 12 px d'écart),
     un **menu au doigt** s'ouvre sur la carte (« Lequel ? », « Que viser ? ») au lieu de
     choisir au hasard ou de faire tourner les flottes une à une.
  3. **Ordres au doigt** : plusieurs ordres possibles (se poser / orbite, attaquer / conquérir,
     coloniser / orbite, ou panne en route) → le même menu, posé à côté du doigt, l'ordre
     principal en premier et en couleur, plus « Fiche de … » pour voir la planète sans relâcher
     la flotte. Un seul ordre sans risque (case vide, planète libre sans colonisateur) part
     tout de suite, comme avant.
  4. **Glisser pour envoyer** : appuyer sur une de mes flottes et glisser trace un trait
     jusqu'à la cible (aimantée), l'ordre est écrit au-dessus du doigt ; lâcher envoie (ou
     ouvre le menu s'il y a un choix). Lâcher sur la flotte elle-même : rien. Un glissé qui
     commence ailleurs déplace la vue, comme avant (D-117).
  5. Flotte sélectionnée : la retoucher la relâche ; toucher une autre de mes flottes la
     choisit ; une flotte adverse → menu « Attaquer la flotte de … ».
  6. **Autonomie dessinée** : losange jaune pointillé autour de la flotte sélectionnée, les
     cases que son carburant atteint (distance |dx| + |dy|, comme les règles).
  7. La fiche de la flotte sélectionnée remonte **juste sous la carte** (avant la grille).
- Choix de Claude, par défaut : les seuils (18 px, 0,6 case, 12 px, 8 px pour un glissé) ;
  toucher la carte pendant que le menu est ouvert le ferme sans rien envoyer (taper à côté pour
  annuler ne doit pas envoyer la flotte) ; le menu se ferme quand la vue bouge (pas de menu
  qui flotte loin de sa cible) ; lâcher une flotte traînée ne choisit jamais une autre de mes
  flottes (on vise un endroit) ; sans flotte sélectionnée, les flottes adverses ne sont pas
  des cibles.
- Alternatives écartées : agrandir les objets (la carte est pleine à zoom 1) ; loupe sous le
  doigt (cache ce qu'on vise, demande un appui long) ; envoyer d'office l'ordre principal en
  lâchant (attaquer et conquérir ne se confondent pas, on demande) ; appui long pour la fiche
  (lent, et peu découvrable sur un téléphone).
- Qui : Vincent (la demande), Claude (le système). Source : session `012yisfzoyH`.
- Statut : en vigueur, **point 5 modifié par D-159** (toucher une autre de mes flottes ouvre un menu de fusion). 8 tests (`tests/aim.test.mjs`). Vérifié dans Chromium (390 × 844,
  toucher simulé) : toucher une planète libre avec le colonisateur → menu « Fonder / orbite /
  fiche » ; toucher à côté → menu fermé, rien d'envoyé ; glisser le colonisateur jusqu'à la
  planète → trait, libellé, menu, colonisation ; planète mère avec 3 flottes en orbite →
  « Lequel ? » ; flotte choisie + case vide → départ direct ; flotte choisie + planète mère →
  « Se poser / orbite / Choisir Flotte 2 / 3 » ; glisser depuis le vide zoomé → la vue bouge,
  aucun ordre. Sur un vrai téléphone : **non confirmé**.

**D-127 — Cache `astra-p2p-v69`**
- 2026-10-31. Choix de Claude : `index.html`, `style.css`, `js/app.js` changent et
  `js/aim.js` apparaît (ajouté à la liste du cache) (D-126).
- Statut : en vigueur.

**D-128 — Tester la vision des flottes par un test de logique, pas par le DOM ni par des captures**
- 2026-10-31 22:22 (UTC). Contexte : Vincent demande comment tester le projet, si Claude peut
  faire des tests visuels (captures, DOM), puis : « je voudrais tester qu'on ne voit pas les
  flottes enemies en dehors de notre champs de vision, quel serait le meilleur type de test
  pour ca ? ». Constat : la règle tient dans `session.sees` (`js/session.js`) ; la carte s'en
  sert pour sauter les flottes cachées (`fleetSpots`, `js/app.js`) ; aucun test ne vérifiait
  directement qu'une flotte ennemie trop loin est cachée (D-030 testait la poursuite).
- Choix : `tests/vision.test.mjs`, dans Node avec le harnais, sur les vraies portées
  (`sightRange`) et les vrais déplacements (`moveFleet`) : à la portée d'une planète ou d'une
  flotte, visible ; une case au-delà ou en diagonale, cachée ; les miennes toujours visibles ;
  une flotte en route qui sort de ma portée puis y revient. Contrôlé par mutation (`sees` qui
  dit toujours oui → 3 tests sur 4 échouent). Le dessin reste vérifié à l'œil par Claude
  dans le navigateur intégré, à la demande, sans outil installé.
- Écarté : lire le DOM (la carte est un `canvas`, les flottes n'y sont pas des éléments) ;
  captures d'écran automatiques (Playwright ou autre : une dépendance et un `package.json`
  dans un projet sans build, et des tests fragiles).
- Qui : Vincent (« Oui, écris le test »), Claude (le type de test, par défaut). Source :
  session `09eb6bdd`.
- Rappel : c'est un filtre d'affichage, pas un secret (§8.6 des règles) ; la copie de la partie
  contient toutes les flottes, ce que le test note aussi.
- Statut : en vigueur, modifiée par D-129 (les 4 tests deviennent 6 scénarios avec rapport ; 189/189).

**D-129 — Scénarios de test avec un rapport HTML de la carte vue par le joueur**
- 2026-11-01 13:55 (UTC). Contexte : Vincent veut que le test de vision (D-128) soit
  « verifiable facilement par un humain » : un mini replay et, si le test échoue, « un rapport
  html avec un petit embed qui montre le replay et une description du comportement attendu ».
  Puis : « le screen shot coute chere pour les tests, il faut une solution rapid que les humain
  et les agents puisse utiliser » ; « l'ascii n'est pas une bonne idée car c'est pas
  representatif pour l'humain […] travaile sur de l'inline html » ; « a quoi sert le { given,
  when, then } dans le code ? je pense que seul l'intitulé du test suffi ».
- Choix : `tests/scenario.mjs`. `scenarios(import.meta.url)` donne `scenario(intitulé, (film) =>
  …)`, un `test` de node:test. L'intitulé dit le comportement attendu. `film.look(joueur,
  légende, [{ fleet: [propriétaire, id], visible }], { eyes })` photographie ce que voit le
  joueur (sa portée, les planètes, toutes les flottes, vues ou non) et vérifie chaque attente.
  Si un scénario échoue, ou avec `ASTRA_REPORT=1`, `tests/reports/<fichier>.html` est écrit :
  un fichier HTML autonome, sans dépendance, une section par scénario (intitulé, « Obtenu »,
  une carte SVG par image, ▶ / ⏮ / ⏭ / curseur), l'image fautive montrée d'abord. Les agents
  le lisent comme du texte (`<title>` de chaque planète et flotte, légendes, attendu /
  obtenu) ; un humain l'ouvre dans un navigateur. `#scn=<intitulé>` ne montre qu'un scénario.
  Tout vert sans `ASTRA_REPORT` : le rapport est effacé. `tests/reports/` est ignoré par git.
- Écarté : captures d'écran (coûteuses, Vincent) ; carte en ASCII (« pas representatif »,
  Vincent) ; Given / When / Then en paramètres (essayé, retiré à la demande de Vincent :
  l'intitulé suffit) ; réutiliser `replay.html` (il montre toutes les flottes, pas la vue
  d'un joueur, et lit la partie dans la mémoire du navigateur : il aurait fallu changer le jeu).
- Limite : la carte montre ce que dit la règle (`sees`), pas le dessin du vrai `canvas`.
- Qui : Vincent (le besoin, pas d'ASCII ni de capture, pas de Given / When / Then), Claude (la
  forme). Source : session `09eb6bdd`.
- Statut : en vigueur, modifiée par D-140 (le rapport montre le vrai jeu ; la carte SVG devient la « carte de contrôle »). `tests/vision.test.mjs` réécrit en 6 scénarios. Contrôlé par mutation
  (`sees` qui dit toujours oui → 4 scénarios en échec, rapport écrit, image fautive en rouge).

**D-130 — Interface de test locale (`tests/ui/`), notre mini framework de test**
- 2026-11-01 13:55 (UTC). Demande de Vincent : « faire un petit serveur qui tourne en local
  pour avoir une interface de test, un peu comme ce que fait vitest avec son mode UI, avec la
  liste des test, la possibilité d'en lancer un et le rendu de la simulation pour les humain » ;
  puis « ca sera notre mini framework de test, il faut que les tests restent rapide, je vais
  en avoir vraiment beaucoup, mais il faut que l'interface soit intuitive ».
- Choix : `node tests/ui/server.mjs` → http://localhost:5199 (`PORT` pour changer ; écoute
  sur 127.0.0.1 seulement). Sans dépendance ni build : `node:http`. Les tests tournent comme
  d'habitude (`node --test`, un processus par fichier, en parallèle) avec un reporter à nous
  (`tests/ui/reporter.mjs`, une ligne JSON par test), et `ASTRA_REPORT=1` pour avoir la
  simulation. Les résultats arrivent au fil de l'eau. Page `tests/ui/index.html` : compteurs
  ✔ / ✖ / ○ (le ✖ filtre les échecs), recherche (`/`), fichiers repliables, ▶ par test et par
  fichier, « Tout lancer », « Arrêter » ; à droite, le test choisi : statut, durée, erreur et
  ligne du test, puis la simulation (le rapport de D-129) pour un scénario. Après « Tout
  lancer », le premier échec est choisi. Un lancement remplace le précédent.
- Liste des tests : lue dans le source (premier texte de chaque `test(` ou `scenario(` en
  début de ligne), car node:test ne sait pas lister sans lancer : `--test-skip-pattern` et
  `--test-only` filtrent sans rien rapporter (vérifié avec Node 24.14.1). Un test au nom
  calculé n'apparaît donc pas dans la liste avant d'avoir tourné ; lancé par fichier, il
  tourne quand même.
- Un scénario est déclaré dans `tests/scenario.mjs` : node:test le rapporte à ce fichier ; le
  serveur le rend à son fichier par son nom.
- `.claude/launch.json` : `astra-tests` (cette interface) et `astra` (le jeu,
  `python3 -m http.server 8080`) pour le navigateur intégré de Claude.
- Écarté : vitest ou un autre outil (une dépendance, un `package.json`, un build) ; lancer tous
  les tests à l'ouverture (avec beaucoup de tests, on choisit quoi lancer).
- Mesuré : 189 tests en 6,5 s depuis l'interface (6,4 s en ligne de commande) ; un test seul
  en 0,1 s.
- Qui : Vincent (la demande), Claude (la forme). Source : session `09eb6bdd`.
- Statut : en vigueur. Vérifié dans le navigateur intégré (règle cassée exprès puis remise).

**D-131 — Film seconde par seconde entre deux vérifications, et simulation à hauteur fixe**
- 2026-11-01 14:02 (UTC). Contexte : question de Vincent sur le scénario « flotte ennemie en
  route » : « dans ce test, il y a 4 ticks de temps ? pourquoi ce n'est pas en temps reel ?
  autent de tick que de secondes ? ». Réponse : le test sautait d'un moment à l'autre (5 images,
  sans `tick`), ce qui suffit pour la règle, puisque la position d'une flotte se calcule à partir
  de l'heure (`fleetPos`). Puis : « il ne faut pas rajouter/enlever du test dans la simulations,
  cela fait du flickering sur l'ecran et change la hauteur de la div ; oui rajoute un film ».
- Choix : `film.roll(joueur, horloge, jusqu'à, légende, chaqueSeconde)` fait avancer la fausse
  horloge seconde par seconde, sans attendre : à chaque seconde, `chaqueSeconde()` (dans le
  scénario : `B.tick()`, A reçoit la fiche de B, `A.tick()`), puis une image sans vérification.
  Au plus 240 images par `roll` (au-delà, le pas s'allonge). Les vérifications restent dans
  `look`. Le scénario de la flotte en route passe de 5 à 33 images (≈ 9 ms).
- Rapport : les images sont empilées au même endroit (grille CSS, `visibility`) : la hauteur
  est celle de la plus grande image et ne change pas pendant la lecture ; lecture en ≈ 8 s quel
  que soit le nombre d'images (0,12 à 0,9 s par image), arrêt sur la dernière.
- Interface : pendant un lancement, la simulation affichée reste en place ; le nouveau rapport
  se charge dans le même cadre, qui garde sa hauteur ; seul le rapport du fichier relancé est
  rechargé.
- Écarté : le temps réel (32 vraies secondes d'attente pour ce seul test) ; vérifier
  « vue / cachée » à chaque seconde (il faudrait recalculer la règle dans le test).
- Qui : Vincent (le film, pas de saut de hauteur), Claude (la forme). Source : session `09eb6bdd`.
- Statut : en vigueur. Vérifié dans le navigateur intégré : hauteur du film identique sur les
  33 images (456 px), cadre gardé à 690 px pendant un nouveau lancement.

**D-132 — Tous les tests qui jouent une partie deviennent des scénarios filmés**
- 2026-11-01 14:16 (UTC). Demande de Vincent : « transforme un maximum de test existant avec des
  simulation ».
- Choix : tout test qui joue une partie (`newGame`, `newLobby`, des `Session`) passe en
  `scenario(…)` avec des `film.look` aux moments utiles ; un test de pure fonction (calcul sur
  une planète seule, géométrie, texte, sauvegarde seule) reste en `test(…)` : on n'invente pas
  de partie pour lui. Résultat : 114 scénarios sur 189 tests (17 fichiers), environ 480 images.
  Les `assert` sont identiques à ceux d'avant dans chaque fichier (comparés ligne à ligne) ;
  seules changent les lignes `test(` → `scenario(`, les imports, et des aides (`run`, `play`,
  `raid`, `assault`) qui prennent un paramètre facultatif pour filmer, sans changer les passages
  ni l'horloge. Deux sauts d'horloge (`clock.t = arrivée`) sont devenus `film.roll` sans
  passage, qui finit à la même heure.
- Outil (`tests/scenario.mjs`), complété en même temps : sous la carte, un tableau de l'état réel
  de chaque joueur (stock à l'heure de l'image, calculé avec `stateAt` sans rien écrire ;
  vaisseaux à quai ; nombre de flottes) ; une image « au moment de l'échec » ajoutée toute
  seule ; les scénarios `async` sont attendus ; lettres A, B… départagées par identifiant
  (avant, deux joueurs de même rang changeaient de lettre selon qui regardait) ; brouillard des
  planètes montré sans toucher aux renseignements du joueur (anneau en pointillés = vrai
  propriétaire inconnu) ; couleurs de secours quand deux joueurs ont la même ; flottes à
  l'arrêt décalées pour ne pas être cachées par leur planète ; contenu des flottes dans leur
  description (vaisseaux, soute, destination, ordre).
- Fait par : 5 agents en parallèle, un groupe de fichiers chacun, puis vérifié par Claude
  (comparaison des `assert`, suite complète, échec provoqué dans un test async).
- Écarté : filmer les tests de pure fonction (rien à montrer sur une carte) ; remplacer les
  boucles de temps des tests par `film.roll` (risque de changer les passages).
- Mesuré : `node --test tests/*.test.mjs` 6,4 s avant et après ; avec `ASTRA_REPORT=1`, 6,5 s.
- Qui : Vincent (la demande), Claude (le partage). Source : session `09eb6bdd`.
- Statut : modifiée par D-141 (plus d'exception : tous les tests sont des scénarios). 189/189.

**D-133 — Alerte quand une flotte ennemie arrive sur une de mes planètes**
- 2026-10-30 14:10. Contexte : retour de 7 testeurs (point 1.3 de leur synthèse) : une conquête
  tombe sans préavis, le seul signal est un toast de 3,2 s à l'impact, et l'effectif des flottes
  ennemies ne se voit pas sur la carte. Demande : un bandeau rouge persistant avec compte à
  rebours, et l'effectif des flottes ennemies sur la carte.
- Choix : `Session.threats(now)` liste les flottes **armées**, **adverses**, **visibles** (dans
  ma zone de détection, la même règle que la carte). Deux niveaux : d'abord celles qui visent une
  de mes planètes (ordre attaque ou conquête sur moi, simple trajet vers la case de ma planète, ou
  déjà en orbite), la plus proche de l'impact en tête ; puis les autres, de la plus proche à la
  plus lointaine de mes planètes. Bandeau `#threat` sous celui du froid, sur tous les onglets : la
  plus pressante (« 12 vaisseaux de Zorg sur Pollux dans 8 s », « … en orbite de Pollux »,
  « … en vue, à 3 cases de Pollux ») et « +N autres ». Un toucher montre la carte. Compte à
  rebours en secondes (les trajets durent 2 à 10 s). Sur la carte, le nombre de vaisseaux est
  écrit à côté de chaque flotte adverse visible. Cache v70.
- Choix de Claude, par défaut : la cible et l'ordre d'une flotte visible sont montrés (ils sont
  déjà dans la copie de la partie ; la carte, elle, ne montrait que la direction) ; une flotte
  arrivée dont le combat n'est pas encore réglé garde l'alerte à « en orbite » ; une flotte d'un
  joueur éliminé ne compte pas ; pas d'alerte sans armes ; rien en partie finie.
- Alternatives écartées : un toast de plus (disparaît, c'était le problème) ; alerter sur toutes
  les flottes de la partie, même hors de vue (révèle ce que la carte cache) ; vibration ou son
  (non demandé).
- Qui : Vincent (demande), Claude (détails). Source : session `0cb6f324`. Statut : en vigueur.
- Tests : `tests/threat.test.mjs`.

**D-134 — Délai avant qu'une flotte en orbite frappe une case voisine**
- 2026-10-30 14:10. Contexte : même point 1.3 : depuis l'orbite, une conquête de la case voisine
  prend 2 à 3 s (plancher `MIN_TRIP` de 2 s). La synthèse le met « à discuter ».
- Choix : **rien n'est changé pour l'instant**. Question posée à Vincent ; l'alerte de D-133
  laisse déjà voir les flottes en orbite proches (« en vue, à 1 case »).
- Qui : en attente de Vincent. Source : session `0cb6f324`. Statut : ouvert, non tranché.

**D-135 — Les scénarios de test montrent le bandeau d'alerte du joueur**
- 2026-11-01 20:35. Contexte : « fait un test ou tu montre l'alert ».
- Choix : le texte du bandeau sort de `app.js` dans `threatText(list)` (`js/session.js`), que le
  jeu et `tests/scenario.mjs` utilisent tous les deux. `film.look` le note à chaque image et le
  rapport l'affiche au-dessus de la carte (une ligne « pas d'alerte » quand il n'y en a pas, pour
  que la carte ne saute pas) ; la carte du rapport écrit l'effectif des flottes adverses vues.
  Nouvelle attente `{ alert: /texte/ | null }`. `tests/threat.test.mjs` passe en scénarios
  filmés (D-132), dont une conquête suivie seconde par seconde. Cache v71 (`app.js` change).
- Choix de Claude, par défaut : une expression régulière plutôt qu'un texte exact (les noms de
  planètes changent d'une partie de test à l'autre) ; le texte est en clair, le jeu ajoute seul
  l'icône et la mise en forme.
- Alternatives écartées : capture d'écran du vrai jeu dans le test (lente, D-128) ; recopier le
  texte dans le test (il pourrait diverger du jeu).
- Qui : Vincent (demande), Claude (méthode). Source : session `0cb6f324`. Statut : en vigueur, modifiée par D-140 (le bandeau se voit dans le vrai jeu, plus au-dessus d'une carte dessinée).
- Tests : `tests/threat.test.mjs`.

**D-136 — Rapport de scénario : une seule image, pas de commandes ni de compteur**
- 2026-11-01 20:38. Contexte : « dans les simulations, si il n'y a qu'une seule step, ne pas
  afficher les controls », puis « ni "1/1 · t = 0 s" ».
- Choix : dans `tests/scenario.mjs`, un scénario d'une seule image n'a ni la barre ⏮ ▶ ⏭ et le
  curseur, ni le compteur « 1/1 · t = 0 s » ; la légende commence directement. Les films de
  deux images ou plus ne changent pas.
- Alternatives écartées : griser les commandes (elles prennent encore la place).
- Qui : Vincent. Source : session `0cb6f324`. Statut : en vigueur.

**D-137 — Plus de parallaxe, pour tout le monde**
- 2026-11-01 20:42. Contexte : « retirer la paralaxe pour tout le monde ».
- Choix : le fond étoilé est toujours une seule image immobile (les 3 couches d'étoiles réunies),
  redessinée seulement quand l'écran change de taille : ni défilement, ni souris, ni
  accéléromètre, ni autorisation « Mouvement » sur iPhone. Le réglage « Fond » garde deux choix :
  « Étoiles » (`fixe`, par défaut) et « Sans étoiles » (`aucun`). Un téléphone qui avait gardé
  `anime` passe à `fixe`. Code de la parallaxe retiré de `js/galaxy.js`. Cache v72.
- Choix de Claude, par défaut : retirer le choix « animé » du réglage plutôt que seulement changer
  le défaut (« pour tout le monde ») ; l'option « fixe » s'appelle maintenant « Étoiles ».
- Alternatives écartées : garder la parallaxe en option (pas « pour tout le monde ») ; retirer
  aussi les étoiles fixes (non demandé).
- Remplace D-067 et D-068 ; modifie D-112.
- Qui : Vincent (demande), Claude (détails). Source : session `0cb6f324`. Statut : en vigueur.
- Tests : `tests/decisions-reseau.test.mjs` « D-137 ».

**D-138 — Le bouton « Bâtiments » de la fiche de planète devient « Voir la planète »**
- 2026-11-01 20:42. Contexte : élément `#btn-open-planet` montré par Vincent : « ce boutton doit etre
  rename: "voir la planete" ».
- Choix : texte « Voir la planète », icône planète (avant : icône bâtiment). Il ouvre toujours
  l'écran de la planète (bâtiments, recherche, flottes).
- Choix de Claude, par défaut : l'icône planète, qui va avec le nouveau texte.
- Qui : Vincent (texte), Claude (icône). Source : session `0cb6f324`. Statut : en vigueur.

**D-139 — « Voir la planète » seulement sur mes planètes, et sa simulation**
- 2026-11-01 20:53. Contexte : « fait un test qui montre le boutton "voir la planete" si la planette
  nous appartiens », puis « avec une simulation ».
- Choix : la règle sort de `renderPick` dans `Session.myPlanetAt(cell)` (ma planète mère ou une
  de mes colonies sur la case, sinon null), lue par le jeu et par le test. `tests/planet-button.test.mjs` :
  un scénario filmé — A touche sa planète (bouton), celle de B et une planète libre (pas de
  bouton), y envoie un colonisateur (film seconde par seconde, 43 s), touche sa nouvelle colonie
  (bouton, qui ouvre cette colonie). Attente `{ sheet: case, button }` dans `film.look`. Cache v73.
- Qui : Vincent (demande), Claude (méthode). Source : session `0cb6f324`. Statut : en vigueur.
- Tests : `tests/planet-button.test.mjs`.

**D-140 — Les rapports de scénario montrent le vrai jeu, image par image**
- 2026-11-01 20:53. Contexte : Claude avait dessiné dans le rapport une imitation de la fiche de
  planète ; Vincent : « non il faut que les simulation reprennent exactement ce que voit
  l'utilisateur ». Deux options proposées (A : le vrai jeu dans le rapport ; B : captures d'écran
  d'un vrai navigateur) ; Vincent choisit A, « Vrai jeu dans le rapport ».
- Choix : `film.look` enregistre à chaque image l'état de la partie du joueur (`state`, `me`,
  heure, renseignements du brouillard, planète touchée, réglages du froid du test). Le rapport
  embarque le vrai jeu, `index.html?view`, dans un cadre de téléphone (390 × 780) et lui envoie
  l'image choisie par `postMessage`. En lecture seule (`showSnapshot`, `js/app.js`) : nouvelle
  `Session` sur cet état, horloge arrêtée à l'heure de l'image, pas de réseau, pas de sauvegarde,
  pas de service worker, rien ne se touche ; les autres joueurs comptent comme connectés. Le vrai
  écran montre donc le vrai bandeau d'alerte, la vraie fiche, le vrai bouton. La carte SVG du
  test reste, repliée, comme « carte de contrôle » (vérité : flottes cachées, vrais propriétaires).
  Les imitations (bandeau et fiche dessinés par le rapport) sont retirées. `tests/ui/server.mjs`
  sert aussi les fichiers du jeu (liste fermée). Ouvert en `file://`, le rapport ne peut pas
  charger le jeu (modules JS) : il le dit et déplie la carte de contrôle.
- Choix de Claude, par défaut : un seul cadre de jeu par scénario (pas un par image) ; les autres
  joueurs « connectés » (sinon le bandeau « Seul en ligne », qui n'existe pas dans un test) ; le
  froid du test transmis (sinon le vrai jeu afficherait un froid que le test a coupé).
- Alternatives écartées : captures d'écran (lentes, D-128) ; garder la carte dessinée seule (pas
  ce que voit le joueur).
- Vérifié : tous les rapports générés (`ASTRA_REPORT=1`, 19 fichiers) rejoués dans le vrai jeu,
  382 images essayées, aucune erreur. Tests : 191/191 en ~6,6 s (avant : ~6,4 s). Rapports de
  5,6 Mo en tout (le plus gros 1,2 Mo), écrits seulement en cas d'échec ou avec `ASTRA_REPORT=1`.
- Modifie D-129 et D-135. Qui : Vincent (choix A), Claude (méthode). Source : session `0cb6f324`.
  Statut : en vigueur.

**D-141 — Tous les tests sont des simulations**
- 2026-11-01 21:04. Contexte : « apres absolument tous les tests doivent etre des simulations »
  (73 tests restaient des `test(…)` simples, D-132 les laissait ainsi).
- Choix : les 73 deviennent des `scenario(…)` : 191 scénarios sur 191 tests. Chaque `assert`
  d'avant est gardé tel quel (aucun retiré ni modifié, titres inchangés). Chaque scénario installe
  la situation dans une vraie partie (`newGame`) et fait au moins une image de l'écran du joueur
  là où l'effet se voit (fiche de planète, carte, bandeaux, journal) ; le rapport la rejoue dans
  le vrai jeu (D-140). Quand l'effet n'a pas d'écran (tables de coûts, géométrie du doigt, combat
  calculé à part, données trafiquées), l'image montre où le joueur le rencontre et un commentaire
  le dit ; la valeur reste vérifiée par les `assert`. Quelques vérifications ajoutées (alertes de
  la planète en jeu = celles du test ; rapport trafiqué lu par B borné ; départs de flotte
  acceptés). `tests/peer.test.mjs` : le gros message est maintenant une vraie copie de partie
  (alourdie à plus de 600 000 caractères) que B fusionne.
- Choix de Claude, par défaut : conversion faite par 4 agents en parallèle, un groupe de fichiers
  chacun, relue ensuite (aucune ligne `assert` retirée dans le diff).
- Vérifié : 191/191 en ~6,5 s ; avec `ASTRA_REPORT=1`, 22 rapports (13 Mo) ; 438 images (début,
  milieu, fin de chaque scénario) rejouées dans le vrai jeu sans erreur.
- Modifie D-132. Qui : Vincent (demande), Claude (méthode). Source : session `0cb6f324`. Statut :
  en vigueur.
- Statut : en vigueur. 189/189.

**D-142 — Seul dans la partie et éliminé : c'est perdu, personne ne gagne** (modifie D-089)
- 2026-11-01 21:19 (UTC). Bug signalé par Vincent : « je suis tout seul dans la partie, et je
  viens d'être éliminé, mais le jeu me dit Victoire ».
- Cause : `checkOver` prenait toujours le premier du classement comme vainqueur. Seul, la partie
  ne finit que quand le froid a tout pris, et le premier (le seul) est donc le joueur éliminé.
- Choix : seul (un seul joueur dans la course, `inRace`), `p.over = { at, winner: null }` ;
  journal « Fin de la partie : le froid a tout pris. » ; `Session.over` accepte `winner: null`
  et lit aussi une vieille fiche seule (« A gagne » écrit avant ce correctif) comme perdue ;
  bandeau « Perdu. · partie finie ». À plusieurs, rien ne change (le dernier en vie gagne ; tous
  tombés : le dernier tombé, D-089 et D-102).
- Pas de nouveau `FORMAT` : seul, aucun autre téléphone ne lit ma fiche. Une partie à deux où un
  seul joueur est entré dans la course compte comme « seul » (non confirmé en vrai jeu).
- Écarté : laisser la victoire et changer seulement le texte (le classement et la courbe
  diraient encore « gagné ») ; donner la victoire à un joueur seul qui a survécu longtemps (il
  n'y a pas d'autre fin seul que tout perdre).
- Qui : Vincent (le bug), Claude (la correction). Source : session `1b635a47`.
- Numéro pris après D-133 à D-141 de la PR VincentBee/astra#17 ; elle a été fusionnée avec ces
  numéros, donc pas de renumérotation.
- Statut : en vigueur. Test : `end.test.mjs` « seul et éliminé : la partie finit sur une
  défaite, pas une victoire ».

**D-143 — Écran « Fin de partie » : classement final et médailles or, argent, bronze** — modifiée par D-145 (plus de ligne « X gagne. » dans l'écran)
- 2026-11-01 21:19 (UTC). Demande de Vincent : « il faudrait que le jeu affiche un splash screen
  "fin de partie" avec le classement des joueurs dans un leaderboard, avec un badge en or pour
  le premier, un en argent pour le deuxième, et un en bronze pour le 3e ».
- Choix : une fenêtre `#sheet-finish` (même modèle que les autres fenêtres `.sheet`, centrée)
  s'ouvre une fois par partie quand elle finit (clé « gid@heure de fin », en mémoire) ;
  bouton **Classement** dans le bandeau pour la rouvrir ; croix, Échap, toucher du fond ou
  **Revoir la carte** pour la fermer ; lien **Voir la courbe des points**.
- Classement : `session.ranking(over.at)` (l'ordre du jeu) ; points affichés = `best` (points
  d'avant la chute pour un joueur tombé, sinon ses points), pour que le nombre suive l'ordre ;
  « éliminé » ou « en vie » ; mon joueur encadré, avec « toi ».
- Médailles carrées (angles droits) en couleurs `--gold`, `--silver`, `--bronze`, avec la place
  écrite dedans ; les suivants ont la place sans couleur. **Pas de médaille sans vainqueur**
  (seul et éliminé, D-142) : une médaille d'or sur une défaite referait le bug.
- Le calcul est dans `js/finish.js` (`finalBoard`), sans DOM, pour être testé en scénario ;
  `js/app.js` ne fait que l'afficher.
- Écarté : un nouvel écran plein (`#screen-…`) : on ne pourrait plus revoir la carte derrière ;
  une icône de médaille dessinée (le carré coloré avec le chiffre se lit mieux en petit).
- Qui : Vincent (la demande), Claude (la forme). Source : session `1b635a47`.
- Numéro gardé après la fusion de la PR VincentBee/astra#17 (D-133 à D-141).
- Statut : en vigueur. Tests : `finish.test.mjs` (2 scénarios). Vérifié dans le navigateur
  intégré (fin seul : « Perdu », sans médaille ; fin à quatre : or, argent, bronze, moi encadré ;
  format téléphone ; fermeture et réouverture).

**D-144 — Cache `astra-p2p-v74`**
- 2026-11-01 21:19 (UTC). Nouveau fichier `js/finish.js` et changements de `index.html`,
  `style.css`, `js/app.js`, `js/session.js` : le service worker passe à `astra-p2p-v74` (v70 à
  v73 pris par la PR VincentBee/astra#17, fusionnée dans `main`). Qui : Claude par défaut. Statut : en vigueur.

**D-145 — L'écran de fin ne répète pas qui gagne** (modifie D-143)
- 2026-11-01 21:37 (UTC). Demande de Vincent, en montrant la ligne « J0 gagne. » de l'écran de
  fin : « retire ca ».
- Choix : la ligne `#finish-result` (« Victoire ! », « X gagne. », « Perdu : le froid a tout
  pris. ») est retirée de l'écran ; `finalBoard` ne donne plus que `rows`. Le classement et la
  médaille d'or disent qui gagne ; le bandeau `#race` garde « Victoire ! », « X gagne. » ou
  « Perdu. » (D-142).
- Cache `astra-p2p-v75` (changement de `index.html`, `style.css`, `js/app.js`, `js/finish.js`).
- Qui : Vincent. Source : session `1b635a47`. Statut : en vigueur. Vérifié dans le rapport du
  test (`finish.test.html`, vrai jeu) : l'écran commence par le classement.

**D-146 — Le doigt se dessine dans la simulation**
- 2026-11-01 21:52. Contexte : « dans le test "D-126 : le doigt a une taille fixe à l’écran,
  jamais moins de MIN_REACH case" qu'est ce qu'il faut voir dans la simulation ? tu pourrais
  mettre en evidence l'objet du test ? ». Réponse : rien ; l'image montrait seulement la fiche de
  la planète mère, le doigt et le zoom n'étaient vérifiés que par les `assert`.
- Choix : nouvelle attente de `film.look` : `{ finger: { at, px, zoom }, hits: case ou null }`.
  Le film vérifie lui-même, avec `underFinger` (js/aim.js), quelle planète est sous le doigt, et
  enregistre le doigt dans l'image. En lecture seule (`index.html?view`), la carte se met au zoom
  du test, centrée sur le toucher, et un cercle blanc en pointillés montre la portée vérifiée
  (`reach(px)`, en cases), avec sa valeur ; si le minimum `MIN_REACH` joue, un petit cercle dedans
  montre ce que couvriraient 18 px seuls. Même cercle sur la carte de contrôle. Le scénario a trois
  images : carte entière, toucher à 0,8 case (planète dessous, fiche ouverte) ; à 1,2 case (rien) ;
  zoom 4, toucher à 0,5 case (planète dessous grâce au minimum de 0,6 ; 0,25 sans lui).
- Choix de Claude, par défaut : le cercle a la taille vérifiée par le test (`px` du test : 18 ou
  72), pas celle des cases de l'iframe (≈ 19 px) : l'image montre ce qui a été vérifié. Il passe
  par-dessus la fiche de planète (c'est une annotation, elle doit se voir en entier). Chaque image
  remet le zoom à 1 (sinon le zoom d'une image restait pour la suivante). Seul ce scénario utilise
  le doigt ; les autres scénarios D-126 pourraient en profiter (non fait).
- Vérifié : 191/191 ; une attente fausse (`hits: null` au lieu de la planète) fait échouer le
  scénario ; les trois images vues dans le rapport servi par `node tests/ui/server.mjs`, sans
  erreur dans la console.
- Qui : Vincent (demande), Claude (méthode). Source : session `f2222601`. Statut : en vigueur.

**D-147 — Chaque test montre ce qu'il vérifie, fichier par fichier**
- 2026-11-01 22:09. Contexte : « est ce que chaque test a un highlight ? » → non : 124 scénarios
  sur 191 ne montraient aucune vérification ; puis « Oui, par fichier » (bouton proposé par
  Claude, en commençant par `decisions-flotte`, 29 sans rien).
- Choix : nouvelle attente générique de `film.look` : `{ show: 'carburant', at, expected, got,
  ok }`. Le film la vérifie (`isDeepStrictEqual`, ou `ok` donné par le test quand il compare avec
  une marge) et la montre : dans la liste des vérifications, sur la carte de contrôle, et dans le
  vrai jeu (lecture seule) par un anneau vert ✔ ou rouge ✖ posé sur la case (`at: { x, y }`) ou
  sur la flotte (`at: [session, id]`, à l'endroit où la carte la dessine). Valeurs écrites en
  clair (nombres arrondis, oui / non, « rien », ressources en icônes). (Première version : une
  étiquette de texte sur la carte ; remplacée par numéro + légende, voir plus bas.)
- `tests/decisions-flotte.test.mjs` : les 30 scénarios montrent ce qu'ils vérifient (il en
  restait 0 sans vérification). Là où une valeur n'était connue qu'après l'image, l'appel est
  avancé (ex. `refuelFleet`, `chaseFleet`, `answerTrade`) ou une image est ajoutée à la fin.
- Choix de Claude, par défaut : les `assert` restent (D-141) ; `show` s'ajoute. 107 `assert`
  avant et après ; 18 lisent maintenant une variable (la valeur calculée pour l'image) au lieu
  d'appeler la fonction eux-mêmes. Un fichier à la fois, l'utilisateur valide avant le suivant.
- Vérifié : 191/191 ; une valeur fausse (`expected` 75 au lieu de 74) fait échouer le scénario
  avec « carburant : 74 (attendu : 75) » ; les 108 images du rapport rejouées dans le vrai jeu
  sans erreur.
- Suite (22:12, « Oui, continue ») : `tests/fleet.test.mjs`, 20/20 scénarios montrent ce qu'ils
  vérifient ; 62 `assert` avant et après ; 135 images rejouées sans erreur. Une flotte que le
  joueur n'a pas (détruite, posée, fusionnée, ou pas encore reçue) met son étiquette en haut de
  la carte au lieu de faire échouer le scénario.
- Suite (22:18, « Oui, continue ») : `tests/decisions-reseau.test.mjs`, 19/19 scénarios montrent ce
  qu'ils vérifient ; 78 `assert` avant et après. Les fonctions sans écran (fusion, historique,
  rendez-vous, icônes, fond) montrent leurs valeurs dans la légende.
- Modifié en cours de route (« probleme d'affichage ? je ne vois pas tous les message, trouve une
  autre maniere d'afficher ca », puis « une legende peut etre ? ») : les étiquettes de texte sur la
  carte se chevauchaient et sortaient du bord. Maintenant, sur l'écran du joueur : seulement un
  anneau vert (✔) ou rouge (✖) avec un **numéro** ; le texte est dans la **légende**, à droite du
  téléphone dans le rapport (la liste des vérifications, numérotée : ① ② …). Une vérification
  sans place sur la carte n'est que dans la légende. Alternatives écartées : étiquettes repoussées
  pour ne pas se toucher (essayé : encore illisible au bord), cadre de texte par-dessus la carte
  (cache la carte). Qui : Vincent (la légende), Claude (pastilles numérotées).
- Suite (22:21, « Oui, continue ») : `tests/start.test.mjs`, 11/11 scénarios montrent ce qu'ils
  vérifient ; 53 `assert` avant et après.
- Suite (22:26, « Oui, continue ») : `tests/end.test.mjs`, 10/10 scénarios montrent ce qu'ils
  vérifient (score, froid, élimination, conquête, gagnant) ; 39 `assert` avant et après.
- Suite (22:32, « Oui, continue ») : `tests/decisions-planete.test.mjs`, 26/26 scénarios montrent
  ce qu'ils vérifient (7 n'en montraient aucune : races, carte, planète mère disputée, recherche,
  petits corps) ; 116 `assert` avant et après.
- Suite (22:35, « Oui, continue ») : `tests/hostile.test.mjs`, 6/6 scénarios montrent ce qu'ils
  vérifient (fiches trafiquées : nom, secret, date, race, planète antidatée, horloge) ; 15 `assert`
  avant et après.
- Fin (22:40, « Oui, tout d'un coup », bouton proposé par Claude) : les 10 derniers fichiers d'un
  coup (`colony`, `combat`, `effects`, `fog`, `journal`, `peer`, `plan`, `replay`, `report`,
  `rules`), 25 scénarios. **Plus aucun scénario sans vérification montrée** (0 sur 191, compté sur
  les 22 rapports). Aucun fichier de test n'a perdu d'`assert`. Là où la valeur n'existait
  qu'après la dernière image (rejeu, fiches nettoyées, sauvegarde), une image est ajoutée à la fin.
  Valeur vide montrée « rien ».
- Fusion avec `main` (22:55, à l'ouverture de la PR) : une autre session avait pris D-142 à D-145
  et le cache v75 ; ces deux décisions, d'abord numérotées D-142 et D-143 dans cette branche,
  deviennent D-146 et D-147. Cache `astra-p2p-v76`. Les 3 scénarios venus de `main` (écran de fin,
  D-142 / D-143) reçoivent aussi leurs `show` : 194 scénarios sur 194 montrent ce qu'ils
  vérifient. L'étiquette de `end` sur le joueur seul gelé suit D-142 (personne ne gagne).
- Qui : Vincent (demande), Claude (méthode). Source : session `f2222601`. Statut : en vigueur.

**D-148 — Plus de texte d'explication en tête des rapports de scénario** (modifie D-140, D-147)
- 2026-11-02 07:52. Contexte : Vincent demande de retirer le paragraphe « À gauche, l'écran du joueur qui
  regarde… au même numéro. » en haut de chaque rapport (`tests/scenario.mjs`).
- Choix : le paragraphe et son style (`.legend`) sont retirés ; le rapport commence par le titre
  du fichier et le résumé, puis les scénarios. La légende numérotée de chaque image (D-147) reste.
- Qui : Vincent. Source : session `f2222601`. Statut : en vigueur.

**D-149 — Plus de badge « simulation » dans la liste des tests** (modifie D-130)
- 2026-11-02 07:55. Contexte : « Vu que tous les tests sont des simulations, est-ce que tu peux retirer le
  badge simulation dans la liste ? » (tous les tests sont des scénarios depuis D-141).
- Choix : `tests/ui/index.html` n'affiche plus le badge à côté de chaque test (ni son style
  `.badge`) ; la phrase d'accueil qui l'expliquait devient « Chaque test montre l'écran du joueur,
  image par image, et ce qu'il vérifie. ». Le message « Ce test n'a pas de simulation » reste,
  pour un éventuel `test(…)` simple à venir.
- Vérifié dans le navigateur : liste sans badge ; un test lancé montre toujours sa simulation.
- Qui : Vincent. Source : session `f2222601`. Statut : en vigueur.

**D-150 — Plus de boutons « Lancer » dans le panneau de droite de l'interface de test** (modifie D-130)
- 2026-11-02 08:03. Contexte : « supprime ces deux boutons depuis la partie droite de l'écran puisqu'ils sont
  déjà dans la liste. » (« Lancer ce test », « Lancer le fichier »).
- Choix : `tests/ui/index.html` : les deux boutons et leur gestionnaire de clic sont retirés du
  panneau de droite ; on lance un test ou un fichier par son ▶ dans la liste (ou Entrée, ou
  « Tout lancer »). Le message d'un test pas encore lancé dit « (▶ dans la liste) ».
- Vérifié dans le navigateur : le ▶ de la liste lance le test, le panneau montre le résultat et
  la simulation.
- Qui : Vincent. Source : session `f2222601`. Statut : en vigueur.

## 2 novembre 2026 (soir) — jouer contre une IA

**D-151 — L'IA est un joueur comme un autre, qui joue sur le téléphone de l'hôte**
- 2026-11-02 20:35. Contexte : « Je voudrais pouvoir jouer contre une ia ». Le jeu n'a pas de
  serveur et chaque joueur est le seul à écrire sa fiche (D-001, `reseau.md` §1).
- Choix : une IA est une `Session` de plus (`js/bot.js`), avec sa propre fiche et son propre
  identifiant, qui tourne dans la page de celui qui l'a ajoutée (l'hôte). Elle est reliée à la
  `Session` de l'hôte par un **lien en mémoire** (`localPair`) qui a l'interface d'un lien WebRTC
  (`send`, `onmessage`, `onclose`, `close`, `route`) : messages en JSON, livrés juste après
  (microtâche). L'hôte l'accueille comme un invité (`addPlayer`, entrée au journal, fiche
  diffusée) ; elle joue avec les ordres de l'interface (`chooseRace`, `ready`, `planBuild`,
  `research`, `buildShips`, `takeOff`, `moveFleet`, `power`) : ses ordres vont dans son journal
  et **la partie se rejoue** (vérifié). Elle ne sauve rien et n'appelle personne (`save`,
  `meet`, `dial` neutralisés) : l'hôte sauve toute la partie. `Session.end` arrête ses IA.
- Alternatives écartées : l'hôte qui écrit lui-même la fiche de l'IA (deux auteurs pour une
  fiche, contraire à D-001) ; une IA sur un serveur (pas de serveur) ; une IA sans fiche, hors
  des règles (pas de rejeu, règles en double).
- Limites : l'IA ne joue que tant que la page de l'hôte est ouverte (comme un joueur, sa planète
  continue de produire, mais elle ne donne plus d'ordres) ; dans une partie à plusieurs
  téléphones, les autres reçoivent sa fiche par l'hôte et la voient « hors ligne » : **non
  confirmé**, pas testé entre téléphones. Elle ne répond pas aux offres d'échange (elles
  expirent).
- Qui : Vincent (demande), Claude (conception, par défaut). Source : session `012yisg2`. Statut :
  en vigueur.

**D-152 — Le cerveau de l'IA : des règles par race, des ordres vérifiés d'avance**
- 2026-11-02 20:35. Choix : `think(session)` toutes les 3 s (`THINK_MS`), **3 ordres au plus**
  par passage, et seulement des ordres qui passeront (un ordre refusé s'inscrit quand même au
  journal de la fiche, D-045) : recherche et vaisseaux essayés sur une copie de la planète
  (`startResearch`, `startShips`), bâtiments mis au **fil de construction** (D-105), qui se
  lance seul quand le stock suffit. Par planète : d'abord ce qui manque pour vivre (énergie avec
  12 % de marge, nourriture, logement des humains ; pas de mine humaine sans bras), puis une liste
  d'étapes par race (`PLAYBOOK`), puis production et défense à tour de rôle ; les dernières
  places de la planète mère vont au labo 2 et au chantier naval ; un bâtiment trop cher pour
  l'entrepôt fait monter l'entrepôt. Recherche : une liste par race (colonisation tôt, puis
  armes). Chantier naval : un colonisateur tant qu'elle a moins de 4 planètes (`WANT_PLANETS`),
  sinon des vaisseaux de guerre avec ce qui dépasse une réserve. Colonies : la planète libre que
  le froid prendra le plus tard, pas trop loin. Attaque : `conquer` quand le combat calculé
  (`battle`, défense comprise, comme le menu « Conquérir … · défense ⚔ ◇ ») est gagné en gardant
  au moins la moitié de la flotte. Le froid presque là : les vaisseaux posés partent sur la
  planète qui tiendra le plus longtemps. Aliens : arrachement et transe dès qu'ils sont prêts.
  Race : la moins prise (au hasard entre ex æquo) ; noms « IA Véga », « IA Orion »…
- Mesuré (simulation, 3 IA, une par race) : chacune fonde sa planète en moins de 3 min,
  colonise, se bat ; la partie finit en 19 à 28 min par un gagnant ; ≈ 150 à 550 ordres par IA.
  Les machines de l'IA gagnent le plus souvent ; les humains de l'IA sont les plus faibles.
  **Non confirmé** : la force de l'IA face à un vrai joueur.
- Alternatives écartées : recherche par simulation (comme le guide des races) ou arbre de
  décision appris (trop lourd pour un téléphone, toutes les 3 s) ; plusieurs niveaux de
  difficulté (pas demandé : un seul niveau pour commencer).
- L'IA lit les planètes adverses dans sa copie de la partie (pas de brouillard pour elle, D-124) ;
  elle ne suit pas les flottes ennemies. Choix par défaut, à revoir si elle paraît tricher.
- Qui : Claude, par défaut. Source : session `012yisg2`. Statut : en vigueur.

**D-153 — Trêve : l'IA ne conquiert pas avant 10 min**
- 2026-11-02 20:35. Contexte : sans trêve, en simulation, l'IA machine conquiert dès 14 min et
  la partie finit à 19 min, avant que le froid compte.
- Choix : `PEACE_MS = 10 min` après le départ : avant, l'IA construit, colonise et arme, mais
  n'attaque pas. Les joueurs, eux, n'ont pas de trêve.
- Alternatives écartées : pas de trêve ; une trêve plus longue (le froid commence à 12 min :
  l'IA doit pouvoir prendre des planètes quand il se resserre).
- Qui : Claude, par défaut. Source : session `012yisg2`. Statut : en vigueur. Testé :
  `tests/bot.test.mjs` (aucune conquête avant 10 min dans une partie de 3 IA).

**D-154 — Où l'on ajoute une IA : « Contre l'IA » à l'accueil, « Ajouter une IA » au départ**
- 2026-11-02 20:35. Choix : sur l'accueil, sous « Créer » et « Rejoindre », le bouton
  **Contre l'IA** (icône `bot`, tête de robot) crée une partie et y ajoute une IA ; dans le
  bandeau du départ, tant que la partie n'est pas partie, **Ajouter une IA** (à côté
  d'« Inviter ») en ajoute une de plus, jusqu'à 8 joueurs. L'IA choisit sa race et se dit prête
  aussitôt : la partie part quand le joueur est prêt. Dans la fenêtre Joueurs, une IA est
  « IA sur ce téléphone » (au lieu de la latence et du chemin réseau).
- Alternatives écartées : un écran de réglage (nombre d'IA, races) avant la partie (plus de
  clics) ; un mode « solo » à part (même partie que les autres : on peut aussi inviter des
  joueurs).
- Vérifié dans Chromium (390 × 844) : accueil, salon avec deux IA prêtes, départ, planètes des
  IA fondées en 1 min, reprise depuis l'historique avec les IA reliées. Cache `astra-p2p-v77`
  (`js/bot.js` pré-caché).
- Qui : Claude, par défaut. Source : session `012yisg2`. Statut : en vigueur.

**D-155 — Les IA d'un téléphone sont notées dans sa sauvegarde, et se réveillent à la reprise**
- 2026-11-02 20:35. Choix : la sauvegarde locale (`astra.save`, historique `astra.saves`) garde
  `bots` : les identifiants des IA que ce téléphone fait jouer (`saveGame(…, bots)`,
  `Session.botIds`). À la reprise, `wakeBots` recrée leurs `Session` sur la partie reprise ;
  leur premier passage rattrape le temps écoulé, comme pour un joueur. Le format des fiches ne
  change pas (`FORMAT` reste 9).
- Alternatives écartées : un champ « IA de tel joueur » dans la fiche (un joueur malveillant
  pourrait se déclarer IA de mon téléphone et faire jouer sa fiche par lui) ; ne pas reprendre
  les IA (la partie reprise serait sans adversaire).
- Qui : Claude, par défaut. Source : session `012yisg2`. Statut : en vigueur.
**D-156 — Une planète s'ouvre toujours sur ses bâtiments**
- 2026-11-02 10:56. Contexte : « Quand on va sur une planette, la vue par defaut est la liste des
  batiments ». Jusque-là, l'écran planète rouvrait le dernier onglet choisi (Bâtiments, Pouvoirs,
  Recherche ou Flottes), retenu en mémoire et dans `localStorage` (`astra.tab`), même d'une
  planète à l'autre et d'une partie à l'autre.
- Choix : `showView('planet', …)` appelle `showTab('build')` à chaque ouverture (bouton de la
  fiche de la carte, alerte, autre planète). On change d'onglet librement pendant la visite ; au
  retour sur la carte, l'onglet est oublié. `chosenTab`, l'écriture et la lecture de `astra.tab`
  sont retirées ; la vieille clé est effacée au chargement. Cache `sw.js` v78 (v77 pris par D-151 à D-155).
- Écarté : garder l'onglet retenu au sein d'une même session (seulement le premier affichage
  sur Bâtiments) — la demande parle de chaque arrivée sur une planète.
- Vérifié dans le navigateur (`index.html?view`, partie à un joueur) : ouverture → Bâtiments ;
  Recherche → carte → planète → Bâtiments. 194/194 tests (198/198 après la reprise sur `main`, D-151 à D-155 de l'IA).
- Qui : Vincent (demande), Claude (portée : à chaque ouverture). Source : session `012yisg1`.
  Statut : en vigueur.
**D-157 — Fil de construction sur deux lignes**
- 2026-11-02 22:22. Contexte : « La file de batiment provoque un scroll horizontal ». Chaque
  ligne du fil (`#plan`) mettait le nom, l'heure estimée et le × sur une seule ligne ; l'heure
  (« ≈ dans 1:23:45 → fini dans 1:30:12 ») ne pouvait pas passer à la ligne, et la grille `.plan`
  s'élargissait pour la contenir : 484 px de page sur un écran de 360.
- Choix : `.plan-item` devient une grille : nom (coupé par « … » s'il est trop long) en haut,
  heure dessous (peut passer à la ligne), × à droite sur les deux lignes. `.plan` a
  `grid-template-columns: minmax(0, 1fr)` pour ne jamais déborder. Seulement du CSS
  (`style.css`) ; cache `sw.js` v79.
- Écarté : couper l'heure par « … » (on perdrait l'heure de fin) ; raccourcir le texte de
  l'heure (le débordement reviendrait avec un nom long ou un écran plus étroit).
- Vérifié dans Chromium (montage de l'écran planète avec 3 lignes au plus long) : 360 et 320 px,
  page à la largeur de l'écran.
- Qui : Vincent (demande), Claude (mise en page sur deux lignes, par défaut). Source : session
  `012yisg1`. Statut : en vigueur.
**D-158 — Recherches et vaisseaux dans le fil d'attente**
- 2026-11-02 22:24 (message reçu pendant le travail précédent, heure à la minute près non confirmée). Contexte : « Il faut aussi pouvoir mettre des recherches et des flottes dans
  la file ». Le fil (D-105) ne tenait que des bâtiments ; la recherche et le chantier naval ne
  pouvaient être lancés qu'à la main, labo ou chantier libre et stock suffisant.
- Choix :
  - **Un seul fil par planète**, où se mêlent bâtiments, recherches et lots de vaisseaux (« flottes »
    compris comme les lots du chantier naval : un décollage ne se met pas au fil). Chaque élément
    attend son chantier ; le chantier, le labo et le chantier naval avancent en même temps.
  - **Ordre** : un élément dont le chantier est occupé, ou à qui il manque un prérequis, ne
    bloque pas les autres chantiers ; le premier élément prêt a la priorité sur le stock (les
    suivants ne le doublent pas pour une question de prix). Un prix plus grand que l'entrepôt
    compte comme un prérequis manquant (sinon il bloquerait tout le fil pour toujours).
  - **Ajout fil compris** : labo, chantier naval, niveaux et prérequis se comptent avec ce qui
    est déjà au fil (labo puis recherche, propulsion puis cargos, d'un coup).
  - Format : un bâtiment reste son nom (les fiches et les rejeux d'avant restent valables), une
    recherche `{ tech }`, un lot `{ ship, n }`. Fil de **12** éléments au plus (8 avant : trop
    court pour trois chantiers). Format de fiche **10** (une version d'avant verrait un fil
    tronqué : elle est prévenue qu'une mise à jour existe). Cache `sw.js` v80.
  - Interface : le fil sort de l'onglet Bâtiments, visible sous les onglets ; boutons ↑ / + sur
    les recherches, ×n / +n sur les vaisseaux, comme pour les bâtiments.
- Écarté : trois fils séparés, un par chantier (plus d'écrans, et l'ordre entre une recherche
  et un bâtiment qui se disputent le stock ne se dirait pas) ; ordre strict, où la tête du fil
  bloque tout (une recherche attendrait la fin d'un bâtiment alors que le labo est libre) ;
  premier payable d'abord, sans priorité (un bâtiment cher serait doublé sans fin par des petites
  recherches).
- Limite : « pas la même technologie sur deux planètes à la fois » n'est vérifié qu'à l'ajout au
  fil (non constaté en partie).
- Les IA (D-151) n'utilisent toujours le fil que pour les bâtiments ; leur calcul des places ne
  compte plus que les bâtiments du fil.
- Vérifié : 6 nouveaux scénarios (`tests/plan.test.mjs` : trois chantiers à la fois, chantier
  occupé, priorité sur le stock, labo puis recherche et estimation, le joueur avec refus,
  retrait et rejeu identique, fil abîmé nettoyé) ; 204/204 ; vu dans Chromium à 360 et 320 px.
- Qui : Vincent (demande), Claude (un seul fil, règle d'ordre, 12 éléments, par défaut). Source :
  session `012yisg1`. Statut : en vigueur. Modifie D-105.
**D-159 — Toucher une autre de mes flottes : fusionner, ou la rejoindre pour fusionner**
- 2026-11-02 22:40. Contexte : « Faciliter la fusion de flotte quand on clique sur une flotte
  allié ». Il n'y a pas d'alliance dans le jeu : compris comme **une autre de mes flottes**
  (non confirmé). Avant, flotte choisie, toucher une autre de mes flottes la choisissait à la
  place (D-126, point 5) ; fusionner demandait d'amener les deux sur la même case, à l'arrêt,
  puis le bouton « Fusionner ici » de la fiche.
- Choix :
  - Flotte choisie, toucher une autre de mes flottes ouvre le menu au doigt : en premier
    « **Fusionner avec Flotte N** » (déjà arrêtées ensemble : fusion tout de suite, l'autre
    passe dans la flotte choisie, comme « Fusionner ici ») ou « **Rejoindre Flotte N et
    fusionner** » (sinon), puis « Choisir · Flotte N » pour changer de flotte comme avant.
  - Nouvel ordre `joinFleet` / `{ kind: 'join', fleet }` : la flotte va là où l'autre attend
    (ou là où elle va) et s'y fond à l'arrivée ; si l'autre est encore en route vers la même
    case, elle l'attend ; si l'autre est partie ailleurs, l'ordre tombe et la flotte reste sur
    place (noté au journal). Si la flotte choisie disparaît ainsi, la fiche suit celle qui l'a
    absorbée.
  - Pas de nouveau `FORMAT` (un téléphone d'avant affiche « Ordre » et n'exécute pas les ordres
    des autres) ; cache `sw.js` v81.
- Écarté : fusionner en lâchant une flotte traînée sur une autre (D-126 a exclu mes flottes des
  cibles d'un glissé, pour qu'une flotte en orbite ne cache pas sa planète : gardé) ; poursuivre
  une flotte en route comme une flotte ennemie (`chase`) : plus lourd, et on rejoint en général
  une flotte à l'arrêt ; fusionner sans menu au toucher (on ne pourrait plus changer de flotte
  d'un toucher).
- Vérifié : 5 scénarios (`tests/fleet.test.mjs` « jonction : … ») ; 209/209 ; menu vu dans
  Chromium.
- Qui : Vincent (demande), Claude (menu, ordre, attente, par défaut). Source : session
  `012yisg1`. Statut : en vigueur. Modifie D-126 (point 5).


**D-160 — Les ordres d'assaut montrent les vaisseaux posés et une estimation du combat**
- 2026-10-30 14:05. Contexte : recette (point 1.2) : « Conquérir X · défense ⚔ ◇ » ne comptait que
  les bâtiments (`fortOf`) ; un joueur a vu « ⚔54 ◇1380 » sur une planète qui avait 7 + 9
  vaisseaux posés, et a perdu des assauts d'avance.
- Choix : « Attaquer » et « Conquérir » affichent la même fin : « défense ⚔ a ◇ c + N vaisseaux
  posés · estimation ». Hors de ma détection, « + ? vaisseaux ». L'estimation joue `battle`
  maintenant avec ce que je vois (`assaultView`, `js/session.js`).
- Choix de Claude, par défaut : trois issues. « bataille perdue » si le combat est perdu (même sans
  voir les vaisseaux : ils ne feraient qu'ajouter) ; « victoire incertaine » si gagné sans voir les
  vaisseaux, ou en perdant plus de la moitié de la flotte ; sinon « victoire probable ». Calcul à
  l'heure présente, pas à l'arrivée : la planète peut bâtir ou recevoir des renforts d'ici là.
- Alternatives écartées : additionner vaisseaux et bâtiments en un seul ⚔ ◇ (on ne voit plus ce
  qui vient d'où) ; simuler à l'heure d'arrivée (on ne connaît pas ce que l'autre fera d'ici là).
- Qui : Vincent (demande), Claude (forme et seuils). Source : session `fb0c1844`. Statut : en vigueur, modifiée par D-190 (hors de ma détection, plus de défense ni d'estimation).
- Tests : `tests/end.test.mjs`, trois tests « Attaquer » et « Conquérir »… / sans vaisseaux posés / hors de ma détection.

**D-161 — Cache `astra-p2p-v82`**
- 2026-11-03. Contexte : fusion de `main` (D-157 à D-159 et cache v81 déjà pris) dans la PR des ordres d'assaut (D-160).
- Choix : `VERSION` passe à `astra-p2p-v82` pour que les téléphones prennent le nouveau `session.js`.
- Qui : Claude, par défaut. Source : session `fb0c1844`. Statut : en vigueur.

**D-163 — Le froid détruit les flottes qu'il atteint (issue #33)**
- 2026-11-06 17:40. Contexte : issue #33. Un joueur « prêt » qui ne fondait jamais sa planète mère
  restait en vie pour toujours (`deadAt` renvoyait null sans planète, le froid ne touchait que les
  planètes) : il bloquait la fin par conquête et gagnait vers 34 min, quand le froid avait pris
  les planètes des autres. Aussi le cas d'un joueur prêt qui ferme l'appli avant que sa flotte
  n'apparaisse (pas de `since`, pas de flotte).
- Choix de Vincent (transmis par la session de coordination) : **le froid détruit les flottes
  qu'il atteint**, en orbite ou en vol, celles de tous les joueurs. Un joueur qui cache sa seule
  flotte près du soleil, le dernier endroit à geler, n'est pas un problème : les flottes
  rapportent des points et l'adversaire peut la détruire. **Pas de règle en plus** (pas de délai
  pour fonder, pas d'interdiction de gagner).
- Choix de Claude, par défaut :
  - Heure de destruction = première heure où la case de la flotte est gelée, calculée sur son
    segment (`fleetFrostAt`), la même sur tous les téléphones. En vol, position regardée toutes
    les secondes (`FROST_STEP`) ; arrêtée, `frostOf(case)` exactement.
  - Une flotte qui arrive à destination avant le froid y arrive d'abord (se pose, fonde) ; celle
    qui reste en orbite est détruite ensuite.
  - Sans planète, perdre son dernier colonisateur au froid élimine **à l'heure du gel** (pas à
    l'heure où le téléphone s'en aperçoit), avec les points d'avant le gel (`deathPts`).
  - Les autres téléphones voient la flotte disparaître à l'heure du gel, sans attendre la fiche
    du propriétaire (`sees` faux) ; `deadAt` voit la mort d'un joueur sans planète hors ligne.
  - Combat : une flotte qu'un autre joueur a détruite (son rapport de combat lui enlève tous ses
    vaisseaux) disparaît aussi pour tous à l'heure du combat, sans attendre la fiche du
    propriétaire (`fleetKillAt`). Sans planète, perdre ainsi son dernier colonisateur élimine **à
    l'heure du combat**, celle que les autres ont calculée.
- Choix de Vincent, sur le joueur prêt qui se déconnecte avant que sa flotte n'apparaisse (question
  posée par Claude, réponse transmise par la session de coordination) : « quand la partie
  commence, Tous les joueurs pret ont une flotte qui apparait sur la map, meme si il sont tout de
  suite deconnecté, cette flotte est destructible par un autre joueur ou par le froit ». Mise en
  œuvre (Claude) :
  - La flotte de départ (`startFleet`) se calcule à partir de la partie seule : un colonisateur
    sur la case de départ (`startCell`), à `max(départ, ready)`, et un **identifiant tiré du gid
    et du joueur** (plus au hasard). Tant que le téléphone du joueur ne l'a pas fait apparaître,
    les autres la construisent eux-mêmes (`ghostFleet`, `fleetsOf`) : ils la voient sur la carte,
    la prennent en chasse et la combattent, le froid la détruit.
  - Détruite (combat ou froid) : le joueur est éliminé, même s'il ne revient jamais (`deadAt`).
    S'il revient, `enterRace` crée exactement la même flotte (même identifiant) : le rapport de
    combat s'applique à elle, ou le froid la détruit, à la même heure que chez les autres.
  - Pas de problème réseau : la fiche du joueur absent existe (race, `ready`) ; le combat s'écrit
    dans la fiche de l'attaquant (`effects`), comme d'habitude. Pas d'échange possible avec cette
    flotte (personne pour répondre).
- Précision de Vincent (transmise par la session de coordination) : « oui on peut attaquer les
  planetes et les flottes d'un joueur deconnecté ». Les combats contre un joueur hors ligne sont
  voulus ; la flotte de départ d'un joueur prêt jamais connecté s'attaque comme les autres, par
  le même mécanisme : poursuite (`chaseFleet`) ou flotte agressive, y compris une rencontre que
  personne ne regardait (`firstContact`, D-109).
  - Conséquence acceptée : un retardataire dont la case de départ est déjà gelée perd sa flotte
    en entrant et il est éliminé aussitôt.
- Alternatives écartées : éliminer après un délai fixe sans planète (proposé d'abord, écarté par
  Vincent au profit d'une règle de jeu) ; pour le joueur sans flotte, le tuer quand le froid
  atteint le soleil (36 min, règle à part, il gagnerait encore contre un joueur gelé à 34 min) ;
  pour le joueur sans flotte, compter seulement le gel de sa case de départ, sans flotte visible
  ni combat (première version de cette PR, remplacée par le choix de Vincent) ;
  chercher l'instant exact du gel en vol (racine) : une grille d'une seconde suffit et reste
  identique partout.
- Vérifié : `tests/frost-fleet.test.mjs` (6 scénarios, dont une flotte agressive qui croise la
  flotte de départ de B déconnecté pendant que personne ne regarde : combat à l'heure de la
  rencontre, D-109 ; et à quai, en vol, issue #33 avec rejeu
  fidèle, flotte de départ d'un joueur déconnecté vue par tous et gelée avec rejeu fidèle, A
  détruit au combat la flotte de départ de B déconnecté → B éliminé, A gagne, B retrouve la même
  flotte et la même heure en revenant) ; « D-120 : tant qu'un joueur vole vers sa planète, la
  partie ne finit pas » reste vert (pas de froid dans ce test) ; 218/218 ; vu dans le vrai jeu
  (rapport de scénario, interface de test). Rejeu du scénario de combat non vérifié : le test
  donne ses frégates à A à la main, hors de son journal d'ordres.
- Qui : Vincent (règle, flotte de départ d'un joueur déconnecté), Claude (calcul). Source :
  session `65b37922`.
  Statut : en vigueur. Modifie D-120. Cache `astra-p2p-v83`.

## 6 novembre 2026 — sauvegarde abîmée (#87)

Numéro pris haut (D-170) : les PR #158 (D-163) et celle de #45 (D-164 et suivants) prennent déjà
les numéros d'après D-161. D-162 à D-169 restent à qui en a besoin.

**D-170 — Un historique de sauvegardes abîmé est ignoré, puis réécrit propre**
- 2026-11-06 22:00. Contexte : issue #87. Une entrée invalide dans `astra.saves` (`null`, sans
  `state`, tableau, texte JSON `"abc"`) faisait lever une `TypeError` dans `saveGame`, donc dans
  chaque ordre : l'état changeait mais l'écran n'était pas prévenu. Avec un texte JSON, l'accueil
  plantait aussi au démarrage (`listGames`). Cause externe (stockage abîmé, extension, outil) : le
  joueur ne pouvait s'en sortir qu'en vidant les données du site.
- Choix de Claude, par défaut : `archive()` (`js/save.js`) part de `{}` si `astra.saves` n'est pas
  un objet simple (`isMap` : ni `null`, ni tableau, ni texte), et ne garde que les entrées qui passent
  `valid()`. `saveGame`, `listGames`, `selectGame` et `forgetGame` passent tous par `archive()`, donc
  ignorent tous les entrées abîmées. Rien n'est effacé à la lecture : l'historique est réécrit sans
  elles à la prochaine écriture (`saveGame` ou `forgetGame`). Même garde pour `astra.identities`
  (`identities()`), lu par `selectGame`, `forgetGame` et `saveIdentity`.
- Alternatives écartées : tout effacer dès qu'une entrée est abîmée (on perdrait les bonnes
  parties) ; purger à la lecture (une lecture qui écrit surprend, et la prochaine sauvegarde le fait
  de toute façon, au plus tard au premier ordre).
- Cache `sw.js` : `astra-p2p-v85` (v83 et v84 sont laissés aux PR #158 et #45).
- Vérifié : scénario « D-170 : un historique abîmé… » (`tests/decisions-reseau.test.mjs`, les 5
  formes de l'issue), qui échoue sans la correction ; vrai jeu avec `{"zzz":null}` puis `"abc"`.
- Qui : Vincent (demande : corriger #87), Claude (forme de la correction). Source : session
  `9e675a52`. Statut : en vigueur. Complète D-066.

**D-175 — Le calcul de l'économie est borné à 2 000 pas ; l'heure d'une planète reçue a un plancher**
- 2026-11-06. Contexte : issue #32. `steps` et `until` intégraient l'économie par pas de 48 s
  sans plafond : une planète datée de très loin faisait des millions de pas. `planetOk` acceptait
  tout `at` fini : une fiche reçue avec `planet.at = 0` figeait la page de chaque téléphone qui
  l'affichait (≈ 37 millions de pas par `stateAt`). Numéro : D-163 à D-169 étant pris ou réservés
  par d'autres PR, cette PR prend D-175.
- Choix de Claude :
  1. **Nombre de pas borné** : `stepOf(durée) = max(1 s, min(2 h de jeu, durée / 300),
     durée / MAX_STEPS)`, `MAX_STEPS = 2000`, dans `steps` et `until`. Le troisième terme ne
     gagne qu'au-delà de 2 000 × 48 s ≈ 26,7 h : sous cette durée (donc toute partie normale,
     et tout écart de moins de 4 h), les pas sont exactement ceux d'avant, l'économie ne change
     pas d'un chiffre. Aucune question au router n'était donc nécessaire. Le calcul reste
     déterministe : le pas ne dépend que de la durée. Au-delà de 26,7 h, les pas s'allongent :
     le résultat reste fini et positif (vérifié sur les trois races à `at = 0`) mais
     s'éloigne de ce que donneraient des passages réguliers.
  2. **Plancher de l'heure dans `planetOk`** : `at` est **ramené** (pas refusé) au plancher
     connu par la fiche elle-même : `since` (entrée dans la course, écrite une fois) pour la
     planète mère ; le plus tardif de `since` et de `claimAt` pour une colonie. Aucune planète
     n'existe avant ces heures (`newPlanet` naît à l'heure de l'installation ou de l'arrivée,
     `settle` n'avance que vers l'avant). Ramener plutôt que refuser : `normalize` passe aussi
     sur ma propre fiche au chargement (`clean`), un refus effacerait ma planète au moindre
     écart ; ramener ne crée rien (le tricheur perd la production d'avant le plancher).
- Alternatives écartées : couper la durée simulée (n'intégrer que les N dernières heures) :
  aussi borné, mais change le résultat dès cette durée ; refuser la planète (`planet = null`) ;
  plancher pris sur l'heure du téléphone qui reçoit (`now`, `startedAt`) : différent d'un
  téléphone à l'autre, ou tiré des `go` que le tricheur peut aussi trafiquer ; plancher sur
  `p.claimAt` de la planète mère (`claimPlanet` garde une planète existante avec `||=`, son `at`
  peut être plus ancien).
- Limites : une fiche sans `since` (partie d'avant la course, ou retiré par le tricheur) n'a pas
  de plancher, seul `MAX_STEPS` la protège ; une heure loin dans le futur n'est pas bornée
  (`normalize` ne connaît pas l'heure, et elle ne coûte rien).
- Qui : Claude, par défaut (le ticket laissait le choix). Source : session `424ded66`, issue #32.
  Statut : en vigueur.
- Tests : `tests/rules.test.mjs` (planète datée de 1970 ou de 30 jours en moins de 100 ms ; pas
  inchangés sous 26 h ; une heure calculée d'un coup ou soldée toutes les 250 ms à 0,1 % près),
  `tests/hostile.test.mjs` (fiche reçue avec `at = 0` ramenée à `since` ; colonie ramenée à
  sa prise).

**D-176 — Cache `astra-p2p-v86`**
- 2026-11-06. Contexte : v83 (PR #158, déjà dans `main`) et v85 (PR #159, déjà dans `main`) sont pris, v84 est
  probablement réservé par la PR de #45 (non confirmé).
- Choix : `VERSION` passe à `astra-p2p-v86` pour que les téléphones prennent les nouveaux
  `game.js` et `session.js`.
- Qui : Claude, par défaut. Source : session `424ded66`. Statut : en vigueur.

**D-190 — Le menu d'ordres d'une flotte suit le brouillard**
- 2026-11-06 22:15. Contexte : issue #35. Flotte choisie, toucher une planète des autres hors de
  ma portée affichait « Attaquer Orion (IA Véga) · défense ⚔ 12 ◇ 120 + ? vaisseaux · victoire
  incertaine », alors que la fiche de la planète la disait libre (D-124). Il suffisait de choisir
  une flotte et de toucher chaque planète pour trouver les bases ennemies et leur force. Un
  colonisateur se voyait proposer « Attaquer » au lieu de « Coloniser ».
- Choix : `ordersAt` part de `knownOwner(cell)`, comme la fiche. Dans ma portée : rien ne change
  (vrai propriétaire, défense, vaisseaux posés, estimation, D-160). Hors de portée, propriétaire
  retenu : « Attaquer X (joueur) · hors de portée : défense inconnue » et « Conquérir X · hors de
  portée : défense inconnue », sans estimation (`odds` absent). Hors de portée, jamais vue (ou vue
  libre) : les ordres d'une planète libre (« Coloniser » avec un colonisateur, « Juste y aller »).
- Choix de Claude, par défaut : `moveFleet` ne refuse plus ce que je ne vois pas. « Coloniser »
  vers une planète prise hors de ma portée part ; l'arrivée dit « déjà prise : la flotte reste en
  orbite » (`arrive`, inchangé). « Attaquer » / « Conquérir » vers une planète retenue mais
  quittée depuis part aussi ; à l'arrivée, la flotte reste en orbite. Si la planète est encore
  prise, l'ordre vise son vrai propriétaire, et le combat se joue comme avant. `moveFleet` ne devient jamais plus strict : l'IA
  (sans brouillard, D-124) l'appelle avec ses propres cibles. `moveFleet` décide avec la partie
  seule (`seesCell`), jamais avec mes souvenirs (`intel`, propres au téléphone) : le replay
  (`js/replay.js`) refait la même décision. Planète libre en vrai mais hors de vue : l'ordre part
  sans cible (`pid: null`, `key: null`), la flotte reste en orbite : `arrive` ne trouve pas de
  joueur et s'arrête là, sans planter (testé). Le journal (partagé, rejoué) ne lit pas `intel`
  non plus : il nomme le propriétaire seulement à portée (« part conquérir Hadar (J1) »), hors de
  vue juste la planète (« attaque Hadar »). Avec la PR de #36 (`arrive` attaque le propriétaire
  actuel de la planète), une flotte partie vers une planète qui paraît libre combattra son vrai
  propriétaire à l'arrivée : c'est voulu (le brouillard ne change que l'affichage et le choix de
  l'ordre, pas ce qui se passe à l'arrivée). Non confirmé tant que #36 n'est pas fusionnée.
- Alternatives écartées : garder le menu et cacher seulement les chiffres (le nom du joueur
  suffisait à trouver ses bases) ; refuser « Coloniser » au départ quand la planète est prise (le
  refus disait ce que je ne vois pas).
- Qui : Vincent (la règle D-124, l'issue), Claude (la forme du libellé, `moveFleet`). Source :
  session `5c1afab8`. Statut : en vigueur. Précise D-124, modifie D-160 (cas « hors de ma
  détection »).
- Tests : `tests/vision.test.mjs`, quatre scénarios « … le menu la croit libre », « colonisateur… »,
  « à portée : … hors de portée ensuite … », « ordre « Conquérir » vers une planète retenue, quittée… » ; `tests/end.test.mjs` « hors de ma détection : ni
  défense, ni vaisseaux posés, ni estimation (D-190) ». Vu dans le navigateur.

**D-191 — Cache `astra-p2p-v87`**
- 2026-11-06. Contexte : v83 à v86 sont pris dans `main` (D-163, D-170, D-176).
- Choix : `VERSION` passe à `astra-p2p-v87` pour que les téléphones prennent le nouveau
  `session.js` (D-190). Si une autre PR prend v87 avant, monter au numéro suivant.
- Qui : Claude, par défaut. Source : session `5c1afab8`. Statut : en vigueur.

**D-164 — Horloges décalées : bloquer « Prêt » et refuser les dates « déjà arrivées » du futur (remplacée par D-165 et D-166)**
- 2026-11-06. Contexte : issue #45. Un téléphone en avance voit le froid trop tôt, écrit `p.over`
  daté dans le futur, et les autres l'adoptent : la partie finit trop tôt pour tous.
- Choix de Vincent (premier) : comparer les horloges au salon, message d'erreur et « Prêt »
  impossible si l'une est décalée ; toute date « déjà arrivée » reçue dans le futur en erreur.
  Codé sur la branche (seuil 10 s), jamais fusionné.
- Pourquoi abandonné : refuser une fiche datée du futur bloque toute la synchro du joueur en
  avance (chaque ordre date sa fiche, `actAt`, avec son heure) ; Vincent a préféré ne refuser
  personne.
- Qui : Vincent. Source : session `6a1c3a43` (via la session de coordination). Statut : remplacée
  par D-165 et D-166 avant fusion.

**D-165 — Heure commune : celle du créateur de la partie, avancée par l'horloge interne du navigateur**
- 2026-11-06. Contexte : #45 (D-164 abandonnée).
- Choix de Vincent : « n'importe laquelle est acceptée » : personne n'est refusé à cause de son
  heure. Au salon, chaque téléphone envoie son heure ; la partie compte sur l'heure du créateur.
- Comment (`js/session.js`) : `now()` = heure commune = heure du téléphone à l'ouverture de la page
  + `clockOff`, puis avancée par `performance.now()` (`clock()`). Le créateur a l'heure commune
  (`clockSynced`) ; un joueur qui ne l'a pas la prend au premier battement de cœur d'un joueur qui
  l'a (`hb`/`hb-ack` portent `w` = heure commune, `sy`, `ep`). Gardée par partie dans
  `localStorage['astra.clocks']` sous la forme « heure commune − heure du téléphone », 10
  parties au plus. Les IA prennent l'heure de leur hôte.
- Choix de Claude : `performance.now()` (changer l'heure du téléphone page ouverte ne change plus
  rien) ; mesure comme NTP, médiane des 5 derniers battements ; garder l'écart dans une clé à part
  plutôt que dans `astra.save` (ne pas toucher `js/save.js`, modifié par #87).
- Alternatives écartées : médiane des heures au départ (plus de code pour le même résultat de
  jeu) ; corriger seulement les dates reçues (chaque fonction de règle devrait savoir de qui vient
  une date).
- Effet : #45 corrigé (le froid, `checkOver` et `over` comptent sur la même heure partout).
  #48 et #92 réduits mais pas fermés : leurs critères (tests précis, pillage) ne sont pas vérifiés.
- Qui : Vincent (règle), Claude (moyens). Source : session `6a1c3a43`. Statut : en vigueur.
- Tests : `tests/clock.test.mjs`.

**D-166 — Heure qui a changé : les autres le disent, et s'ils sont tous d'accord il est resynchronisé**
- 2026-11-06. Contexte : #45, suite de D-165. Reste possible : l'heure du téléphone change
  pendant que l'appli est fermée ; à la réouverture, l'heure commune est fausse.
- Choix de Vincent : à chaque battement, les autres comparent son heure à celle attendue ; trop
  loin, ils lui envoient « ton heure a changé » (`clock-changed`, avec ce qu'ils savent de lui ;
  `clock-ok` quand c'est revenu). Si **tous** les joueurs humains en ligne avec lui qui l'ont
  mesuré (au moins 1 ; ni les IA, ni les hors ligne) le disent, il reprend l'heure du groupe, et ce
  qu'il a fait avec sa mauvaise heure est remplacé par ce que les autres savent de lui. À deux, le
  créateur de la partie l'emporte (« celui qui a fait la partie a plus de poids »).
- Comment : chaque téléphone garde la dernière fiche de chaque joueur reçue quand son heure était
  juste (`clockTrust` ; en attente tant qu'elle n'est pas mesurée). À la resynchronisation, sa
  fiche devient la plus récente de ces copies, avec `clockFix` + 1 : une fiche au `clockFix` plus
  grand l'emporte sur l'heure de fiche (`actAt`), une fiche au `clockFix` plus petit ne passe
  plus. `FORMAT` passe à 11 (un téléphone d'avant garderait la fiche fautive).
- Choix de Claude : marge de 10 s (`CLOCK_DRIFT_MS`) ; 3 mesures avant de juger ; duel sans le
  créateur : le premier arrivé (`rank`) l'emporte ; fiche relayée (pas de lien direct) jugée juste
  si elle n'est pas datée de plus de 10 s dans mon futur.
- Limites (non corrigées) : les lignes du journal partagé écrites avec la mauvaise heure restent
  (le journal est une union des copies) ; ce que la fiche fautive a déjà fait chez les autres
  (dégâts appliqués) n'est pas défait ; une heure en retard sur une fiche relayée n'est pas vue.
  Pendant les ~5 s avant le consensus (3 battements), la fiche fautive est adoptée par tous (toute
  heure est acceptée) : si elle portait une fin de partie (`over`), l'écran « Fin de partie »
  s'ouvrirait, et il ne se referme pas tout seul quand la fin disparaît (`showFinish`,
  `js/app.js`). Cache : `astra-p2p-v88` (et non v84 : `main` est passé à v85, v86 puis v87 avec #159, #160 et #161).
- Alternatives écartées : refuser la fiche (D-164) ; à deux, personne n'est corrigé (avertissement
  seul).
- Qui : Vincent (règle, duel, votants, sens de « resynchronisé »), Claude (marge, détails). Source :
  session `6a1c3a43`. Statut : en vigueur.
- Tests : `tests/clock.test.mjs` (consensus à 3, duel à 2 dans les deux sens, hors ligne, IA,
  bruit < 10 s, téléphone d'avant).

**D-180 — À l'élimination, toutes les flottes du joueur disparaissent**
- 2026-11-06 22:16. Contexte : issue #34. Les flottes en vol d'un joueur éliminé exécutaient encore
  leur ordre : une « conquête » prenait la planète d'un autre (et pouvait l'éliminer), le mort
  possédait une colonie ; une « attaque » pillait.
- Choix (Vincent, transmis par la session de coordination) : « au moment ou un joueur est
  eliminé, toute ses flottes disparaissent ». À quai ou en vol, à l'heure de l'élimination
  (`p.out`), pas à l'heure où un téléphone s'en aperçoit ; plus de combat, de pillage ni de prise
  après, même en interception ; les autres téléphones ne voient plus ces flottes, même si le mort
  est hors ligne.
- Mise en œuvre (Claude) : `eliminate(p, at, pts)` dans `js/session.js`, seul endroit qui pose
  `p.out`, appelé par `losePlanet`, `noColonizer`, `freezeFleets` et `fleetHit` (ces deux-là venus
  de D-163). Filet dans `tick` pour une fiche `out` qui a encore des flottes. Autres téléphones :
  `sees` (par `deadAt`), `ownerAt` (un joueur `out` ne possède rien ; prise après la mort de
  l'attaquant ignorée, `goneBy`), `applyEffects` (rapport daté de la mort de l'auteur ou après
  ignoré). `deadAt` date la prise d'un joueur hors ligne à l'heure du rapport de l'attaquant, plus
  à « maintenant ».
- Alternatives écartées : flottes gardées mais sans ordre, inertes (la piste de l'issue) : elles
  resteraient sur la carte et dans les combats d'interception ; test de `p.out` dans `arrive` et
  `capture` (deuxième endroit, et ne couvre pas les autres téléphones).
- Limite : fiches reçues dans le désordre (le mort livre son arrivée avant de recevoir le rapport
  qui l'élimine) : non corrigé, voir `regles.md` §19.3.
- Qui : Vincent (règle), Claude (mise en œuvre). Source : session `1d0dae27`, issue #34. Statut :
  en vigueur.
- Tests : `tests/end.test.mjs`, trois scénarios « éliminé pendant que sa flotte vole… » et
  « éliminé et hors ligne… ».

**D-181 — Cache `astra-p2p-v89`**
- 2026-11-06. Contexte : v86 (PR #160), v87 (PR #161) et v88 (PR #162) sont dans `main`.
- Choix : `VERSION` passe à `astra-p2p-v89` pour que les téléphones prennent le nouveau
  `session.js`.
- Qui : Claude, par défaut. Source : session `1d0dae27`. Statut : en vigueur.

**D-200 — Une flotte qui arrive sur une planète qui a changé de main vise son propriétaire actuel (issue #36)**
- 2026-11-06. Contexte : issue #36 (constats code-flotte-02 et code-fin-08). Une flotte
  « Attaquer » ou « Conquérir » gardait `{ pid, key }` de l'ancien propriétaire ; à l'arrivée,
  `arrive` se battait contre la fiche de cet ancien propriétaire sans regarder `ownerAt`. Si un
  3e joueur avait pris la planète pendant le trajet, on pillait un stock fantôme (ressources
  créées de rien), on écrivait un rapport à un joueur qui ne l'appliquerait jamais, et la
  conquête finissait évacuée par `checkClaim` avec un colonisateur offert par `evacuate`. Deux
  conquêtes de suite par le même joueur : la 2e refaisait le combat et écrasait la colonie de la
  1re (vaisseaux effacés, 2 rapports de prise).
- Choix :
  - **Vincent** (via la session de coordination, ses mots : « Attaquer le nouveau
    propriétaire ») : à l'arrivée, si la case n'est plus au joueur visé, la flotte combat le
    propriétaire actuel, avec sa défense et son stock, et le même ordre.
  - Propriétaire actuel = moi : pas de combat, la flotte se pose (`dock`) et ajoute ses vaisseaux
    (consigne de la coordination). Pas d'alliances dans le jeu, donc pas de cas « allié ».
  - **Choix de Claude** : case sans propriétaire → la flotte reste en orbite, même pour une
    conquête avec un colonisateur à bord (coloniser demanderait les contrôles de `colonize` :
    froid, taille, `takenBefore` ; le joueur peut donner l'ordre lui-même).
  - **Choix de Claude** : le propriétaire actuel est `ownerAt(f.to)` au passage (`tick`) qui
    traite l'arrivée, pas un `ownerAt` « à l'heure `f.arrive` » : les fiches ne gardent pas
    l'historique des propriétaires (les rapports lus disparaissent), et les flottes d'un même
    passage ne sont pas traitées dans l'ordre de leurs arrivées. Le rejeu refait les mêmes
    passages sur les mêmes fiches, donc le résultat reste rejouable (comme `defenseAt`).
  - **Choix de Claude** : une colonie prise au combat porte `captured: true` ; `evacuate` ne lui
    ajoute pas de colonisateur (il n'en a consommé aucun). Les colonies fondées par un
    colonisateur, et les vieilles fiches sans ce champ, gardent le +1.
- Alternatives écartées : annuler l'ordre (« la planète a changé de main ») et rester en orbite,
  proposé par l'issue (Vincent a choisi d'attaquer) ; comparer seulement à `order.pid` et tomber
  en orbite si la case est à moi (la 2e flotte serait restée en vol au lieu de renforcer la prise).
- Critère de l'issue non suivi tel quel : « ses vaisseaux et sa soute sont inchangés » à
  l'arrivée de A ; avec la règle de Vincent, A combat C, donc sa flotte et sa soute changent. Ce
  qui reste vrai : aucun rapport vers B, et le butin sort du stock de C (C le perd en lisant le
  rapport), donc rien n'est créé.
- Preuve : 4 scénarios dans `tests/end.test.mjs` (échouent sur l'ancien code, passent après) ;
  4 parties IA contre IA (3 et 4 IA) : 0 re-capture, rejeu identique, mais l'ancien code n'en
  faisait pas non plus dans ces parties : ce n'est pas une preuve du correctif. Le script d'audit
  `recapture.mjs` n'est pas publié : **non rejoué**.
- Qui : Vincent (règle), Claude (cas sans propriétaire, heure du propriétaire, marque
  `captured`). Source : worker `worker-cible`, issue #36.
- Statut : en vigueur. Modifie D-092 (conquête). Cache `astra-p2p-v90` (v84 avant la fusion de `main`, qui avait déjà v89).

**D-201 — Plus de carte « Ta planète gèle dans… » pendant la partie : le bandeau `#race` ne sert qu'à la fin**
- 2026-11-06. Contexte : Vincent envoie une capture du bandeau du haut (« Ta planète gèle dans
  30:53 · va vers le soleil · 2 en vie ») : « n'affiche plus l'aide comme ceci », puis, à la
  question de ce qu'il faut changer : « retire toute la card ».
- Choix :
  - **Vincent** : la carte disparaît pendant la partie (toutes ses variantes : « Ta planète la
    plus exposée gèle… », « Le soleil s'éteint… »).
  - **Choix de Claude par défaut** (session router « Affichage aide ») : elle disparaît aussi
    quand le joueur est éliminé (« Éliminé · encore n en vie »), mais on la **garde en fin de
    partie** (« Victoire ! / Perdu. · partie finie · Classement · Voir la courbe des points »),
    car son bouton Classement est le seul moyen de rouvrir l'écran de fin (D-143) une fois fermé.
  - La règle du froid ne change pas (`frostOf`, `ranking`, cercle sur la carte) ; le bandeau
    rouge de menace `#threat` reste.
- Alternatives écartées : retirer aussi la carte en fin de partie (on perdrait l'accès au
  Classement) ; garder le texte « Éliminé ».
- Source : capture et messages de Vincent, transmis par la session « Affichage aide ».
- Statut : en vigueur (cette PR). Change le bandeau de course de la session `26f178b9` (`interface.md` §12) ; D-104 (lien vers la courbe) et D-143 (bouton Classement) restent vrais.

**D-210 — Le Journal ne trahit plus l'ordre d'une flotte que je ne vois pas (issue #37)**
- 2026-11-06 22:18. Contexte : issue #37. `moveFleet` (attaque, conquête) et `chaseFleet`
  (poursuite) écrivaient au journal partagé « La flotte de A attaque Rigel (B) » ou « … prend en
  chasse une flotte de B ». La fenêtre Journal (« Ce qui me concerne », D-110) montrait à B toutes
  les lignes qui contiennent son nom : B apprenait l'attaque dès l'ordre, flotte hors de sa
  détection, alors que la carte (D-128) et l'alerte (D-133) ne montraient rien.
- Choix de Claude : **marquer et filtrer**. Une ligne d'ordre de flotte porte `{ pid, fleet }`
  (le joueur et sa flotte) dans le journal partagé ; `showsLog(l)` (`js/session.js`) la montre à
  son auteur toujours, aux autres seulement tant qu'ils voient cette flotte (`sees`, la règle de
  la carte et de l'alerte). Flotte disparue (posée, détruite) : la ligne reste cachée ; le
  combat a ses propres lignes (« est attaquée par », « prend … à », carnet D-110), jamais
  marquées, toujours montrées. `openJournal` (`js/app.js`) passe par `showsLog`. Une marque mal
  formée reçue du réseau est ignorée (`pushLog` : `pid` et `fleet` doivent être du texte) ; la
  ligne redevient ordinaire. Tous les ordres de `moveFleet` sont marqués (coloniser et se poser
  ne nomment que l'auteur : aucun changement pour eux).
- Alternative écartée : garder ces lignes hors du journal partagé (journal local de l'auteur
  seulement). Il aurait fallu un second journal, sauvegardé à part, et B n'aurait jamais lu
  l'ordre, même flotte en vue. La marque garde un seul journal et suit la même règle que la
  carte. Comme D-128, c'est un **filtre d'affichage, pas un secret** : la ligne voyage toujours
  avec la fiche (la fiche contient d'ailleurs déjà l'ordre de la flotte), et la console
  (`printLog`) la montre toujours, pour le débogage.
- Avec D-190 (fusionné avant) : la ligne ne nomme la cible que si l'auteur voit sa planète
  (`live`). Hors de sa vue, la ligne ne contient pas le nom de B et n'est déjà pas dans son
  Journal. La marque reste utile quand l'auteur voit la planète (un éclaireur, du radar) mais que
  la cible ne voit pas la flotte d'attaque : les scénarios d'attaque et de conquête placent un
  éclaireur de A à 1 case de la planète de B pour couvrir ce cas.
- Rejeu (`js/replay.js`) : inchangé. Son journal rejoué ne garde que `{ at, pid, text }`, et la
  marque ne change pas l'état de la partie ; `tests/replay.test.mjs` passe sans changement.
- Vérifié : 4 scénarios (`tests/journal.test.mjs`) : attaque et conquête depuis 19 cases (B ne lit
  pas l'ordre tant qu'il ne voit pas la flotte, A toujours ; flotte à 2 cases : B la voit,
  l'alerte sonne, l'ordre se lit ; après le combat, B lit le résultat) ; poursuite (A, radar 3,
  voit le cargo de B à 4 cases, B ne voit pas A) ; marque gardée par `onRecord`, marque mal formée
  ignorée. Contrôlés par mutation (`showsLog` qui renvoie toujours vrai : les 4 échouent).
  222/222. Vu dans le vrai jeu (interface de test, contre l'IA) : Journal de B avant, flotte en
  vue, après le combat.
- Qui : Claude (choix de méthode, demandé par la session de coordination). Source : session
  `89918100`.
  Statut : en vigueur. Applique D-128 et D-133 au Journal (D-110).

**D-211 — Cache `astra-p2p-v91`**
- 2026-11-06. Choix de Claude : `js/app.js` et `js/session.js` changent (D-210) ; nouvelle
  version de cache pour que les téléphones les récupèrent. Prévu en v84 ; `main` est passé à v86
  (D-176), puis à v90 (#161, #162, #165, #166) avant les fusions, d'où v91.
- Statut : en vigueur.

## 6 novembre 2026 — IA coupée après une pause de la page (#38)

Numéro pris haut (D-220) : D-163 à D-219 sont pris ou réservés par les autres PR en cours.

**D-220 — Le lien en mémoire d'une IA ne se coupe jamais pour silence**
- 2026-11-06 22:15. Contexte : issue #38. Une IA (D-151) est reliée à l'hôte par un lien en
  mémoire (`LocalLink`, `js/bot.js`). `heartbeat()` (`js/session.js`) ferme tout lien muet depuis
  30 s (`SILENCE_MS`). Si la page de l'hôte se fige plus de 30 s (téléphone verrouillé, appli en
  arrière-plan), au réveil le battement passe avant le moindre message : le lien de l'IA était
  fermé, et rien ne le recréait. L'IA jouait dans sa copie, mais l'hôte ne recevait plus ses
  fiches (« déconnecté », « Seul en ligne · Rejoindre ») ; au rechargement, ses ordres joués
  pendant la coupure étaient perdus.
- Choix de Claude : `LocalLink` porte `local = true`, et `heartbeat` ne ferme pas pour silence un
  lien `local` (il lui envoie toujours `hb`, pour la latence et « IA sur ce téléphone »). Les
  deux bouts sont sur le même téléphone : un silence veut seulement dire que la page était en
  pause, pendant laquelle l'IA non plus n'a pas joué. Le lien ne se ferme plus qu'à la fin
  (`end()`). Le bandeau « Seul en ligne » suit tout seul : le lien de l'IA compte dans
  `links`, donc `alone` reste faux ; `js/app.js` n'a pas changé.
- Alternatives écartées : recréer l'IA quand son lien se ferme (`wakeBots` après avoir retiré
  l'entrée morte de `host.bots`) : plus de code, et la nouvelle Session repartirait de la fiche
  figée chez l'hôte, donc perdrait les ordres joués entre-temps ; faire de `lastSeen` un getter
  de `LocalLink` (toujours « à l'instant ») : magie cachée, `attach` l'écrit.
- Vérifié : scénario « D-220 : la page de l'hôte se fige 31 s… » (`tests/bot.test.mjs`), qui
  échoue sans la correction (liens 1 → 0, IA hors ligne, `alone` vrai) ; vrai jeu (page bloquée
  31 s, IA toujours en ligne, fiche qui avance, rien de perdu au rechargement). Cache `sw.js` :
  `astra-p2p-v92` (v86 au départ ; v92 au merge, au-dessus de v91 de `main`).
- Qui : Vincent (demande : corriger #38), Claude (méthode). Source : session `2f996c1d`.
  Statut : en vigueur. Complète D-151.
**D-230 — Service worker : le cache répond si le réseau se tait 3 s (issue #40)**
- 2026-11-06. Contexte : `sw.js` faisait `fetch` puis, seulement en cas d'échec, `caches.match`.
  Sur un réseau qui accepte la connexion sans répondre (portail captif, métro, 4G à une barre),
  `fetch` n'échoue pas avant longtemps : page blanche alors que les 32 fichiers sont en cache.
- Choix : **course entre le réseau et un délai de 3 s** (`NET_WAIT`), pour chaque requête.
  1. Le réseau répond avant 3 s : sa réponse est servie et mise en cache (comme avant).
  2. Délai dépassé : la copie en cache est servie ; s'il n'y en a pas, on continue d'attendre le
     réseau (une page jamais mise en cache ne doit pas échouer juste parce qu'elle est lente).
  3. Le réseau échoue : la copie en cache (comme avant).
  4. Drapeau `mute` : après un délai dépassé, les requêtes suivantes prennent le cache tout de
     suite ; la première réponse du réseau le remet à faux. Sans lui, chaque `import` de la
     chaîne des modules attendait 3 s de plus (vu dans Chromium : rien après 10 s).
  5. La réponse du réseau arrivée après le délai est quand même écrite dans le cache
     (`e.waitUntil` appelé tout de suite) : la prochaine ouverture a la nouvelle version.
- Alternatives écartées : « stale-while-revalidate » (cache d'abord, réseau en fond) : plus
  rapide, mais chaque mise à jour n'arrive qu'à l'ouverture suivante, et `index.html` neuf
  pourrait charger d'anciens modules ; délai sans drapeau `mute` (3 s par niveau d'`import`,
  plus de 10 s) ; délai plus court (1 s : une vraie 4G lente perdrait trop souvent la nouvelle
  version) ; `AbortController` sur le `fetch` (on perdrait la réponse tardive qui met le cache
  à jour).
- Limites : sur un réseau lent mais vivant, `index.html` peut arriver du réseau avant 3 s et un
  module du cache après 3 s : une page neuve avec d'anciens modules pour cette ouverture (le
  risque existait déjà si le réseau lâchait en plein chargement ; la réponse tardive mise en
  cache répare l'ouverture suivante). Juste après le retour du réseau, une ouverture peut
  encore servir le cache une fois ; le drapeau est perdu quand le navigateur arrête le service worker (retour au
  comportement normal). Ne touche ni #84 (`technologies.html` absente de `FILES`) ni #89 (les
  réponses d'erreur sont mises en cache, y compris la réponse tardive, comme avant).
- Qui : **choix de Claude** (le ticket laissait le choix de la méthode). Source : session
  `7bec2792`, issue #40. Statut : en vigueur.
- Tests : `tests/sw.test.mjs` (vrai `sw.js` dans un `vm`, serveur local qui répond, lent, muet,
  coupé) ; `tests/sw-browser.mjs` (même parcours dans Chromium, hors `node --test`).

**D-231 — Cache `astra-p2p-v94`**
- 2026-11-06. Contexte : à l'ouverture de la PR, v86 était dans `main` (D-176) et la PR prenait
  v87 ; à la fusion de `main` (#161 à #166 mergées), `main` était à v92 (PR à v93), puis #179
  a pris v93 à son tour.
- Choix : `VERSION` passe à `astra-p2p-v94`, au-dessus de `main`, pour que les téléphones
  prennent le nouveau `sw.js`.
- Qui : Claude, par défaut. Source : session `7bec2792`. Statut : en vigueur.

**D-290 — Le lien d'invitation reçu sans nom ne sert qu'une fois ; « Autre invitation » à l'étape 2**
- 2026-11-06. Contexte : issue #69. Un lien d'invitation ouvert sans nom remplaçait le `onclick`
  de **Rejoindre** pour toute la vie de la page (`boot`) : chaque appui suivant relançait
  `startJoin(vieux code)`, donc l'étape 2 sur une invitation morte, sans erreur. L'étape 1 ne
  revenait qu'après l'échec de la connexion (15 à 180 s), ou en rechargeant.
- Choix de Claude :
  1. `boot` ne touche plus au bouton : il garde le code dans `pendingInvite`. Le gestionnaire
     normal de **Rejoindre** le prend une fois, le remet à `null` et cache la note « Invitation
     reçue… ». Ensuite, **Rejoindre** ouvre l'étape 1, champ vide.
  2. Un bouton **Autre invitation** (`#btn-other-invite`, sous le statut de l'étape 2) revient à
     l'étape 1. Il arrête la tentative en cours comme la flèche Retour (`session.end()`,
     `session = null`) : la vieille réponse ne peut plus se connecter ni afficher plus tard une
     erreur d'échec sur l'étape 1. `useOffer` refait une session pour la nouvelle invitation.
- Alternatives écartées : rétablir l'ancien `onclick` après usage (deux endroits qui écrivent le
  même gestionnaire) ; garder la tentative vivante derrière « Autre invitation » (une vieille
  réponse pourrait se connecter pendant qu'on scanne une autre invitation).
- Limite : si l'on crée une partie au lieu de rejoindre, `pendingInvite` reste gardé jusqu'au
  prochain appui sur **Rejoindre** (une seule fois). Non traité : rare, et sans effet durable.
- Qui : Claude, par défaut (la piste venait de l'issue). Source : session `07a4ccd7`, issue #69.
  Statut : en vigueur. Cache `astra-p2p-v87`, puis `astra-p2p-v95` à la fusion de `main` (#167 à v94).

**D-300 — Une invitation abandonnée pendant sa préparation est fermée (jeton numéroté)**
- 2026-11-06. Contexte : issue #70. `openInvite` attendait `createInvite()` (collecte des
  adresses, jusqu'à 3,5 s) avant de ranger l'invitation : fermer « Inviter » pendant cette
  attente n'annulait rien, et plusieurs ouvertures rapides laissaient des `RTCPeerConnection`
  orphelines, même après `session.end()`.
- Choix : chaque `openInvite` prend un jeton numéroté (`inviteTicket`), que `cancelInvite`
  change. Si le jeton a changé à la fin de l'attente (fenêtre fermée, ou nouvelle invitation),
  l'invitation obtenue est fermée et `openInvite` renvoie `null` ; une erreur de
  `createInvite` survenue pendant une préparation abandonnée est ignorée (personne n'attend
  plus ce message). `openInviteSheet` ne dessine rien quand il reçoit `null`. Une invitation
  acceptée n'est plus dans `session.invite` : la fermer ou rouvrir ne touche pas sa connexion.
  Cache `astra-p2p-v96` (v87 au départ, relevée au-dessus de v95 de `main` à la fusion).
- Alternatives écartées : désactiver « Fermer » tant que le QR n'est pas prêt (attente subie,
  et rouvrir vite fuirait toujours) ; ranger la promesse en cours dans `session.invite`
  (change le type que lit `acceptAnswer`).
- Qui : Claude, par défaut (piste de l'issue). Source : session `6ca7574f`, issue #70.
  Statut : en vigueur.
- Tests : `tests/invite-open.test.mjs` (fausse `RTCPeerConnection` qui compte les connexions
  ouvertes : 1 et 5 ouvertures/fermetures → 0 ouverte ; 3 ouvertures d'affilée → 1 ; une
  invitation acceptée reste ouverte).

