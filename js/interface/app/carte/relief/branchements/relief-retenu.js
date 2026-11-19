import { loadRelief } from '../load-relief.js';
import { RELIEF_KEY } from '../relief-key.js';
import { relief } from '../relief.js';

// « Carte en 3D » cochée la dernière fois sur ce téléphone (D-563) : on télécharge le module dès
// l'ouverture. Sinon rien n'est téléchargé : la carte reste la carte 2D d'origine.
try {
  relief.on = localStorage.getItem(RELIEF_KEY) === '1';
} catch {}
if (relief.on) loadRelief();
