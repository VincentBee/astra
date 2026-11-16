export * from './reseau/rendezvous/index.js';
// Provisoire (façade) : un import avec `?t=…` doit repartir d'un état neuf, comme avant le découpage.
import { etat } from './reseau/rendezvous/etat.js';
Object.assign(etat, { lib: null, failures: 0 });
