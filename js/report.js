// Rapport de combat détaillé (D-122) : à partir du déroulé que `battle`
// (js/fleet.js) renvoie dans `report`, dire ce qui s'est passé, passe par
// passe, et pourquoi on a gagné ou perdu. Pur : aucun état, aucun réseau ;
// le texte est vu par un camp (`side` : 'a' l'attaquant, 'd' le défenseur).
//
// Le déroulé voyage dans le rapport (`effects`) que l'attaquant écrit pour
// le défenseur : `cleanReport` le borne, comme toute donnée d'un autre
// téléphone. Il ne sert qu'à l'affichage : rien n'en dépend dans les règles.

import { SHIPS, SHIP_KEYS } from './tech.js';

const isObj = (x) => !!x && typeof x === 'object' && !Array.isArray(x);
const num = (v, max = 1e9) => (Number.isFinite(v) ? Math.max(0, Math.min(max, v)) : 0);
const KEYS = [...SHIP_KEYS, 'fort'];

function counts(o, keys = KEYS) {
  if (!isObj(o)) return {};
  return Object.fromEntries(keys.filter((k) => Number.isFinite(o[k]) && o[k] > 0).map((k) => [k, Math.min(Math.floor(o[k]), 1e7)]));
}

/** Déroulé reçu d'un autre téléphone, nettoyé (ou undefined s'il est inutilisable). */
export function cleanReport(r) {
  if (!isObj(r) || !isObj(r.a) || !isObj(r.d) || !Array.isArray(r.rounds)) return undefined;
  const side = (s) => {
    const out = {
      race: typeof s.race === 'string' && Object.hasOwn(SHIPS, s.race) ? s.race : null,
      ships: counts(s.ships, SHIP_KEYS),
      bonus: { attack: num(s.bonus?.attack, 100) || 1, hull: num(s.bonus?.hull, 100) || 1 },
      fire: num(s.fire),
      hull: num(s.hull),
      hullLeft: num(s.hullLeft),
    };
    if (isObj(s.fort)) out.fort = { attack: num(s.fort.attack), hull: num(s.fort.hull) };
    return out;
  };
  return {
    a: side(r.a),
    d: side(r.d),
    rounds: r.rounds.slice(0, 4).filter(isObj).map((x) => ({ a: num(x.a), d: num(x.d), aLost: counts(x.aLost), dLost: counts(x.dLost) })),
  };
}

// ----- mise en forme ---------------------------------------------------------

const n0 = (v) => Math.round(v).toLocaleString('fr-FR');
const mult = (v) => `×${(Math.round(v * 100) / 100).toLocaleString('fr-FR')}`;
const pct = (v) => `${Math.round(v * 100)} %`;
const passes = (n) => `${n} passe${n > 1 ? 's' : ''}`;

/** Nom d'un vaisseau de la race (ou « défense de la planète »). */
export function shipName(race, k) {
  if (k === 'fort') return 'défense de la planète';
  return SHIPS[race]?.[k]?.name || k;
}

/** Caractéristiques d'un vaisseau dans le déroulé : celles de sa race, technologies comprises. */
function statsOf(s, k) {
  if (k === 'fort') return s.fort || { attack: 0, hull: 0 };
  const base = SHIPS[s.race]?.[k] || { attack: 0, hull: 0 };
  return { attack: base.attack * s.bonus.attack, hull: base.hull * s.bonus.hull };
}

/** « 3 × Frégate et la défense de la planète » (vide si rien). */
function listShips(race, o) {
  const parts = KEYS.filter((k) => o?.[k] > 0).map((k) => (k === 'fort' ? 'sa défense' : `${o[k]} × ${shipName(race, k)}`));
  return parts.length > 1 ? `${parts.slice(0, -1).join(', ')} et ${parts.at(-1)}` : parts[0] || '';
}

/** Pertes de chaque camp sur tout le combat (défense comprise). */
function totalLost(rep, who) {
  const key = who === 'a' ? 'aLost' : 'dLost';
  const out = {};
  for (const r of rep.rounds) for (const [k, v] of Object.entries(r[key] || {})) out[k] = (out[k] || 0) + v;
  return out;
}

