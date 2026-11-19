/** Ajoute au tracé en cours le polygone des points `pts` ([u, v, h], en cases) projetés par `view`. */
export function quadPath(ctx, view, pts) {
  pts.forEach(([u, v, h], k) => {
    const p = view.pt(u, v, h);
    ctx[k ? 'lineTo' : 'moveTo'](p.x, p.y);
  });
  ctx.closePath();
}
