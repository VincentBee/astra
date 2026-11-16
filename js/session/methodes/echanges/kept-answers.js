/**
 * Mes réponses à garder : tant que l'offre existe chez celui qui propose,
 * il en a besoin pour la régler (l'oublier la ferait accepter deux fois, ou
 * rendre son séquestre en plus). Une fois qu'il l'a réglée, elle peut partir.
 */
export function keptAnswers(answers) {
  const live = (a) => {
    const other = this.state.players[a.pid];
    return other?.offers?.some((o) => o.id === a.offer) || other?.dropped?.some((d) => d.id === a.offer);
  };
  return answers.filter(live).slice(-200);
}
