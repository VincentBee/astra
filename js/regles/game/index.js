import { TEMPO } from '../tech/index.js';
import { SPEED } from './temps/speed.js';
import { RES } from './ressources/res.js';
import { SOIL } from './ressources/soil.js';
import { RES_INFO } from './ressources/res-info.js';
import { resIcon } from './ressources/res-icon.js';
import { raceIcon } from './races/race-icon.js';
import { storageCap } from './ressources/storage-cap.js';
import { RACES } from './races/races.js';
import { RACE_KEYS } from './races/race-keys.js';
import { secs } from './temps/secs.js';
import { POWERS } from './pouvoirs/powers.js';
import { POWER_KEYS } from './pouvoirs/power-keys.js';
import { raceOf } from './races/race-of.js';
import { newPlanet } from './planete/new-planet.js';
import { flows } from './economie/flows.js';
import { planetAlerts } from './economie/planet-alerts.js';
import { MAX_STEPS } from './temps/max-steps.js';
import { stepOf } from './temps/step-of.js';
import { PLAN_MAX } from './plan/plan-max.js';
import { planLane } from './plan/plan-lane.js';
import { planId } from './plan/plan-id.js';
import { planItem } from './plan/plan-item.js';
import { planAhead } from './plan/plan-ahead.js';
import { autoRule } from './plan/auto-rule.js';
import { AUTO_MAX } from './plan/auto-max.js';
import { AUTO_CHUNKS } from './plan/auto-chunks.js';
import { storeFor } from './plan/store-for.js';
import { storeShort } from './plan/store-short.js';
import { tooBig } from './plan/too-big.js';
import { stateAt } from './economie/state-at.js';
import { planForecast } from './plan/plan-forecast.js';
import { settle } from './economie/settle.js';
import { upgradeCost } from './construction/upgrade-cost.js';
import { buildDuration } from './construction/build-duration.js';
import { covers } from './construction/covers.js';
import { startBuild } from './construction/start-build.js';
import { startDemolish } from './construction/start-demolish.js';
import { startResearch } from './construction/start-research.js';
import { shipsAffordable } from './construction/ships-affordable.js';
import { startShips } from './construction/start-ships.js';
import { powerReadyAt } from './pouvoirs/power-ready-at.js';
import { powerCost } from './pouvoirs/power-cost.js';
import { liftGain } from './pouvoirs/lift-gain.js';
import { usePower } from './pouvoirs/use-power.js';
import { score } from './score/score.js';
import { empireScore } from './score/empire-score.js';
import { fortOf } from './score/fort-of.js';
import { power } from './score/power.js';
import { fmt } from './outils/fmt.js';
import { UNIVERSE } from './carte/universe.js';
import { distance } from './carte/distance.js';
import { freeCell } from './carte/free-cell.js';
import { PLANET_COUNT } from './carte/planet-count.js';
import { PLANET_PLACES } from './carte/planet-places.js';
import { SMALL_BODIES } from './carte/small-bodies.js';
import { kindLabel } from './carte/kind-label.js';
import { seeded } from './outils/seeded.js';
import { NATURE } from './ressources/nature.js';
import { sunFor } from './climat/sun-for.js';
import { inSun } from './climat/in-sun.js';
import { climateAt } from './climat/climate-at.js';
import { sunDistance } from './climat/sun-distance.js';
import { FROST } from './climat/frost.js';
import { frostAt } from './climat/frost-at.js';
import { frostLine } from './climat/frost-line.js';
import { climateName } from './climat/climate-name.js';
import { planetsFor } from './carte/planets-for.js';
import { sameCell } from './carte/same-cell.js';
import { usedPlaces } from './planete/used-places.js';
import { placesLeft } from './planete/places-left.js';
import { shipsCost } from './plan/ships-cost.js';

// Règles du jeu : fonctions pures, sans réseau ni DOM.
// Version accélérée pour des parties courtes : une « heure » de jeu = une minute.
//
// Principe : pas de tick partagé. Une planète stocke son état à l'instant `at`
// (heure du téléphone, en ms) ; l'état à tout instant se calcule à partir du
// temps écoulé. Chaque joueur fait foi pour sa propre planète ; les autres
// refont le même calcul pour l'afficher.
//
// Trois ressources : minéraux (constructions), nourriture (population),
// énergie (bâtiments, et la « population » des machines). Trois races, au
// gameplay différent, choisies une fois pour toutes en arrivant dans la partie.
//
// Comme la population grandit ou meurt de faim selon les stocks, l'économie
// n'a pas de formule fermée : on l'intègre par petits pas (2 h de jeu au plus
// chacun, et MAX_STEPS au plus par calcul quelle que soit l'absence, D-175).

export { TEMPO } from '../tech/index.js';
export { SPEED } from './temps/speed.js';
export { RES } from './ressources/res.js';
export { SOIL } from './ressources/soil.js';
export { RES_INFO } from './ressources/res-info.js';
export { resIcon } from './ressources/res-icon.js';
export { raceIcon } from './races/race-icon.js';

// ---------------------------------------------------------------------------
// Races
// ---------------------------------------------------------------------------
//
// Chaque race décrit ses bâtiments et une fonction `rates` qui donne, pour
// des niveaux et une population, ce qui entre et sort par heure de jeu :
//   energyIn / energyOut : production et consommation d'énergie
//   food(effE)           : nourriture extraite du sol selon le courant reçu
//   foodOut              : nourriture mangée par la population
//   minerals(effE, effF) : minéraux extraits du sol selon courant et nourriture
//   mineralsBase         : revenu de base (impôt, récupération), tiré du sol lui aussi
//   popCap, caps         : plafonds (population, stocks)
// et une fonction `grow` pour la population.

