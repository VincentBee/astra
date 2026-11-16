import { sameCell } from '../../../game.js';
import { etat } from '../etat.js';
import { de } from './de.js';
import { mapVeiled } from './map-veiled.js';

/**
 * Toutes les planètes à afficher : celles de l'univers, avec leur
 * propriétaire, et les planètes mères des joueurs d'avant le choix de
 * planète (placées hors de la liste).
 */
export function mapPlanets() {
  if (mapVeiled()) return []; // avant le départ (D-240) : la carte reste une surprise
  // Brouillard (D-124) : hors de ma portée, une planète des autres paraît libre, ou porte le nom
  // de celui qui la tenait la dernière fois que je l'ai vue (`seen` : pas de nouvelles fraîches).
  const now = etat.session.now();
  const eyes = etat.session.eyes(now);
  const out = etat.session.planets.map((w) => {
    const k = etat.session.knownOwner(w, now, eyes);
    const owner = k.owner;
    // `pl` : la planète du propriétaire à cet endroit (mère ou colonie), avec sa clé ; vue seulement en direct.
    const pl = owner && k.live ? etat.session.planetsOf(owner).find((x) => sameCell(x.cell, w)) : null;
    return { ...w, owner: owner && (pl || !k.live) ? owner : null, pl: pl || null, live: k.live, seen: k.at };
  });
  for (const p of Object.values(etat.session.state.players)) {
    if (p.home && p.planet && !out.some((w) => sameCell(w, p.home))) {
      const k = etat.session.knownOwner(p.home, now, eyes);
      if (k.owner?.id !== p.id) continue; // jamais vue : on ne sait même pas qu'elle existe
      out.push({ id: `home-${p.id}`, name: `Planète ${de(p.name)}`, x: p.home.x, y: p.home.y, owner: p, nature: null, pl: k.live ? etat.session.planetOf(p, 'home') : null, live: k.live, seen: k.at });
    }
  }
  return out;
}
