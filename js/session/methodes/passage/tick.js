import { settle, stateAt, RACES } from '../../../game.js';
import { TECHS, SHIPS } from '../../../tech.js';
import { moving } from '../../../fleet.js';
import { maxTech } from '../../outils/max-tech.js';
import { sameTech } from '../../outils/same-tech.js';
import { techOf } from '../../outils/tech-of.js';
import { planStartText } from '../../textes/plan-start-text.js';

/**
 * Je fais avancer moi-même ce qui m'appartient (l'affichage des autres se
 * calcule seul) : chantiers, recherches et vaisseaux terminés, arrivées de
 * mes flottes, et dégâts que d'autres m'ont infligés.
 */
/**
 * `from` : depuis quand chercher les rencontres de flottes que personne n'a
 * regardées (téléphones hors ligne, en arrière-plan) : le passage précédent
 * (`scanAt`), ou au lancement la dernière modification de ma fiche. Notée
 * dans le journal d'ordres : le rejeu cherche sur la même fenêtre.
 */
export function tick() {
  if (this.status !== 'playing' || !this.state) return;
  this.checkClaim();
  const p = this.state.players[this.me];
  if (!p?.race) return;
  const now = this.now();
  this.scout(now); // brouillard (D-124) : ce que mes planètes et mes flottes voient en ce moment
  const entered = this.enterRace(p, now); // départ donné : ma flotte de départ apparaît
  const racing = Number.isFinite(p.ready) && Number.isFinite(p.since) && !p.out; // dans la course, peut-être sans planète
  if (!p.planet && !p.fleets?.length && !racing) return;
  const from = Math.min(now, this.scanAt ?? p.actAt ?? now);
  if (this.entry && from < now) this.entry.from = from;
  this.scanAt = now;
  let changed = entered;
  this.tickLogs = []; // entrées du journal de ce passage, envoyées avec ma fiche
  if (this.over) {
    // Partie finie : tout s'arrête, sauf la lecture des derniers combats.
    if (this.applyEffects(p, now)) this.touch(this.tickLogs.length ? this.tickLogs : null), this.changed();
    this.tickLogs = null;
    return;
  }
  if (this.freeze(p, now)) changed = true;
  if (this.freezeFleets(p, now, false)) changed = true;
  let techAt = now; // fin de la dernière recherche terminée depuis le passage précédent
  let colonyTech = false; // une colonie a trouvé une technologie : les autres planètes la reçoivent
  const R = RACES[p.race];
  const report = (pl, d) => {
    changed = true;
    if (d.kind === 'start') this.addLog(planStartText(p, d, pl.name));
    else if (d.kind === 'queue' && d.demolish) this.addLog(`${p.name} a déconstruit ${R.buildings[d.key].name} (niv. ${d.level}) sur ${pl.name}.`);
    else if (d.kind === 'queue') this.addLog(`${p.name} termine ${R.buildings[d.key].name} niv. ${d.level} sur ${pl.name}.`);
    else if (d.kind === 'research') {
      techAt = Math.min(techAt, d.end);
      // Trouvée dans une colonie : elle vaut aussi pour la planète mère, qui la donne aux autres.
      if (pl.key !== 'home') {
        settle(p.planet, d.end); // la planète mère profite du bonus à partir de la fin, pas avant
        p.planet.tech = maxTech(techOf(p), { [d.key]: d.level });
        colonyTech = true;
      }
      this.addLog(`${p.name} découvre ${TECHS[p.race][d.key].name} niv. ${d.level} sur ${pl.name}.`);
      this.ontoast?.(`Recherche terminée : ${TECHS[p.race][d.key].name} niv. ${d.level}.`);
    } else this.addLog(`${p.name} reçoit ${d.count} × ${SHIPS[p.race][d.type].name} sur ${pl.name}.`);
  };
  // Les technologies valent pour toutes mes planètes : chaque colonie en garde une copie, à
  // partir de la fin de la recherche (et pas seulement du passage qui s'en aperçoit).
  const shareTech = (pl) => {
    if (pl.key === 'home' || sameTech(pl.planet.tech, techOf(p))) return;
    for (const d of settle(pl.planet, Math.min(techAt, now))) report(pl, d);
    p.planet.tech = maxTech(techOf(p), pl.planet.tech); // une recherche finie ici et pas encore partagée
    pl.planet.tech = { ...p.planet.tech };
    changed = true;
  };
  // La planète mère d'abord (planetsOf la donne en premier) : ses recherches valent pour les colonies.
  const mine = this.planetsOf(p);
  for (const pl of mine) {
    shareTech(pl);
    // Une fin de chantier, ou le fil de construction qui peut lancer le suivant.
    const due = ['queue', 'research', 'yard'].some((k) => pl.planet[k] && pl.planet[k].end <= now) || (!pl.planet.queue && pl.planet.plan?.length && stateAt(pl.planet, now).done.length > 0);
    if (due) for (const d of settle(pl.planet, now)) report(pl, d);
  }
  // Une recherche finie dans une colonie : les planètes déjà passées la reçoivent aussi.
  if (colonyTech) for (const pl of mine) shareTech(pl);
  // Les combats des autres d'abord : mes flottes agissent ensuite avec leurs vraies pertes.
  if (this.applyEffects(p, now)) changed = true;
  // Filet (D-180) : éliminé par un chemin qui n'est pas passé par eliminate() (vieille fiche…), ses flottes disparaissent aussi.
  if (Number.isFinite(p.out) && p.fleets?.length) {
    p.fleets = [];
    changed = true;
  }
  for (const f of [...(p.fleets || [])]) {
    if (f.order?.kind === 'chase') {
      if (this.pursue(p, f, now, from)) changed = true;
      continue;
    }
    if (this.engage(p, f, now, from)) changed = true;
    if (!p.fleets.includes(f)) continue; // détruite dans ce combat
    if (f.order && !moving(f, now) && this.arrive(p, f)) changed = true;
  }
  if (this.freezeFleets(p, now, true)) changed = true; // celles restées en orbite après leur arrivée
  if (this.noColonizer(p, now)) changed = true;
  if (this.settleOffers(p, now)) changed = true;
  if (this.refuseExpired(p, now)) changed = true;
  this.noticeOffers(now);
  if (this.checkOver(p, now)) changed = true;
  const logs = this.tickLogs;
  this.tickLogs = null;
  if (!changed) return;
  this.touch(logs.length ? logs : null);
  this.changed();
}
