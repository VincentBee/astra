/** `table[key]` si c'est une vraie entrée de la table (pas `constructor`, `__proto__`…), sinon null. */
export const own = (table, key) => (table && Object.hasOwn(table, key) ? table[key] : null);
