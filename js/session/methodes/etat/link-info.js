/** Latence et type de chemin réseau vers ce joueur. */
export function linkInfo(pid) {
  const l = this.links.get(pid);
  return l ? { rtt: l.rtt ?? null, route: l.routeType ?? null } : null;
}
