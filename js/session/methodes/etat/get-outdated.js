import { FORMAT } from '../../constantes/format.js';

/** Un autre joueur a une version plus récente de l'appli. */
export function getOutdated() {
  return Object.values(this.state?.players || {}).some((p) => (p.v || 0) > FORMAT);
}
