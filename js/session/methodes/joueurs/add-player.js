import { COLORS } from '../../constantes/colors.js';

export function addPlayer(pid, name, secretHash) {
  const st = this.state;
  const others = Object.values(st.players);
  const used = new Set(others.map((p) => p.color));
  const now = this.now();
  st.players[pid] = {
    id: pid,
    name,
    rank: now, // ordre d'arrivée
    color: COLORS.find((c) => !used.has(c)) || COLORS[others.length % COLORS.length],
    secretHash,
    // À l'arrivée, on choisit sa race (une fois pour toutes), puis on se dit prêt (D-120).
    race: null,
    planet: null,
    home: null,
    online: true,
    actAt: now, // dernière modification de la fiche (sert à garder la plus récente)
  };
}
