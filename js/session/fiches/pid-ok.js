/** Identifiant de joueur acceptable (pas de clé spéciale comme __proto__). */
export const pidOk = (pid) => typeof pid === 'string' && /^[A-Za-z0-9-]{1,24}$/.test(pid);
