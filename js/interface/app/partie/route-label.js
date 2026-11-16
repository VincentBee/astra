export function routeLabel(route) {
  return { host: 'réseau local', srflx: 'direct', prflx: 'direct', relay: 'relais', bot: 'IA sur ce téléphone' }[route] || '';
}
