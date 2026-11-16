import { moveTo, moving, intercept, inContact, firstContact } from '../../../fleet.js';
import { techOf } from '../../outils/tech-of.js';
import { de } from '../../textes/de.js';

/**
 * Poursuite, à chaque passage : combat au contact ; sinon, nouveau cap
 * vers le point d'interception quand la cible a changé de trajet (ou
 * quand j'y suis arrivé sans la trouver). Renvoie true si ma fiche a changé.
 */
export function pursue(p, f, now, from = now) {
  const enemy = this.state.players[f.order.pid];
  const target = this.fleetOf(enemy, f.order.fleet);
  // Rencontre que personne n'a regardée à temps (hors ligne) : combat à l'heure de la rencontre.
  const met = target && !inContact(f, target, now) && firstContact(f, target, from, now);
  if (met && this.sees(enemy, target, met) && !this.pendingFight(p, f, enemy, target)) {
    if (target.id !== f.order.fleet) f.order = { ...f.order, fleet: target.id };
    return this.fight(p, f, enemy, target, met);
  }
  if (!target || !this.sees(enemy, target, now)) {
    // Disparue (posée, détruite) ou sortie de ma portée de détection.
    f.order = null;
    this.addLog(`La flotte ${de(p.name)} perd sa cible de vue.`);
    this.ontoast?.('Cible perdue de vue : la poursuite s’arrête.');
    return true;
  }
  if (target.id !== f.order.fleet) f.order = { ...f.order, fleet: target.id }; // la cible a fusionné
  // Un combat entre ces deux flottes déjà livré (par une autre de mes flottes, ou par lui) et pas
  // encore lu : nos copies montrent l'état d'avant, le rejouer compterait les pertes deux fois.
  // J'attends son rapport, ou qu'il lise le mien.
  if (this.pendingFight(p, f, enemy, target)) return false;
  if (inContact(f, target, now)) return this.fight(p, f, enemy, target, now);
  // Appli en arrière-plan au moment de la rencontre : je regarde aussi l'instant de mon arrivée.
  if (!moving(f, now) && f.arrive > f.depart && inContact(f, target, f.arrive)) return this.fight(p, f, enemy, target, f.arrive);
  const seen = `${target.depart}:${target.arrive}:${target.to.x}:${target.to.y}`;
  if (seen === f.order.seen && moving(f, now)) return false;
  const aim = intercept(f, p.race, techOf(p), target, now);
  if (seen === f.order.seen && !moving(f, now) && Math.abs(aim.x - f.to.x) + Math.abs(aim.y - f.to.y) < 1e-6) return false; // j'attends au point d'interception
  const err = moveTo(f, p.race, techOf(p), aim, { ...f.order, seen }, now);
  if (err || f.stranded) {
    f.order = null;
    this.ontoast?.(err || 'Pas assez de carburant pour rattraper la cible : la poursuite s’arrête au point de panne.');
  }
  return true;
}