/** Il reste quelque chose à ce camp à la fin (vaisseaux ou défense). */
function standing(rep, who) {
  const s = rep[who];
  const lost = totalLost(rep, who);
  const before = { ...s.ships, ...(s.fort?.hull > 0 ? { fort: 1 } : {}) };
  return Object.entries(before).some(([k, v]) => v - (lost[k] || 0) > 0);
}

/**
 * Tableau des forces d'un camp : une ligne par type (nombre, attaque et coque
 * unitaires, pertes), défense comprise, et ses totaux au départ.
 */
export function sideTable(rep, who) {
  const s = rep[who];
  const lost = totalLost(rep, who);
  const rows = SHIP_KEYS.filter((k) => s.ships[k] > 0).map((k) => {
    const st = statsOf(s, k);
    return { key: k, name: shipName(s.race, k), count: s.ships[k], attack: st.attack, hull: st.hull, lost: lost[k] || 0 };
  });
  if (s.fort?.hull > 0) rows.push({ key: 'fort', name: 'Défense de la planète', count: 1, attack: s.fort.attack, hull: s.fort.hull, lost: lost.fort || 0 });
  return { rows, fire: s.fire, hull: s.hull, hullLeft: s.hullLeft, bonus: s.bonus };
}

/**
 * Le combat vu par le camp `side` : `outcome` ('win' | 'loss' | 'both' |
 * 'draw'), `reasons` (la première dit pourquoi, les suivantes ce qui a pesé),
 * `rounds` (une phrase par passe). `extra.noLoot` : pourquoi une victoire n'a
 * rien rapporté ('cooldown' | 'full' | 'empty'), `extra.cooldown` : délai en ms.
 */
