import { FROST, UNIVERSE } from '../../../regles/game/index.js';
import { Session } from '../../../session/index.js';
import { clampZoom } from '../carte/zoom/clamp-zoom.js';
import { zoom } from '../carte/zoom/zoom.js';
import { etat } from '../etat.js';
import { show } from '../outils/show.js';
import { buildStatic } from '../partie/build-static.js';
import { renderLive } from '../partie/render-live.js';
import { showView } from '../partie/show-view.js';
import { stopGame } from '../partie/stop-game.js';
import { renderState } from '../planete/render-state.js';
import { showMarks } from './show-marks.js';

export function showSnapshot(snap) {
  stopGame();
  // Les règles du froid du test (coupé : delayMs null), pour voir la même partie que lui.
  if (snap.frost) Object.assign(FROST, snap.frost, { delayMs: snap.frost.delayMs ?? Infinity });
  const s = new Session(snap.state.players[snap.me]?.name || 'Commandant');
  Object.assign(s, { me: snap.me, state: snap.state, status: 'playing', intel: snap.intel || {} });
  s.now = () => snap.t;
  s.save = s.scheduleSave = s.start = s.tick = () => {};
  // Les autres joueurs comptent comme connectés : pas de « Seul en ligne » qui n'existe pas dans le test.
  for (const pid of Object.keys(snap.state.players)) if (pid !== snap.me) s.links.set(pid, {});
  etat.session = s;
  show('game');
  buildStatic();
  etat.selected = null;
  etat.selFleet = null;
  // Zoom du test (D-146) : carte entière, sauf si le scénario montre un doigt sur une carte zoomée.
  const f = snap.finger;
  Object.assign(zoom, { z: f?.zoom || 1, x: 0, y: 0 });
  if (f) Object.assign(zoom, { x: f.x + 0.5 - UNIVERSE.w / zoom.z / 2, y: f.y + 0.5 - UNIVERSE.h / zoom.z / 2 });
  clampZoom();
  showView(snap.view || 'map', snap.key || 'home');
  etat.selected = snap.selected || null;
  clearInterval(etat.liveTimer);
  etat.liveTimer = setInterval(renderLive, 200);
  renderState();
  showMarks(snap);
}