export { storageCap } from './ressources/storage-cap.js';

// Équilibrage : on part avec de quoi lancer deux ou trois chantiers, l'énergie
// est juste à l'équilibre et presque rien ne tombe sans bâtiment. Chaque
// chantier pèse donc : monter une production sans l'énergie, la nourriture ou
// la place qui va avec provoque une pénurie, et les pénuries se propagent.

export { RACES } from './races/races.js';
export { RACE_KEYS } from './races/race-keys.js';
export { secs } from './temps/secs.js';
export { POWERS } from './pouvoirs/powers.js';
export { POWER_KEYS } from './pouvoirs/power-keys.js';
export { raceOf } from './races/race-of.js';
export { newPlanet } from './planete/new-planet.js';

// ---------------------------------------------------------------------------
// Économie
// ---------------------------------------------------------------------------

export { flows } from './economie/flows.js';
export { planetAlerts } from './economie/planet-alerts.js';
export { MAX_STEPS } from './temps/max-steps.js';
export { stepOf } from './temps/step-of.js';
export { PLAN_MAX } from './plan/plan-max.js';

// ---------------------------------------------------------------------------
// Fil d'attente (D-105, puis D-158) : un seul fil par planète, où l'on met
// des bâtiments, des recherches et des lots de vaisseaux. Un élément est :
//   - un bâtiment : son nom, en texte, comme avant ("mine") ;
//   - une recherche : { tech: "weapons" } ;
//   - un lot de vaisseaux : { ship: "fighter", n: 5 }.
// Chacun attend son chantier : le chantier (bâtiments), le labo (recherches),
// le chantier naval (vaisseaux) ; les trois avancent en même temps.
// ---------------------------------------------------------------------------

export { planLane } from './plan/plan-lane.js';
export { planId } from './plan/plan-id.js';
export { planItem } from './plan/plan-item.js';
export { planAhead } from './plan/plan-ahead.js';
export { autoRule } from './plan/auto-rule.js';
export { AUTO_MAX } from './plan/auto-max.js';
export { AUTO_CHUNKS } from './plan/auto-chunks.js';
export { storeFor } from './plan/store-for.js';
export { storeShort } from './plan/store-short.js';
export { tooBig } from './plan/too-big.js';
export { stateAt } from './economie/state-at.js';
export { planForecast } from './plan/plan-forecast.js';
export { settle } from './economie/settle.js';

// ---------------------------------------------------------------------------
// Constructions
// ---------------------------------------------------------------------------

export { upgradeCost } from './construction/upgrade-cost.js';
export { buildDuration } from './construction/build-duration.js';
export { covers } from './construction/covers.js';
export { startBuild } from './construction/start-build.js';
export { startDemolish } from './construction/start-demolish.js';

// ---------------------------------------------------------------------------
// Recherche et chantier naval (sur toute planète qui a le bâtiment)
// ---------------------------------------------------------------------------

export { startResearch } from './construction/start-research.js';
export { shipsAffordable } from './construction/ships-affordable.js';
export { startShips } from './construction/start-ships.js';

// ---------------------------------------------------------------------------
// Pouvoirs psychiques (aliens)
// ---------------------------------------------------------------------------

export { powerReadyAt } from './pouvoirs/power-ready-at.js';
export { powerCost } from './pouvoirs/power-cost.js';
export { liftGain } from './pouvoirs/lift-gain.js';
export { usePower } from './pouvoirs/use-power.js';

// ---------------------------------------------------------------------------
// Classement
// ---------------------------------------------------------------------------

export { score } from './score/score.js';
export { empireScore } from './score/empire-score.js';
export { fortOf } from './score/fort-of.js';
export { power } from './score/power.js';
export { fmt } from './outils/fmt.js';

// ---------------------------------------------------------------------------
// Univers : grille 2D où sont posées les planètes
// ---------------------------------------------------------------------------

export { UNIVERSE } from './carte/universe.js';
export { distance } from './carte/distance.js';
export { freeCell } from './carte/free-cell.js';

// ---------------------------------------------------------------------------
// Planètes de l'univers
// ---------------------------------------------------------------------------
//
// Les planètes vides sont tirées au hasard au début de la partie, mais avec
// un hasard déterminé par l'identifiant de la partie : chaque téléphone
// calcule exactement les mêmes, sans rien avoir à se transmettre.

export { PLANET_COUNT } from './carte/planet-count.js';
export { PLANET_PLACES } from './carte/planet-places.js';
export { SMALL_BODIES } from './carte/small-bodies.js';
export { kindLabel } from './carte/kind-label.js';
export { seeded } from './outils/seeded.js';
export { NATURE } from './ressources/nature.js';
export { sunFor } from './climat/sun-for.js';
export { inSun } from './climat/in-sun.js';
export { climateAt } from './climat/climate-at.js';
export { sunDistance } from './climat/sun-distance.js';
export { FROST } from './climat/frost.js';
export { frostAt } from './climat/frost-at.js';
export { frostLine } from './climat/frost-line.js';
export { climateName } from './climat/climate-name.js';
export { planetsFor } from './carte/planets-for.js';
export { sameCell } from './carte/same-cell.js';

// ---------------------------------------------------------------------------
// Place sur les planètes
// ---------------------------------------------------------------------------
//
// Chaque niveau de bâtiment occupe une place. Une planète a de 12 à 22
// places, un astéroïde ou une comète bien moins. Les planètes d'avant la
// place n'ont pas de limite.

export { usedPlaces } from './planete/used-places.js';
export { placesLeft } from './planete/places-left.js';
export { shipsCost } from './plan/ships-cost.js';
