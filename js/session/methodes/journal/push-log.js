export function pushLog(entry) {
  const log = this.state.log;
  if (log.some((l) => l.at === entry.at && l.text === entry.text)) return;
  const mark = typeof entry.pid === 'string' && typeof entry.fleet === 'string' ? { pid: entry.pid.slice(0, 64), fleet: entry.fleet.slice(0, 64) } : {};
  log.push({ at: entry.at, text: String(entry.text).slice(0, 120), ...mark });
  log.sort((a, b) => a.at - b.at);
  if (log.length > 40) log.splice(0, log.length - 40);
}
