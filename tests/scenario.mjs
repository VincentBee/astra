// Scénarios lisibles (D-129) : un test dont l'intitulé dit le comportement
// attendu, et qui photographie ce que voit un joueur à chaque vérification. Si un scénario
// échoue (ou avec ASTRA_REPORT=1), un rapport HTML autonome est écrit dans
// tests/reports/ : le texte attendu, ce qui s'est passé, et la carte vue par
// le joueur, image par image. Un agent lit le HTML tel quel (textes, <title>
// des SVG) ; un humain l'ouvre dans un navigateur.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { basename, dirname, join } from 'node:path';
import { game, fleet } from './harness.mjs';

const { threatText } = await import('../js/session.js');

const { SHIPS } = await import('../js/tech.js');

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const cell = (p) => `[${+p.x.toFixed(1)}:${+p.y.toFixed(1)}]`;

/**
 * Les scénarios d'un fichier de test : `const scenario = scenarios(import.meta.url)`.
 * scenario(intitulé, (film) => { … film.look(…) … })
 */
export function scenarios(url) {
  const file = fileURLToPath(url);
  const out = join(dirname(file), 'reports', `${basename(file, '.mjs')}.html`);
  const done = [];

  after(() => {
    const failed = done.some((s) => !s.ok);
    if (failed || process.env.ASTRA_REPORT) {
      mkdirSync(dirname(out), { recursive: true });
      writeFileSync(out, page(basename(file), done));
    } else rmSync(out, { force: true }); // tout est vert : pas de vieux rapport qui traîne
  });

  return (name, fn) =>
    test(name, async () => {
      const s = { name, frames: [], ok: true, error: null };
      done.push(s);
      const f = film(s, out);
      try {
        await fn(f); // un scénario peut être async : on attend sa fin (et son échec)
      } catch (e) {
        s.ok = false;
        s.error ||= e.message;
        f.failed();
        throw e;
      }
    });
}

// Couleurs de secours, par lettre : dans les tests, chaque Session choisit sa couleur seule, et deux joueurs ont souvent la même.
const PALETTE = ['#7aa2ff', '#ff9f43', '#4ade80', '#e879f9', '#facc15', '#22d3ee', '#f87171', '#a3a3a3'];

/** Couleur de chaque joueur : la sienne, sauf si un autre a la même (alors une par lettre). */
function colors(state, L) {
  const ps = Object.values(state.players);
  const same = new Set(ps.map((p) => p.color)).size < ps.length;
  return Object.fromEntries(ps.map((p) => [p.id, same ? PALETTE[(L[p.id].charCodeAt(0) - 65) % PALETTE.length] : p.color]));
}

/** Joueurs dans l'ordre d'arrivée, puis par identifiant, comme le jeu : le même ordre pour tous. */
const byRank = (a, b) => a.rank - b.rank || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/** Lettre de chaque joueur (A, B…) : la même quel que soit le joueur qui regarde. */
function letters(state) {
  const ps = Object.values(state.players).sort(byRank);
  return Object.fromEntries(ps.map((p, i) => [p.id, String.fromCharCode(65 + i)]));
}

/** Au plus tant d'images par `roll` : au-delà, le pas s'allonge (un long trajet reste léger). */
const MAX_ROLL = 240;

/** « 2 Chasseurs, 1 Cargo » (noms de la race). */
function shipsText(race, ships) {
  const parts = Object.entries(ships || {})
    .filter(([, n]) => n > 0)
    .map(([k, n]) => `${n} ${SHIPS[race]?.[k]?.name || k}`);
  return parts.join(', ') || 'aucun vaisseau';
}

/** Stock à l'heure de l'image (production comprise), sans rien écrire dans la planète. */
function stockAt(planet, now) {
  try {
    return game.stateAt(planet, now)?.stock || planet.stock;
  } catch {
    return planet.stock; // planète abîmée exprès (tests anti-triche) : le stock enregistré
  }
}

const RES = [['minerals', '⛏'], ['energy', '⚡'], ['food', '🌾']];
const resText = (stock) => RES.filter(([k]) => Number.isFinite(stock?.[k])).map(([k, icon]) => `${icon} ${Math.floor(stock[k])}`).join(' ');

