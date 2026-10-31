// Flottes : des unités qu'on pilote sur la carte. Fonctions pures.
//
// Une flotte décolle d'une planète du joueur avec des vaisseaux et, s'il le
// veut, une cargaison. Elle reste ensuite sur la carte jusqu'à ce qu'elle se
// pose sur une de ses planètes ou soit détruite. On peut l'envoyer sur
// n'importe quelle case, l'arrêter, changer de cap, la faire rentrer.
//
// Sa position tient dans un segment daté (from, to, depart, arrive) : tous
// les téléphones la voient avancer de la même façon. À l'arrêt, from et to
// sont la même case. Chaque nouvel ordre ouvre un segment depuis là où elle
// est. Elle brûle du carburant (de l'énergie) à chaque case parcourue :
// si son réservoir ne suffit pas, le segment s'arrête dès l'ordre donné au
// point de panne (`stranded`). Tous les téléphones voient donc la même
// panne, sans rien calculer en route. À sec, la flotte attend qu'on la
// ravitaille. Un ordre peut attendre l'arrivée :
//   dock     : se poser sur une de ses planètes (vaisseaux et cargaison y restent) ;
//   colonize : fonder une colonie sur une planète libre (le premier arrivé l'emporte) ;
//   attack   : combattre les vaisseaux à quai d'une planète adverse et piller
//              ce que les soutes peuvent emporter. Les survivants restent en orbite.
// C'est le téléphone du propriétaire qui applique l'arrivée.

import { distance, covers, settle, SOIL } from './game.js';
import { SHIPS, SHIP_KEYS, shipStats, techBonus, TEMPO } from './tech.js';

export const MAX_FLEETS = 16;
/** Un trajet dure au moins ce temps (ms), dès qu'il faut bouger. */
const MIN_TRIP = 2_000;

export const ORDERS = {
  dock: { name: 'Se poser', verb: 'va se poser sur' },
  colonize: { name: 'Colonisation', verb: 'part coloniser' },
  attack: { name: 'Attaque', verb: 'attaque' },
  conquer: { name: 'Conquête', verb: 'part conquérir' },
  chase: { name: 'Poursuite', verb: 'prend en chasse' },
};

/**
 * Comportement en voyage, à part de l'ordre : une flotte passive ne se bat que
 * si on lui en donne l'ordre ; une flotte agressive combat toute flotte ennemie
 * visible qu'elle touche (CONTACT), en route ou à l'arrêt, puis reprend son
 * trajet. Sans champ `stance` (flottes d'avant), une flotte est passive.
 */
export const STANCES = {
  passive: { name: 'Passive', hint: 'ne combat que sur ordre' },
  aggressive: { name: 'Agressive', hint: 'combat toute flotte ennemie qu’elle croise' },
};

export const aggressive = (f) => f?.stance === 'aggressive';

/** La flotte a-t-elle au moins un vaisseau armé ? */
export const armed = (race, ships, tech) => Object.entries(ships || {}).some(([k, n]) => n > 0 && shipStats(race, k, tech).attack > 0);

/** Distance (en cases) sous laquelle deux flottes se rencontrent. */
export const CONTACT = 0.5;

export const countShips = (ships) => Object.values(ships || {}).reduce((a, b) => a + (b || 0), 0);

/** Vitesse d'une flotte : celle de son vaisseau le plus lent (cases par minute). */
export function fleetSpeed(race, ships, tech) {
  const k = slowestShip(race, ships, tech);
  return k ? shipStats(race, k, tech).speed : 0;
}

/** Type du vaisseau le plus lent de la flotte (celui qui fixe sa vitesse), ou null si elle est vide. */
export function slowestShip(race, ships, tech) {
  let slow = null;
  let v = Infinity;
  for (const [k, n] of Object.entries(ships || {})) {
    if (!(n > 0)) continue;
    const sp = shipStats(race, k, tech).speed;
    if (sp < v) [slow, v] = [k, sp];
  }
  return slow;
}

