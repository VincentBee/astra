// Historique des parties de ce téléphone : en reprendre une, la revoir, l'oublier.
export function whenText(at) {
  const when = new Date(at);
  const time = when.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  if (when.toDateString() === new Date().toDateString()) return time;
  return `${when.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} ${time}`;
}
