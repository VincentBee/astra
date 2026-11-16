/** Instant où le pouvoir redevient disponible (0 = prêt). */
export const powerReadyAt = (planet, key) => planet.powers?.[key] || 0;
