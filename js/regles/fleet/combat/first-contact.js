import { distance } from '../../game/index.js';
import { CONTACT } from './contact.js';
import { fleetPos } from '../deplacement/fleet-pos.js';

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
