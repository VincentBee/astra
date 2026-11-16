import { CLOCKS_KEY } from './clocks-key.js';

export function loadClock(gid) {
  try {
    const c = JSON.parse(localStorage.getItem(CLOCKS_KEY) || '{}')?.[gid];
    return c && Number.isFinite(c.off) ? c : null;
  } catch {
    return null;
  }
}
