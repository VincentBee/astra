import { MAX_PLAYERS } from '../../constantes/max-players.js';
import { pidOk } from '../../fiches/pid-ok.js';
import { rid } from '../../outils/rid.js';
import { sha256 } from '../../outils/sha256.js';

export async function onHello(link, msg) {
  if (link.pid) return;
  if (link.helloSeen) return link.send({ type: 'hello-ack' }); // demande renvoyée : déjà prise en compte
  link.helloSeen = true;
  if (this.status !== 'playing') return;
  const name = String(msg.name || '').trim().slice(0, 16) || 'Joueur';
  // Son secret se vérifie avec ce que je savais avant de lire sa copie (elle pourrait le remplacer).
  const knownHash = msg.gid === this.state.gid && pidOk(msg.pid) ? this.state.players[msg.pid]?.secretHash : null;
  // Il apporte sa copie de la partie : on garde ce qu'elle a de plus récent.
  this.mergeIn(msg.copy, link);
  const st = this.state;
  const known = msg.gid === st.gid && pidOk(msg.pid) && st.players[msg.pid];
  if (known && typeof msg.secret === 'string' && (await sha256(msg.secret)) === (knownHash || known.secretHash)) {
    // Retour d'un joueur : son secret prouve que c'est bien lui.
    return this.admit(link, msg.pid, null);
  }
  if (typeof msg.secretHash !== 'string' || msg.secretHash.length !== 64) return;
  link.send({ type: 'hello-ack' });
  // Pas de validation : l'hôte a lui-même scanné (ou collé) la réponse, et
  // une invitation ne sert qu'une fois. C'est déjà son accord.
  if (this.roster.length >= MAX_PLAYERS) {
    link.send({ type: 'refused', reason: 'La partie est complète (8 joueurs).' });
    return setTimeout(() => link.close(), 300);
  }
  const pid = rid(6);
  this.addPlayer(pid, name, msg.secretHash);
  this.admit(link, pid, this.addLog(`${name} rejoint la partie, invité par ${this.name}.`));
  this.ontoast?.(`${name} a rejoint la partie.`);
}
