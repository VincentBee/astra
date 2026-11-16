/** `mark` : { pid, fleet } pour un ordre de flotte, que les autres ne lisent que s'ils voient la flotte (D-210). */
export function addLog(text, mark = null) {
  const entry = { at: this.now(), text, ...(mark ? { pid: mark.pid, fleet: mark.fleet } : {}) };
  this.pushLog(entry);
  this.tickLogs?.push(entry);
  return entry;
}
