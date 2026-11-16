export function planetOf(p, key) {
  return this.planetsOf(p).find((x) => x.key === key) || null;
}
