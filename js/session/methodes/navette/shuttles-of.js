export function shuttlesOf(fleets) {
  return fleets.filter((f) => f?.order?.kind === 'shuttle').map((f) => ({ id: f.id, order: f.order }));
}
