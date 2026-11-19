import { fleetSpots } from '../carte/selection/fleet-spots.js';
import { mapView } from '../carte/bassin/map-view.js';
import { etat } from '../etat.js';
import { $ } from '../outils/dollar.js';
import { esc } from '../outils/esc.js';

/**
 * Ce que le scénario vérifie, posé sur la carte (lecture seule seulement : jamais en jeu).
 * - le doigt (D-146) : le cercle que le test a vérifié (portée `r` en cases, autour du point
 *   touché) ; si le minimum `MIN_REACH` joue, un petit cercle dedans (portée `raw` sans lui) ;
 * - les valeurs vérifiées (D-147) : un anneau vert (✔) ou rouge (✖) sur la case ou la flotte, avec le
 *   numéro de la vérification ; le texte est dans la légende du rapport, à côté du téléphone.
 */
export function showMarks(snap) {
  let box = $('view-marks');
  if (!box) {
    box = document.createElement('div');
    box.id = 'view-marks';
    $('map').parentElement.append(box);
  }
  box.replaceChildren();
  const f = snap.finger;
  const marks = snap.marks || [];
  if (!f && !marks.length) return;
  // Après la mise en page : la taille du canvas donne celle des cases.
  requestAnimationFrame(() => {
    const canvas = $('map');
    const view = mapView(); // carte en perspective (D-559)
    const place = (el, x, y) => {
      const pt = view.pt(x + 0.5, y + 0.5, 0);
      el.style.left = `${canvas.offsetLeft + pt.x}px`;
      el.style.top = `${canvas.offsetTop + pt.y}px`;
      box.append(el);
    };
    if (f) {
      const el = document.createElement('div');
      el.className = 'view-finger';
      el.style.width = el.style.height = `${2 * f.r * view.pt(f.x + 0.5, f.y + 0.5, 0).s}px`;
      // Portée sans le minimum (MIN_REACH), plus petite : un cercle plein dedans.
      const raw = f.raw < f.r ? `<i style="width:${(100 * f.raw) / f.r}%;height:${(100 * f.raw) / f.r}%"></i>` : '';
      el.innerHTML = `${raw}<span>${esc(f.text)}</span>`;
      place(el, f.x, f.y);
    }
    const spots = fleetSpots(etat.session.now());
    for (const m of marks) {
      if (m.x === undefined) continue; // sans place sur la carte : seulement dans la légende du rapport
      // Une flotte : là où la carte la dessine (à l'arrêt, en couronne autour de sa case).
      const spot = m.id && spots.find((x) => x.p.id === m.pid && x.f.id === m.id);
      const el = document.createElement('div');
      el.className = `view-mark ${m.ok ? 'ok' : 'ko'}`;
      el.title = `${m.ok ? '✔' : '✖'} ${m.text}`;
      el.innerHTML = `<span>${m.n}</span>`;
      place(el, spot ? spot.x : m.x, spot ? spot.y : m.y);
    }
  });
}
