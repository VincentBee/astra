import { aggressive } from '../../../../../fleet.js';
import { etat } from '../../../etat.js';
import { $ } from '../../../outils/dollar.js';
import { toast } from '../../../outils/toast.js';
import { renderFleetInfo } from '../render-fleet-info.js';

$('btn-fi-stance').onclick = () => {
  const f = etat.session.myFleet(etat.selFleet);
  if (f && etat.session.setFleetStance(etat.selFleet, aggressive(f) ? 'passive' : 'aggressive')) {
    toast(`Flotte ${aggressive(f) ? 'agressive : elle combattra toute flotte ennemie qu’elle croise' : 'passive : elle ne combattra que sur ordre'}.`);
    renderFleetInfo();
  }
};
