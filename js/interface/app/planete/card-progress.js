/** Chantier, recherche ou vaisseaux en cours : la barre de progression s'affiche sur la carte concernée. */
export function cardProgress(card, job, now) {
  const bar = card.querySelector('.card-bar');
  bar.hidden = !job;
  if (!job) return;
  const left = Math.max(0, job.end - now);
  bar.firstElementChild.style.width = `${Math.min(100, (1 - left / Math.max(1, job.end - job.start)) * 100)}%`;
}
