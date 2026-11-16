// Toucher le nom d'une carte déplie ou replie sa description.
document.addEventListener('click', (e) => {
  const name = e.target.closest('.b-name');
  if (!name) return;
  const open = name.closest('.building').classList.toggle('open');
  name.setAttribute('aria-expanded', String(open));
});
