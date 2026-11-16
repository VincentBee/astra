export function snapshot() {
  const st = JSON.parse(JSON.stringify({ ...this.state, log: this.state.log.slice(-20) }));
  for (const p of Object.values(st.players)) delete p.online;
  return st;
}
