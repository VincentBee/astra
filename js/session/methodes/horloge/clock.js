/**
 * Heure commune (D-165) : heure du téléphone + clockOff, prise une fois (ancrage), puis avancée
 * par l'horloge interne. Changer l'heure du téléphone page ouverte ne change donc rien.
 */
export function clock() {
  const m = this.mono();
  if (!this.clockAnchor) this.clockAnchor = { wall: this.wall(), mono: m };
  return Math.round(this.clockAnchor.wall + (m - this.clockAnchor.mono) + this.clockOff);
}
