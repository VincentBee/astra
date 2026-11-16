import { buildDuration, covers, fmt, liftGain, PLAN_MAX, planAhead, power, POWER_KEYS, powerCost, powerReadyAt, POWERS, RACES, resIcon, secs, SOIL, stateAt, storageCap, storeFor, TEMPO, tooBig, upgradeCost, usedPlaces } from '../../../game.js';
import { ic } from '../../../icons.js';
import { renderPartners } from '../echanges/render-partners.js';
import { etat } from '../etat.js';
import { renderFleets } from '../flotte/render-fleets.js';
import { clock } from '../outils/clock.js';
import { $ } from '../outils/dollar.js';
import { esc } from '../outils/esc.js';
import { toast } from '../outils/toast.js';
import { cardProgress } from './card-progress.js';
import { compact } from './compact.js';
import { costText } from './cost-text.js';
import { sampleHistory } from './courbes/sample-history.js';
import { rateText } from './rate-text.js';
import { renderPlan } from './render-plan.js';
import { renderResearch } from './render-research.js';
import { renderYard } from './render-yard.js';
import { setHtml } from './set-html.js';
import { climX } from './sol/clim-x.js';
import { fillSoil } from './sol/fill-soil.js';
import { withCap } from './with-cap.js';

/** La planète ouverte (mère ou colonie) : ressources, population, chantiers, recherche, flottes. */
export function renderPlanet(me, now) {
  const R = RACES[me.race];
  let pl = etat.session.planetOf(me, etat.openKey);
  if (!pl) {
    const lost = etat.openKey !== 'home' && etat.currentView === 'planet';
    etat.openKey = 'home';
    pl = etat.session.planetOf(me, 'home');
    // La colonie affichée n'est plus à moi : on le dit avant de montrer la planète mère (#73).
    if (lost && pl) toast(`Tu as perdu ta colonie${etat.openName ? ` ${etat.openName}` : ''} : retour à ta planète mère.`);
  }
  if (!pl) return;
  etat.openName = pl.name;
  const planet = pl.planet;
  const s = stateAt(planet, now);
  const f = s.prod;
  const soil = s.reserve ? Object.fromEntries(SOIL.map((r) => [`soil-${r}`, s.reserve[r]])) : {};
  sampleHistory(now, { ...s.stock, pop: s.pop, grid: f.effE * 100, ...soil }, etat.openKey);
  const q = (sel) => document.querySelector(sel);

  $('planet-title').textContent = $('planet-title').title = etat.openKey === 'home' ? pl.name : `${pl.name} · colonie`;
  $('soil-zone').hidden = !planet.nature;
  if (planet.nature) fillSoil('soil', planet.nature, s.reserve, f.soil);

  for (const r of R.resources) {
    const cap = f.caps[r];
    // Coefficient du climat dans la carte (D-221) ; rien pour une planète d'avant le climat.
    const clim = q(`[data-clim="${r}"]`);
    const k = planet.climate?.[r];
    clim.hidden = !Number.isFinite(k);
    if (Number.isFinite(k)) {
      clim.textContent = climX(k);
      const kk = Math.round(k * 100);
      clim.classList.toggle('up', kk > 100);
      clim.classList.toggle('down', kk < 100);
      clim.title = `Climat : production ${climX(k)}`;
    }
    q(`[data-res="${r}"]`).innerHTML = withCap(s.stock[r], cap);
    q(`[data-res="${r}"]`).firstChild.textContent = compact(s.stock[r]); // tuile étroite : « 118 k »
    const short = r === 'energy' ? f.effE < 1 : r === 'food' ? f.effF < 1 : false;
    const rate = q(`[data-rate="${r}"]`);
    rate.textContent = short
      ? `Pénurie ${Math.round((r === 'energy' ? f.effE : f.effF) * 100)} %`
      : s.stock[r] >= cap && f.net[r] >= 0
        ? 'Plein'
        : rateText(f.net[r] * TEMPO);
    rate.classList.toggle('neg', short || f.net[r] < -0.5);
    q(`[data-gauge="${r}"]`).style.width = `${Math.min(100, (s.stock[r] / cap) * 100)}%`;
  }

  if (R.pop) {
    const cap = f.popCap;
    const later = stateAt(planet, now + 60_000).pop; // dans une minute
    const delta = later - s.pop;
    q('[data-popgauge]').style.width = `${Math.min(100, (s.pop / Math.max(cap, 1)) * 100)}%`;
    const rate = q('[data-poprate]');
    const extra = q('[data-popextra]');
    if (me.race === 'human') {
      q('[data-pop]').innerHTML = withCap(s.pop, cap);
      rate.textContent = f.effF < 1 ? 'Famine !' : rateText(delta);
      // Habitants au travail (autant que de postes, au plus) sur l'ensemble des habitants.
      const people = Math.floor(s.pop);
      const active = Math.min(people, f.jobs);
      const vacant = Math.max(0, f.jobs - people);
      extra.textContent = `${fmt(active)} actifs${vacant ? ` · ${fmt(vacant)} vides` : ''}`;
      extra.title = `${fmt(active)} habitants au travail sur ${fmt(people)}${vacant ? `, ${fmt(vacant)} postes vides` : ''}`;
      extra.classList.toggle('neg', vacant > 0);
    } else {
      q('[data-pop]').innerHTML = withCap(s.pop, cap);
      const starving = Math.min(f.effE, f.effF) < 1;
      const next = (Math.floor(s.pop) + 1 - s.pop) / 0.12 / TEMPO; // 0,12 naissance par heure de jeu (game.js) ; une heure de jeu = 1 / TEMPO minute réelle
      rate.textContent = starving
        ? 'Ils dépérissent !'
        : s.pop >= cap - 1e-6
          ? 'Plein'
          : `+1 : ${Math.ceil(next)} min`;
      extra.textContent = `≈ ${fmt(power(me.race, s.pop))} hum.`;
      extra.title = `Puissance d'environ ${fmt(power(me.race, s.pop))} humains`;
    }
    rate.classList.toggle('neg', delta < -0.01 || f.effF < 1 || (me.race === 'alien' && f.effE < 1));
  } else {
    q('[data-grid]').textContent = `${Math.round(f.effE * 100)} %`;
    q('[data-gridrate]').textContent = `+${fmt(f.in.energy * TEMPO)} −${fmt((f.out.energy / Math.max(f.effE, 1e-9)) * TEMPO)}`;
    q('[data-gridrate]').title = 'Production et consommation d’énergie, par minute';
    q('[data-gridextra]').textContent = f.effE < 1 ? 'Ralenti' : 'À plein';
    q('[data-gridrate]').classList.toggle('neg', f.effE < 1);
  }

  // Place : un niveau de bâtiment, une place (les planètes d'avant la place n'ont pas de limite).
  const used = usedPlaces(s.levels);
  const full = !!planet.places && used >= planet.places;
  $('places').textContent = planet.places ? `${used} / ${planet.places} places` : '';
  $('places').classList.toggle('full', full);
  // Fil d'attente (D-105, D-158) : chantier occupé, fil pas vide ou stock trop court, le bouton
  // ajoute au fil. Le fil peut aussi tenir des recherches et des vaisseaux : fil pas vide, même
  // sans bâtiment, la construction va à la fin du fil, elle ne passe pas devant (D-420).
  const plan = s.plan || [];
  const planBuilds = plan.filter((x) => typeof x === 'string').length;
  const busy = !!s.queue || plan.length > 0;
  // Places une fois tout fini : chantier en cours et bâtiments du fil compris.
  const taken = used + (s.queue ? (s.queue.demolish ? -1 : 1) : 0) + planBuilds;
  const noRoom = !!planet.places && taken >= planet.places;
  // Niveaux une fois tout fini (chantier et fil compris) : l'entrepôt qui tiendra le prix (#50).
  const ahead = planAhead(s);
  for (const k of Object.keys(R.buildings)) {
    const level = s.levels[k] || 0;
    // Niveau du prochain ajout : celui en chantier et ceux qui attendent déjà dans le fil.
    const next = level + (s.queue?.key === k ? (s.queue.demolish ? -1 : 1) : 0) + plan.filter((x) => x === k).length;
    const cost = upgradeCost(me.race, k, next);
    const ok = covers(s.stock, cost) && !full;
    const direct = !busy && ok;
    // Prix plus grand que l'entrepôt, même une fois le fil fini : refusé, on dit quel entrepôt il faut (#50, D-441).
    const big = tooBig(me.race, ahead.levels, cost);
    const job = s.queue?.key === k ? s.queue : null;
    // Entrepôt : son plafond se lit sur sa carte (la tuile de stock, étroite, le cache) (#50, D-442).
    const capText = k === 'store' ? ` · max ${fmt(storageCap(level))}` : '';
    q(`[data-level="${k}"]`).textContent = job ? `niv ${level} → ${job.level} · ${clock(Math.max(0, job.end - now))}${capText}` : `niv ${level}${capText}`;
    // Trop cher pour l'entrepôt : la raison se lit sur la carte (le titre du bouton ne se voit pas au doigt).
    const tail = big ? `<span class="neg">il faut ${esc(R.buildings.store.short)} niv ${storeFor(cost)}</span>` : `${buildDuration(me.race, s.levels, cost) / 1000} s`;
    setHtml(q(`[data-cost="${k}"]`), `${costText(cost)} · ${tail}`);
    const card = q(`[data-card="${k}"]`);
    card.classList.toggle('affordable', direct);
    card.classList.toggle('building-now', !!job);
    const btn = q(`[data-build="${k}"]`);
    btn.dataset.mode = direct ? 'now' : 'plan';
    btn.disabled = noRoom || !!big || plan.length >= PLAN_MAX || etat.session.status !== 'playing';
    cardProgress(card, job, now);
    setHtml(btn, direct ? `${ic('up')}${next + 1}` : `${ic('plus')}${next + 1}`);
    btn.title = noRoom
      ? 'Plus de place sur cette planète'
      : big
        ? `${big} pour le niveau ${next + 1}`
        : plan.length >= PLAN_MAX
        ? `Fil plein (${PLAN_MAX} au plus)`
        : direct
          ? `Passer au niveau ${next + 1}`
          : `Ajouter le niveau ${next + 1} au fil : il se lancera dès que possible`;
    btn.setAttribute('aria-label', `${R.buildings[k].name} : ${btn.title.toLowerCase()}`);
    const down = q(`[data-demolish="${k}"]`);
    down.disabled = !!s.queue || level < 1 || !etat.session.canAct;
    down.hidden = level < 1;
  }
  renderPlan(me, pl, planet, now);

  if (me.race === 'alien') {
    const trance = Math.max(0, (planet.trance || 0) - now);
    for (const k of POWER_KEYS) {
      const cost = powerCost(planet, k, s.pop);
      const wait = Math.max(0, powerReadyAt(planet, k) - now);
      const ok = covers(s.stock, cost);
      const gain = k === 'lift' ? liftGain({ ...planet, ...s }) : 0;
      const idle = k === 'lift' && !gain; // entrepôt plein ou sol vide : rien à gagner
      // Arrachement : gain attendu avant de toucher (#75). Durées : depuis POWERS (secs).
      const win = gain ? ` · <span class="qty">+${fmt(gain)}${resIcon('minerals')}</span>` : '';
      setHtml(q(`[data-pcost="${k}"]`), `${costText(cost)}${win} · ↻ ${secs(POWERS[k].cooldown)}`);
      q(`[data-pready="${k}"]`).textContent = k === 'trance' && trance ? `transe ${clock(trance)}` : wait ? clock(wait) : 'prêt';
      q(`[data-pcard="${k}"]`).classList.toggle('affordable', ok && !wait && !idle);
      const btn = q(`[data-power="${k}"]`);
      btn.disabled = !!wait || !ok || idle || etat.session.status !== 'playing';
      setHtml(btn, ic(wait ? 'wait' : idle ? 'none' : 'play'));
      btn.title = wait ? 'En recharge' : idle ? 'Rien à arracher' : 'Déclencher';
      btn.setAttribute('aria-label', `${POWERS[k].name} : ${btn.title.toLowerCase()}`);
    }
  }

  renderResearch(me, pl, s, now, ahead);
  renderYard(me, pl, s, now, ahead);
  renderFleets(me, pl, s, now);
  renderPartners($('planet-partners'), { planet: pl.key });
}
