import { RACES } from '../../regles/game/index.js';
import { COLORS } from '../constantes/colors.js';
import { cleanAmounts } from './clean-amounts.js';
import { cleanEffect } from './clean-effect.js';
import { isCell } from './is-cell.js';
import { isObj } from './is-obj.js';
import { planetOk } from './planet-ok.js';
import { upgradeFleet } from './upgrade-fleet.js';
import { cleanShuttle } from './clean-shuttle.js';

/**
 * Fiche d'un joueur au format actuel. Avant les races, les planètes
 * produisaient métal, cristal et deutérium : une fiche sans race n'a pas
 * encore de planète, son joueur choisira sa race en revenant.
 */
export function normalize(p) {
  delete p.pos; // vaisseaux d'avant : on ne se déplace plus sur la carte
  // Nom et couleur viennent d'un autre téléphone et finissent à l'écran : bornés et vérifiés.
  p.name = String(p.name ?? 'Joueur').slice(0, 16) || 'Joueur';
  if (typeof p.color !== 'string' || !/^#[0-9a-f]{6}$/i.test(p.color)) p.color = COLORS[0];
  if (!Object.hasOwn(RACES, p.race)) {
    p.race = null;
    p.planet = null;
  }
  // Une fiche vient d'un autre téléphone, peut-être abîmée ou trafiquée : ce qui
  // n'a pas la bonne forme est écarté, plutôt que de faire planter chaque passage.
  // Heure plancher d'une planète (D-175) : l'entrée du joueur dans la course (`since`, écrite une
  // fois), et pour une colonie son heure de prise (`claimAt`). Aucune planète n'existe avant.
  const since = Number.isFinite(p.since) ? p.since : -Infinity;
  if (p.planet && !planetOk(p.race, p.planet, since)) p.planet = null;
  // Colonies, flottes en route, dégâts infligés aux autres (et reçus, déjà appliqués).
  if (!isObj(p.colonies)) p.colonies = {};
  for (const [id, c] of Object.entries(p.colonies)) if (!planetOk(p.race, c, Math.max(since, Number.isFinite(c?.claimAt) ? c.claimAt : -Infinity))) delete p.colonies[id];
  if (!Array.isArray(p.fleets)) p.fleets = [];
  p.fleets = p.fleets.filter((f) => isObj(f) && isCell(f.from) && isCell(f.to) && isObj(f.ships));
  p.fleets.forEach(upgradeFleet);
  p.fleets.forEach(cleanShuttle);
  if (!Array.isArray(p.effects)) p.effects = [];
  p.effects = p.effects.filter((e) => isObj(e) && typeof e.to === 'string' && typeof e.id === 'string').map(cleanEffect);
  if (!Array.isArray(p.applied)) p.applied = [];
  if (!isObj(p.raided)) p.raided = {};
  p.applied = p.applied.filter((id) => typeof id === 'string');
  // Mes combats de flottes récents (pour ne pas compter deux fois un même combat livré des deux côtés).
  if (!Array.isArray(p.engaged)) p.engaged = [];
  // Flottes posées : id -> planète, pour que les dégâts qui les visaient encore les trouvent.
  if (!p.docked || typeof p.docked !== 'object') p.docked = {};
  // Échanges : mes offres en cours (avec leur séquestre), mes réponses à celles des autres.
  if (!Array.isArray(p.offers)) p.offers = [];
  p.offers = p.offers.filter((o) => isObj(o) && isObj(o.to) && isObj(o.from) && typeof o.to.pid === 'string' && Number.isFinite(o.expires));
  for (const o of p.offers) {
    o.give = cleanAmounts(o.give);
    o.want = cleanAmounts(o.want);
  }
  if (!Array.isArray(p.dropped)) p.dropped = [];
  p.dropped = p.dropped.filter((d) => isObj(d) && typeof d.id === 'string' && typeof d.pid === 'string' && Number.isFinite(d.expires) && Number.isFinite(d.at));
  for (const d of p.dropped) {
    d.give = cleanAmounts(d.give);
    d.want = cleanAmounts(d.want);
  }
  if (!Array.isArray(p.answers)) p.answers = [];
  p.answers = p.answers.filter((a) => isObj(a) && typeof a.offer === 'string');
  // Journal des ordres : { t, k, a?, ids?, s? } (heure, ordre ou « tick », arguments,
  // identifiants tirés, entrées des journaux des autres connues quand ce nombre a changé).
  if (!Array.isArray(p.orders)) p.orders = [];
  if (p.deathPts !== undefined && !Number.isFinite(p.deathPts)) delete p.deathPts;
  // Prêt (heure) et départ de la partie vu par ce joueur (heure) : des nombres, ou rien.
  // Parti avant le départ (IA retirée du lobby, D-399) : une heure, ou rien.
  for (const k of ['ready', 'go', 'clockFix', 'left']) if (p[k] !== undefined && !Number.isFinite(p[k])) delete p[k];
  return p;
}
