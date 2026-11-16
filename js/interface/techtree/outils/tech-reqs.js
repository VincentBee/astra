/** Prérequis technologiques d'une technologie (sans le labo). */
export const techReqs = (t) => Object.entries(t.req).filter(([k]) => k !== 'lab');
