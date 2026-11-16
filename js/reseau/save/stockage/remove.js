export const remove = (k) => {
  try {
    localStorage.removeItem(k);
  } catch {}
};
