# Astra

Jeu de conquête spatiale entre téléphones, en pair à pair : HTML/CSS/JS sans framework, sans
build, sans serveur de jeu. Hébergé sur GitHub Pages.

Toute la documentation est dans [docs/](docs/README.md) : architecture du code
(`docs/architecture/`), journal des demandes (`docs/historique/journal.md`), décisions
(`docs/decisions.md`). Lire `docs/README.md` d'abord.

Tests : `node --test tests/*.test.mjs`.

## Règle : tout noter, dans le même commit

À chaque demande de l'utilisateur, et à chaque décision, mettre à jour la doc **dans le même
commit que le changement**. Heures en UTC.

1. **Chaque demande** → une entrée datée dans `docs/historique/journal.md`, dans le jour qui
   convient : heure UTC, session (identifiant court du transcript), demande (citation exacte si
   elle est courte), ce qui a été fait, commit ou PR, décision liée (D-xxx). Même une question
   sans code (« comment marche… ? ») a sa ligne.
2. **Chaque décision** → une entrée `D-xxx` (numéro suivant) dans `docs/decisions.md` : date,
   contexte, choix, alternatives écartées, qui a tranché (utilisateur, ou Claude par défaut),
   source, statut. Compte comme décision : un choix de conception, de règle de jeu, d'outil ou de
   façon de travailler, **y compris un choix par défaut que personne n'a contesté**.
3. **Si une décision change**, ne pas effacer l'ancienne : la marquer « remplacée par D-yyy » (ou
   « modifiée par D-yyy ») et écrire la nouvelle.
4. **Quand le code change**, mettre à jour `docs/architecture/reseau.md`, `regles.md` ou
   `interface.md` (et la carte de `docs/README.md` si un fichier apparaît ou disparaît).
5. Ce qui n'est pas sûr est écrit « non confirmé ». Pas de secrets ni de données personnelles.