/** Capacité totale des soutes. */
export function fleetCargo(race, ships) {
  let c = 0;
  for (const [k, n] of Object.entries(ships)) c += (n || 0) * SHIPS[race][k].cargo;
  return c;
}

/** Contenance totale des réservoirs. */
export function fleetTank(race, ships) {
  let t = 0;
  for (const [k, n] of Object.entries(ships)) t += (n || 0) * SHIPS[race][k].tank;
  return t;
}

/** Carburant brûlé par case parcourue. */
export function fleetBurn(race, ships) {
  let b = 0;
  for (const [k, n] of Object.entries(ships)) b += (n || 0) * SHIPS[race][k].burn;
  return b;
}

/**
 * Carburant restant à `now`. `fuel` est celui du départ du segment ; une
 * flotte d'avant le carburant a le plein.
 */
export function fuelAt(f, race, now) {
  if (f.fuel == null) return fleetTank(race, f.ships);
  const k = Math.min(1, Math.max(0, (now - f.depart) / Math.max(1, f.arrive - f.depart)));
  return Math.max(0, f.fuel - fleetBurn(race, f.ships) * distance(f.from, f.to) * k);
}

/** Durée du trajet en ms, à la vitesse de la flotte. */
export function tripMs(from, to, speed) {
  const d = distance(from, to);
  if (!d) return 0;
  if (!speed) return Infinity;
  return Math.max(MIN_TRIP, Math.round(((d / speed) * 60_000) / TEMPO));
}

/**
 * Décollage depuis une planète du joueur : retire les vaisseaux et la
 * cargaison de la planète. La flotte attend en orbite, sur la case de la
 * planète. Renvoie { error } ou { fleet }.
 */
export function launch(planet, { ships, cargo = {}, fuel = 0, at, origin, id }, now) {
  settle(planet, now);
  const race = planet.race;
  const clean = {};
  for (const k of SHIP_KEYS) {
    const n = Math.floor(ships?.[k] || 0);
    if (n < 0) return { error: 'Nombre de vaisseaux invalide.' };
    if (n > (planet.ships?.[k] || 0)) return { error: `Pas assez de ${SHIPS[race][k].name}.` };
    if (n) clean[k] = n;
  }
  if (!countShips(clean)) return { error: 'Choisis au moins un vaisseau.' };
  const load = {};
  for (const r of SOIL) load[r] = Math.max(0, Math.floor(cargo[r] || 0));
  if (load.minerals + load.food > fleetCargo(race, clean)) return { error: 'Les soutes sont trop petites pour cette cargaison.' };
  if (!covers(planet.stock, load)) return { error: 'Pas assez de ressources pour cette cargaison.' };
  const gas = Math.max(0, Math.floor(fuel || 0));
  if (gas > fleetTank(race, clean)) return { error: 'Les réservoirs sont trop petits pour ce carburant.' };
  if (!covers(planet.stock, { energy: gas })) return { error: 'Pas assez d’énergie pour ce carburant.' };
  for (const [k, n] of Object.entries(clean)) planet.ships[k] -= n;
  for (const [r, v] of Object.entries(load)) planet.stock[r] -= v;
  planet.stock.energy -= gas;
  const cell = { x: at.x, y: at.y };
  const fleet = { id, ships: clean, cargo: load, fuel: gas, origin, from: cell, to: { ...cell }, depart: now, arrive: now, order: null, stance: 'passive' };
  return { fleet };
}

/** Position d'une flotte à l'instant `now` (interpolée entre départ et arrivée). */
export function fleetPos(f, now) {
  const k = Math.min(1, Math.max(0, (now - f.depart) / Math.max(1, f.arrive - f.depart)));
  return { x: f.from.x + (f.to.x - f.from.x) * k, y: f.from.y + (f.to.y - f.from.y) * k };
}

