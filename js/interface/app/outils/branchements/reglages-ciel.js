import { setSkyMode } from '../../../../galaxy.js';
import { $ } from '../dollar.js';

$('sky').onchange = () => setSkyMode($('sky').value);
