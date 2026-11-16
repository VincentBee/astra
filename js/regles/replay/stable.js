/**
 * Texte stable d'une valeur (clés triées), pour comparer deux fiches. Les
 * nombres sont arrondis à 10 chiffres : deux navigateurs ne calculent pas
 * les puissances et exponentielles au dernier chiffre près.
 */
export function stable(x) {
  if (typeof x === 'number') return JSON.stringify(Number.isFinite(x) ? Number(x.toPrecision(10)) : x);
  if (Array.isArray(x)) return `[${x.map(stable).join(',')}]`;
  if (x && typeof x === 'object') {
    return `{${Object.keys(x)
      .filter((k) => x[k] !== undefined)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stable(x[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(x);
}
