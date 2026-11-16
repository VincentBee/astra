export const between = (random, [lo, hi], step = 1) => Math.round((lo + random() * (hi - lo)) / step) * step;
