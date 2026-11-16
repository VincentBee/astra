export const cellOf = (it, at) => (it?.type === 'planet' ? { x: it.w.x, y: it.w.y } : { x: Math.round(it ? it.x : at.x), y: Math.round(it ? it.y : at.y) });
