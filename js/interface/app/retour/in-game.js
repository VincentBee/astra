import { playing } from '../../../back.js';
import { etat } from '../etat.js';
import { VIEW } from '../lecture/view.js';
import { $ } from '../outils/dollar.js';

export const inGame = () =>
  !VIEW && !!etat.session && playing({ status: etat.session.status, startedAt: etat.session.startedAt, over: etat.session.over, gameShown: !$('screen-game').hidden });
