import { readTap } from '../../../../aim/index.js';
import { etat } from '../../../etat.js';
import { $ } from '../../../outils/dollar.js';
import { renderPick } from '../../fiche/render-pick.js';
import { closeMenu } from '../../menu/close-menu.js';
import { openMenu } from '../../menu/open-menu.js';
import { cellCss } from '../../zoom/cell-css.js';
import { gesture } from '../../zoom/gesture.js';
import { toCells } from '../../zoom/to-cells.js';
import { actionsFor } from '../actions-for.js';
import { mapItems } from '../map-items.js';
import { orderAt } from '../order-at.js';
import { selectFleet } from '../select-fleet.js';
import { showPlanet } from '../show-planet.js';

/**
 * Toucher la carte (D-126). Ce qui est sous le doigt est cherché avec un aimant (`js/aim.js`) ;
 * plusieurs objets presque aussi près : un menu au doigt pour choisir, au lieu de deviner.
 * Sans flotte sélectionnée : une de mes flottes la sélectionne, une planète ouvre sa fiche.
 * Flotte sélectionnée : la retoucher la relâche, une autre de mes flottes ouvre le menu « Fusionner » (ou
 * « Rejoindre et fusionner ») / « Choisir » (D-159), ailleurs
 * c'est sa cible (un seul ordre possible : il part ; plusieurs : menu au doigt).
 */
$('map').addEventListener('click', (e) => {
  if (!etat.session?.state) return;
  if (gesture.moved) return; // fin d'un glissé, d'un pincement ou d'une visée, pas un toucher
  if (etat.menu) return closeMenu(); // toucher à côté du menu le ferme, sans rien faire d'autre
  const at = toCells(e.clientX, e.clientY);
  const fid = etat.selFleet && etat.session.myFleet(etat.selFleet) ? etat.selFleet : null;
  const t = readTap(mapItems(), at, cellCss(at), fid);
  if (t.kind === 'many') {
    if (!fid) return openMenu(at, t.list.flatMap((it) => actionsFor(null, it, at)), { title: 'Lequel ?' });
    return orderAt(fid, t, at);
  }
  const it = t.kind === 'one' ? t.it : null;
  // Une autre de mes flottes, flotte choisie : menu « Fusionner / Rejoindre et fusionner / Choisir » (D-159).
  if (it?.type === 'mine' && (!fid || it.id === fid)) return selectFleet(it.id === fid ? null : it.id);
  if (fid) return orderAt(fid, t, at);
  if (it?.type === 'planet') return showPlanet(it.w);
  etat.selected = null;
  renderPick();
});
