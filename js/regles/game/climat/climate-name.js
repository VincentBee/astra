/** Nom du climat selon la chaleur. */
export function climateName(heat) {
  if (heat >= 0.8) return 'Brûlant';
  if (heat >= 0.6) return 'Chaud';
  if (heat >= 0.4) return 'Tempéré';
  if (heat >= 0.2) return 'Froid';
  return 'Glacé';
}
