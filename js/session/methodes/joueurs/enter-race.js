import { SHIPS } from '../../../tech.js';
import { MAX_FLEETS } from '../../../fleet.js';

/**
 * Partie partie, moi prêt et pas encore dans la course : ma flotte de départ, un seul
 * colonisateur, le plein fait, apparaît sur la carte (au départ, ou quand je suis prêt si
 * c'est après). Elle doit aller fonder ma planète mère sur une planète libre.
 */
export function enterRace(p, now) {
  const start = this.startedAt;
  if (start == null || !Number.isFinite(p.ready) || Number.isFinite(p.since) || p.home || p.out) return false;
  p.fleets ||= [];
  if (p.fleets.length >= MAX_FLEETS) return false;
  // La même flotte que les autres téléphones voyaient déjà (ghostFleet), avec le même identifiant :
  // les combats qu'ils lui ont livrés pendant mon absence s'appliquent à elle (D-163).
  const f = this.startFleet(p, start);
  const at = Math.min(now, f.depart);
  f.depart = f.arrive = at;
  p.fleets.push(f);
  p.since = at;
  this.addLog(`${p.name} entre dans la partie avec un seul vaisseau : ${SHIPS[p.race].colony.name}.`);
  this.ontoast?.(`Ta flotte de départ (${SHIPS[p.race].colony.name}) est sur la carte : envoie-la fonder ta planète mère sur une planète libre.`, 8000);
  return true;
}
