// Mémoire pleine, selon les navigateurs (Chromium, Safari : QuotaExceededError, code 22 ; ancien Firefox).
export const isFull = (e) => e?.name === 'QuotaExceededError' || e?.name === 'NS_ERROR_DOM_QUOTA_REACHED' || e?.code === 22 || e?.code === 1014;
