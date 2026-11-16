import { loadGame, loadIdentity, identityFor, savedGame } from '../../../reseau/save/index.js';
import { rid } from '../../outils/rid.js';
import { sha256 } from '../../outils/sha256.js';

export async function onFirstLink(link) {
  this.pendingAnswer = null;
  this.status = 'waiting';
  this.attach(link, null);
  this.firstLink = link;
  // D-260 : si l'invitation dit de quelle partie elle vient, je n'envoie que mon identité
  // et ma copie de celle-là, jamais le secret d'une autre. Ancien lien ou code seul : comme
  // avant, l'identité de la dernière partie ouverte.
  const gid = this.inviteGid;
  const id = gid ? identityFor(gid) : loadIdentity();
  this.newSecret = rid(16);
  const hello = {
    type: 'hello',
    name: this.name,
    gid: id?.gid,
    pid: id?.pid,
    secret: id?.secret,
    secretHash: await sha256(this.newSecret),
    // Ma copie de la partie, si j'en ai une : ma progression faite hors
    // ligne est gardée.
    copy: (gid ? savedGame(gid) : loadGame())?.state,
  };
  // Le tout premier message d'un canal qui vient de s'ouvrir se perd
  // parfois : on le renvoie chaque seconde jusqu'à l'accusé de réception.
  const send = () => {
    if (this.firstLink !== link || this.helloAcked || link.closed) return clearInterval(this.helloTimer);
    link.send(hello);
  };
  clearInterval(this.helloTimer);
  this.helloAcked = false;
  send();
  this.helloTimer = setInterval(send, 1000);
  this.changed();
}
