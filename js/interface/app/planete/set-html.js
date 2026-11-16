/** innerHTML, réécrit seulement s'il a changé (ces lignes sont rafraîchies à chaque tic). */
export function setHtml(el, html) {
  if (el.dataset.html !== html) {
    el.innerHTML = html;
    el.dataset.html = html;
  }
}
