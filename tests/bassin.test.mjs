// La carte en 3D (D-559) : la projection du bassin, sans navigateur.
// Le jeu reste sur un plan : le toucher doit retrouver exactement la case dessinée.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeView } from '../js/interface/app/carte/bassin/make-view.js';
import { UNIVERSE } from '../js/regles/game/index.js';

const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≠ ${b}`);

test('bassin : toucher un point dessiné retrouve sa case, à tous les zooms', () => {
  for (const [z, x0, y0] of [[1, 0, 0], [2, 3, 7.5], [4, 15, 0]]) {
    const view = makeView(360, 300, z, x0, y0);
    for (const [u, v] of [[0.5, 0.5], [10, 10], [x0 + 1.2, y0 + 3.7], [19.5, 19.5]]) {
      const p = view.pt(u, v, 0);
      const back = view.unproj(p.x, p.y);
      near(back.u, u);
      near(back.v, v);
    }
  }
});

test('bassin : toute la carte tient dans le canvas, le haut plus petit que le bas (perspective)', () => {
  const size = 400;
  const view = makeView(size, size * 0.82, 1, 0, 0);
  for (const [u, v] of [[0, 0], [UNIVERSE.w, 0], [0, UNIVERSE.h], [UNIVERSE.w, UNIVERSE.h]]) {
    const p = view.pt(u, v, 0);
    assert.ok(p.x >= 0 && p.x <= size && p.y >= 0 && p.y <= size * 0.82, `coin ${u}:${v} hors du canvas`);
  }
  const far = view.pt(10, 0.5, 0).s;
  const close = view.pt(10, 19.5, 0).s;
  assert.ok(far < close, 'une case du fond est plus petite qu’une case de devant');
  assert.ok(far / close > 0.7, 'mais pas trop : on peut encore la toucher');
  // Plus haut = plus haut à l'écran.
  assert.ok(view.pt(10, 10, 1).y < view.pt(10, 10, 0).y);
});

test('bassin : glisser la vue de d cases déplace le point touché de d cases (glissé, pincement)', () => {
  const a = makeView(300, 250, 2, 4, 5).unproj(120, 80);
  const b = makeView(300, 250, 2, 5.5, 3).unproj(120, 80);
  near(b.u - a.u, 1.5);
  near(b.v - a.v, -2);
});

test('bassin : on peut incliner la vue (D-562), de dessus à très penchée, le toucher reste juste', () => {
  for (const tilt of [0, 0.3, 0.55, 1]) {
    const size = 400;
    const high = size * 0.82;
    const view = makeView(size, high, 1, 0, 0, tilt);
    for (const [u, v] of [[0, 0], [UNIVERSE.w, 0], [0, UNIVERSE.h], [UNIVERSE.w, UNIVERSE.h]]) {
      const p = view.pt(u, v, 0);
      assert.ok(p.x >= 0 && p.x <= size && p.y >= 0 && p.y <= high, `incliné de ${tilt} : coin ${u}:${v} hors du canvas`);
    }
    const z = makeView(size, high, 3, 6, 9, tilt);
    const p = z.pt(8.5, 11.5, 0);
    const back = z.unproj(p.x, p.y);
    near(back.u, 8.5);
    near(back.v, 11.5);
  }
  // Plus penchée : le fond de la carte paraît plus petit.
  const ratio = (t) => { const v = makeView(400, 328, 1, 0, 0, t); return v.pt(10, 0.5, 0).s / v.pt(10, 19.5, 0).s; };
  assert.ok(ratio(1) < ratio(0.55) && ratio(0.55) < ratio(0));
  near(ratio(0), 1);
});
