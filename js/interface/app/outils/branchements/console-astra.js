import { etat } from '../../etat.js';

// Accès depuis la console du navigateur, pour déboguer : astra.session
window.astra = { get session() { return etat.session; } };
