# Guides du jeu

Des guides simples pour bien jouer, avec des chiffres **mesurés** (jamais devinés).

| Je veux… | Lire |
|---|---|
| Jouer les humains | [humains.md](humains.md) |
| Jouer les machines | [machines.md](machines.md) |
| Jouer les aliens | [aliens.md](aliens.md) |
| Savoir ce qui est impossible, et quand (froid, place, défense, plafonds) | [limites.md](limites.md) |
| Les 24 questions de joueurs (gagner sans combattre, IA, colonies, alerte, entrepôt…) | [questions.md](questions.md) |

## D'où viennent les chiffres

- **Code mesuré** : commit `15ca511` (2026-11-04).
- **Mesures** : du 2026-11-04 vers 23:40 au 2026-11-05 vers 00:10 UTC, par des scripts Node qui utilisent les
  vraies règles du jeu (`js/game.js`, `js/fleet.js`, `js/bot.js`), sans navigateur.
- Les scripts et leurs sorties ne sont **pas dans le dépôt** : ils sont dans
  `~/.claude/swarm-runs/astra-audit-2026-11-05/guides/` (audit du 2026-11-05), et pour les
  mesures des autres sessions de l'audit dans `eq-eco/`, `eq-tech/`, `eq-combat/`,
  `eq-rythme/` et `questions/` à côté. Chaque tableau dit quel script l'a produit.
- Les minutes sont des **minutes réelles** depuis le départ commun de la partie.
- « Planète type » : 18 places, gisement moyen (130 000 minéraux, 37 500 nourriture), à
  7 cases du centre (là où les joueurs apparaissent), climat ×1,04 énergie, ×1,02 minéraux,
  ×1,17 nourriture.
- Ce qui n'est pas sûr est écrit **« non confirmé »**.

**À refaire si l'équilibrage change** (prix, productions, défenses, froid) : relancer les
scripts et recopier les tableaux.

Les ordres de construction de [GUIDE.md](../../GUIDE.md) datent d'avant le tempo 2,5, la
recherche, la place et les vaisseaux : ces guides-ci les remplacent (D-162).
