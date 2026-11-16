/** Petit bruit déterministe : les mêmes étoiles de fond sur tous les téléphones. */
export function noise(x, y) {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}
