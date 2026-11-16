import { mergeStates, saveIdentity, identityFor, savedGame } from '../../../save.js';
import { clean } from '../../fiches/clean.js';

export function onWelcome(link, msg) {
  if (link !== this.firstLink || !msg.state || typeof msg.from !== 'string') return;
  // On adopte la copie de l'hôte, complétée par la nôtre s'il s'agit de la
  // même partie (progression faite hors ligne).
  const mine = savedGame(msg.state.gid); // ma copie de CETTE partie, pas forcément la dernière ouverte (D-260)
  let st = clean(msg.state);
  if (mine && mine.state.gid === st.gid) st = mergeStates(st, clean(mine.state));
  // Mon carnet de combats de cette partie, s'il est sur ce téléphone (même joueur).
  if (mine && mine.state.gid === st.gid && mine.me === msg.you) {
    this.journal = mine.journal || null;
    this.intel = mine.intel || {};
  }
  this.me = msg.you;
  this.state = st;
  this.loadClock(); // nouveau venu : pas d'heure commune, il la prend de son hôte au premier battement (D-165)
  const id = identityFor(st.gid);
  const secret = id?.pid === msg.you ? id.secret : this.newSecret;
  saveIdentity({ gid: st.gid, pid: msg.you, secret });
  this.firstLink = null;
  this.status = 'playing';
  this.claim();
  this.attach(link, msg.from);
  link.send({ type: 'sync', state: this.snapshot() });
  this.start();
  this.changed();
}
