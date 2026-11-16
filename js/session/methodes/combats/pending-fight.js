/** Un rapport de combat entre ma flotte `f` et sa flotte `target`, dans un sens ou dans l'autre, pas encore lu ? */
export function pendingFight(p, f, enemy, target) {
  const ids = (x) => [x.id, ...(x.absorbed || [])];
  const theirs = ids(target);
  const mine = ids(f);
  return (
    (p.effects || []).some((e) => e.to === enemy.id && theirs.includes(e.fleet) && !enemy.applied?.includes(e.id)) ||
    (enemy.effects || []).some((e) => e.to === p.id && mine.includes(e.fleet) && !p.applied?.includes(e.id))
  );
}
