export function onLinkClosed(link) {
  if (link === this.firstLink && !link.pid) {
    // Coupé avant d'être accepté.
    this.status = 'failed';
    this.failure = 'La connexion avec ton hôte a été perdue.';
    return this.changed();
  }
  if (link.pid && this.links.get(link.pid) === link) {
    this.links.delete(link.pid);
    this.refreshOnline();
  }
  this.changed();
}
