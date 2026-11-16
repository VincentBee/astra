import { ID_KEY, IDS_KEY } from '../constantes.js';
import { write } from '../stockage/write.js';
import { identities } from './identities.js';

/** Mon identité dans la partie en cours, gardée aussi pour la reprendre plus tard. */
export function saveIdentity(id) {
  const ids = identities(); // avant d'écraser l'identité en cours, pour la garder
  ids[id.gid] = id;
  write(IDS_KEY, ids);
  write(ID_KEY, id);
}
