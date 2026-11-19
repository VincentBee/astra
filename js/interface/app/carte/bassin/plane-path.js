/**
 * Ajoute au tracé en cours le cercle de centre (u, v) et de rayon `r` (en cases), couché sur le
 * plan de hauteur `h`, vu par la projection `view` : un polygone de `n` côtés (une ellipse
 * déformée par la perspective, juste à toutes les tailles).
 */
export function planePath(ctx, view, u, v, r, h = 0, n = 48) {
  for (let k = 0; k <= n; k++) {
    const t = (k / n) * Math.PI * 2;
    const p = view.pt(u + r * Math.cos(t), v + r * Math.sin(t), h);
    ctx[k ? 'lineTo' : 'moveTo'](p.x, p.y);
  }
  ctx.closePath();
}
