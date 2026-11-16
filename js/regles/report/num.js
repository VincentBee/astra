export const num = (v, max = 1e9) => (Number.isFinite(v) ? Math.max(0, Math.min(max, v)) : 0);