/**
 * Propriétaire d'une planète tel que `viewer` le connaît (brouillard, D-124) : le vrai dans sa
 * portée, sinon son souvenir. Comme `knownOwner`, mais sans écrire dans ses renseignements.
 */
function known(viewer, cell, owner, now, eyes) {
  if (owner === viewer.me || viewer.over || viewer.seesCell(cell, now, eyes)) return owner;
  return viewer.intel?.[`${cell.x},${cell.y}`]?.pid || null;
}

/** Ce qu'un test attend du bandeau d'alerte, en clair. */
const alertWant = (re) => (re === null ? 'aucun bandeau' : `un bandeau qui contient ${re}`);

function film(s, out) {
  let last = null; // le dernier joueur regardé : l'image « au moment de l'échec » se prend de son point de vue
  const api = {
    /**
     * Ce que voit `viewer` en ce moment, et ce qu'il devrait voir :
     * expect = [{ fleet: [session du propriétaire, id], visible }, { alert: /texte/ ou null }].
     * `alert` : le bandeau d'alerte de flotte ennemie (D-133), null = pas de bandeau.
     * `eyes` remplace sa vue.
     */
    look(viewer, label, expect = [], { eyes } = {}) {
      last = viewer;
      const now = viewer.now();
      const st = viewer.state;
      eyes ||= viewer.eyes(now);
      const L = letters(st);
      const fleets = [];
      for (const p of Object.values(st.players)) {
        (p.fleets || []).forEach((f, i) => {
          const pos = fleet.fleetPos(f, now);
          fleets.push({ pid: p.id, id: f.id, n: i + 1, count: fleet.countShips(f.ships), x: pos.x, y: pos.y, to: f.to, moving: fleet.moving(f, now), seen: viewer.sees(p, f, now, eyes), ships: shipsText(p.race, f.ships), cargo: resText(f.cargo), order: f.order?.kind || null });
        });
      }
      // Le bandeau d'alerte, tel que le jeu l'écrit (renderThreat, js/app.js).
      const threat = viewer.over ? null : threatText(viewer.threats(now));
      const alert = threat ? (threat.more ? `${threat.main} · ${threat.more}` : threat.main) : null;
      const checks = expect.map((x) => {
        if ('alert' in x) {
          const ok = x.alert === null ? alert === null : alert !== null && x.alert.test(alert);
          return { kind: 'alert', what: 'le bandeau d’alerte', expected: x.alert, got: alert, ok };
        }
        const { fleet: [owner, id], visible } = x;
        const f = fleets.find((x) => x.pid === owner.me && x.id === id);
        const what = f ? `la flotte ${f.n} de ${L[f.pid]} en ${cell(f)}` : `la flotte ${id} de ${L[owner.me]} (introuvable)`;
        return { pid: owner.me, id, what, expected: visible, got: f?.seen ?? null, ok: f?.seen === visible };
      });
      const frame = {
        t: now,
        label,
        viewer: viewer.me,
        L,
        colors: colors(st, L),
        sun: game.sunFor(st.gid),
        planets: viewer.planets.map((w) => {
          const owner = viewer.ownerAt(w)?.id || null;
          return { name: w.name, x: w.x, y: w.y, small: !!w.kind && w.kind !== 'planet', owner, known: known(viewer, w, owner, now, eyes), home: Object.values(st.players).find((p) => game.sameCell(p.home, w))?.id || null };
        }),
        eyes,
        fleets,
        alert,
        checks,
        // L'état réel de chaque joueur (pas seulement ce que voit `viewer`) : pour comprendre.
        players: Object.values(st.players)
          .sort(byRank)
          .map((p) => ({
            id: p.id,
            race: p.race,
            out: Number.isFinite(p.out),
            planets: viewer.planetsOf(p).map((x) => ({ name: x.name, res: resText(stockAt(x.planet, now)), ships: shipsText(p.race, x.planet.ships) })),
            fleets: (p.fleets || []).length,
          })),
      };
      s.frames.push(frame);
      const bad = checks.filter((c) => !c.ok);
      if (bad.length) {
        frame.ko = true;
        s.ok = false;
        s.error = bad.map((c) => (c.kind === 'alert' ? `${L[viewer.me]} a ${c.got ? `le bandeau « ${c.got} »` : 'aucun bandeau'} (attendu : ${alertWant(c.expected)})` : `${L[viewer.me]} ${c.got ? 'voit' : 'ne voit pas'} ${c.what} (attendu : ${c.expected ? 'vue' : 'cachée'})`)).join(' ; ');
        assert.fail(`${s.error}\n  Image : « ${label} »\n  Rapport : ${pathToFileURL(out)}`);
      }
    },

    /**
     * Le temps passe seconde par seconde jusqu'à `until` : à chaque seconde, `each()` (ce que
     * fait le jeu : passages `tick`, échanges de fiches), puis une image de ce que voit
     * `viewer`. Ces images ne vérifient rien : c'est le film entre deux `look`, qui, lui,
     * vérifie. L'horloge finit sur `until`, `each()` compris, sans image (le `look` suivant la prend).
     */
    roll(viewer, clock, until, label, each = () => {}) {
      const step = Math.max(1000, Math.ceil((until - clock.t) / MAX_ROLL / 1000) * 1000);
      while (clock.t + step < until) {
        clock.t += step;
        each();
        api.look(viewer, label);
      }
      clock.t = until;
      each();
    },

    /** Le test a échoué : une dernière image, telle qu'au moment de l'échec (sauf si la dernière le montre déjà). */
    failed() {
      const prev = s.frames.at(-1);
      if (!last || prev?.ko) return;
      try {
        api.look(last, 'au moment de l’échec');
        s.frames.at(-1).ko = true;
      } catch {
        // l'état est trop abîmé pour être dessiné : on garde les images d'avant
      }
    },
  };
  return api;
}

