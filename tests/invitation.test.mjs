// Issue #43 (D-260) : revenir dans une partie par une invitation, après avoir ouvert une autre
// partie. Le lien d'invitation dit de quelle partie il vient (`?g=<gid>` avant le "#") :
// l'invité n'envoie à l'hôte que son identité de cette partie-là, jamais le secret d'une autre.
//
// Deux téléphones dans Node : l'hôte (une vraie Session, partie « gtest ») et l'invité (une
// vraie Session, avec son propre localStorage). Ils se parlent par deux faux liens reliés :
// on lit tout ce que l'invité envoie à l'hôte.
import assert from 'node:assert/strict';
import { newGame, Session } from './harness.mjs';
import { scenarios } from './scenario.mjs';

globalThis.location ||= { origin: 'https://astra.test', pathname: '/astra/', href: 'https://astra.test/astra/', search: '', hash: '' };
const save = await import('../js/save.js');
const { inviteLink, inviteGid } = await import('../js/invite.js');
const scenario = scenarios(import.meta.url);

const SECRET_A = 'secret-de-ma-fiche-dans-A';
const SECRET_B = 'secret-de-ma-fiche-dans-B';

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** localStorage du téléphone de l'invité, le temps de `fn`. */
async function withStore(fn) {
  const old = globalThis.localStorage;
  const m = new Map();
  globalThis.localStorage = { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
  try {
    return await fn(m);
  } finally {
    globalThis.localStorage = old;
  }
}

/** Deux faux liens reliés : ce que l'un envoie arrive à l'autre (copie JSON, comme sur le fil). */
function linkPair() {
  const queue = [];
  const end = () => ({
    closed: false,
    sent: [],
    onmessage: null,
    onclose: null,
    send(m) {
      this.sent.push(JSON.parse(JSON.stringify(m)));
      const to = this === guestSide ? hostSide : guestSide;
      queue.push(() => to.onmessage?.(JSON.parse(JSON.stringify(m))));
    },
    close() {
      this.closed = true;
    },
  });
  const guestSide = end();
  const hostSide = end();
  // Les messages se traitent en asynchrone (sha256, parfois lent quand la machine est chargée) :
  // on fait passer les messages jusqu'à ce que `done()` soit vrai, 5 s au plus.
  const flush = async (done) => {
    const until = Date.now() + 5000;
    while (!done() && Date.now() < until) {
      await new Promise((r) => setTimeout(r, 2));
      while (queue.length) queue.shift()();
    }
    while (queue.length) queue.shift()();
  };
  return { guestSide, hostSide, flush };
}

/**
 * La partie A (« gtest ») chez l'hôte J0, où l'invité est J1 (p1, secret SECRET_A). Le téléphone de
 * l'invité a déjà sa sauvegarde et son identité de A. `then(store)` joue ce qu'il fait ensuite.
 */
async function setup() {
  const { players: [host, me], clock } = newGame(2);
  host.state.players.p1.secretHash = await sha256(SECRET_A);
  me.state.players.p1.secretHash = host.state.players.p1.secretHash;
  host.save = () => {}; // l'hôte a son propre téléphone : il n'écrit pas dans celui de l'invité
  return { host, me, clock };
}

/** Une autre partie B sur le téléphone de l'invité (solo, gid « gB »). */
function playB(clock) {
  const b = new Session('Moi');
  Object.assign(b, { now: () => clock.t, start() {}, meet() {}, me: 'q0', status: 'playing' });
  b.state = { gid: 'gB', key: 'kB', players: {}, log: [] };
  b.addPlayer('q0', 'Moi', 'y'.repeat(64));
  save.saveIdentity({ gid: 'gB', pid: 'q0', secret: SECRET_B });
  b.save();
}

/** L'invité ouvre l'invitation `link` et rejoint : renvoie ce qu'il a envoyé et ce qui en est sorti. */
async function join(host, clock, link) {
  const before = Object.keys(host.state.players).length;
  const guest = new Session('J1');
  Object.assign(guest, { now: () => clock.t, start() {}, meet() {} });
  guest.inviteGid = inviteGid(link); // ce que fait session.answer(link), sans WebRTC
  const { guestSide, hostSide, flush } = linkPair();
  host.attach(hostSide, null);
  await guest.onFirstLink(guestSide);
  await flush(() => guest.status !== 'waiting');
  clearInterval(guest.helloTimer);
  const welcome = hostSide.sent.find((m) => m.type === 'welcome');
  const hello = guestSide.sent.find((m) => m.type === 'hello');
  return {
    guest,
    hello,
    sentText: JSON.stringify(guestSide.sent),
    you: welcome?.you,
    before,
    after: Object.keys(host.state.players).length,
    ids: JSON.parse(localStorage.getItem('astra.identities') || '{}'),
    current: JSON.parse(localStorage.getItem('astra.identity') || 'null'),
  };
}

/** Les vérifications communes : je reprends p1, personne de nouveau, B reste chez moi. */
function backAsMe(film, r, label) {
  film.look(r.guest, label, [
    { show: 'je rentre dans A comme', expected: 'p1', got: r.you },
    { show: 'joueurs dans A', expected: `${r.before} → ${r.before}`, got: `${r.before} → ${r.after}` },
    { show: 'hello.gid', expected: 'gtest', got: r.hello?.gid },
    { show: 'le secret de B part chez l’hôte de A', expected: false, got: r.sentText.includes(SECRET_B) },
    { show: 'ma copie envoyée', expected: 'gtest', got: r.hello?.copy?.gid ?? 'aucune' },
    { show: 'identité gardée pour A', expected: 'p1, même secret', got: r.ids.gtest?.secret === SECRET_A ? `${r.ids.gtest.pid}, même secret` : r.ids.gtest?.pid },
  ]);
  assert.equal(r.you, 'p1', 'je reprends ma fiche de A');
  assert.equal(r.after, r.before, 'aucun nouveau joueur');
  assert.equal(r.hello.gid, 'gtest');
  assert.equal(r.sentText.includes(SECRET_B), false, "le secret de B n'est jamais envoyé à l'hôte de A");
  assert.equal(r.sentText.includes('"gid":"gB"'), false, 'rien de la partie B (ni identité ni copie)');
  assert.equal(r.ids.gtest.pid, 'p1');
  assert.equal(r.ids.gtest.secret, SECRET_A, 'identities[A] garde mon secret de A');
  assert.deepEqual(r.current, { gid: 'gtest', pid: 'p1', secret: SECRET_A });
  if (r.ids.gB) assert.equal(r.ids.gB.secret, SECRET_B, 'mon identité de B est toujours là');
}

scenario('#43 : le lien d’invitation dit sa partie, et un ancien téléphone l’ignore', (film) => {
  const { players: [host] } = newGame(1);
  const link = inviteLink('o2.AbC_-9', 'gtest');
  film.look(host, 'le lien que l’hôte de A partage', [
    { show: 'lien', expected: 'https://astra.test/astra/?g=gtest#o2.AbC_-9', got: link },
    { show: 'partie lue dans le lien', expected: 'gtest', got: inviteGid(link) },
    { show: 'code seul (ancien format)', expected: null, got: inviteGid('o2.AbC_-9') },
    { show: 'ancien lien', expected: null, got: inviteGid('https://astra.test/astra/#o2.AbC_-9') },
  ]);
  assert.equal(link, 'https://astra.test/astra/?g=gtest#o2.AbC_-9');
  assert.equal(inviteGid(link), 'gtest');
  assert.equal(inviteGid('?g=gtest#o2.AbC_-9'), 'gtest', 'ce que boot() donne à startJoin');
  assert.equal(inviteGid('o2.AbC_-9'), null);
  assert.equal(inviteGid('https://astra.test/astra/#o2.AbC_-9'), null);
  assert.equal(inviteGid('https://astra.test/?g=__proto__x%22#o2.a'), null, 'gid bizarre : ignoré');
  // Un ancien téléphone ne lit que ce qui suit le "#" : le code n'a pas changé.
  assert.equal(link.slice(link.indexOf('#') + 1), 'o2.AbC_-9');
});

scenario('#43 : témoin — je joue A, puis je reviens par une invitation de A', async (film) => {
  const { host, me, clock } = await setup();
  await withStore(async () => {
    me.save();
    save.saveIdentity({ gid: 'gtest', pid: 'p1', secret: SECRET_A });
    const r = await join(host, clock, inviteLink('o2.x', 'gtest'));
    backAsMe(film, r, 'retour dans A par l’invitation, rien entre-temps');
  });
});

scenario('#43 : je joue A, puis une partie B, puis je reviens dans A par une invitation', async (film) => {
  const { host, me, clock } = await setup();
  await withStore(async () => {
    me.save();
    save.saveIdentity({ gid: 'gtest', pid: 'p1', secret: SECRET_A });
    playB(clock); // B devient la dernière partie ouverte
    assert.equal(save.loadIdentity().gid, 'gB', 'avant : astra.identity est celle de B');
    const r = await join(host, clock, inviteLink('o2.x', 'gtest'));
    backAsMe(film, r, 'après une partie B : retour dans A, même fiche');
  });
});

scenario('#43 : je joue A, je « Revois » B, puis je reviens dans A par une invitation', async (film) => {
  const { host, me, clock } = await setup();
  await withStore(async () => {
    playB(clock);
    me.save();
    save.saveIdentity({ gid: 'gtest', pid: 'p1', secret: SECRET_A });
    save.selectGame('gB'); // « Revoir » B : B redevient la partie en cours
    assert.equal(save.loadIdentity().gid, 'gB');
    const r = await join(host, clock, inviteLink('o2.x', 'gtest'));
    backAsMe(film, r, 'après avoir revu B : retour dans A, même fiche');
  });
});

scenario('#43 : un nouveau venu (aucune fiche dans A) n’envoie aucun secret', async (film) => {
  const { host, clock } = await setup();
  await withStore(async () => {
    playB(clock); // il n'a joué que B
    const r = await join(host, clock, inviteLink('o2.x', 'gtest'));
    film.look(r.guest, 'nouveau dans A : il entre comme un nouveau joueur', [
      { show: 'entre comme', expected: 'un nouveau pid', got: r.you, ok: !!r.you && r.you !== 'p1' },
      { show: 'joueurs', expected: `${r.before} → ${r.before + 1}`, got: `${r.before} → ${r.after}` },
      { show: 'secret envoyé', expected: 'aucun', got: r.hello.secret ?? 'aucun' },
    ]);
    assert.ok(r.you && r.you !== 'p1');
    assert.equal(r.after, r.before + 1);
    assert.equal(r.hello.secret, undefined);
    assert.equal(r.hello.copy, undefined, 'pas de copie de B');
    assert.equal(r.sentText.includes(SECRET_B), false);
    assert.equal(r.ids.gB.secret, SECRET_B, 'son identité de B est gardée');
  });
});

scenario('#43 : ancien lien (sans partie), A ouverte en dernier : comme avant, je reprends ma fiche', async (film) => {
  const { host, me, clock } = await setup();
  await withStore(async () => {
    me.save();
    save.saveIdentity({ gid: 'gtest', pid: 'p1', secret: SECRET_A });
    const r = await join(host, clock, 'https://astra.test/astra/#o2.x'); // lien d'un ancien téléphone
    backAsMe(film, r, 'ancien lien, partie A ouverte en dernier : même fiche');
  });
});
