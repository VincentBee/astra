/** Envoie une fiche à tous mes voisins (sauf celui d'où elle vient). */
export function spread(rec, log, except) {
  if (!rec) return;
  const { online, ...data } = rec;
  const msg = { type: 'rec', rec: data, ...(log ? { log } : {}) };
  for (const l of this.links.values()) if (l !== except) l.send(msg);
}
