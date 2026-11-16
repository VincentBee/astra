import { setSkyMode } from '../../../galaxy/index.js';
import { $ } from '../dollar.js';

$('sky').onchange = () => setSkyMode($('sky').value);
