export function fleetChoice() {
  const ships = {};
  for (const el of document.querySelectorAll('[data-fship]')) ships[el.dataset.fship] = Math.max(0, Math.floor(Number(el.value) || 0));
  const cargo = {};
  for (const el of document.querySelectorAll('[data-fcargo]')) cargo[el.dataset.fcargo] = Math.max(0, Math.floor(Number(el.value) || 0));
  return { ships, cargo };
}
