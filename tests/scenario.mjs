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
    test(name, () => {
      const s = { name, frames: [], ok: true, error: null };
      done.push(s);
      try {
        fn(film(s, out));
      } catch (e) {
        s.ok = false;
        s.error ||= e.message;
        throw e;
      }
    });
}

/** Lettre de chaque joueur (A, B…), dans l'ordre d'arrivée. */
function letters(state) {
  const ps = Object.values(state.players).sort((a, b) => a.rank - b.rank);
  return Object.fromEntries(ps.map((p, i) => [p.id, String.fromCharCode(65 + i)]));
}

/** Au plus tant d'images par `roll` : au-delà, le pas s'allonge (un long trajet reste léger). */
const MAX_ROLL = 240;

function film(s, out) {
  const api = {
    /**
     * Ce que voit `viewer` en ce moment, et ce qu'il devrait voir :
     * expect = [{ fleet: [session du propriétaire, id], visible }]. `eyes` remplace sa vue.
     */
    look(viewer, label, expect = [], { eyes } = {}) {
      const now = viewer.now();
      const st = viewer.state;
      eyes ||= viewer.eyes(now);
      const L = letters(st);
      const fleets = [];
      for (const p of Object.values(st.players)) {
        (p.fleets || []).forEach((f, i) => {
          const pos = fleet.fleetPos(f, now);
          fleets.push({ pid: p.id, id: f.id, n: i + 1, x: pos.x, y: pos.y, to: f.to, moving: fleet.moving(f, now), seen: viewer.sees(p, f, now, eyes) });
        });
      }
      const checks = expect.map(({ fleet: [owner, id], visible }) => {
        const f = fleets.find((x) => x.pid === owner.me && x.id === id);
        const what = f ? `la flotte ${f.n} de ${L[f.pid]} en ${cell(f)}` : `la flotte ${id} de ${L[owner.me]} (introuvable)`;
        return { pid: owner.me, id, what, expected: visible, got: f?.seen ?? null, ok: f?.seen === visible };
      });
      const frame = {
        t: now,
        label,
        viewer: viewer.me,
        L,
        colors: Object.fromEntries(Object.values(st.players).map((p) => [p.id, p.color])),
        sun: game.sunFor(st.gid),
        planets: viewer.planets.map((w) => ({ name: w.name, x: w.x, y: w.y, small: !!w.kind && w.kind !== 'planet', owner: viewer.ownerAt(w)?.id || null, home: Object.values(st.players).find((p) => game.sameCell(p.home, w))?.id || null })),
        eyes,
        fleets,
        checks,
      };
      s.frames.push(frame);
      const bad = checks.filter((c) => !c.ok);
      if (bad.length) {
        s.ok = false;
        s.error = bad.map((c) => `${L[viewer.me]} ${c.got ? 'voit' : 'ne voit pas'} ${c.what} (attendu : ${c.expected ? 'vue' : 'cachée'})`).join(' ; ');
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
    const o = w.owner;
    const rad = w.small ? 0.12 : o ? 0.26 : 0.18;
    parts.push(`<circle cx="${c(w.x)}" cy="${c(w.y)}" r="${rad}" fill="${o ? f.colors[o] : '#8d95b3'}" opacity="${o ? 1 : 0.5}"><title>${esc(w.name)} ${cell(w)}${o ? ` : planète de ${f.L[o]}` : ' : libre'}</title></circle>`);
    if (w.home) parts.push(`<ellipse cx="${c(w.x)}" cy="${c(w.y)}" rx="0.42" ry="0.14" transform="rotate(-20 ${c(w.x)} ${c(w.y)})" fill="none" stroke="${f.colors[w.home]}" stroke-width="0.06"/>`);
    if (o) parts.push(`<text x="${c(w.x)}" y="${c(w.y) + 0.8}" font-size="0.42" fill="#e8ebf7" text-anchor="middle">${esc(w.name)}</text>`);
  }

  for (const x of f.fleets) {
    const cx = c(x.x);
    const cy = c(x.y);
    const color = f.colors[x.pid];
    if (x.moving) parts.push(`<line x1="${cx}" y1="${cy}" x2="${c(x.to.x)}" y2="${c(x.to.y)}" stroke="${color}" stroke-width="0.05" stroke-dasharray="0.15 0.12" opacity="0.5"/>`);
    const d = `M${cx} ${cy - 0.24}L${cx + 0.2} ${cy}L${cx} ${cy + 0.24}L${cx - 0.2} ${cy}Z`;
    const mine = x.pid === me;
    const state = mine ? `à ${f.L[me]}` : x.seen ? `vue par ${f.L[me]}` : `cachée pour ${f.L[me]} (dessinée ici pour comprendre)`;
    // Une flotte que le joueur ne voit pas : en pointillés, comme un fantôme.
    parts.push(
      x.seen
        ? `<path d="${d}" fill="${color}" stroke="#05070f" stroke-width="0.05"><title>Flotte ${x.n} de ${f.L[x.pid]} en ${cell(x)} : ${state}</title></path>`
        : `<path d="${d}" fill="none" stroke="${color}" stroke-width="0.06" stroke-dasharray="0.08 0.06" opacity="0.8"><title>Flotte ${x.n} de ${f.L[x.pid]} en ${cell(x)} : ${state}</title></path>`,
    );
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
      const checks = f.checks.map((c) => `<li class="${c.ok ? 'ok' : 'ko'}">${c.ok ? '✔' : '✖'} ${esc(c.what)} : attendu ${c.expected ? 'vue' : 'cachée'}, obtenu ${c.got === null ? 'absente' : c.got ? 'vue' : 'cachée'}</li>`).join('');
      return `<figure data-frame="${k}"${f.checks.some((c) => !c.ok) ? ' class="ko"' : ''}>${svg(f)}<figcaption><b>${k + 1}/${s.frames.length} · t = ${Math.round((f.t - t0) / 1000)} s</b> · ${esc(f.label)} (vu par ${f.L[f.viewer]})${checks ? `<ul>${checks}</ul>` : ''}</figcaption></figure>`;
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
figcaption ul{margin:4px 0 0;padding-left:18px}li.ok{color:#4ade80}li.ko{color:#ff8a8a}
.film figure+figure{margin-top:12px}
.js .frames{display:grid}.js .frames figure{grid-area:1/1;margin:0;visibility:hidden}.js .frames figure.on{visibility:visible}
.ctl{display:none;gap:8px;align-items:center}.js .ctl{display:flex}.ctl button{background:#1b2340;color:#e8ebf7;border:0;border-radius:8px;padding:6px 12px;font-size:15px}.ctl input{flex:1}
.legend{color:#aab2cf;font-size:13px;margin:0 0 16px}
</style></head><body>
<h1>${esc(file)}</h1>
<p class="sum">${list.length} scénario${list.length > 1 ? 's' : ''}, ${ko ? `<b class="ko">${ko} en échec</b>` : 'tous réussis'} · ${esc(new Date().toISOString().slice(0, 16).replace('T', ' '))} UTC · relancer : <code>ASTRA_REPORT=1 node --test tests/${esc(file)}</code></p>
<p class="legend">Carte vue par le joueur qui regarde : son halo = sa portée de détection ; losange plein = flotte qu'il voit ; losange en pointillés = flotte qu'il ne voit pas (dessinée pour comprendre) ; anneau vert ✔ / rouge ✖ = la vérification du test.</p>
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
