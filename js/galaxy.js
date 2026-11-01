// Fond de galaxie : un dégradé de nébuleuse et trois couches d'étoiles,
// réunies en une seule image immobile (plus de parallaxe, D-137 : ni
// capteurs ni redessin quand on bouge le téléphone).
//
// Deux réglages (« Fond », gardé dans astra.sky) :
// - fixe  : les étoiles, en une image de la taille de l'écran (par défaut) ;
// - aucun : rien que le dégradé CSS du body, pas de canvas.
// L'ancien « anime » (parallaxe) gardé dans un téléphone devient « fixe ».

const LAYERS = [
  { count: 260, size: [0.4, 0.9], alpha: [0.25, 0.6] }, // lointaines
  { count: 90, size: [0.7, 1.3], alpha: [0.4, 0.8] },
  { count: 28, size: [1.1, 1.8], alpha: [0.6, 1] }, // proches
];
const TINTS = ['255,255,255', '200,215,255', '255,230,200', '190,200,255'];
export const SKY_MODES = ['fixe', 'aucun'];
const KEY = 'astra.sky';

/** Un générateur pseudo-aléatoire stable : le même ciel à chaque ouverture. */
function rng(seed) {
  return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
}
const mod = (a, n) => ((a % n) + n) % n;

/** Dessine les étoiles d'une couche dans le contexte g (tw × th en pixels CSS). */
function drawLayer(g, L, i, tw, th) {
  const rand = rng(7919 * (i + 1));
  // Plus d'étoiles sur un grand écran, à densité égale.
  const n = Math.round(L.count * ((tw * th) / (400 * 800)));
  for (let k = 0; k < n; k++) {
    // Une partie des étoiles se serre le long d'une bande en diagonale : la Voie lactée.
    let x = rand() * tw;
    let y = rand() * th;
    if (rand() < 0.45) {
      const t = rand();
      x = t * tw;
      y = mod(th * (0.85 - 0.6 * t) + (rand() + rand() + rand() - 1.5) * th * 0.12, th);
    }
    const r = L.size[0] + rand() * (L.size[1] - L.size[0]);
    g.fillStyle = `rgba(${TINTS[Math.floor(rand() * TINTS.length)]},${L.alpha[0] + rand() * (L.alpha[1] - L.alpha[0])})`;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
}

/** Le réglage choisi (fixe par défaut, et à la place de l'ancien « anime »). */
export function skyMode() {
  try {
    const m = localStorage.getItem(KEY);
    if (SKY_MODES.includes(m)) return m;
  } catch {}
  return 'fixe';
}

let stop = null;

/** Change le fond tout de suite et retient le choix. */
export function setSkyMode(mode) {
  if (!SKY_MODES.includes(mode)) return;
  try {
    localStorage.setItem(KEY, mode);
  } catch {}
  stop?.();
  stop = start(mode);
}

export function startGalaxy() {
  stop?.();
  stop = start(skyMode());
}

/**
 * Pose le fond : une image de la taille de l'écran, redessinée seulement
 * quand l'écran change de taille. Renvoie une fonction qui le retire.
 */
function start(mode) {
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
