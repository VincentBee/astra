import { sameCell } from '../../../game.js';
import { countShips } from '../../../fleet.js';
import { de } from '../../textes/de.js';
import { shipsText } from '../../textes/ships-text.js';

/**
 * Quelqu'un s'est installé sur une de mes planètes avant moi (choix
 * simultanés) : je la lui laisse. Je suis le seul à écrire ma fiche, c'est
 * donc à mon téléphone de le faire.
 */
export function checkClaim() {
  const p = this.state?.players[this.me];
  if (!p) return;
  // Une planète prise au combat n'est pas une installation simultanée : applyEffects la retire.
  const captured = (cell) => Object.values(this.state.players).some((o) => (o.effects || []).some((e) => e.capture && e.to === this.me && sameCell(e.cell, cell)));
  for (const id of Object.keys(p.colonies || {})) {
    const w = this.planets.find((x) => x.id === id);
    const owner = w && this.ownerAt(w);
    if (!owner || owner.id === this.me || captured(w)) continue;
    const fleet = this.evacuate(p, p.colonies[id], w);
    delete p.colonies[id];
    const after = fleet ? ` : la flotte ${de(p.name)} reste en orbite avec ${shipsText(countShips(fleet.ships))}` : '';
    this.touch(this.addLog(`${owner.name} a fondé sa colonie sur ${w.name} juste avant ${p.name}${after}.`));
    this.changed();
  }
  if (!p.home) return;
  const owner = this.ownerAt(p.home);
  if (!owner || owner.id === this.me || captured(p.home)) return;
  const w = this.myWorld;
  // Fondée par mon colonisateur : il repart en orbite (avec ce que la planète avait), pour en chercher une autre.
  const back = Number.isFinite(p.ready) && w ? this.evacuate(p, p.planet, w) : null;
  p.home = null;
  p.planet = null;
  delete p.claimAt;
  this.touch();
  this.ontoast?.(`${owner.name} s'est installé sur ${w?.name || 'cette planète'} juste avant toi : ${back ? 'ton colonisateur reste en orbite, envoie-le sur une autre' : 'choisis-en une autre'}.`);
  this.changed();
}
