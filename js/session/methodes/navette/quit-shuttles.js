/**
 * Après un autre ordre réussi (D-552) : chaque navette de `was` que l'ordre a remplacée (ou
 * dont la flotte a disparu, fondue dans une autre) s'arrête, avec sa ligne au journal. Renvoie
 * les entrées du journal à envoyer avec ma fiche (avec `log`, celle de l'ordre), ou null.
 */
export function quitShuttles(p, was, log = null, why = 'nouvel ordre') {
  const out = [].concat(log || []);
  for (const w of was) if (this.myFleet(w.id)?.order !== w.order) out.push(this.endShuttle(p, w, why));
  return out.length ? out : null;
}
