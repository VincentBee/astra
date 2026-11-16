/** « vue il y a 12 min » : depuis quand je n'ai plus de nouvelles d'une planète (D-124). */
export function seenAgo(ms) {
  const min = Math.max(0, Math.round(ms / 60000));
  if (min < 1) return 'vue à l’instant';
  return `vue il y a ${min < 60 ? `${min} min` : `${Math.floor(min / 60)} h${min % 60 ? ` ${String(min % 60).padStart(2, '0')}` : ''}`}`;
}
