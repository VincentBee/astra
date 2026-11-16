import { planetAlerts, stateAt } from '../../../game.js';
import { etat } from '../etat.js';
import { $ } from '../outils/dollar.js';
import { esc } from '../outils/esc.js';
import { toast } from '../outils/toast.js';
import { setHtml } from '../planete/set-html.js';
import { ALERT_NAMES } from './alert-names.js';
import { alertText } from './alert-text.js';
import { cellKey } from './cell-key.js';

/** Pastille sur la carte, toast à l'apparition, ligne dans le bandeau, icône et sa liste. */
export function renderAlerts(me, now) {
  const all = new Map();
  if (me?.planet && !me.out) {
    for (const pl of etat.session.livePlanets(me, now)) {
      const list = planetAlerts(me.race, stateAt(pl.planet, now));
      if (list.length) all.set(cellKey(pl.cell), { ...pl, list });
    }
  }
  etat.alertsNow = all;

  // Toast : seulement ce qui vient d'apparaître. Un problème parti depuis moins de 10 s ne se réannonce pas.
  const fresh = [];
  for (const a of all.values()) {
    for (const x of a.list) {
      const k = `${a.key}:${x.res}:${x.kind}`;
      if (!etat.alertsSeen.has(k)) fresh.push(`${ALERT_NAMES[x.kind][x.res]} sur ${a.name}`);
      etat.alertsSeen.set(k, now);
    }
  }
  for (const [k, t] of etat.alertsSeen) if (now - t > 10_000) etat.alertsSeen.delete(k);
  if (fresh.length) toast(fresh.join(' · '));

  // Bandeau : une ligne pour les pénuries, sur tout l'empire, quelle que soit la vue.
  const shorts = [...all.values()].flatMap((a) => a.list.filter((x) => x.kind === 'short').map((x) => `<strong>${ALERT_NAMES.short[x.res]}</strong> sur ${esc(a.name)}`));
  $('alert-line').hidden = !shorts.length;
  setHtml($('alert-text'), shorts.join(' · '));

  // Icône : toutes mes planètes sur la carte, seulement celle ouverte sur sa vue.
  const onPlanet = etat.currentView === 'planet';
  const scope = [...all.values()].filter((a) => !onPlanet || a.key === etat.openKey);
  const n = scope.reduce((t, a) => t + a.list.length, 0);
  const bad = scope.some((a) => a.list.some((x) => x.kind === 'short'));
  const btn = $('alerts-btn');
  btn.hidden = !me?.planet;
  btn.classList.toggle('bad', bad);
  btn.classList.toggle('warn', !bad && n > 0);
  $('alerts-count').textContent = n || '';
  const label = `${onPlanet ? 'Diagnostic de cette planète' : 'Diagnostic de toutes mes planètes'} : ${n ? `${n} problème${n > 1 ? 's' : ''}` : 'tout va bien'}`;
  if (btn.title !== label) {
    btn.title = label;
    btn.setAttribute('aria-label', label);
  }
  if ($('alerts-panel').hidden) return;
  const rows = scope.flatMap((a) =>
    a.list.map(
      (x) =>
        `<li class="${x.kind}">${onPlanet ? '' : `<button class="ghost small" data-alert-go="${esc(a.key)}">${esc(a.name)}</button>`}<span>${alertText(x)}</span></li>`,
    ),
  );
  setHtml($('alerts-list'), rows.join('') || `<li class="ok"><span>Tout va bien : nourriture et énergie couvertes${onPlanet ? '' : ' sur toutes tes planètes'}.</span></li>`);
}
