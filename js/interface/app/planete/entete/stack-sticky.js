import { BAR, STICKY, TABS } from './entete-dom.js';

export function stackSticky() {
  const top = BAR.offsetHeight;
  for (const el of STICKY) el.style.top = `calc(${top}px + env(safe-area-inset-top, 0px))`;
  TABS.style.top = `calc(${top + STICKY[STICKY.length - 1].offsetHeight}px + env(safe-area-inset-top, 0px))`;
  const edge = BAR.getBoundingClientRect().bottom + 1;
  // Un bloc arrivé en haut cache tous ceux d'avant (sinon les plus grands dépasseraient dessous).
  const stuck = STICKY.filter((el) => el.offsetHeight && el.getBoundingClientRect().top <= edge);
  const last = stuck[stuck.length - 1];
  for (const el of STICKY) el.classList.toggle('sticky-covered', stuck.includes(el) && el !== last);
}
