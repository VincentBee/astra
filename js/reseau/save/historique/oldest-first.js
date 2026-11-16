/** Les gid de l'index, la plus ancienne d'abord. */
export const oldestFirst = (idx) => Object.keys(idx).sort((a, b) => idx[a] - idx[b]);
