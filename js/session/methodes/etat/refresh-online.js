export function refreshOnline() {
  for (const p of Object.values(this.state?.players || {})) p.online = this.online(p.id);
}