/** La flotte est-elle encore en route à `now` ? */
// Un segment immobile (from = to) n'est jamais « en route », même si un autre
// téléphone, à l'heure un peu différente, l'a figé dans son futur proche.
export const moving = (f, now) => f.arrive > now && (f.from.x !== f.to.x || f.from.y !== f.to.y);

/**
 * Nouvel ordre de déplacement : la flotte part de là où elle est à `now`
 * vers la case `cell`, et `order` s'appliquera à l'arrivée (null : simple
 * déplacement). Modifie la flotte ; renvoie un message d'erreur ou null.
 */
export function moveTo(f, race, tech, cell, order, now) {
  const speed = fleetSpeed(race, f.ships, tech);
  if (!speed) return 'Cette flotte ne peut pas bouger.';
  const pos = fleetPos(f, now);
  const fuel = fuelAt(f, race, now);
  let to = { x: cell.x, y: cell.y };
  let stranded = false;
  const need = fleetBurn(race, f.ships) * distance(pos, to);
  if (need > fuel + 1e-9) {
    if (fuel < 1e-6) return 'Plus de carburant : fais le plein, ou attends qu’on te ravitaille.';
    // Panne en route : le trajet s'arrête là où le réservoir se vide, et l'ordre tombe.
    const k = fuel / need;
    to = { x: pos.x + (to.x - pos.x) * k, y: pos.y + (to.y - pos.y) * k };
    stranded = true;
    order = null;
  }
  Object.assign(f, { from: pos, to, depart: now, arrive: now + tripMs(pos, to, speed), order: order || null, fuel, stranded });
  return null;
}

/**
 * Change les vaisseaux d'une flotte arrêtée (pertes d'un combat) : la
 * consommation change, donc on fige d'abord le carburant, sans dépasser
 * les nouveaux réservoirs.
 */
export function setShips(f, race, ships, now) {
  const fuel = Math.min(fuelAt(f, race, now), fleetTank(race, ships));
  Object.assign(f, { ships, from: { ...f.to }, depart: Math.min(now, f.arrive), arrive: Math.min(now, f.arrive), fuel });
}

/** Ce qu'il faut de carburant pour aller de la position actuelle à `cell`. */
export function fuelNeed(f, race, cell, now) {
  return fleetBurn(race, f.ships) * distance(fleetPos(f, now), cell);
}

/**
 * Plein sur une planète du joueur, avec l'énergie de son stock (plein
 * partiel s'il n'y en a pas assez). La flotte doit être arrêtée. Renvoie
 * la quantité versée.
 */
export function refuel(planet, f, race, now) {
  settle(planet, now);
  const fuel = fuelAt(f, race, now);
  const give = Math.max(0, Math.floor(Math.min(fleetTank(race, f.ships) - fuel, planet.stock.energy || 0)));
  // Nouveau segment immobile : le carburant d'un segment est celui de son départ.
  Object.assign(f, { from: { ...f.to }, depart: now, arrive: now, fuel: fuel + give, stranded: false });
  planet.stock.energy -= give;
  return give;
}

// ----- Entre mes flottes ----------------------------------------------------
//
// Deux de mes flottes arrêtées sur la même case peuvent s'échanger
// vaisseaux, cargaison et carburant, fusionner, ou une flotte se scinder en
// deux. Tout se passe dans la fiche du joueur, tout de suite.

/** Case où attend une flotte arrêtée (une flotte en panne peut être entre deux cases). */
export const parkedCell = (f) => ({ x: Math.round(f.to.x), y: Math.round(f.to.y) });

/** Deux flottes arrêtées sur la même case. */
export function together(a, b, now) {
  if (moving(a, now) || moving(b, now)) return false;
  const ca = parkedCell(a);
  const cb = parkedCell(b);
  return ca.x === cb.x && ca.y === cb.y;
}

/** Fige le carburant d'une flotte arrêtée : son segment devient immobile, à `now`. */
export function freeze(f, race, now) {
  Object.assign(f, { fuel: fuelAt(f, race, now), from: { ...f.to }, depart: now, arrive: now });
}

