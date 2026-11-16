/** File (`queue`, `research` ou `yard`) qu'un élément du fil occupera. */
export function planLane(item) {
  if (typeof item === 'string') return 'queue';
  return item?.tech ? 'research' : 'yard';
}
