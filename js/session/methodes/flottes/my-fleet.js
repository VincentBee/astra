/** Une de mes flottes, par son identifiant. */
export function myFleet(id) {
  return (this.state.players[this.me]?.fleets || []).find((f) => f.id === id) || null;
}