/**
 * Fait passer une partie de la flotte `a` dans la flotte `b` :
 * part = { ships, cargo, fuel }. `b` peut être une flotte neuve, vide (pour
 * scinder). Chacune doit garder au moins un vaisseau, et ses soutes et
 * réservoirs doivent suffire. Modifie les deux ; renvoie une erreur ou null.
 */
export function transfer(a, b, race, part, now) {
  const fuelA = fuelAt(a, race, now);
  const fuelB = b.ships && countShips(b.ships) ? fuelAt(b, race, now) : b.fuel || 0;
  const ships = {};
  for (const k of SHIP_KEYS) {
    const n = Math.floor(Number(part.ships?.[k]) || 0);
    if (n < 0 || n > (a.ships[k] || 0)) return `Pas assez de ${SHIPS[race][k].name}.`;
    if (n) ships[k] = n;
  }
  const cargo = {};
  for (const r of SOIL) {
    const v = Math.floor(Number(part.cargo?.[r]) || 0);
    if (v < 0 || v > (a.cargo?.[r] || 0)) return 'Pas autant dans les soutes.';
    cargo[r] = v;
  }
  const fuel = Math.max(0, Number(part.fuel) || 0);
  if (fuel > fuelA + 1e-6) return 'Pas autant de carburant.';
  const give = Math.min(fuel, fuelA);

  const aShips = Object.fromEntries(SHIP_KEYS.map((k) => [k, (a.ships[k] || 0) - (ships[k] || 0)]).filter(([, n]) => n > 0));
  const bShips = Object.fromEntries(SHIP_KEYS.map((k) => [k, (b.ships?.[k] || 0) + (ships[k] || 0)]).filter(([, n]) => n > 0));
  if (!countShips(aShips)) return 'Il doit rester au moins un vaisseau (sinon, fusionne les flottes).';
  if (!countShips(bShips)) return 'Choisis au moins un vaisseau.';
  const aCargo = Object.fromEntries(SOIL.map((r) => [r, (a.cargo?.[r] || 0) - cargo[r]]));
  const bCargo = Object.fromEntries(SOIL.map((r) => [r, (b.cargo?.[r] || 0) + cargo[r]]));
  const load = (c) => SOIL.reduce((t, r) => t + c[r], 0);
  if (load(aCargo) > fleetCargo(race, aShips)) return 'Les soutes de la flotte qui donne seraient trop petites : déplace aussi de la cargaison.';
  if (load(bCargo) > fleetCargo(race, bShips)) return 'Les soutes de la flotte qui reçoit sont trop petites.';
  if (fuelA - give > fleetTank(race, aShips) + 1e-6) return 'Les réservoirs de la flotte qui donne seraient trop petits : déplace aussi du carburant.';
  if (fuelB + give > fleetTank(race, bShips) + 1e-6) return 'Les réservoirs de la flotte qui reçoit sont trop petits.';

  freeze(a, race, now);
  if (b.ships && countShips(b.ships)) freeze(b, race, now);
  Object.assign(a, { ships: aShips, cargo: aCargo, fuel: fuelA - give, order: null });
  Object.assign(b, { ships: bShips, cargo: bCargo, fuel: fuelB + give, order: null });
  return null;
}

/**
 * Scinde la flotte `a` : `part` part dans une nouvelle flotte, sur la même
 * case. Renvoie { error } ou { fleet }.
 */
export function split(a, race, part, id, now) {
  const b = { id, ships: {}, cargo: {}, fuel: 0, origin: a.origin, from: { ...a.to }, to: { ...a.to }, depart: now, arrive: now, order: null, stance: 'passive' };
  const error = transfer(a, b, race, part, now);
  return error ? { error } : { fleet: b };
}

/**
 * Fusionne la flotte `a` dans `b` : tout passe dans `b`, qui se souvient
 * des flottes absorbées (`absorbed`), pour que les dégâts visant `a`
 * l'atteignent quand même. `b` garde son comportement. `a` est à retirer par l'appelant.
 */
