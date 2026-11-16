import { countShips } from '../../../fleet.js';
import { fmt, RACES, resIcon, stateAt } from '../../../game.js';
import { renderAlerts } from '../alertes/render-alerts.js';
import { renderPick } from '../carte/fiche/render-pick.js';
import { renderTrades } from '../echanges/render-trades.js';
import { etat } from '../etat.js';
import { renderFleetInfo } from '../flotte/pilotage/render-fleet-info.js';
import { renderMapFleets } from '../flotte/pilotage/render-map-fleets.js';
import { $ } from '../outils/dollar.js';
import { esc } from '../outils/esc.js';
import { toast } from '../outils/toast.js';
import { popText } from '../planete/pop-text.js';
import { renderPlanet } from '../planete/render-planet.js';
import { setHtml } from '../planete/set-html.js';
import { armBack } from '../retour/arm-back.js';
import { buildStatic } from './build-static.js';
import { renderRace } from './render-race.js';
import { renderThreat } from './render-threat.js';
import { routeLabel } from './route-label.js';
import { showView } from './show-view.js';

/** Rendu des valeurs qui bougent en continu (5 fois par seconde). */
export function renderLive() {
  if (!etat.session) return;
  const st = etat.session.state;
  const me = st.players[etat.session.me];
  const now = etat.session.now();
  renderRace();
  renderThreat(now);
  renderAlerts(me, now);

  {
    const online = etat.session.peerCount;
    const rtts = [...etat.session.links.values()].map((l) => l.rtt).filter((v) => v != null);
    const worst = rtts.length ? Math.max(...rtts) : null;
    $('net-count').textContent = online + 1; // moi compris
    $('net').classList.toggle('slow', worst != null && worst > 250);
    $('net-detail').textContent = online
      ? `${online + 1} joueurs en ligne${worst != null ? ` · ${worst} ms` : ''}`
      : 'Seul en ligne';
    $('net-detail').className = 'net' + (worst != null && worst > 250 ? ' slow' : '');
  }
  {
    const j = etat.session.journal;
    const fresh = j ? j.n - j.read : 0;
    $('journal-count').hidden = !fresh;
    $('journal-count').textContent = fresh > 9 ? '9+' : fresh;
  }
  armBack();

  if (me?.planet) {
    if (etat.builtFor !== me.race) buildStatic();
    renderPlanet(me, now);
  } else if (etat.currentView === 'planet') showView('map');
  renderPick(me, now);
  renderFleetInfo(me, now);
  renderMapFleets(me, now);
  renderTrades(me, now);
  if (etat.session.outdated && !etat.warnedOutdated) {
    etat.warnedOutdated = true;
    toast('Un autre joueur a une version plus récente du jeu : recharge l’appli.');
  }

  for (const p of Object.values(st.players)) {
    const sub = document.querySelector(`[data-psub="${p.id}"]`);
    if (!sub) continue;
    const info = etat.session.linkInfo(p.id);
    const net = p.id === etat.session.me ? '' : !info ? 'déconnecté' : info.route === 'bot' ? routeLabel('bot') : info.rtt != null ? `${info.rtt} ms${info.route ? ' ' + routeLabel(info.route) : ''}` : '';
    const scoreEl = document.querySelector(`[data-pscore="${p.id}"]`);
    if (!p.race || !p.planet) {
      const started = etat.session.startedAt != null;
      const what = !p.race ? 'choisit sa race…'
        : p.out ? 'éliminé'
        : etat.session.inRace(p) ? 'en route vers sa planète…'
        : Number.isFinite(p.ready) ? 'prêt'
        : started ? 'pas encore entré' : 'pas encore prêt';
      sub.textContent = `${what}${net ? ' · ' + net : ''}`;
      scoreEl.textContent = '—';
      continue;
    }
    if (etat.session.deadAt(p, now) != null) {
      sub.textContent = `éliminé${net ? ' · ' + net : ''}`;
      scoreEl.textContent = `${fmt(etat.session.scoreOf(p))} pts`;
      scoreEl.closest('.player').style.order = '1';
      continue;
    }
    const s = stateAt(p.planet, now);
    const R = RACES[p.race];
    const doing = s.queue ? `${R.buildings[s.queue.key].short} ${s.queue.level} dans ${Math.ceil((s.queue.end - now) / 1000)} s` : 'aucun chantier';
    const people = popText(p.race, s.pop);
    const nPlanets = etat.session.planetsOf(p).length;
    const docked = etat.session.planetsOf(p).reduce((t, x) => t + countShips(stateAt(x.planet, now).ships), 0);
    const eyes = etat.session.eyes(now);
    const flying = etat.session.fleetsOf(p).filter((f) => etat.session.sees(p, f, now, eyes)).length; // les autres : seulement celles que je vois
    const space = [
      nPlanets > 1 ? `${nPlanets} planètes` : null,
      docked ? `${docked} vaisseau${docked > 1 ? 'x' : ''}` : null,
      flying ? `${flying} flotte${flying > 1 ? 's' : ''}` : null,
    ];
    const stock = `<span class="qty">${fmt(s.stock.minerals)}${resIcon('minerals')}</span>`;
    setHtml(sub, [stock, people, ...[doing, ...space, net].filter(Boolean).map(esc)].filter(Boolean).join(' · '));
    const pts = etat.session.scoreOf(p);
    scoreEl.textContent = `${fmt(pts)} pts`;
    // Classement : le meilleur score en haut (ordre d'affichage, sans redessiner la liste).
    scoreEl.closest('.player').style.order = String(-Math.round(pts));
  }
}
