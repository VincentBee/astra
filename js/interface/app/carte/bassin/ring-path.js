/**
 * Moitié d'anneau de planète (D-559) autour de (u, v), rayon `R` en cases, légèrement penché :
 * `back` vrai = la moitié de derrière (cachée en partie par la planète, dessinée avant elle).
 */
export function ringPath(ctx, view, u, v, R, back) {
  const n = 18;
  const tilt = 0.35; // l'anneau penche : sa moitié proche monte un peu
  const turn = -0.35; // et tourne un peu sur le plan
  const ct = Math.cos(turn);
  const st = Math.sin(turn);
  for (let k = 0; k <= n; k++) {
    const t = (back ? Math.PI : 0) + (k / n) * Math.PI;
    const a = R * Math.cos(t);
    const b = R * Math.sin(t);
    const p = view.pt(u + a * ct - b * st, v + a * st + b * ct, b * tilt);
    ctx[k ? 'lineTo' : 'moveTo'](p.x, p.y);
  }
}
