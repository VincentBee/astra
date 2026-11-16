// Objet simple { clé: valeur } : ni null, ni tableau, ni texte (stockage abîmé, D-170).
export const isMap = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
