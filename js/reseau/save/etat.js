// ----- Prévenir le joueur (D-415) : save.js ne connaît pas l'écran, app.js s'abonne.

// État partagé du module (règle 5 : un binding importé ne se réassigne pas).
// Remplace `let failed`, `let told`, qui étaient des variables du fichier d'origine.
export const etat = { failed: null, told: -Infinity };
