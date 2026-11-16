import { countShips } from '../../../../fleet.js';
import { kindLabel, RACES, sameCell, stateAt, usedPlaces } from '../../../../game.js';
import { ic } from '../../../../icons.js';
import { myColonizer } from '../../depart/my-colonizer.js';
import { renderLobby } from '../../depart/render-lobby.js';
import { etat } from '../../etat.js';
import { $ } from '../../outils/dollar.js';
import { esc } from '../../outils/esc.js';
import { setHtml } from '../../planete/set-html.js';
import { fillSoil } from '../../planete/sol/fill-soil.js';
import { showClimate } from '../../planete/sol/show-climate.js';
import { soilTiles } from '../../planete/sol/soil-tiles.js';
import { de } from '../de.js';
import { mapPlanets } from '../map-planets.js';
import { seenAgo } from '../seen-ago.js';
import { renderPickYard } from './render-pick-yard.js';

/** Bandeau du départ et fiche de la planète touchée. */
export function renderPick(me = etat.session?.state?.players[etat.session.me], now = etat.session?.now()) {
  if (!etat.session?.state) return;
  renderLobby(me);
  const colonizer = myColonizer(me);
  const w = etat.selected && mapPlanets().find((x) => sameCell(x, etat.selected));
  $('sheet-planet').hidden = !w;
  if (!w) return;
  const o = w.owner;
  $('pi-name').textContent = w.name;
  $('pi-where').textContent = `[${w.x}:${w.y}]`;
  $('pi-owner').textContent = o
    ? `${o.id === etat.session.me ? `${w.kind === 'asteroid' ? 'Ton' : 'Ta'} ${kindLabel(w.kind).toLowerCase()}` : `${kindLabel(w.kind)} ${de(o.name)}`}${o.race ? ` · ${RACES[o.race].name}` : ''}`
    : w.live || etat.session.over
      ? `${kindLabel(w.kind)} libre. Ses gisements se vident quand on les exploite, et se reconstituent d’eux-mêmes jusqu’à leur maximum.`
      : `${kindLabel(w.kind)} hors de ta portée de détection : libre la dernière fois qu’on l’a vue, ou jamais vue.`;
  if (o && !w.live) $('pi-owner').textContent += ` · ${seenAgo(now - w.seen)}, hors de portée`;
  // Gisements : pleins pour une planète libre, calculés chez son propriétaire sinon.
  const planet = w.pl?.planet;
  const s = planet ? stateAt(planet, now) : null;
  // Hors de portée (D-124) : seulement ce que tout le monde sait de l'univers, pas son état chez son propriétaire.
  const nature = planet ? planet.nature : w.nature;
  showClimate($('pi-climate'), planet ? planet.climate : w.climate);
  const places = planet ? planet.places : w.places;
  $('pi-size').hidden = !places;
  $('pi-size').textContent = places
    ? `${kindLabel(w.kind)} · ${planet ? `${usedPlaces(stateAt(planet, now).levels)} / ${places}` : places} places${!o && w.kind !== 'planet' ? ' · à coloniser' : ''}`
    : '';
  if (o && s) {
    const n = countShips(s.ships);
    $('pi-owner').textContent += `${w.pl.key === 'home' ? '' : ' · colonie'} · ${n ? `${n} vaisseau${n > 1 ? 'x' : ''} à quai` : 'aucun vaisseau à quai'}`;
  }
  const box = $('pi-soil');
  if (!nature) box.innerHTML = '';
  else {
    if (!box.firstChild) box.innerHTML = soilTiles('pi');
    fillSoil('pi', nature, s ? s.reserve : w.reserve, s ? s.prod.soil : null);
  }
  // Départ (D-120) : la planète mère se fonde avec le colonisateur, envoyé d'ici.
  $('btn-claim').hidden = !colonizer || !!o || (w.kind && w.kind !== 'planet') || etat.session.locked(colonizer.id) || etat.session.frostOf(w) <= now;
  setHtml($('btn-claim'), `${ic('fleet')}Y envoyer mon colonisateur · ${esc(w.name)}`);
  const mine = etat.session.myPlanetAt(w); // « Voir la planète » : seulement sur une de mes planètes (D-139)
  $('btn-open-planet').hidden = !mine;
  $('btn-open-planet').dataset.key = mine?.key || 'home';
  renderPickYard(me, o?.id === etat.session.me && w.pl ? w.pl : null, s, now);
}
