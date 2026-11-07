// Mesure du coût des joueurs IA sur le téléphone de l'hôte (issue #39, D-370). Ce n'est pas un
// test (`node --test` ne le lance pas) : un script reproductible, qui joue sans réseau ni
// minuteurs une partie hôte + N IA sur une horloge de test, avec un hasard fixé par la graine.
//
//   node tests/perf-ia.mjs [ia=7] [minutes=25] [graine=1]
//
// Affiche, par tranche de minutes de jeu : le temps processeur par seconde de jeu (passages,
// réflexion des IA, livraison des messages), les octets écrits en JSON pendant la livraison,
// la pire seconde ; puis une empreinte de la partie (fiches et journaux de tous les joueurs,
// fin de partie, rejeu) : même graine, même empreinte, sur n'importe quelle version du code.
// `--json` : une seule ligne JSON (pour tests/bot.test.mjs).
import { createHash } from 'node:crypto';
// Temps processeur (ms) : ne compte pas une mise en veille de la machine pendant la mesure.
const cpu = () => {
  const u = process.cpuUsage();
  return (u.user + u.system) / 1000;
};

export async function measure({ bots: N = 7, minutes = 25, seed = 1, quiet = true } = {}) {
  // Hasard fixé : identifiants, noms, race choisie… tirés de la graine.
  let a = seed >>> 0;
  const rnd = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const random = Math.random;
  const getRandomValues = crypto.getRandomValues;
  Math.random = rnd;
  crypto.getRandomValues = (arr) => {
    for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(rnd() * 256);
    return arr;
  };
  // Ce que Session lit dans le navigateur.
  const store = new Map();
  globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
  globalThis.document ||= { addEventListener() {}, removeEventListener() {}, visibilityState: 'visible' };
  globalThis.window ||= globalThis;

  const { Session } = await import('../js/session.js');
  const { addBot, think } = await import('../js/bot.js');
  const { replay } = await import('../js/replay.js');
  const game = await import('../js/game.js');
  const frost = { ...game.FROST };
  game.FROST.delayMs = 12 * 60_000; // le froid du jeu (un fichier de test a pu le couper)

  // JSON écrit pendant la livraison des messages (liens en mémoire et copies à la réception).
  const stringify = JSON.stringify;
  let delivering = false;
  let bytes = 0;
  JSON.stringify = function (...args) {
    const out = stringify.apply(this, args);
    if (delivering && typeof out === 'string') bytes += out.length;
    return out;
  };

  const clock = { t: 10_000_000 };
  const h = new Session('Hôte');
  Object.assign(h, { now: () => h.entry?.t ?? clock.t, start() {}, meet() {}, me: 'p0', status: 'playing', save() {}, scheduleSave() {} });
  h.state = { gid: 'gperf', key: 'k', players: {}, log: [] };
  h.addPlayer(h.me, h.name, 'x'.repeat(64));
  h.chooseRace('human');
  const races = ['machine', 'alien', 'human'];
  const list = [];
  for (let i = 0; i < N; i++) list.push(addBot(h, { race: races[i % 3], timers: false, clock: () => clock.t }));
  const flush = () => new Promise((r) => setImmediate(r));
  const deliver = async () => {
    delivering = true;
    const t0 = cpu();
    await flush();
    await flush();
    delivering = false;
    return cpu() - t0;
  };
  await deliver();
  h.ready();
  h.checkStart();
  await deliver();

  const rows = [];
  let row = null;
  const end = minutes * 60_000;
  for (let ms = 250; ms <= end; ms += 250) {
    clock.t += 250;
    const t0 = cpu();
    h.tick();
    h.checkStart();
    const t1 = cpu();
    let bt = 0;
    let th = 0;
    if (ms % 1000 === 0) {
      for (const b of list) {
        const u = cpu();
        b.tick();
        b.checkStart();
        const v = cpu();
        if (ms % 3000 === 0) think(b);
        bt += v - u;
        th += cpu() - v;
      }
    }
    const b0 = bytes;
    const msg = await deliver();
    const sec = Math.ceil(ms / 1000) - 1;
    const minute = Math.floor(sec / 60);
    if (!row || row.minute !== minute) rows.push((row = { minute, hostTick: 0, botTick: 0, think: 0, msgs: 0, bytes: 0, worstSec: 0, cur: 0, curSec: -1 }));
    if (row.curSec !== sec) {
      row.worstSec = Math.max(row.worstSec, row.cur);
      row.cur = 0;
      row.curSec = sec;
    }
    const total = t1 - t0 + bt + th + msg;
    row.hostTick += t1 - t0;
    row.botTick += bt;
    row.think += th;
    row.msgs += msg;
    row.bytes += bytes - b0;
    row.cur += total;
  }
  const r1 = (x) => Math.round(x * 10) / 10;
  const out = rows.map((r) => ({
    minute: r.minute,
    msParS: r1((r.hostTick + r.botTick + r.think + r.msgs) / 60),
    hostTick: r1(r.hostTick / 60),
    botTick: r1(r.botTick / 60),
    think: r1(r.think / 60),
    msgs: r1(r.msgs / 60),
    koParS: r1(r.bytes / 60 / 1024),
    pireSecMs: r1(Math.max(r.worstSec, r.cur)),
  }));

  // Empreinte de la partie : fiches (journaux compris) de tous les joueurs, chez l'hôte et chez
  // chaque IA, fin de partie, classement, et rejeu depuis la sauvegarde de l'hôte.
  JSON.stringify = stringify;
  const fiches = (s) => Object.fromEntries(Object.entries(s.state.players).sort(([x], [y]) => (x < y ? -1 : 1)).map(([pid, p]) => {
    const { online, ...rest } = p;
    return [pid, rest];
  }));
  const hash = (x) => createHash('sha256').update(JSON.stringify(x)).digest('hex').slice(0, 16);
  const snap = h.snapshot();
  let rejeu;
  try {
    const frames = replay(snap);
    rejeu = hash(frames.at?.(-1) ?? frames);
  } catch (e) {
    rejeu = `erreur: ${e.message}`;
  }
  const result = {
    ia: N,
    minutes,
    seed,
    fin: h.over ?? null,
    classement: h.ranking().map((p) => p.id ?? p),
    ordres: Object.fromEntries(Object.values(h.state.players).map((p) => [p.name, p.orders.length])),
    hote: hash(fiches(h)),
    ias: list.map((b) => hash(fiches(b))),
    rejeu,
  };
  Object.assign(game.FROST, frost);
  Math.random = random;
  crypto.getRandomValues = getRandomValues;
  for (const b of list) b.end();
  return { rows: out, result, host: h };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2).filter((x) => !x.startsWith('--'));
  const [N = 7, minutes = 25, seed = 1] = args.map(Number);
  const { rows, result } = await measure({ bots: N, minutes, seed });
  if (process.argv.includes('--json')) console.log(JSON.stringify({ rows, result }));
  else {
    console.log(`Hôte + ${N} IA, ${minutes} min de jeu, graine ${seed} (ms de calcul par seconde de jeu ; Ko/s de JSON pendant la livraison)`);
    const by = (from, to) => rows.filter((r) => r.minute >= from && r.minute < to);
    const avg = (rs, k) => Math.round((rs.reduce((t, r) => t + r[k], 0) / Math.max(1, rs.length)) * 10) / 10;
    for (const [from, to] of [[0, 5], [5, 10], [10, 15], [15, 20], [20, 25], [25, 30]]) {
      const rs = by(from, to);
      if (!rs.length) continue;
      console.log(`min ${String(from).padStart(2)}-${String(to).padEnd(2)} : ${avg(rs, 'msParS')} ms/s (passages hôte ${avg(rs, 'hostTick')}, IA ${avg(rs, 'botTick')}, réflexion ${avg(rs, 'think')}, messages ${avg(rs, 'msgs')}), ${avg(rs, 'koParS')} Ko/s, pire seconde ${Math.max(...rs.map((r) => r.pireSecMs))} ms`);
    }
    console.log('Empreinte :', JSON.stringify(result));
  }
}