// ----- le rapport ----------------------------------------------------------

let uid = 0; // identifiants des dégradés : uniques dans la page (sinon une image cachée prête le sien aux autres)

function svg(f) {
  const g = `g${uid++}`;
  const W = game.UNIVERSE.w;
  const H = game.UNIVERSE.h;
  const me = f.viewer;
  const c = (v) => +(v + 0.5).toFixed(3); // centre de la case
  const parts = [];
  parts.push(`<rect width="${W}" height="${H}" fill="#05070f"/>`);
  const grid = [];
  for (let k = 1; k < W; k++) grid.push(`M${k} 0V${H}M0 ${k}H${W}`);
  parts.push(`<path d="${grid.join('')}" stroke="rgba(150,170,230,0.10)" stroke-width="0.04"/>`);
  const r = f.sun.size / 2;
  parts.push(`<circle cx="${f.sun.x + r}" cy="${f.sun.y + r}" r="${r * 1.7}" fill="url(#${g}glow)"/><circle cx="${f.sun.x + r}" cy="${f.sun.y + r}" r="${r * 0.92}" fill="url(#${g}sun)"><title>Soleil</title></circle>`);

  // Vision du joueur : un disque par planète et par flotte, en halo (le groupe garde une seule teinte là où ils se chevauchent).
  const col = f.colors[me];
  parts.push(`<g opacity="0.2" fill="${col}">${f.eyes.map((e) => `<circle cx="${c(e.x)}" cy="${c(e.y)}" r="${e.r}"/>`).join('')}</g>`);
  parts.push(`<g fill="none" stroke="${col}" stroke-width="0.05" opacity="0.5">${f.eyes.map((e) => `<circle cx="${c(e.x)}" cy="${c(e.y)}" r="${e.r}"><title>Vision de ${f.L[me]} : ${e.r} cases autour de ${cell(e)}</title></circle>`).join('')}</g>`);

  for (const w of f.planets) {
    // Dessinée comme le joueur la connaît ; si la vérité diffère (brouillard), un anneau en pointillés à la couleur du vrai propriétaire.
    const real = w.owner;
    const o = w.known === undefined ? real : w.known;
    const who = (id) => (id ? `planète de ${f.L[id]}` : 'libre');
    const rad = w.small ? 0.12 : o ? 0.26 : 0.18;
    const fog = o !== real ? ` ; en vrai : ${who(real)} (${f.L[me]} ne le sait pas, hors de portée)` : '';
    parts.push(`<circle cx="${c(w.x)}" cy="${c(w.y)}" r="${rad}" fill="${o ? f.colors[o] : '#8d95b3'}" opacity="${o ? 1 : 0.5}"><title>${esc(w.name)} ${cell(w)} : ${who(o)} pour ${f.L[me]}${fog}</title></circle>`);
    if (o !== real && real) parts.push(`<circle cx="${c(w.x)}" cy="${c(w.y)}" r="0.34" fill="none" stroke="${f.colors[real]}" stroke-width="0.06" stroke-dasharray="0.08 0.06" opacity="0.8"/>`);
    if (w.home && (w.home === o || w.home === me)) parts.push(`<ellipse cx="${c(w.x)}" cy="${c(w.y)}" rx="0.42" ry="0.14" transform="rotate(-20 ${c(w.x)} ${c(w.y)})" fill="none" stroke="${f.colors[w.home]}" stroke-width="0.06"/>`);
    if (o || real) parts.push(`<text x="${c(w.x)}" y="${c(w.y) + 0.8}" font-size="0.42" fill="#e8ebf7" text-anchor="middle" opacity="${o ? 1 : 0.6}">${esc(w.name)}</text>`);
  }

  for (const x of f.fleets) {
    // À l'arrêt, souvent sur une planète : décalée en haut à droite pour ne pas être cachée (comme le replay).
    const cx = c(x.x) + (x.moving ? 0 : 0.3);
    const cy = c(x.y) - (x.moving ? 0 : 0.3);
    const color = f.colors[x.pid];
    if (x.moving) parts.push(`<line x1="${cx}" y1="${cy}" x2="${c(x.to.x)}" y2="${c(x.to.y)}" stroke="${color}" stroke-width="0.05" stroke-dasharray="0.15 0.12" opacity="0.5"/>`);
    const d = `M${cx} ${cy - 0.24}L${cx + 0.2} ${cy}L${cx} ${cy + 0.24}L${cx - 0.2} ${cy}Z`;
    const mine = x.pid === me;
    const state = mine ? `à ${f.L[me]}` : x.seen ? `vue par ${f.L[me]}` : `cachée pour ${f.L[me]} (dessinée ici pour comprendre)`;
    const title = `Flotte ${x.n} de ${f.L[x.pid]} en ${cell(x)} : ${state} ; ${x.ships}${x.cargo ? ` ; soute ${x.cargo}` : ''}${x.moving ? ` ; en route vers ${cell(x.to)}` : ''}${x.order ? ` ; ordre ${x.order}` : ''}`;
    // Une flotte que le joueur ne voit pas : en pointillés, comme un fantôme.
    parts.push(
      x.seen
        ? `<path d="${d}" fill="${color}" stroke="#05070f" stroke-width="0.05"><title>${esc(title)}</title></path>`
        : `<path d="${d}" fill="none" stroke="${color}" stroke-width="0.06" stroke-dasharray="0.08 0.06" opacity="0.8"><title>${esc(title)}</title></path>`,
    );
    // Effectif des flottes adverses vues, comme sur la carte du jeu (D-133).
    if (x.seen && !mine) parts.push(`<text x="${cx + 0.26}" y="${cy - 0.12}" font-size="0.42" font-weight="700" fill="#ffffff" stroke="#05070f" stroke-width="0.08" paint-order="stroke">${x.count}</text>`);
    const chk = f.checks.find((k) => k.pid === x.pid && k.id === x.id);
    if (chk) {
      const ring = chk.ok ? '#4ade80' : '#ff5a5a';
      parts.push(`<circle cx="${cx}" cy="${cy}" r="0.5" fill="none" stroke="${ring}" stroke-width="0.08"/>`);
      parts.push(`<text x="${cx}" y="${cy - 0.65}" font-size="0.4" fill="${ring}" text-anchor="middle" font-weight="700">${chk.ok ? '✔' : '✖'} ${chk.got ? 'vue' : 'cachée'}</text>`);
    }
  }
  const defs = `<defs><radialGradient id="${g}glow"><stop offset="35%" stop-color="rgba(255,190,90,0.35)"/><stop offset="100%" stop-color="rgba(255,190,90,0)"/></radialGradient><radialGradient id="${g}sun" cx="40%" cy="40%"><stop offset="0%" stop-color="#fff6d6"/><stop offset="45%" stop-color="#ffd166"/><stop offset="100%" stop-color="#ff8a3d"/></radialGradient></defs>`;
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Carte vue par ${f.L[me]}">${defs}${parts.join('')}</svg>`;
}

