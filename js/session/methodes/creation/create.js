import { saveIdentity } from '../../../save.js';
import { rid } from '../../outils/rid.js';
import { sha256 } from '../../outils/sha256.js';
import { Session } from '../../session.js';

/** Crée une nouvelle partie. */
export async function create(name) {
  const s = new Session(name);
  const secret = rid(16);
  s.me = rid(6);
  // key : clé de la partie, qui protège le rendez-vous automatique.
  s.state = { gid: rid(6), key: rid(16), players: {}, log: [] };
  s.addPlayer(s.me, name, await sha256(secret));
  s.clockSynced = true; // le créateur donne l'heure commune (D-165)
  s.addLog(`${name} ouvre la partie.`);
  saveIdentity({ gid: s.state.gid, pid: s.me, secret });
  s.status = 'playing';
  s.claim();
  s.start();
  s.save();
  return s;
}
