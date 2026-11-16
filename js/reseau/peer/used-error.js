export function usedError() {
  const e = new Error('Cette invitation a déjà servi.');
  e.used = true;
  return e;
}
