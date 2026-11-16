export const readTrade = (key) => Object.fromEntries([...document.querySelectorAll(`[data-${key}]`)].map((el) => [el.dataset[key], Math.max(0, Math.floor(Number(el.value) || 0))]));
