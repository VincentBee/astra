/** Petite flèche en rond en bas à gauche d'une de mes planètes : elle achète des vaisseaux toute seule (D-530). */
export function drawAutoMark(ctx, cx, cy, cell, dpr = 1) {
  const r = Math.max(cell * 0.15, 3.5 * dpr);
  const x = cx - Math.max(cell * 0.4, r * 2.2);
  const y = cy + Math.max(cell * 0.34, r * 1.8);
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#05070f';
  ctx.beginPath();
  ctx.arc(x, y, r * 1.55, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#7cf0b4';
  ctx.lineWidth = Math.max(1, cell * 0.05);
  ctx.beginPath();
  ctx.arc(x, y, r, -Math.PI * 0.35, Math.PI * 1.4);
  ctx.stroke();
  // La pointe de la flèche, au bout de l'arc.
  const a = -Math.PI * 0.35;
  const tx = x + r * Math.cos(a);
  const ty = y + r * Math.sin(a);
  ctx.fillStyle = '#7cf0b4';
  ctx.beginPath();
  ctx.moveTo(tx + r * 0.6, ty);
  ctx.lineTo(tx - r * 0.35, ty - r * 0.55);
  ctx.lineTo(tx - r * 0.2, ty + r * 0.6);
  ctx.closePath();
  ctx.fill();
}