export function merge(a, b, race, now) {
  const fuel = fuelAt(a, race, now) + fuelAt(b, race, now);
  freeze(b, race, now);
  const ships = {};
  for (const k of SHIP_KEYS) if ((a.ships[k] || 0) + (b.ships[k] || 0)) ships[k] = (a.ships[k] || 0) + (b.ships[k] || 0);
  Object.assign(b, {
    ships,
    cargo: Object.fromEntries(SOIL.map((r) => [r, (a.cargo?.[r] || 0) + (b.cargo?.[r] || 0)])),
    fuel,
    order: null,
    absorbed: [...new Set([...(b.absorbed || []), a.id, ...(a.absorbed || [])])].slice(-40),
  });
}

/** Arrêt : la flotte finit sa course sur la case la plus proche, et y attend. */
export function stopAt(f, race, tech, now) {
  const pos = fleetPos(f, now);
  return moveTo(f, race, tech, { x: Math.round(pos.x), y: Math.round(pos.y) }, null, now);
}

// ----- Poursuite et combat entre flottes --------------------------------------
//
// Une flotte en poursuit une autre en visant le point d'interception : là
// où sera la cible quand elle-même pourra y être, d'après le segment que
// la cible suit (connu de tous). Viser sa position actuelle ne rattraperait
// jamais une cible aussi rapide. Le contact se fait à moins de CONTACT
// cases ; c'est le téléphone du poursuivant qui calcule le combat.

/**
 * Point d'interception de `target` par la flotte `f` partant de sa position
 * à `now` : le premier instant où `f` peut être là où sera la cible. Si la
 * cible va trop vite, son point d'arrivée (elle s'y arrête).
 */
export function intercept(f, race, tech, target, now) {
  const speed = fleetSpeed(race, f.ships, tech);
  const from = fleetPos(f, now);
  const end = Math.max(now, target.arrive);
  const steps = 240;
  for (let i = 0; i <= steps; i++) {
    const t = now + ((end - now) * i) / steps;
    const p = fleetPos(target, t);
    if (now + tripMs(from, p, speed) <= t + 1) return p;
  }
  return fleetPos(target, end);
}

/** Deux flottes au contact à `now`. */
export const inContact = (a, b, now) => distance(fleetPos(a, now), fleetPos(b, now)) <= CONTACT;

/**
 * Premier instant de `]from, to]` où les flottes `a` et `b` entrent au
 * contact (leur distance passe au-dessus puis à CONTACT ou moins), ou null.
 * Sert quand aucun téléphone n'a regardé au bon moment (hors ligne, en
 * arrière-plan). Un contact déjà en cours à `from` ne compte pas : il a été
 * vu. Avant le départ de son segment, on ne sait pas où était une flotte :
 * on ne cherche qu'à partir du plus tardif des deux départs.
 */
export function firstContact(a, b, from, to) {
  const start = Math.max(from, a.depart, b.depart);
  if (!(to > start)) return null;
  const gap = (t) => distance(fleetPos(a, t), fleetPos(b, t));
  // Les deux positions vont en ligne droite entre ces instants ; la distance
  // (sans diagonale) aussi, sauf quand dx ou dy change de signe.
  const knots = [start, to, a.arrive, b.arrive].filter((t) => t > start && t < to).sort((x, y) => x - y);
  let t0 = start;
  let out = gap(start) > CONTACT;
  for (const t1 of [...new Set(knots), to]) {
    const p0 = { a: fleetPos(a, t0), b: fleetPos(b, t0) };
    const p1 = { a: fleetPos(a, t1), b: fleetPos(b, t1) };
    const cuts = [t0, t1];
    for (const k of ['x', 'y']) {
      const d0 = p0.a[k] - p0.b[k];
      const d1 = p1.a[k] - p1.b[k];
      if (d0 * d1 < 0) cuts.push(t0 + ((t1 - t0) * d0) / (d0 - d1));
    }
    cuts.sort((x, y) => x - y);
    for (let i = 1; i < cuts.length; i++) {
      const u = cuts[i - 1];
      const v = cuts[i];
      const gu = gap(u);
      const gv = gap(v);
      if (out && gv <= CONTACT) return Math.min(to, Math.ceil(gu <= CONTACT ? u : u + ((v - u) * (gu - CONTACT)) / (gu - gv)));
      if (gv > CONTACT) out = true;
    }
    t0 = t1;
  }
  return null;
}