function section(s, i) {
  const t0 = s.frames[0]?.t ?? 0;
  const frames = s.frames
    .map((f, k) => {
      const checks = f.checks
        .map((c) =>
          c.kind === 'alert'
            ? `<li class="${c.ok ? 'ok' : 'ko'}">${c.ok ? '✔' : '✖'} ${esc(c.what)} : attendu ${esc(alertWant(c.expected))}, obtenu ${c.got === null ? 'aucun bandeau' : `« ${esc(c.got)} »`}</li>`
            : `<li class="${c.ok ? 'ok' : 'ko'}">${c.ok ? '✔' : '✖'} ${esc(c.what)} : attendu ${c.expected ? 'vue' : 'cachée'}, obtenu ${c.got === null ? 'absente' : c.got ? 'vue' : 'cachée'}</li>`,
        )
        .join('');
      // Bandeau d'alerte du joueur (D-133) : toujours une ligne, pour que la carte ne saute pas d'une image à l'autre.
      const banner = s.frames.some((x) => x.alert) ? `<p class="alert${f.alert ? '' : ' none'}">${f.alert ? `⚔ ${esc(f.alert)}` : 'pas d’alerte'}</p>` : '';
      const rows = (f.players || [])
        .map((p) => `<tr><td><span class="dot" style="background:${f.colors[p.id]}"></span>${f.L[p.id]}${p.out ? ' (éliminé)' : ''}</td><td>${p.planets.map((x) => `${esc(x.name)} ${x.res} · ${esc(x.ships)}`).join('<br>') || '—'}</td><td>${p.fleets}</td></tr>`)
        .join('');
      const table = rows ? `<table class="pl"><tr><th>Joueur</th><th>Planètes : stock · à quai</th><th>Flottes</th></tr>${rows}</table>` : '';
      return `<figure data-frame="${k}"${f.ko ? ' class="ko"' : ''}>${banner}${svg(f)}<figcaption><b>${k + 1}/${s.frames.length} · t = ${Math.round((f.t - t0) / 1000)} s</b> · ${f.ko && !f.checks.length ? '<span class="ko">✖ </span>' : ''}${esc(f.label)} (vu par ${f.L[f.viewer]})${checks ? `<ul>${checks}</ul>` : ''}${table}</figcaption></figure>`;
    })
    .join('');
  return `<section class="scn ${s.ok ? 'ok' : 'ko'}" id="s${i}" data-name="${esc(s.name)}">
<h2>${s.ok ? '✔' : '✖'} ${esc(s.name)}</h2>
${s.ok ? '' : `<p class="ko">Obtenu : ${esc(s.error)}</p>`}
${frames ? `<div class="film"><div class="frames">${frames}</div><div class="ctl"><button data-step="-1" aria-label="Image précédente">⏮</button><button data-play aria-label="Lecture">▶</button><button data-step="1" aria-label="Image suivante">⏭</button><input type="range" min="0" max="${s.frames.length - 1}" value="0" aria-label="Image"></div></div>` : ''}
</section>`;
}

