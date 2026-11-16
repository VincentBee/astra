/** Générateur pseudo-aléatoire reproductible (mulberry32), graine tirée d'un texte. */
export function seeded(text) {
  let a = 2166136261;
  for (const c of String(text)) a = Math.imul(a ^ c.charCodeAt(0), 16777619);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
