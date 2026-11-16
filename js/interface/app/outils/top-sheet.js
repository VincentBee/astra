export const topSheet = () => [...document.querySelectorAll('.sheet')].findLast((s) => !s.hidden);
