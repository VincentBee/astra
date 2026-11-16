import { printed } from './printed.js';

export function printLog(log) {
  const time = (t) => new Date(t).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  for (const l of [...log].sort((a, b) => a.at - b.at)) {
    const k = `${l.at}|${l.text}`;
    if (printed.has(k)) continue;
    printed.add(k);
    console.info(`[Astra ${time(l.at)}] ${l.text}`);
  }
}
