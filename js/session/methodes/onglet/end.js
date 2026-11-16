export function end() {
  clearTimeout(this.saveTimer);
  this.saveTimer = null;
  this.save();
  this.ended = true;
  this.hold?.release(); // un autre onglet peut reprendre la partie (D-430)
  this.hold = null;
  // Les IA que ce téléphone fait jouer (D-151) s'arrêtent avec lui ; elles reprendront avec la partie.
  for (const bot of this.bots?.values() || []) bot.end();
  this.bots?.clear();
  if (this.onVisible) document.removeEventListener('visibilitychange', this.onVisible);
  this.timers.forEach(clearInterval);
  this.timers = [];
  clearInterval(this.helloTimer);
  this.cancelInvite();
  this.pendingAnswer?.cancel();
  for (const o of this.dialing.values()) o.cancel();
  for (const link of [...this.links.values()]) {
    link.onclose = null;
    link.close();
  }
  this.links.clear();
  this.rdv?.leave();
  this.rdv = null;
}
