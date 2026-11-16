/**
 * Vaisseaux, par race. `attack` et `hull` (points de coque) servent au
 * combat, `cargo` à transporter des ressources, `speed` en cases par minute.
 * Carburant (de l'énergie) : `burn` par case parcourue, `tank` la contenance
 * du réservoir. Un plein mène à 40 cases (humains), 30 (machines, à courte
 * portée) ou 50 (aliens, endurants). Réglé pour qu'un plein de 5 chasseurs
 * coûte quelques minutes de production d'énergie vers 20 min de jeu (de 3 à
 * 7 selon la race) : les machines, riches en énergie, consomment autant par
 * case que les humains.
 */
export const SHIPS = {
  human: {
    cargo: { name: 'Cargo Hermès', attack: 0, hull: 20, cargo: 500, speed: 6, burn: 1, tank: 40, cost: { minerals: 110, energy: 40 } },
    colony: { name: 'Arche coloniale', attack: 0, hull: 40, cargo: 300, speed: 4, burn: 2, tank: 80, cost: { minerals: 360 } },
    fighter: { name: 'Frégate', attack: 12, hull: 30, cargo: 50, speed: 7, burn: 1, tank: 40, cost: { minerals: 150, energy: 50 } },
    heavy: { name: 'Croiseur', attack: 40, hull: 120, cargo: 150, speed: 5, burn: 3, tank: 120, cost: { minerals: 470, energy: 180 } },
  },
  machine: {
    cargo: { name: 'Drone-cargo', attack: 0, hull: 12, cargo: 400, speed: 8, burn: 1, tank: 36, cost: { minerals: 100, energy: 40 } },
    colony: { name: 'Sonde réplicatrice', attack: 0, hull: 25, cargo: 200, speed: 6, burn: 3, tank: 90, cost: { minerals: 270, energy: 90 } },
    fighter: { name: 'Drone d’assaut', attack: 9, hull: 15, cargo: 20, speed: 9, burn: 1, tank: 36, cost: { minerals: 90, energy: 40 } },
    heavy: { name: 'Destroyer', attack: 35, hull: 90, cargo: 100, speed: 6, burn: 3, tank: 108, cost: { minerals: 550, energy: 200 } },
  },
  alien: {
    cargo: { name: 'Méduse porteuse', attack: 0, hull: 35, cargo: 450, speed: 5, burn: 1.5, tank: 75, cost: { minerals: 180, food: 60 } },
    colony: { name: 'Graine-ruche', attack: 0, hull: 60, cargo: 250, speed: 4, burn: 3, tank: 150, cost: { minerals: 390, food: 120 } },
    fighter: { name: 'Dard', attack: 18, hull: 40, cargo: 30, speed: 7, burn: 2, tank: 100, cost: { minerals: 260, food: 80 } },
    heavy: { name: 'Léviathan', attack: 60, hull: 200, cargo: 200, speed: 4, burn: 5, tank: 250, cost: { minerals: 900, food: 270 } },
  },
};
