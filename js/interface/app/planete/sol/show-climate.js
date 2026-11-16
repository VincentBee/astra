import { setHtml } from '../set-html.js';
import { climateHtml } from './climate-html.js';

/** Ligne du climat dans `el` (cachée pour une planète d'avant le climat). */
export function showClimate(el, climate) {
  el.hidden = !climate;
  if (climate) setHtml(el, climateHtml(climate));
}
