import { isObj } from '../../fiches/is-obj.js';
import { normalize } from '../../fiches/normalize.js';
import { median } from '../../horloge/median.js';
import { de } from '../../textes/de.js';
import { gapText } from '../../textes/gap-text.js';

/**
 * Resynchronisation (D-166) : je reprends l'heure du groupe (médiane des écarts qu'ils voient),
 * et ce que j'ai fait avec ma mauvaise heure est remplacé par ce que les autres savent de moi
 * (la plus récente des fiches qu'ils m'envoient). `clockFix` augmente : les autres adoptent
 * cette fiche même si elle paraît plus vieille que celle datée avec ma mauvaise heure.
 */
export function resyncClock(votes) {
  const drift = median(votes.map((v) => v.drift));
  const mine = this.state.players[this.me];
  const known = votes.map((v) => v.rec).filter((r) => isObj(r) && r.id === this.me && r.secretHash === mine.secretHash).sort((a, b) => (b.actAt || 0) - (a.actAt || 0))[0];
  this.clockSynced = true;
  this.shiftClock(-drift);
  if (known) {
    const p = normalize(JSON.parse(JSON.stringify(known)));
    p.online = true;
    p.clockFix = Math.max(mine.clockFix || 0, p.clockFix || 0) + 1;
    this.state.players[this.me] = p;
  } else mine.clockFix = (mine.clockFix || 0) + 1;
  const p = this.state.players[this.me];
  const ahead = drift > 0;
  this.touch(this.addLog(`L’heure du téléphone ${de(p.name)} avait changé : ${p.name} reprend l’heure des autres joueurs.`));
  this.ontoast?.(`L’heure de ton téléphone ${ahead ? 'avançait' : 'retardait'} de ${gapText(drift)} sur celle des autres joueurs : la partie a repris leur heure${known ? ', et ce que tu as fait pendant ce temps est remplacé par ce qu’ils savaient de toi' : ''}.`, 10000);
  this.changed();
  return true;
}
