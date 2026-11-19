import { drawAutoMark } from '../../alertes/draw-auto-mark.js';
import { $ } from '../../outils/dollar.js';
import { DRY } from '../../outils/dry.js';
import { BASSIN } from './bassin.js';
import { deps } from './deps.js';
import { drawAim3d } from './draw-aim-3d.js';
import { drawBall } from './draw-ball.js';
import { drawBasin } from './draw-basin.js';
import { drawFrost3d } from './draw-frost-3d.js';
import { drawRange3d } from './draw-range-3d.js';
import { drawShadow } from './draw-shadow.js';
import { drawShip3d } from './draw-ship-3d.js';
import { drawShuttles3d } from './draw-shuttles-3d.js';
import { drawSmallBody3d } from './draw-small-body-3d.js';
import { drawSun3d } from './draw-sun-3d.js';
import { drawSunPool } from './draw-sun-pool.js';
import { lightDir } from './light-dir.js';
import { makeView } from './make-view.js';
import { planePath } from './plane-path.js';
import { quadPath } from './quad-path.js';
import { ringPath } from './ring-path.js';

/**
 * La carte en 3D (D-559), en option (D-563) : un petit bassin peu profond vu de devant et d'en haut. Les planètes
 * (boules éclairées par le soleil) et les vaisseaux sont posés sur le plan du jeu, au niveau du
 * rebord ; leurs ombres tombent sur le fond étoilé. Le jeu reste en 2D : seules les places à
 * l'écran passent par la projection (`makeView`), que le toucher inverse (`toCells`).
 */
