import { settle, stateAt, RACES } from '../../../regles/game/index.js';
import { TECHS, SHIPS } from '../../../regles/tech/index.js';
import { moving } from '../../../regles/fleet/index.js';
import { maxTech } from '../../outils/max-tech.js';
import { sameTech } from '../../outils/same-tech.js';
import { techOf } from '../../outils/tech-of.js';
import { planStartText } from '../../textes/plan-start-text.js';
import { autoLog } from '../../textes/auto-log.js';
import { AUTO_SETTLE } from '../../textes/auto-settle.js';

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
      if (d.auto) return; // achat automatique (D-530) : une ligne par planète, après (autoLog)
      if (d.kind === 'start') this.addLog(planStartText(p, d, pl.name));
      else if (d.kind === 'queue' && d.demolish) this.addLog(`${p.name} a déconstruit ${R.buildings[d.key].name} (niv. ${d.level}) sur ${pl.name}.`);
      else if (d.kind === 'queue') this.addLog(`${p.name} termine ${R.buildings[d.key].name} niv. ${d.level} sur ${pl.name}.`);
      else if (d.kind === 'research') {
        techAt = Math.min(techAt, d.end);
        // Trouvée dans une colonie : elle vaut aussi pour la planète mère, qui la donne aux autres.
        if (pl.key !== 'home') {
          this.settleLog(p, this.planetOf(p, 'home') || { planet: p.planet, name: '' }, d.end); // la planète mère profite du bonus à partir de la fin, pas avant
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
      const done = settle(pl.planet, Math.min(techAt, now));
      for (const d of done) report(pl, d);
      autoLog(this, p, pl, done);
      p.planet.tech = maxTech(techOf(p), pl.planet.tech); // une recherche finie ici et pas encore partagée
      pl.planet.tech = { ...p.planet.tech };
      changed = true;
    };
    // La planète mère d'abord (planetsOf la donne en premier) : ses recherches valent pour les colonies.
    const mine = this.planetsOf(p);
    for (const pl of mine) {
      shareTech(pl);
      // Une fin de chantier, ou le fil de construction qui peut lancer le suivant.
      // L'achat automatique (D-530) n'écrit la planète qu'au plus toutes les AUTO_SETTLE : un passage
      // par lot remplirait le journal d'ordres (MAX_ORDERS) et la partie ne se rejouerait plus.
      const auto = !!pl.planet.auto && now - pl.planet.at >= AUTO_SETTLE;
      // Règle arrêtée : son dernier lot finit comme un lot ordinaire (sinon il resterait en chantier dans la fiche).
      const ended = (k) => pl.planet[k] && pl.planet[k].end <= now && (k !== 'yard' || !pl.planet.yard.auto || !pl.planet.auto || auto);
      // Le fil n'écrit la planète que pour ses propres lancements et fins : ceux de la règle
      // attendent AUTO_SETTLE (sinon chaque lot automatique ferait un passage dès que le fil attend).
      const plan = !pl.planet.queue && pl.planet.plan?.length;
      const seen = (auto || plan) && stateAt(pl.planet, now).done;
      const due = ['queue', 'research', 'yard'].some(ended) || (auto && seen.length > 0) || (plan && seen.some((d) => !d.auto));
      if (due) {
        const done = settle(pl.planet, now);
        for (const d of done) report(pl, d);
        autoLog(this, p, pl, done);
      }
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