function page(file, list) {
  const ko = list.filter((s) => !s.ok).length;
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Astra · ${esc(file)}</title>
<style>
:root{color-scheme:dark}body{margin:0;padding:16px;background:#070a14;color:#e8ebf7;font:15px/1.45 system-ui,sans-serif;max-width:760px;margin-inline:auto}
h1{font-size:20px;margin:0 0 4px}.sum{color:#aab2cf;margin:0 0 16px}code{font:13px ui-monospace,monospace;background:#11162a;padding:1px 5px;border-radius:4px}
.scn{background:#0d1222;border:1px solid #1f2742;border-radius:12px;padding:12px 14px;margin:0 0 16px}.scn.ko{border-color:#ff5a5a}
h2{font-size:16px;margin:0 0 8px}.scn.ok h2{color:#4ade80}.scn.ko h2{color:#ff5a5a}
.ko{color:#ff8a8a}p.ko{margin:0 0 10px}
figure{margin:0}svg{display:block;width:100%;max-width:420px;aspect-ratio:1;border-radius:8px}figcaption{color:#aab2cf;font-size:13px;margin:6px 0}
figcaption ul{margin:4px 0 0;padding-left:18px}
table.pl{border-collapse:collapse;margin-top:6px;font-size:12px;width:100%;max-width:420px}table.pl th,table.pl td{text-align:left;padding:2px 6px 2px 0;vertical-align:top;border-top:1px solid #1f2742}table.pl th{color:#7d86a8;font-weight:600}
.dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:5px}li.ok{color:#4ade80}li.ko{color:#ff8a8a}
.film figure+figure{margin-top:12px}
.js .frames{display:grid}.js .frames figure{grid-area:1/1;margin:0;visibility:hidden}.js .frames figure.on{visibility:visible}
.ctl{display:none;gap:8px;align-items:center}.js .ctl{display:flex}.ctl button{background:#1b2340;color:#e8ebf7;border:0;border-radius:8px;padding:6px 12px;font-size:15px}.ctl input{flex:1}
.legend{color:#aab2cf;font-size:13px;margin:0 0 16px}
p.alert{max-width:420px;box-sizing:border-box;margin:0 0 8px;padding:6px 10px;border:1px solid #ff6b7a;background:rgba(255,107,122,0.14);color:#ff6b7a;font-weight:700;font-size:14px}p.alert.none{border-color:#1f2742;background:none;color:#7d86a8;font-weight:400}
</style></head><body>
<h1>${esc(file)}</h1>
<p class="sum">${list.length} scénario${list.length > 1 ? 's' : ''}, ${ko ? `<b class="ko">${ko} en échec</b>` : 'tous réussis'} · ${esc(new Date().toISOString().slice(0, 16).replace('T', ' '))} UTC · relancer : <code>ASTRA_REPORT=1 node --test tests/${esc(file)}</code></p>
<p class="legend">Carte vue par le joueur qui regarde : son halo = sa portée de détection ; losange plein = flotte qu'il voit ; losange en pointillés = flotte qu'il ne voit pas (dessinée pour comprendre) ; anneau en pointillés autour d'une planète = son vrai propriétaire, que le joueur ignore (hors de portée) ; tableau = l'état réel de chaque joueur ; anneau vert ✔ / rouge ✖ = la vérification du test ; chiffre blanc = nombre de vaisseaux d'une flotte adverse vue ; cadre rouge au-dessus de la carte = le bandeau d'alerte du joueur, tel que le jeu l'affiche.</p>
${list.map(section).join('\n')}
<script>
document.documentElement.classList.add('js');
// #scn=<nom> : un seul scénario (l'interface de test, tests/ui, montre ainsi celui qu'on a choisi).
const only = new URLSearchParams(location.hash.slice(1)).get('scn');
if (only !== null) {
  for (const s of document.querySelectorAll('.scn')) s.hidden = s.dataset.name !== only;
  for (const p of document.querySelectorAll('.sum, h1')) p.hidden = true;
}
for (const film of document.querySelectorAll('.film')) {
  const figs = [...film.querySelectorAll('figure')];
  const range = film.querySelector('input');
  const play = film.querySelector('[data-play]');
  let i = Math.max(0, figs.findIndex((f) => f.classList.contains('ko'))), timer = 0;
  const show = (k) => { i = (k + figs.length) % figs.length; figs.forEach((f, j) => f.classList.toggle('on', j === i)); range.value = i; };
  const stop = () => { clearInterval(timer); timer = 0; play.textContent = '▶'; };
  film.querySelectorAll('[data-step]').forEach((b) => (b.onclick = () => { stop(); show(i + +b.dataset.step); }));
  range.oninput = () => { stop(); show(+range.value); };
  // Toutes les images tiennent dans ~8 s de lecture (entre 0,12 et 0,9 s par image) ; arrêt sur la dernière.
  const pace = Math.min(900, Math.max(120, 8000 / figs.length));
  play.onclick = () => {
    if (timer) return stop();
    if (i === figs.length - 1) show(0);
    play.textContent = '❚❚';
    timer = setInterval(() => (i === figs.length - 1 ? stop() : show(i + 1)), pace);
  };
  show(i);
}
</script>
</body></html>
`;
}
