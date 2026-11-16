export function offerHolds(id) {
  return (this.state.players[this.me]?.offers || []).some((o) => o.from.fleet === id);
}