/**
 * Butin sur une flotte vaincue : toute sa cargaison, dans la place qui
 * reste dans les soutes des survivants.
 */
export function salvage(race, ships, cargo, carried = {}) {
  let room = Math.max(0, fleetCargo(race, ships) - SOIL.reduce((t, r) => t + (carried[r] || 0), 0));
  const take = {};
  for (const r of SOIL) {
    take[r] = Math.max(0, Math.floor(Math.min(room, cargo?.[r] || 0)));
    room -= take[r];
  }
  return take;
}

/**
 * Pertes subies par une flotte (combat), en route ou à l'arrêt :
 * `lost` vaisseaux, `take` cargaison. Une flotte en route reprend son trajet
 * depuis là où elle est, avec ce qui lui reste. Renvoie false si elle est
 * détruite.
 */
export function applyLosses(f, race, tech, lost, take, now) {
  const ships = {};
  for (const k of SHIP_KEYS) {
    const n = (f.ships[k] || 0) - (lost?.[k] || 0);
    if (n > 0) ships[k] = n;
  }
  if (!countShips(ships)) return false;
  const pos = fleetPos(f, now);
  const fuel = Math.min(fuelAt(f, race, now), fleetTank(race, ships));
  const to = f.to;
  const order = f.order;
  const go = moving(f, now);
  // Segment immobile ici, avec les vaisseaux restants…
  Object.assign(f, { ships, from: pos, to: { ...pos }, depart: now, arrive: now, fuel });
  // … et la cargaison qui tient encore dans les soutes.
  let room = fleetCargo(race, ships);
  const cargo = {};
  for (const r of SOIL) {
    cargo[r] = Math.max(0, Math.min(room, (f.cargo?.[r] || 0) - (take?.[r] || 0)));
    room -= cargo[r];
  }
  f.cargo = cargo;
  if (go) moveTo(f, race, tech, to, order, now); // … puis la suite du trajet
  else Object.assign(f, { to: { ...to }, from: { ...to } });
  return true;
}

/**
 * Combat, sans hasard : les deux téléphones qui le calculent trouvent le
 * même résultat. Jusqu'à 4 passes ; à chaque passe, chaque camp inflige son
 * attaque totale, répartie sur les vaisseaux adverses au prorata de leur
 * coque. Les dégâts s'accumulent : un vaisseau tombe quand sa coque est
 * entièrement entamée. Les deux camps tirent en même temps.
 *
 * a, d : { race, ships, tech, fort? }. Renvoie { attLeft, defLeft, attLost, defLost, won, report } ;
 * `report` : le déroulé, pour le carnet (js/report.js).
 */
