/** La flotte `id` d'un joueur, ou celle qui l'a absorbée en fusionnant. */
export function fleetOf(p, id) {
  const all = p?.id === this.me ? p.fleets || [] : this.fleetsOf(p); // un autre : sa flotte de départ aussi (D-163)
  return all.find((f) => f.id === id) || all.find((f) => f.absorbed?.includes(id)) || null;
}
