import { fmt, SOIL, TEMPO } from '../../../../game.js';
import { rateText } from '../rate-text.js';
import { withCap } from '../with-cap.js';

/**
 * Gisements : ce qu'il reste dans le sol, et ce qu'on en tire. `soil` est
 * l'extraction en cours (null pour une planète libre).
 */
export function fillSoil(prefix, nature, reserve, soil) {
  const q = (sel) => document.querySelector(sel);
  for (const r of SOIL) {
    const n = nature[r];
    const left = reserve[r];
    const empty = left < 1;
    const limited = !!soil && empty && soil[r].want > n.regen + 0.5;
    q(`[data-${prefix}-tile="${r}"]`).classList.toggle('empty', empty);
    q(`[data-${prefix}-amount="${r}"]`).innerHTML = withCap(left, n.max);
    q(`[data-${prefix}-gauge="${r}"]`).style.width = `${Math.min(100, (left / n.max) * 100)}%`;
    const rate = q(`[data-${prefix}-rate="${r}"]`);
    const detail = q(`[data-${prefix}-detail="${r}"]`);
    // Solde du gisement : ce qu'il produit de lui-même, moins ce qu'on en extrait.
    if (!soil) rate.textContent = 'Intact';
    else if (limited) rate.textContent = `Épuisé : ${fmt(n.regen * TEMPO)} / min`;
    else if (left >= n.max - 0.5 && soil[r].got <= n.regen) rate.textContent = 'Plein';
    else rate.textContent = rateText((n.regen - soil[r].got) * TEMPO);
    rate.classList.toggle('neg', limited || (!!soil && soil[r].got > n.regen + 0.5));
    detail.textContent = soil ? `−${fmt(soil[r].got * TEMPO)} +${fmt(n.regen * TEMPO)} / min` : `+${fmt(n.regen * TEMPO)} / min`;
    detail.title = soil ? `Extraction ${fmt(soil[r].got * TEMPO)} / min, régénération ${fmt(n.regen * TEMPO)} / min` : `Régénération ${fmt(n.regen * TEMPO)} / min`;
    rate.title = detail.title;
  }
}
