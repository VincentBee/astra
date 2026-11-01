// Scénarios lisibles (D-129) : un test dont l'intitulé dit le comportement
// attendu, et qui photographie ce que voit un joueur à chaque vérification. Si un scénario
// échoue (ou avec ASTRA_REPORT=1), un rapport HTML autonome est écrit dans
// tests/reports/ : le texte attendu, ce qui s'est passé, et la carte vue par
// le joueur, image par image. Un agent lit le HTML tel quel (textes, <title>
// des SVG) ; un humain l'ouvre dans un navigateur.
import { test, after } from 'node:test';
import { isDeepStrictEqual } from 'node:util';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { basename, dirname, join } from 'node:path';
import { game, fleet } from './harness.mjs';

const { threatText } = await import('../js/session.js');

const { SHIPS } = await import('../js/tech.js');
const { reach, underFinger, FINGER } = await import('../js/aim.js');

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

/** Une valeur vérifiée, en clair : nombres arrondis, oui / non, « rien ». */
function val(v) {
  if (v === null || v === undefined) return 'rien';
  if (typeof v === 'boolean') return v ? 'oui' : 'non';
  if (typeof v === 'number') return String(+v.toFixed(2)).replace('.', ',');
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) return v.length ? v.map(val).join(', ') : 'rien';
  // { minerals: 150, energy: 50 } → « ⛏ 150 ⚡ 50 » ; les autres clés en clair.
  const icon = { ...Object.fromEntries(RES), fuel: '⛽' };
  return Object.entries(v).map(([k, x]) => `${icon[k] || `${k} :`} ${val(x)}`).join(' ') || 'rien';
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
     * { sheet: case, button } : le joueur touche la planète de cette case ; sa fiche montre-t-elle
     * « Voir la planète » (D-139) ?
     * { finger: { at, px, zoom }, hits: case ou null } : le joueur touche la carte en `at` (en cases,
     * décimales permises), avec des cases de `px` pixels (zoom `zoom`) : la planète la plus proche
     * sous le doigt est-elle celle de `hits` (null : aucune) ? Le doigt se dessine sur l'image (D-146).
     * { show: 'carburant', at, expected, got, ok } : une valeur vérifiée, montrée sur l'image (D-147) :
     * une étiquette ✔ / ✖ posée en `at` (une case { x, y }, ou une flotte [session du propriétaire, id]),
     * ou, sans `at` (ou flotte que le joueur n'a pas), dans un cadre en haut de la carte. `ok` : par défaut, `expected` et `got` égaux
     * (isDeepStrictEqual) ; le test le donne quand il compare avec une marge.
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
      let sheet = null; // la fiche de planète ouverte par le joueur, s'il en touche une
      let finger = null; // le doigt posé sur la carte, avec sa portée en cases
      const marks = []; // les valeurs vérifiées, posées sur la carte (D-147)
      const checks = expect.map((x, i) => {
        if ('finger' in x) {
          const { at, px, zoom = 1 } = x.finger;
          const r = reach(px);
          const raw = FINGER / px;
          const num = (v) => String(+v.toFixed(2)).replace('.', ',');
          const text = r > raw ? `doigt : ${num(r)} case (sans minimum : ${num(raw)})` : `doigt : ${FINGER} px = ${num(r)} case`;
          finger = { x: at.x, y: at.y, zoom, px, r, raw, text };
          const hit = underFinger(viewer.planets, at, px)[0]?.it || null;
          const name = (w) => (w ? viewer.planets.find((p) => game.sameCell(p, w))?.name || cell(w) : 'rien');
          const ok = x.hits === null ? !hit : !!hit && game.sameCell(hit, x.hits);
          return { kind: 'finger', what: `sous le doigt (${num(r)} case) en ${cell(at)}`, expected: name(x.hits), got: name(hit), ok };
        }
        if ('sheet' in x) {
          const w = viewer.planets.find((p) => game.sameCell(p, x.sheet));
          const got = !!viewer.myPlanetAt(x.sheet);
          sheet = { x: x.sheet.x, y: x.sheet.y, name: w?.name || cell(x.sheet), button: got };
          return { kind: 'sheet', what: `le bouton « Voir la planète » sur ${sheet.name}`, expected: x.button, got, ok: got === x.button };
        }
        if ('alert' in x) {
          const ok = x.alert === null ? alert === null : alert !== null && x.alert.test(alert);
          return { kind: 'alert', what: 'le bandeau d’alerte', expected: x.alert, got: alert, ok };
        }
        if ('show' in x) {
          const ok = 'ok' in x ? !!x.ok : isDeepStrictEqual(x.expected, x.got);
          const mark = { n: i + 1, text: `${x.show} : ${val(x.got)}`, ok }; // n : son numéro dans la légende
          if (Array.isArray(x.at)) {
            const [owner, id] = x.at;
            const f = fleets.find((y) => y.pid === owner.me && y.id === id);
            // Flotte disparue (posée, fusionnée, détruite) ou inconnue du joueur : l'étiquette va en haut de la carte.
            if (f) Object.assign(mark, { pid: owner.me, id, x: f.x, y: f.y, moving: f.moving });
          } else if (x.at) Object.assign(mark, { x: x.at.x, y: x.at.y });
          marks.push(mark);
          return { kind: 'show', what: x.show, expected: val(x.expected), got: val(x.got), ok };
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
        sheet,
        finger,
        marks,
        checks,
        // Ce qu'il faut au vrai jeu (index.html?view, D-139) pour redessiner l'écran du joueur à cet instant.
        // `frost` : les réglages du froid du test (souvent coupé, delayMs Infinity, que JSON écrit null).
        snap: JSON.parse(JSON.stringify({ state: st, me: viewer.me, t: now, intel: viewer.intel || {}, selected: sheet ? { x: sheet.x, y: sheet.y } : null, finger, marks, frost: { ...game.FROST, delayMs: Number.isFinite(game.FROST.delayMs) ? game.FROST.delayMs : null } })),
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
        s.error = bad.map((c) => (c.kind === 'show' ? `${c.what} : ${c.got} (attendu : ${c.expected})` : c.kind === 'finger' ? `${c.what} de ${L[viewer.me]} : ${c.got} (attendu : ${c.expected})` : c.kind === 'sheet' ? `${L[viewer.me]} ${c.got ? 'voit' : 'ne voit pas'} ${c.what} (attendu : ${c.expected ? 'visible' : 'caché'})` : c.kind === 'alert' ? `${L[viewer.me]} a ${c.got ? `le bandeau « ${c.got} »` : 'aucun bandeau'} (attendu : ${alertWant(c.expected)})` : `${L[viewer.me]} ${c.got ? 'voit' : 'ne voit pas'} ${c.what} (attendu : ${c.expected ? 'vue' : 'cachée'})`)).join(' ; ');
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

  // Planète touchée (fiche ouverte) : un doigt, en anneau blanc.
  if (f.sheet) parts.push(`<circle cx="${c(f.sheet.x)}" cy="${c(f.sheet.y)}" r="0.6" fill="none" stroke="#ffffff" stroke-width="0.08"><title>${esc(f.L[me])} touche ${esc(f.sheet.name)}</title></circle>`);

  // Valeurs vérifiées (D-147) : un anneau et son numéro (celui de la légende) sur la case ou la flotte.
  for (const m of f.marks || []) {
    if (m.x === undefined) continue; // sans place sur la carte : seulement dans la légende
    const color = m.ok ? '#4ade80' : '#ff5a5a';
    const cx = c(m.x) + (m.id && !m.moving ? 0.3 : 0);
    const cy = c(m.y) - (m.id && !m.moving ? 0.3 : 0);
    parts.push(`<circle cx="${cx}" cy="${cy}" r="0.55" fill="none" stroke="${color}" stroke-width="0.08"/><circle cx="${cx + 0.5}" cy="${cy - 0.5}" r="0.3" fill="${color}"/><text x="${cx + 0.5}" y="${cy - 0.36}" font-size="0.4" font-weight="700" text-anchor="middle" fill="#05070f">${m.n}<title>${esc(`${m.ok ? '✔' : '✖'} ${m.text}`)}</title></text>`);
  }

  // Le doigt (D-146) : sa portée en cases, autour du point touché.
  if (f.finger) parts.push(`<circle cx="${c(f.finger.x)}" cy="${c(f.finger.y)}" r="${f.finger.r}" fill="rgba(255,255,255,0.12)" stroke="#ffffff" stroke-width="0.06" stroke-dasharray="0.15 0.1"><title>${esc(f.L[me])} touche ${cell(f.finger)} : ${esc(f.finger.text)}</title></circle><circle cx="${c(f.finger.x)}" cy="${c(f.finger.y)}" r="0.08" fill="#ffffff"/>`);
  if (f.finger?.raw < f.finger?.r) parts.push(`<circle cx="${c(f.finger.x)}" cy="${c(f.finger.y)}" r="${f.finger.raw}" fill="none" stroke="#ffffff" stroke-width="0.04" opacity="0.6"><title>${FINGER} px seuls : ${+f.finger.raw.toFixed(2)} case</title></circle>`);

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
        .map((c, i) =>
          c.kind === 'show'
            ? `<li class="${c.ok ? 'ok' : 'ko'}"><b class="num">${i + 1}</b>${c.ok ? '✔' : '✖'} ${esc(c.what)} : attendu ${esc(c.expected)}, obtenu ${esc(c.got)}</li>`
            : c.kind === 'finger'
            ? `<li class="${c.ok ? 'ok' : 'ko'}"><b class="num">${i + 1}</b>${c.ok ? '✔' : '✖'} ${esc(c.what)} : attendu ${esc(c.expected)}, obtenu ${esc(c.got)}</li>`
            : c.kind === 'sheet'
            ? `<li class="${c.ok ? 'ok' : 'ko'}"><b class="num">${i + 1}</b>${c.ok ? '✔' : '✖'} ${esc(c.what)} : attendu ${c.expected ? 'visible' : 'caché'}, obtenu ${c.got ? 'visible' : 'caché'}</li>`
            : c.kind === 'alert'
              ? `<li class="${c.ok ? 'ok' : 'ko'}"><b class="num">${i + 1}</b>${c.ok ? '✔' : '✖'} ${esc(c.what)} : attendu ${esc(alertWant(c.expected))}, obtenu ${c.got === null ? 'aucun bandeau' : `« ${esc(c.got)} »`}</li>`
              : `<li class="${c.ok ? 'ok' : 'ko'}"><b class="num">${i + 1}</b>${c.ok ? '✔' : '✖'} ${esc(c.what)} : attendu ${c.expected ? 'vue' : 'cachée'}, obtenu ${c.got === null ? 'absente' : c.got ? 'vue' : 'cachée'}</li>`,
        )
        .join('');
      const rows = (f.players || [])
        .map((p) => `<tr><td><span class="dot" style="background:${f.colors[p.id]}"></span>${f.L[p.id]}${p.out ? ' (éliminé)' : ''}</td><td>${p.planets.map((x) => `${esc(x.name)} ${x.res} · ${esc(x.ships)}`).join('<br>') || '—'}</td><td>${p.fleets}</td></tr>`)
        .join('');
      const table = rows ? `<table class="pl"><tr><th>Joueur</th><th>Planètes : stock · à quai</th><th>Flottes</th></tr>${rows}</table>` : '';
      const head = s.frames.length < 2 ? '' : `<b>${k + 1}/${s.frames.length} · t = ${Math.round((f.t - t0) / 1000)} s</b> · `;
      // La carte de contrôle : la vérité du test (flottes cachées, vrais propriétaires), pas ce que voit le joueur.
      return `<figure data-frame="${k}"${f.ko ? ' class="ko"' : ''}><figcaption>${head}${f.ko && !f.checks.length ? '<span class="ko">✖ </span>' : ''}${esc(f.label)} (vu par ${f.L[f.viewer]})${checks ? `<p class="leg">Légende : chaque numéro est posé sur la carte, à l’endroit vérifié${f.marks?.some((m) => m.x === undefined) ? ' (ceux qui n’ont pas de place sur la carte ne sont qu’ici)' : ''}</p><ol class="checks">${checks}</ol>` : ''}${table}</figcaption><details class="truth"><summary>Carte de contrôle (vérité du test)</summary>${svg(f)}</details></figure>`;
    })
    .join('');
  // Chaque image : l'état de la partie pour le vrai jeu (index.html?view). « < » échappé : le JSON reste dans son <script>.
  const snaps = JSON.stringify(s.frames.map((f) => f.snap)).replace(/</g, '\\u003c');
  const ctl = s.frames.length < 2 ? '' : `<div class="ctl"><button data-step="-1" aria-label="Image précédente">⏮</button><button data-play aria-label="Lecture">▶</button><button data-step="1" aria-label="Image suivante">⏭</button><input type="range" min="0" max="${s.frames.length - 1}" value="0" aria-label="Image"></div>`;
  return `<section class="scn ${s.ok ? 'ok' : 'ko'}" id="s${i}" data-name="${esc(s.name)}">
<h2>${s.ok ? '✔' : '✖'} ${esc(s.name)}</h2>
${s.ok ? '' : `<p class="ko">Obtenu : ${esc(s.error)}</p>`}
${frames ? `<div class="film"><div class="phone"><iframe data-src="../../index.html?view" loading="lazy" title="Écran du joueur, dans le vrai jeu"></iframe><p class="phone-off">Le vrai écran du joueur s'affiche quand ce rapport est servi en http : <code>node tests/ui/server.mjs</code>, ou un serveur à la racine du dépôt. Ouvert en fichier, seule la carte de contrôle est montrée.</p></div><div class="info"><div class="frames">${frames}</div>${ctl}</div><script type="application/json" class="snaps">${snaps}</script></div>` : ''}
</section>`;
}

function page(file, list) {
  const ko = list.filter((s) => !s.ok).length;
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Astra · ${esc(file)}</title>
<style>
:root{color-scheme:dark}body{margin:0;padding:16px;background:#070a14;color:#e8ebf7;font:15px/1.45 system-ui,sans-serif;max-width:860px;margin-inline:auto}
h1{font-size:20px;margin:0 0 4px}.sum{color:#aab2cf;margin:0 0 16px}code{font:13px ui-monospace,monospace;background:#11162a;padding:1px 5px;border-radius:4px}
.scn{background:#0d1222;border:1px solid #1f2742;border-radius:12px;padding:12px 14px;margin:0 0 16px}.scn.ko{border-color:#ff5a5a}
h2{font-size:16px;margin:0 0 8px}.scn.ok h2{color:#4ade80}.scn.ko h2{color:#ff5a5a}
.ko{color:#ff8a8a}p.ko{margin:0 0 10px}
.film{display:flex;flex-wrap:wrap;gap:14px;align-items:flex-start}.info{flex:1;min-width:260px}
.phone{width:390px;max-width:100%}.phone iframe{display:block;width:390px;max-width:100%;height:780px;border:1px solid #2a3355;border-radius:18px;background:#05070f}
.phone-off{display:none;color:#aab2cf;font-size:13px;margin:0}.phone.off iframe{display:none}.phone.off .phone-off{display:block}
figure{margin:0}svg{display:block;width:100%;max-width:420px;aspect-ratio:1;border-radius:8px}figcaption{color:#aab2cf;font-size:13px;margin:0 0 6px}
details.truth summary{color:#7d86a8;font-size:12px;cursor:pointer;margin:4px 0}
figcaption ol.checks{margin:2px 0 0;padding:0;list-style:none;display:grid;gap:3px}.leg{margin:6px 0 0;color:#7d86a8;font-size:12px}b.num{display:inline-grid;place-items:center;min-width:18px;height:18px;margin-right:6px;border-radius:9px;font-size:11px;color:#05070f;background:currentColor}li.ok b.num{background:#4ade80}li.ko b.num{background:#ff8a8a}
table.pl{border-collapse:collapse;margin-top:6px;font-size:12px;width:100%;max-width:420px}table.pl th,table.pl td{text-align:left;padding:2px 6px 2px 0;vertical-align:top;border-top:1px solid #1f2742}table.pl th{color:#7d86a8;font-weight:600}
.dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:5px}li.ok{color:#4ade80}li.ko{color:#ff8a8a}
.film figure+figure{margin-top:12px}
.js .frames{display:grid}.js .frames figure{grid-area:1/1;margin:0;visibility:hidden}.js .frames figure.on{visibility:visible}
.ctl{display:none;gap:8px;align-items:center;margin-top:8px}.js .ctl{display:flex}.ctl button{background:#1b2340;color:#e8ebf7;border:0;border-radius:8px;padding:6px 12px;font-size:15px}.ctl input{flex:1}
.legend{color:#aab2cf;font-size:13px;margin:0 0 16px}
</style></head><body>
<h1>${esc(file)}</h1>
<p class="sum">${list.length} scénario${list.length > 1 ? 's' : ''}, ${ko ? `<b class="ko">${ko} en échec</b>` : 'tous réussis'} · ${esc(new Date().toISOString().slice(0, 16).replace('T', ' '))} UTC · relancer : <code>ASTRA_REPORT=1 node --test tests/${esc(file)}</code></p>
<p class="legend">À gauche, l'écran du joueur qui regarde, dans le vrai jeu (<code>index.html?view</code>) : exactement ce qu'il verrait à cet instant (planète touchée : sa fiche est ouverte). À droite, ce que le test vérifie (✔ / ✖), l'état réel de chaque joueur et, en dépliant, la carte de contrôle : halo = portée de détection ; losange plein = flotte vue ; losange en pointillés = flotte cachée pour lui (dessinée pour comprendre) ; anneau en pointillés autour d'une planète = son vrai propriétaire, que le joueur ignore ; anneau blanc = planète touchée ; cercle blanc en pointillés = la portée du doigt, autour du point touché. Sur l'écran du joueur, un anneau vert (✔) ou rouge (✖) numéroté marque chaque valeur vérifiée ; son texte est dans la légende, à droite, au même numéro.</p>
${list.map(section).join('\n')}
<script>
document.documentElement.classList.add('js');
// #scn=<nom> : un seul scénario (l'interface de test, tests/ui, montre ainsi celui qu'on a choisi).
const only = new URLSearchParams(location.hash.slice(1)).get('scn');
if (only !== null) {
  for (const s of document.querySelectorAll('.scn')) s.hidden = s.dataset.name !== only;
  for (const p of document.querySelectorAll('.sum, h1')) p.hidden = true;
}
// Le vrai jeu ne se charge qu'en http (les modules JS ne marchent pas en file://).
const live = location.protocol === 'http:' || location.protocol === 'https:';
for (const film of document.querySelectorAll('.film')) {
  const figs = [...film.querySelectorAll('figure')];
  const snaps = JSON.parse(film.querySelector('script.snaps').textContent);
  const frame = film.querySelector('iframe');
  let i = Math.max(0, figs.findIndex((f) => f.classList.contains('ko'))), ready = false;
  const post = () => ready && frame.contentWindow.postMessage({ astraView: snaps[i] }, location.origin);
  if (live) {
    addEventListener('message', (e) => {
      if (e.source !== frame.contentWindow || !e.data?.astraViewReady) return;
      ready = true;
      post();
    });
    frame.src = frame.dataset.src;
  } else {
    frame.parentNode.classList.add('off');
    for (const d of film.querySelectorAll('details')) d.open = true;
  }
  const range = film.querySelector('input');
  const play = film.querySelector('[data-play]');
  const show = (k) => { i = (k + figs.length) % figs.length; figs.forEach((f, j) => f.classList.toggle('on', j === i)); if (range) range.value = i; post(); };
  if (!play) { show(0); continue; } // une seule image : pas de commandes (rien à faire défiler)
  let timer = 0;
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
