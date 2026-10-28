// Parties jouées dans Node, sans réseau ni minuteurs : plusieurs Session sur
// une horloge commune, qui s'échangent leurs fiches à la demande (sync).

// Session tourne dans le navigateur : on remplace ce qu'elle y lit.
const store = new Map();
globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
globalThis.document = { addEventListener() {}, removeEventListener() {}, visibilityState: 'visible' };
globalThis.window = globalThis;

export const { Session } = await import('../js/session.js');
export const game = await import('../js/game.js');
export const fleet = await import('../js/fleet.js');

const RACES = ['human', 'machine', 'alien'];

/**
 * `n` joueurs (pid p0, p1…), chacun sur sa planète mère et au courant des
 * autres. Renvoie { players, clock, sync(a, b) } : sync(a, b) donne à `a`
 * la fiche que `b` publie en ce moment.
 */
export function newGame(n = 2, races = []) {
  const clock = { t: 10_000_000 };
  const players = [];
  for (let i = 0; i < n; i++) {
    const s = new Session(`J${i}`);
    Object.assign(s, { now: () => clock.t, start() {}, meet() {}, me: `p${i}`, status: 'playing' });
    s.state = { gid: 'gtest', key: 'k', players: {}, log: [] };
    s.addPlayer(s.me, s.name, 'x'.repeat(64));
    s.chooseRace(races[i] || RACES[i % 3]);
    s.claimPlanet(s.planets[i].id);
    players.push(s);
  }
  const sync = (a, b) => a.mergeIn(b.snapshot(), { pid: b.me });
  for (const a of players) for (const b of players) if (a !== b) sync(a, b);
  return { players, clock, sync };
}

/** Copie profonde (une planète « avant » à comparer avec « après »). */
export const clone = (x) => JSON.parse(JSON.stringify(x));
