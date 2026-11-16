// Façade temporaire (split) : la page charge le point d'entrée du module. La requête (?x) du
// test D-048, qui rejoue la page pour chaque race, est transmise à main.js pour qu'il rejoue aussi.
await import(`./interface/techtree/main.js${new URL(import.meta.url).search}`);
