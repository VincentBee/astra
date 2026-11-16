import { etat } from '../../etat.js';
import { $ } from '../../outils/dollar.js';

export const closeShuttleSheet = () => {
  $('sheet-shuttle').hidden = true;
  etat.shuttleSheet = null;
};
