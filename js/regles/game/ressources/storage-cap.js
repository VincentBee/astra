/** Capacité des entrepôts : 1 000 au départ, ×1,7 par niveau d'entrepôt. */
export const storageCap = (level) => Math.round(1000 * Math.pow(1.7, level));
