/** Sauvegarde (au plus deux fois par seconde) de ma copie de la partie. */
export function scheduleSave() {
  if (!this.state || !this.me || this.status !== 'playing' || this.saveTimer || this.lost) return;
  this.saveTimer = setTimeout(() => {
    this.saveTimer = null;
    this.save();
  }, 500);
}
