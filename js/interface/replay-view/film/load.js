import { loadGame } from '../../../save.js';
import { replay, replayable, scoreSeries } from '../../../replay.js';
import { MIN } from '../constantes/min.js';
import { etat } from '../etat.js';
import { seek } from '../lecture/seek.js';
import { $ } from '../outils/dom.js';
import { elapsedText } from '../outils/elapsed-text.js';
import { note } from '../outils/note.js';

export function load() {
  const saved = loadGame();
  if (!saved) return note('Aucune partie sur ce téléphone.');
  const st = saved.state;
  $('rp-title').textContent = Object.values(st.players)
    .filter((p) => !Number.isFinite(p.left)) // sans les IA retirées du lobby (D-399)
    .sort((a, b) => a.rank - b.rank)
    .map((p) => p.name)
    .join(', ');
  const ok = replayable(st);
  if (ok.stale) return note('Cette copie de la partie n’est pas encore à jour : rouvre la partie pour te synchroniser avec les autres, puis réessaie.');
  if (!ok.ok) {
    return note(
      `Cette partie ne se rejoue pas depuis le début : il manque le début du journal de ${ok.missing.join(', ')} (partie commencée avant le journal, ou plus de 1 500 ordres).`,
    );
  }
  note('Calcul du replay…');
  // Laisse le message s'afficher avant le calcul.
  setTimeout(() => {
    let r;
    try {
      r = replay(st);
    } catch (e) {
      return note(`Le replay de cette partie a échoué : ${e.message}`);
    }
    const frames = r.frames;
    // Pour chaque image, où trouver la dernière fiche de chaque joueur : le défilement reste rapide.
    const at = [];
    const cur = {};
    frames.forEach((f, i) => {
      cur[f.pid] = i;
      at.push({ ...cur });
    });
    etat.film = { frames, log: r.log, at, start: frames[0].t, end: Math.max(frames[frames.length - 1].t, saved.savedAt || 0), gid: st.gid, scores: scoreSeries(frames, st.gid) };
    const off = Object.values(st.players).filter((p) => r.faithful[p.id] === false);
    note(off.length ? `Replay approché : la fin ne retombe pas tout à fait sur la vraie partie pour ${off.map((p) => p.name).join(', ')}.` : '');
    // Le curseur compte en minutes de partie : on peut s'arrêter sur n'importe laquelle.
    $('rp-time').max = String(Math.max(1, Math.ceil((etat.film.end - etat.film.start) / MIN)));
    $('rp-length').textContent = elapsedText(etat.film.end - etat.film.start);
    $('rp-main').hidden = false;
    seek(etat.film.start);
    // Venu du bandeau « partie finie » : la courbe des points, à la fin de la partie.
    if (location.hash === '#points') {
      seek(etat.film.end);
      $('points').scrollIntoView();
    }
  }, 30);
}
