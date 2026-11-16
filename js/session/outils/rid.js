export function rid(n = 8) {
  const a = new Uint8Array(n);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => 'abcdefghijkmnpqrstuvwxyz23456789'[b % 32]).join('');
}
