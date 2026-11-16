/** Mon colonisateur de départ, tant que je n'ai pas de planète (D-120), ou null. */
export function myColonizer(me) {
  if (!me?.race || me.home || me.out) return null;
  return (me.fleets || []).find((f) => f.ships?.colony > 0) || null;
}