export function battle(a, d) {
  const side = (x) => {
    // Entiers positifs seulement : une fiche abîmée ne doit pas créer de vaisseaux.
    const S = {
      race: x.race,
      n: Object.fromEntries(SHIP_KEYS.map((k) => [k, Math.max(0, Math.floor(Number(x.ships?.[k]) || 0))])),
      st: Object.fromEntries(SHIP_KEYS.map((k) => [k, shipStats(x.race, k, x.tech)])),
      dmg: Object.fromEntries(SHIP_KEYS.map((k) => [k, 0])),
    };
    // La défense d'une planète (ses bâtiments) se bat comme un seul gros vaisseau.
    if (x.fort?.hull > 0) Object.assign(S, { n: { ...S.n, fort: 1 }, st: { ...S.st, fort: x.fort }, dmg: { ...S.dmg, fort: 0 } });
    return S;
  };
  const A = side(a);
  const D = side(d);
  const keys = (S) => Object.keys(S.n);
  const firepower = (S) => keys(S).reduce((t, k) => t + S.n[k] * S.st[k].attack, 0);
  const hitOn = (S, power) => {
    const hulls = keys(S).map((k) => S.n[k] * S.st[k].hull);
    const total = hulls.reduce((x, y) => x + y, 0);
    if (!total) return;
    keys(S).forEach((k, i) => {
      if (!S.n[k]) return;
      S.dmg[k] += (power * hulls[i]) / total;
      const dead = Math.min(S.n[k], Math.floor(S.dmg[k] / S.st[k].hull + 1e-9));
      S.n[k] -= dead;
      S.dmg[k] -= dead * S.st[k].hull;
    });
  };
  const alive = (S) => keys(S).some((k) => S.n[k] > 0);
  const hullOf = (S) => keys(S).reduce((t, k) => t + S.n[k] * S.st[k].hull - (S.n[k] ? S.dmg[k] : 0), 0);
  // Rapport détaillé (D-122) : forces au départ, puis chaque passe (feu et pertes de chaque camp).
  const r2 = (v) => Math.round(v * 100) / 100;
  const start = (S, x) => {
    const b = techBonus(x.race, x.tech);
    const out = {
      race: x.race,
      ships: Object.fromEntries(SHIP_KEYS.filter((k) => S.n[k] > 0).map((k) => [k, S.n[k]])),
      bonus: { attack: r2(b.attack), hull: r2(b.hull) },
      fire: r2(firepower(S)),
      hull: r2(hullOf(S)),
    };
    if (S.n.fort) out.fort = { attack: r2(S.st.fort.attack), hull: r2(S.st.fort.hull) };
    return out;
  };
  const report = { a: start(A, a), d: start(D, d), rounds: [] };
  const gone = (before, S) => Object.fromEntries(keys(S).map((k) => [k, before[k] - S.n[k]]).filter(([, v]) => v > 0));
  for (let round = 0; round < 4 && alive(A) && alive(D); round++) {
    const pa = firepower(A);
    const pd = firepower(D);
    const nA = { ...A.n };
    const nD = { ...D.n };
    hitOn(D, pa);
    hitOn(A, pd);
    report.rounds.push({ a: r2(pa), d: r2(pd), aLost: gone(nA, A), dLost: gone(nD, D) });
  }
  report.a.hullLeft = r2(Math.max(0, hullOf(A)));
  report.d.hullLeft = r2(Math.max(0, hullOf(D)));
  const lost = (before, S) => Object.fromEntries(SHIP_KEYS.map((k) => [k, (before?.[k] || 0) - S.n[k]]).filter(([, v]) => v > 0));
  const left = (S) => Object.fromEntries(SHIP_KEYS.filter((k) => S.n[k] > 0).map((k) => [k, S.n[k]]));
  return {
    attLeft: left(A),
    defLeft: left(D),
    attLost: lost(a.ships, A),
    defLost: lost(d.ships, D),
    won: alive(A) && !alive(D) && firepower(A) > 0, // des cargos sans armes ne gagnent pas, même contre personne
    report,
  };
}

/**
 * Butin d'une attaque gagnée : jusqu'à la moitié des minéraux et de la
 * nourriture du défenseur, dans la place qui reste dans les soutes des
 * survivants (`carried` : ce qu'elles contiennent déjà).
 */
export function plunder(race, ships, stock, carried = {}) {
  let room = Math.max(0, fleetCargo(race, ships) - SOIL.reduce((t, r) => t + (carried[r] || 0), 0));
  const take = {};
  for (const r of SOIL) {
    const v = Math.floor(Math.min(room, (stock[r] || 0) / 2));
    take[r] = Math.max(0, v);
    room -= take[r];
  }
  return take;
}
