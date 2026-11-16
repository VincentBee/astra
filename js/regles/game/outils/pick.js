/** Nombre entier de `lo` à `hi`, chacun aussi souvent (between arrondit : les bornes sortent deux fois moins). */
export const pick = (random, [lo, hi]) => lo + Math.min(hi - lo, Math.floor(random() * (hi - lo + 1)));
