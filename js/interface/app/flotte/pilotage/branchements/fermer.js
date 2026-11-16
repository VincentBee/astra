import { selectFleet } from '../../../carte/selection/select-fleet.js';
import { $ } from '../../../outils/dollar.js';

$('btn-fi-close').onclick = () => selectFleet(null);
