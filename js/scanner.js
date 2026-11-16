export * from './reseau/scanner/index.js';
// Provisoire (façade) : un import avec `?t=…` doit repartir d'un état neuf, comme avant le découpage.
import { etat } from './reseau/scanner/etat.js';
Object.assign(etat, { jsQRLoading: null });