export function drawMap3d() {
  // Appelée par `drawMap` du jeu (qui demande déjà l'image suivante), seulement en 3D (D-563).
  const { etat, zoom, mapPlanets, mapVeiled, fleetSpots, aimRead, myColonizer, drawAlertDot, countShips, fleetTank, fuelAt, sameCell, sunFor } = deps;
  const canvas = $('map');
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  const W0 = Math.round(canvas.clientWidth * dpr);
  const H0 = Math.round(canvas.clientHeight * dpr);
  if (canvas.width !== W0 || canvas.height !== H0) Object.assign(canvas, { width: W0, height: H0 });
  // Zoom (D-117) : la projection montre la partie vue (zoom.x, zoom.y, zoom.z) en perspective, inclinée de zoom.t (D-562).
  const view = makeView(W0, H0, zoom.z, zoom.x, zoom.y, zoom.t);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, W0, H0);

  const veiled = mapVeiled();
  $('map-wrap').hidden = veiled;
  const sun = sunFor(etat.session.state.gid);
  const su = sun.x + sun.size / 2;
  const sv = sun.y + sun.size / 2;
  const sunAt = view.pt(su, sv, 0);
  const now = etat.session.now();
  const me = etat.session.state.players[etat.session.me];
  const picking = !!myColonizer(me); // colonisateur de départ en jeu : les planètes libres clignotent
  const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 300);
  const planets = mapPlanets();
  const spots = fleetSpots(now);
  // Ombre un peu poussée à l'opposé du soleil.
  const away = (u, v) => {
    const d = Math.hypot(u - su, v - sv) || 1;
    return [u + ((u - su) / d) * 0.18, v + ((v - sv) / d) * 0.18];
  };

  drawBasin(ctx, view, () => {
    if (!veiled) drawSunPool(ctx, view, sun);
    // Portée de détection : ce que je vois, en léger halo sur le fond (hors du halo, les flottes adverses sont cachées).
    if (me?.planet) {
      ctx.fillStyle = me.color || '#8d95b3';
      ctx.globalAlpha = 0.09;
      ctx.beginPath();
      for (const e of etat.session.eyes(now)) planePath(ctx, view, e.x + 0.5, e.y + 0.5, e.r, -BASSIN.floor, 40);
      ctx.fill(); // un seul tracé : les zones qui se recouvrent ne s'assombrissent pas
      ctx.globalAlpha = 1;
    }
    drawFrost3d(ctx, view, sun);
    for (const w of planets) {
      const [u, v] = away(w.x + 0.5, w.y + 0.5);
      const small = w.kind === 'asteroid' || w.kind === 'comet';
      drawShadow(ctx, view, u, v, small ? 0.16 : w.owner ? 0.3 : 0.24, w.owner && !w.live ? 0.3 : 0.5);
    }
    for (const spot of spots) {
      const [u, v] = away(spot.x + 0.5, spot.y + 0.5);
      drawShadow(ctx, view, u, v, spot.moving ? 0.2 : 0.16, 0.45);
    }
  });

  // Sur le plan du jeu : navettes, autonomie, trajets, points de panne, case visée.
  drawRange3d(ctx, view, now);
  drawShuttles3d(ctx, view, now);
  for (const spot of spots) {
    const { p, f } = spot;
    if (!spot.moving) continue;
    const a = view.pt(spot.x + 0.5, spot.y + 0.5, BASSIN.ship);
    const b = view.pt(f.to.x + 0.5, f.to.y + 0.5, BASSIN.ship);
    ctx.strokeStyle = p.color;
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = Math.max(1, dpr * 0.6);
    ctx.setLineDash([a.s * 0.15, a.s * 0.15]);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    if (f.stranded) {
      // Point de panne : une croix au bout du trajet.
      const u = f.to.x + 0.5;
      const v = f.to.y + 0.5;
      const r = 0.18;
      const q = (du, dv) => view.pt(u + du, v + dv, 0);
      const [p1, p2, p3, p4] = [q(-r, -r), q(r, r), q(r, -r), q(-r, r)];
      ctx.strokeStyle = '#ff7a93';
      ctx.lineWidth = Math.max(1, b.s * 0.06);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.moveTo(p3.x, p3.y);
      ctx.lineTo(p4.x, p4.y);
      ctx.stroke();
    }
  }
  if (etat.menu?.cell) {
    // Case visée, en attente d'un choix (se poser, coloniser, attaquer…).
    const { x, y } = etat.menu.cell;
    ctx.strokeStyle = '#ffffff';
    ctx.globalAlpha = 0.6 + 0.4 * pulse;
    ctx.lineWidth = Math.max(1, view.pt(x + 0.5, y + 0.5, 0).s * 0.05);
    ctx.beginPath();
    quadPath(ctx, view, [[x + 0.04, y + 0.04, 0], [x + 0.96, y + 0.04, 0], [x + 0.96, y + 0.96, 0], [x + 0.04, y + 0.96, 0]]);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // Les objets, du fond vers l'avant : les plus proches passent devant.
  const aim = aimRead(now); // flotte traînée vers sa cible (D-126)
  const foe = etat.menu?.foe || aim?.foe; // flotte ennemie visée : cercle rouge
  const things = [];
  if (!veiled) things.push({ v: sv, draw: () => drawSun3d(ctx, view, sun) });
  const alphaOf = (w, o, memo) => (etat.session.frostOf(w) <= now ? 0.15 : memo ? 0.4 : o ? (o.online ? 1 : 0.45) : picking && w.kind === 'planet' ? 0.55 + 0.35 * pulse : 0.6);
  for (const w of planets) {
    things.push({
      v: w.y + 0.5,
      draw: () => {
        const u = w.x + 0.5;
        const v = w.y + 0.5;
        const P = view.pt(u, v, 0);
        const o = w.owner;
        const mine = o?.id === etat.session.me;
        // Planète libre : grise, plus lumineuse quand on cherche où s'installer. Gelée : presque effacée.
        const memo = o && !w.live; // souvenir (D-124) : propriétaire vu la dernière fois, plus en vue
        ctx.globalAlpha = alphaOf(w, o, memo);
        const color = o ? o.color : '#8d95b3';
        const ring = (r, h = 0) => {
          ctx.globalAlpha = 1;
          ctx.strokeStyle = mine && !sameCell(etat.selected, w) ? 'rgba(255,255,255,0.85)' : '#ffffff';
          ctx.lineWidth = Math.max(1.5, P.s * 0.07);
          ctx.beginPath();
          planePath(ctx, view, u, v, r, h, 40);
          ctx.stroke();
        };
        if (w.kind === 'asteroid' || w.kind === 'comet') {
          drawSmallBody3d(ctx, view, w, P, color, sunAt);
          if (sameCell(etat.selected, w) || mine) ring(0.4);
          return;
        }
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(1, P.s * 0.06);
        if (!o || memo) ctx.setLineDash([P.s * 0.12, P.s * 0.1]);
        ctx.beginPath();
        ringPath(ctx, view, u, v, 0.42, true);
        ctx.stroke();
        drawBall(ctx, P.x, P.y, P.s * (o ? 0.28 : 0.22), color, lightDir(P.x, P.y, sunAt));
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(1, P.s * 0.06);
        ctx.beginPath();
        ringPath(ctx, view, u, v, 0.42, false);
        ctx.stroke();
        ctx.setLineDash([]);
        if (mine || sameCell(etat.selected, w)) ring(0.5);
      },
    });
  }
  const phase = (s) => [...String(s)].reduce((a, ch) => a + ch.charCodeAt(0), 0);
  const shipH = (spot) => BASSIN.ship + 0.035 * Math.sin(now / 650 + phase(`${spot.p.id}${spot.f.id}`));
  for (const spot of spots) {
    things.push({
      v: spot.y + 0.5,
      draw: () => {
        const { p, f, x, y } = spot;
        const u = x + 0.5;
        const v = y + 0.5;
        const h = shipH(spot);
        const halo = (col) => {
          ctx.globalAlpha = 1;
          ctx.strokeStyle = col;
          ctx.lineWidth = Math.max(1.5, view.pt(u, v, h).s * 0.06);
          ctx.beginPath();
          planePath(ctx, view, u, v, 0.3, h, 32);
          ctx.stroke();
        };
        if (foe && p.id === foe.pid && f.id === foe.id) halo('#ff7a93');
        if (p.id === etat.session.me && f.id === etat.selFleet) halo('#ffffff');
        ctx.globalAlpha = !spot.moving && fuelAt(f, p.race, now) < DRY ? 0.5 : 1; // à sec : grisée
        const color = ['attack', 'conquer', 'chase'].includes(f.order?.kind) || f.mission === 'attack' ? '#ff7a93' : p.color;
        drawShip3d(ctx, view, u, v, h, spot.ang, spot.moving ? 1.15 : 0.95, color, spot.moving, now);
        ctx.globalAlpha = 1;
      },
    });
  }
  things.sort((a, b) => a.v - b.v);
  for (const t of things) t.draw();
  ctx.globalAlpha = 1;

  // Par-dessus tout : noms, alertes, jauges, effectifs (toujours lisibles).
  for (const w of planets) {
    const o = w.owner;
    if (!o) continue;
    const P = view.pt(w.x + 0.5, w.y + 0.5, 0);
    const mine = o?.id === etat.session.me;
    if (o && w.kind !== 'asteroid' && w.kind !== 'comet') {
      // Nom du propriétaire au-dessus
      const memo = !w.live;
      ctx.globalAlpha = memo ? 0.5 : o.online ? 1 : 0.6;
      const fs = Math.max(9 * dpr, P.s * 0.36);
      ctx.font = `600 ${fs}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.lineWidth = Math.max(2, fs * 0.22);
      ctx.strokeStyle = 'rgba(5,8,18,0.75)';
      ctx.fillStyle = mine ? '#ffffff' : 'rgba(232,235,247,0.85)';
      const label = o.name.length > 8 ? o.name.slice(0, 7) + '…' : o.name;
      const ly = Math.max(fs, P.y - P.s * 0.52);
      ctx.strokeText(label, P.x, ly);
      ctx.fillText(label, P.x, ly);
    }
    if (mine) drawAlertDot(ctx, w, P.x, P.y, P.s, pulse);
    if (mine && w.pl?.planet?.auto) drawAutoMark(ctx, P.x, P.y, P.s, dpr);
  }
  ctx.globalAlpha = 1;
  for (const spot of spots) {
    const { p, f } = spot;
    const P = view.pt(spot.x + 0.5, spot.y + 0.5, shipH(spot));
    if (p.id === etat.session.me) {
      // Jauge de carburant sous mes flottes.
      const k = Math.min(1, fuelAt(f, p.race, now) / Math.max(1, fleetTank(p.race, f.ships)));
      const w = P.s * 0.5;
      const th = Math.max(1.5, P.s * 0.06);
      ctx.fillStyle = 'rgba(5,8,18,0.6)';
      ctx.fillRect(P.x - w / 2 - 1, P.y + P.s * 0.22 - 1, w + 2, th + 2);
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(P.x - w / 2, P.y + P.s * 0.22, w, th);
      ctx.fillStyle = k < 0.25 ? '#ff7a93' : '#f5c96a';
      ctx.fillRect(P.x - w / 2, P.y + P.s * 0.22, w * k, th);
    } else {
      // Effectif des flottes adverses (D-133), en haut à droite du vaisseau.
      ctx.font = `700 ${Math.max(9 * dpr, P.s * 0.34)}px system-ui, sans-serif`;
      ctx.textAlign = 'left';
      ctx.lineWidth = Math.max(2, P.s * 0.08);
      ctx.strokeStyle = 'rgba(5,8,18,0.9)';
      ctx.fillStyle = '#ffffff';
      const n = String(countShips(f.ships));
      ctx.strokeText(n, P.x + P.s * 0.2, P.y - P.s * 0.14);
      ctx.fillText(n, P.x + P.s * 0.2, P.y - P.s * 0.14);
    }
  }
  drawAim3d(ctx, view, dpr, aim);

  $('my-coords').textContent = me?.home ? `[${me.home.x}:${me.home.y}]` : me?.out ? 'éliminé' : etat.session.startedAt == null ? 'préparation' : 'à fonder';
}
