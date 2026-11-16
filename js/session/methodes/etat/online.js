/** Joueurs joignables depuis ce téléphone. */
export function online(pid) {
  return pid === this.me || this.links.has(pid);
}