export function explainBattle(rep, side, extra = {}) {
  const foeSide = side === 'a' ? 'd' : 'a';
  const me = rep[side];
  const foe = rep[foeSide];
  const meUp = standing(rep, side);
  const foeUp = standing(rep, foeSide);
  const outcome = meUp && !foeUp ? 'win' : !meUp && foeUp ? 'loss' : !meUp && !foeUp ? 'both' : 'draw';
  const N = rep.rounds.length;
  const reasons = [];
  const dealt = (s) => (s.hull > 0 ? 1 - s.hullLeft / s.hull : 0); // part de sa coque détruite

  // 1. Pourquoi.
  if (outcome === 'win') {
    reasons.push(
      foe.fire <= 0
        ? `L’adversaire n’avait aucune arme : ton feu (${n0(me.fire)} par passe) a abattu sa coque (${n0(foe.hull)}) en ${passes(N)}.`
        : `Ton feu (${n0(me.fire)} par passe) a abattu sa coque (${n0(foe.hull)}) en ${passes(N)}, avant que le sien (${n0(foe.fire)}) ne vienne à bout de la tienne (${n0(me.hull)}) : l’adversaire n’en a détruit que ${pct(dealt(me))}.`,
    );
  } else if (outcome === 'loss') {
    reasons.push(
      me.fire <= 0
        ? `Tes vaisseaux n’avaient aucune arme : ils ont encaissé ${passes(N)} sans pouvoir répondre.`
        : `Son feu (${n0(foe.fire)} par passe) a abattu ta coque (${n0(me.hull)}) en ${passes(N)}, avant que le tien (${n0(me.fire)}) ne vienne à bout de la sienne (${n0(foe.hull)}) : tu n’en as détruit que ${pct(dealt(foe))}.`,
    );
  } else if (outcome === 'both') {
    reasons.push(`Les deux camps s’anéantissent en ${passes(N)} : feu ${n0(me.fire)} contre ${n0(foe.fire)}, coque ${n0(me.hull)} contre ${n0(foe.hull)}.`);
  } else if (me.fire <= 0 && foe.fire <= 0) {
    reasons.push('Aucun des deux camps n’avait d’armes : personne n’a pu tirer.');
  } else {
    reasons.push(
      `Personne n’est abattu après les ${passes(N)} du combat : tu as détruit ${pct(dealt(foe))} de sa coque (${n0(foe.hull)}), l’adversaire ${pct(dealt(me))} de la tienne (${n0(me.hull)}).`,
    );
  }

  // 2. Rapport de forces : feu × coque (à effectifs doublés, il est quadruplé).
  const mine = me.fire * me.hull;
  const theirs = foe.fire * foe.hull;
  if (mine > 0 && theirs > 0) {
    const r = mine / theirs;
    const ratio = r >= 1 ? `${(Math.round(r * 10) / 10).toLocaleString('fr-FR')} contre 1 pour toi` : `1 contre ${(Math.round(10 / r) / 10).toLocaleString('fr-FR')} pour l’adversaire`;
    let line = `Rapport de forces (feu × coque) : ${ratio}.`;
    if (outcome !== 'win' && r < 1) line += ` Pour l’emporter, il t’aurait fallu environ ${(Math.round(Math.sqrt(1 / r) * 10) / 10).toLocaleString('fr-FR')} fois plus de vaisseaux armés.`;
    else if (outcome === 'win' && r < 1.5) line += ' Victoire serrée.';
    reasons.push(line);
  }

  // 3. La défense d'une planète.
  if (foe.fort?.hull > 0) {
    const fell = totalLost(rep, foeSide).fort > 0;
    reasons.push(
      `Sa planète se défend : ses bâtiments comptent pour ${n0(foe.fort.attack)} d’attaque et ${n0(foe.fort.hull)} de coque (${pct(foe.fort.hull / (foe.hull || 1))} de sa coque). ` +
        (fell ? 'Tu l’as abattue.' : 'Elle tient : elle repart intacte au prochain assaut, il faut l’abattre en un seul combat.'),
    );
  }
  if (me.fort?.hull > 0) {
    const fell = totalLost(rep, side).fort > 0;
    reasons.push(`Tes bâtiments défendent la planète : ${n0(me.fort.attack)} d’attaque et ${n0(me.fort.hull)} de coque. ${fell ? 'Ils sont tombés.' : 'Ils ont tenu.'}`);
  }

  // 4. Les technologies.
  const b = (s) => s.bonus.attack !== 1 || s.bonus.hull !== 1;
  if (b(me) || b(foe)) {
    reasons.push(`Technologies : ton attaque ${mult(me.bonus.attack)} et ta coque ${mult(me.bonus.hull)} ; chez l’adversaire ${mult(foe.bonus.attack)} et ${mult(foe.bonus.hull)}.`);
  }

  // 5. Les vaisseaux sans armes prennent leur part des coups (répartis selon la coque).
  const soak = SHIP_KEYS.filter((k) => me.ships[k] > 0 && statsOf(me, k).attack <= 0);
  if (soak.length && me.fire > 0 && me.hull > 0) {
    const h = soak.reduce((t, k) => t + me.ships[k] * statsOf(me, k).hull, 0) / me.hull;
    if (h >= 0.1) reasons.push(`Tes vaisseaux sans armes (${soak.map((k) => shipName(me.race, k)).join(', ')}) portaient ${pct(h)} de ta coque : les coups se répartissent selon la coque, ils en prennent leur part sans tirer.`);
  }

  // 6. Le butin.
  if (extra.noLoot === 'cooldown') reasons.push(`Pas de butin : tu as déjà pillé cette planète il y a moins de ${Math.round((extra.cooldown || 0) / 1000)} s (un pillage par planète à la fois).`);
  else if (extra.noLoot === 'full') reasons.push('Pas de butin : il ne reste pas de place dans les soutes de tes survivants.');
  else if (extra.noLoot === 'empty') reasons.push('Pas de butin : il n’y avait rien à prendre.');

  const lostKey = side === 'a' ? 'aLost' : 'dLost';
  const foeKey = side === 'a' ? 'dLost' : 'aLost';
  const rounds = rep.rounds.map((r, i) => {
    const myLoss = listShips(me.race, r[lostKey]);
    const foeLoss = listShips(foe.race, r[foeKey]);
    const fire = `tu tires ${n0(side === 'a' ? r.a : r.d)}, l’adversaire ${n0(side === 'a' ? r.d : r.a)}`;
    const losses = [myLoss ? `tu perds ${myLoss.replace('sa défense', 'ta défense')}` : 'tu ne perds rien', foeLoss ? `l’adversaire perd ${foeLoss}` : 'l’adversaire ne perd rien'];
    return `Passe ${i + 1} : ${fire} ; ${losses.join(', ')}.`;
  });
  return { outcome, reasons, rounds };
}
