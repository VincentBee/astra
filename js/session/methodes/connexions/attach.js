export function attach(link, pid) {
  const prev = pid && this.links.get(pid);
  if (prev && !prev.closed && prev.viaRoom && !link.viaRoom) {
    // Déjà reliés par le rendez-vous : cette connexion-ci est en trop.
    link.onclose = null;
    return link.close();
  }
  link.pid = pid;
  link.lastSeen = performance.now();
  link.onmessage = (msg) => {
    link.lastSeen = performance.now();
    this.onMessage(link, msg);
  };
  link.onclose = () => this.onLinkClosed(link);
  if (pid) {
    this.links.set(pid, link);
    if (prev && prev !== link) prev.close();
    this.refreshOnline();
    // Premier battement tout de suite : l'écart d'horloge est connu sans attendre 1,5 s (D-165).
    link.send(this.beatMsg('hb', performance.now()));
  }
}
