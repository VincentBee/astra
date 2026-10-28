// Fond de galaxie : un dégradé de nébuleuse et trois couches d'étoiles.
// Les couches proches bougent plus que les lointaines (parallaxe) quand on
// fait défiler la page, bouge la souris ou incline le téléphone.

const LAYERS = [
  { count: 260, size: [0.4, 0.9], alpha: [0.25, 0.6], depth: 0.04 }, // lointaines
  { count: 90, size: [0.7, 1.3], alpha: [0.4, 0.8], depth: 0.1 },
  { count: 28, size: [1.1, 1.8], alpha: [0.6, 1], depth: 0.2 }, // proches
];
const TINTS = ['255,255,255', '200,215,255', '255,230,200', '190,200,255'];

/** Un générateur pseudo-aléatoire stable : le même ciel à chaque ouverture. */
function rng(seed) {
  return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
}
const mod = (a, n) => ((a % n) + n) % n;

/**
 * Chaque couche est une tuile de la taille de l'écran, répétée : on peut la
 * décaler sans fin (défilement d'une longue page) sans jamais voir de bord.
 */
export function startGalaxy() {
  const sky = document.createElement('div');
  sky.className = 'galaxy';
  sky.setAttribute('aria-hidden', 'true');
  const layers = LAYERS.map(() => sky.appendChild(document.createElement('div')));
  document.body.prepend(sky);
  let tw = 0;
  let th = 0;

  function draw() {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    tw = innerWidth;
    th = innerHeight;
    LAYERS.forEach((L, i) => {
      const c = document.createElement('canvas');
      c.width = Math.round(tw * dpr);
      c.height = Math.round(th * dpr);
      const g = c.getContext('2d');
      g.scale(dpr, dpr);
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
      layers[i].style.backgroundImage = `url(${c.toDataURL()})`;
      layers[i].style.backgroundSize = `${tw}px ${th}px`;
    });
  }

  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let px = 0; // -1 … 1 : souris ou inclinaison
  let py = 0;
  let queued = false;
  function place() {
    queued = false;
    LAYERS.forEach((L, i) => {
      const ox = still ? 0 : px * tw * L.depth * 0.5;
      const oy = still ? 0 : -scrollY * L.depth + py * th * L.depth * 0.5;
      layers[i].style.transform = `translate3d(${mod(ox, tw) - tw}px, ${mod(oy, th) - th}px, 0)`;
    });
  }
  const later = () => {
    if (!queued) (queued = true), requestAnimationFrame(place);
  };

  draw();
  place();
  let resize;
  addEventListener('resize', () => {
    clearTimeout(resize);
    resize = setTimeout(() => (draw(), place()), 150);
  });
  if (still) return;
  addEventListener('scroll', later, { passive: true });
  addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    px = (e.clientX / innerWidth) * 2 - 1;
    py = (e.clientY / innerHeight) * 2 - 1;
    later();
  });
  // Accéléromètre : la gravité mesurée dit comment le téléphone penche.
  // La position où on le tient devient peu à peu le repos (rest), et le ciel
  // glisse quand on s'en écarte.
  const ios = typeof DeviceMotionEvent?.requestPermission === 'function';
  let rest = null;
  addEventListener('devicemotion', (e) => {
    const a = e.accelerationIncludingGravity;
    if (a?.x == null) return;
    // Android donne les axes dans l'autre sens qu'iOS.
    const gx = ios ? a.x : -a.x;
    const gy = ios ? a.y : -a.y;
    rest = rest ? { x: rest.x + (gx - rest.x) * 0.01, y: rest.y + (gy - rest.y) * 0.01 } : { x: gx, y: gy };
    const clamp = (v) => Math.max(-1, Math.min(1, v));
    // Lissage : on va doucement vers la nouvelle cible, sans tremblement.
    px += (clamp((gx - rest.x) / 3) - px) * 0.2;
    py += (clamp((rest.y - gy) / 3) - py) * 0.2;
    later();
  });
  // iPhone : l'accès aux capteurs se demande, et seulement après un geste.
  if (ios) {
    addEventListener(
      'pointerdown',
      () => DeviceMotionEvent.requestPermission().catch(() => {}),
      { once: true },
    );
  }
}
