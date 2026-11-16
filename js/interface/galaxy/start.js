import { drawLayer } from './draw-layer.js';
import { LAYERS } from './layers.js';

/**
 * Pose le fond : une image de la taille de l'écran, redessinée seulement
 * quand l'écran change de taille. Renvoie une fonction qui le retire.
 */
export function start(mode) {
  if (mode === 'aucun') return () => {};
  const sky = document.createElement('div');
  sky.className = 'galaxy';
  sky.setAttribute('aria-hidden', 'true');
  const layer = sky.appendChild(document.createElement('div'));
  document.body.prepend(sky);
  const off = new AbortController();

  function draw() {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const tw = innerWidth;
    const th = innerHeight;
    const c = document.createElement('canvas');
    c.width = Math.round(tw * dpr);
    c.height = Math.round(th * dpr);
    const g = c.getContext('2d');
    g.scale(dpr, dpr);
    LAYERS.forEach((L, i) => drawLayer(g, L, i, tw, th));
    layer.style.backgroundImage = `url(${c.toDataURL()})`;
    layer.style.backgroundSize = `${tw}px ${th}px`;
  }

  draw();
  let resize;
  addEventListener(
    'resize',
    () => {
      clearTimeout(resize);
      resize = setTimeout(draw, 150);
    },
    { signal: off.signal },
  );
  return () => {
    off.abort();
    clearTimeout(resize);
    sky.remove();
  };
}
