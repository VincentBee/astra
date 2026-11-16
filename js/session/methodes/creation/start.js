import { HEARTBEAT_MS } from '../../constantes/heartbeat-ms.js';

export function start() {
  this.meet();
  if (this.timers.length) return;
  this.timers.push(
    setInterval(() => this.heartbeat(), HEARTBEAT_MS),
    setInterval(() => {
      this.tick();
      this.checkStart();
    }, 250),
  );
  this.onVisible = () => {
    if (document.visibilityState === 'hidden') return this.save();
    if (document.visibilityState !== 'visible' || !this.state) return;
    // Au réveil, les connexions ont pu tomber : on se réannonce tout de suite.
    if (this.alone || this.rdv?.state === 'failed') this.rdv?.refresh();
    this.changed();
  };
  document.addEventListener('visibilitychange', this.onVisible);
}
