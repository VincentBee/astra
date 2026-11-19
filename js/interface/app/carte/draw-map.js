import { countShips, fleetTank, fuelAt } from '../../../regles/fleet/index.js';
import { sameCell, sunFor, UNIVERSE } from '../../../regles/game/index.js';
import { drawSun } from '../../sky/index.js';
import { drawAlertDot } from '../alertes/draw-alert-dot.js';
import { myColonizer } from '../depart/my-colonizer.js';
import { etat } from '../etat.js';
import { $ } from '../outils/dollar.js';
import { DRY } from '../outils/dry.js';
import { drawFrost } from './draw-frost.js';
import { drawSmallBody } from './draw-small-body.js';
import { mapPlanets } from './map-planets.js';
import { mapVeiled } from './map-veiled.js';
import { noise } from './noise.js';
import { fleetSpots } from './selection/fleet-spots.js';
import { aimRead } from './visee/aim-read.js';
import { drawAim } from './visee/draw-aim.js';
import { drawRange } from './visee/draw-range.js';
import { drawShuttles } from './visee/draw-shuttles.js';
import { zoom } from './zoom/zoom.js';
import { reliefOn } from './relief/relief-on.js';
import { drawAutoMark } from '../alertes/draw-auto-mark.js';

export function drawMap() {
  etat.mapFrame = null;
  if (!etat.session || etat.currentView !== 'map') return;
  // L'image suivante est demandée tout de suite : une erreur dans celle-ci ne fige pas la carte.
  etat.mapFrame = requestAnimationFrame(drawMap);
  const canvas = $('map');
  // Carte en 3D cochée dans les Réglages et téléchargée (D-563) : c'est elle qui dessine.
  const relief3d = reliefOn();
  if (canvas.classList.contains('bassin') !== !!relief3d) {
    canvas.classList.toggle('bassin', !!relief3d);
    $('btn-tilt').hidden = !relief3d;
  }
  if (relief3d) return relief3d.drawMap3d();
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  const css = canvas.clientWidth;
  if (canvas.width !== Math.round(css * dpr) || canvas.height !== canvas.width) canvas.width = canvas.height = Math.round(css * dpr);
  const W0 = canvas.width;
  // Zoom (D-117) : les cases grandissent, et le dessin se décale jusqu'au coin de la partie vue.
  const cell = (W0 * zoom.z) / UNIVERSE.w;
  const W = cell * UNIVERSE.w; // tout l'univers, en pixels du canvas
  const ctx = canvas.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, W0, W0);
  ctx.fillStyle = '#05070f';
  ctx.fillRect(0, 0, W0, W0);
  ctx.setTransform(1, 0, 0, 1, -zoom.x * cell, -zoom.y * cell);

  // Étoiles et quadrillage : du décor, très discret, pour que seuls les objets qu'on peut toucher ressortent.
  for (let y = 0; y < UNIVERSE.h; y++) {
    for (let x = 0; x < UNIVERSE.w; x++) {
      const n = noise(x, y);
      if (n > 0.72) {
        ctx.fillStyle = `rgba(220,230,255,${0.05 + (n - 0.72) * 0.6})`;
        const r = Math.max(0.5, cell * 0.025 * (n * 2));
        ctx.beginPath();
        ctx.arc((x + noise(y, x)) * cell, (y + noise(x + 7, y + 3)) * cell, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  ctx.strokeStyle = 'rgba(150,170,230,0.05)';
  ctx.lineWidth = Math.max(1, dpr * 0.5);
  ctx.beginPath();
  for (let i = 1; i < UNIVERSE.w; i++) {
    ctx.moveTo(i * cell, 0);
    ctx.lineTo(i * cell, W);
    ctx.moveTo(0, i * cell);
    ctx.lineTo(W, i * cell);
  }
  ctx.stroke();
  const veiled = mapVeiled();
  $('map-wrap').hidden = veiled;
  const sun = sunFor(etat.session.state.gid);
  if (!veiled) drawSun(ctx, sun, cell);
  drawFrost(ctx, sun, cell, W);

  const me = etat.session.state.players[etat.session.me];
  const picking = !!myColonizer(me); // colonisateur de départ en jeu : les planètes libres clignotent
  const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 300);

  // Portée de détection : ce que je vois, en léger halo (hors du halo, les flottes adverses sont cachées).
  if (me?.planet) {
    ctx.fillStyle = me.color || '#8d95b3';
    ctx.globalAlpha = 0.07;
    ctx.beginPath();
    for (const e of etat.session.eyes(etat.session.now())) {
      ctx.moveTo((e.x + 0.5 + e.r) * cell, (e.y + 0.5) * cell);
      ctx.arc((e.x + 0.5) * cell, (e.y + 0.5) * cell, e.r * cell, 0, Math.PI * 2);
    }
    ctx.fill(); // un seul tracé : les zones qui se recouvrent ne s'assombrissent pas
    ctx.globalAlpha = 1;
  }

  for (const w of mapPlanets()) {
    const cx = (w.x + 0.5) * cell;
    const cy = (w.y + 0.5) * cell;
    const o = w.owner;
    const mine = o?.id === etat.session.me;
    // Planète libre : grise, plus lumineuse quand on cherche où s'installer. Gelée : presque effacée.
    const memo = o && !w.live; // souvenir (D-124) : propriétaire vu la dernière fois, plus en vue
    ctx.globalAlpha = etat.session.frostOf(w) <= etat.session.now() ? 0.15 : memo ? 0.4 : o ? (o.online ? 1 : 0.45) : picking && w.kind === 'planet' ? 0.55 + 0.35 * pulse : 0.6;
    const color = o ? o.color : '#8d95b3';
    ctx.fillStyle = color;
    if (w.kind === 'asteroid' || w.kind === 'comet') {
      drawSmallBody(ctx, w, cx, cy, cell, color);
      if (sameCell(etat.selected, w) || mine) {
        ctx.globalAlpha = 1;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(1.5, cell * 0.06);
        ctx.beginPath();
        ctx.arc(cx, cy, cell * 0.4, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (mine) drawAlertDot(ctx, w, cx, cy, cell, pulse);
      continue;
    }
    ctx.beginPath();
    ctx.arc(cx, cy, cell * (o ? 0.26 : 0.2), 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1, cell * 0.06);
    if (!o || memo) ctx.setLineDash([cell * 0.12, cell * 0.1]);
    ctx.beginPath();
    ctx.ellipse(cx, cy, cell * 0.42, cell * 0.14, -0.35, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    if (mine || sameCell(etat.selected, w)) {
      ctx.globalAlpha = 1;
      ctx.strokeStyle = mine ? 'rgba(255,255,255,0.85)' : '#ffffff';
      ctx.lineWidth = Math.max(1.5, cell * 0.07);
      ctx.beginPath();
      ctx.arc(cx, cy, cell * 0.5, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Nom du propriétaire au-dessus
    if (o) {
      ctx.globalAlpha = memo ? 0.5 : o.online ? 1 : 0.6;
      ctx.font = `600 ${Math.max(9 * dpr, cell * 0.36)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = mine ? '#ffffff' : 'rgba(232,235,247,0.8)';
      const label = o.name.length > 8 ? o.name.slice(0, 7) + '…' : o.name;
      ctx.fillText(label, cx, Math.max(cell * 0.4, cy - cell * 0.5));
    }
    if (mine) drawAlertDot(ctx, w, cx, cy, cell, pulse);
    if (mine && w.pl?.planet?.auto) drawAutoMark(ctx, cx, cy, cell, dpr);
  }
  ctx.globalAlpha = 1;

  // Flottes : un petit triangle qui glisse le long de son trajet, ou qui attend en orbite.
  const now = etat.session.now();
  drawRange(ctx, cell, now);
  drawShuttles(ctx, cell, now);
  const aim = aimRead(now); // flotte traînée vers sa cible (D-126)
  const foe = etat.menu?.foe || aim?.foe; // flotte ennemie visée : cercle rouge
  for (const spot of fleetSpots(now)) {
    const { p, f, x, y } = spot;
    const cx = (x + 0.5) * cell;
    const cy = (y + 0.5) * cell;
    if (spot.moving) {
      ctx.strokeStyle = p.color;
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = Math.max(1, dpr * 0.6);
      ctx.setLineDash([cell * 0.15, cell * 0.15]);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo((f.to.x + 0.5) * cell, (f.to.y + 0.5) * cell);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.globalAlpha = 1;
    if (foe && p.id === foe.pid && f.id === foe.id) {
      ctx.strokeStyle = '#ff7a93';
      ctx.lineWidth = Math.max(1.5, cell * 0.06);
      ctx.beginPath();
      ctx.arc(cx, cy, cell * 0.3, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (p.id === etat.session.me && f.id === etat.selFleet) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(1.5, cell * 0.06);
      ctx.beginPath();
      ctx.arc(cx, cy, cell * 0.3, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (f.stranded && spot.moving) {
      // Point de panne : une croix au bout du trajet.
      const px = (f.to.x + 0.5) * cell;
      const py = (f.to.y + 0.5) * cell;
      const r = cell * 0.18;
      ctx.strokeStyle = '#ff7a93';
      ctx.lineWidth = Math.max(1, cell * 0.06);
      ctx.beginPath();
      ctx.moveTo(px - r, py - r);
      ctx.lineTo(px + r, py + r);
      ctx.moveTo(px + r, py - r);
      ctx.lineTo(px - r, py + r);
      ctx.stroke();
    }
    if (p.id === etat.session.me) {
      // Jauge de carburant sous mes flottes.
      const k = Math.min(1, fuelAt(f, p.race, now) / Math.max(1, fleetTank(p.race, f.ships)));
      const w = cell * 0.5;
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(cx - w / 2, cy + cell * 0.24, w, Math.max(1.5, cell * 0.06));
      ctx.fillStyle = k < 0.25 ? '#ff7a93' : '#f5c96a';
      ctx.fillRect(cx - w / 2, cy + cell * 0.24, w * k, Math.max(1.5, cell * 0.06));
    }
    ctx.globalAlpha = !spot.moving && fuelAt(f, p.race, now) < DRY ? 0.5 : 1; // à sec : grisée
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(spot.ang);
    ctx.fillStyle = ['attack', 'conquer', 'chase'].includes(f.order?.kind) || f.mission === 'attack' ? '#ff7a93' : p.color;
    const k = spot.moving ? 1 : 0.8;
    ctx.beginPath();
    ctx.moveTo(cell * 0.28 * k, 0);
    ctx.lineTo(-cell * 0.18 * k, cell * 0.16 * k);
    ctx.lineTo(-cell * 0.18 * k, -cell * 0.16 * k);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.globalAlpha = 1;
    if (p.id !== etat.session.me) {
      // Effectif des flottes adverses (D-133), en haut à droite du triangle.
      ctx.font = `700 ${Math.max(9 * dpr, cell * 0.34)}px system-ui, sans-serif`;
      ctx.textAlign = 'left';
      ctx.lineWidth = Math.max(2, cell * 0.08);
      ctx.strokeStyle = 'rgba(5,8,18,0.9)';
      ctx.fillStyle = '#ffffff';
      const n = String(countShips(f.ships));
      ctx.strokeText(n, cx + cell * 0.2, cy - cell * 0.14);
      ctx.fillText(n, cx + cell * 0.2, cy - cell * 0.14);
    }
  }
  // Case visée, en attente d'un choix (se poser, coloniser, attaquer…).
  if (etat.menu?.cell) {
    ctx.strokeStyle = '#ffffff';
    ctx.globalAlpha = 0.6 + 0.4 * pulse;
    ctx.lineWidth = Math.max(1, cell * 0.05);
    ctx.strokeRect(etat.menu.cell.x * cell + 1, etat.menu.cell.y * cell + 1, cell - 2, cell - 2);
    ctx.globalAlpha = 1;
  }
  drawAim(ctx, cell, dpr, aim);

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  $('my-coords').textContent = me?.home ? `[${me.home.x}:${me.home.y}]` : me?.out ? 'éliminé' : etat.session.startedAt == null ? 'préparation' : 'à fonder';
}
