/** Avant d'adopter une fiche de `pid` : ce que je savais de lui, si je n'en ai rien gardé (D-166). */
export function beforeRec(pid) {
  if (!Object.hasOwn(this.clockTrust, pid) && this.state.players[pid]) this.clockTrust[pid] = this.state.players[pid];
}
