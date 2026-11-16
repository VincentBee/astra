import { loadClock } from './horloge/load-clock.js';
import { storeClock } from './horloge/store-clock.js';
import { adopt } from './methodes/onglet/adopt.js';
import { claim } from './methodes/onglet/claim.js';
import { lose } from './methodes/onglet/lose.js';
import { create } from './methodes/creation/create.js';
import { resume } from './methodes/creation/resume.js';
import { answer } from './methodes/creation/answer.js';
import { onFirstLink } from './methodes/creation/on-first-link.js';
import { start } from './methodes/creation/start.js';
import { now } from './methodes/horloge/now.js';
import { wall } from './methodes/horloge/wall.js';
import { mono } from './methodes/horloge/mono.js';
import { clock } from './methodes/horloge/clock.js';
import { shiftClock } from './methodes/horloge/shift-clock.js';
import { isCreator } from './methodes/etat/is-creator.js';
import { newId } from './methodes/etat/new-id.js';
import { online } from './methodes/etat/online.js';
import { refreshOnline } from './methodes/etat/refresh-online.js';
import { linkInfo } from './methodes/etat/link-info.js';
import { attach } from './methodes/connexions/attach.js';
import { beatMsg } from './methodes/connexions/beat-msg.js';
import { onClock } from './methodes/horloge/on-clock.js';
import { clockDrift } from './methodes/horloge/clock-drift.js';
import { clockState } from './methodes/horloge/clock-state.js';
import { beforeRec } from './methodes/horloge/before-rec.js';
import { afterRec } from './methodes/horloge/after-rec.js';
import { checkClock } from './methodes/horloge/check-clock.js';
import { outranks } from './methodes/horloge/outranks.js';
import { resyncClock } from './methodes/horloge/resync-clock.js';
import { heartbeat } from './methodes/connexions/heartbeat.js';
import { retryRendezvous } from './methodes/connexions/retry-rendezvous.js';
import { onLinkClosed } from './methodes/connexions/on-link-closed.js';
import { onMessage } from './methodes/messages/on-message.js';
import { onHello } from './methodes/messages/on-hello.js';
import { admit } from './methodes/messages/admit.js';
import { onWelcome } from './methodes/messages/on-welcome.js';
import { mergeIn } from './methodes/messages/merge-in.js';
import { recordOk } from './methodes/messages/record-ok.js';
import { backdated } from './methodes/messages/backdated.js';
import { onRecord } from './methodes/messages/on-record.js';
import { spread } from './methodes/messages/spread.js';
import { touch } from './methodes/messages/touch.js';
import { getGameKey } from './methodes/connexions/get-game-key.js';
import { meet } from './methodes/connexions/meet.js';
import { onRoomLink } from './methodes/connexions/on-room-link.js';
import { dial } from './methodes/connexions/dial.js';
import { onSignal } from './methodes/connexions/on-signal.js';
import { openInvite } from './methodes/invitations/open-invite.js';
import { acceptAnswer } from './methodes/invitations/accept-answer.js';
import { cancelInvite } from './methodes/invitations/cancel-invite.js';
import { addPlayer } from './methodes/joueurs/add-player.js';
import { getCanAct } from './methodes/joueurs/get-can-act.js';
import { getRoster } from './methodes/joueurs/get-roster.js';
import { getTooMany } from './methodes/joueurs/get-too-many.js';
import { scoreOf } from './methodes/joueurs/score-of.js';
import { getStartedAt } from './methodes/joueurs/get-started-at.js';
import { inRace } from './methodes/joueurs/in-race.js';
import { getNotReady } from './methodes/joueurs/get-not-ready.js';
import { ready } from './methodes/joueurs/ready.js';
import { begin } from './methodes/joueurs/begin.js';
import { checkStart } from './methodes/joueurs/check-start.js';
import { enterRace } from './methodes/joueurs/enter-race.js';
import { startFleet } from './methodes/flottes/start-fleet.js';
import { ghostFleet } from './methodes/flottes/ghost-fleet.js';
import { fleetsOf } from './methodes/flottes/fleets-of.js';
import { fleetKillAt } from './methodes/fin/fleet-kill-at.js';
import { fleetDeadAt } from './methodes/fin/fleet-dead-at.js';
import { startCell } from './methodes/flottes/start-cell.js';
import { noColonizer } from './methodes/fin/no-colonizer.js';
import { eliminate } from './methodes/fin/eliminate.js';
import { frostOf } from './methodes/fin/frost-of.js';
import { fleetFrostAt } from './methodes/fin/fleet-frost-at.js';
import { freezeFleets } from './methodes/fin/freeze-fleets.js';
import { colonizerDeadAt } from './methodes/fin/colonizer-dead-at.js';
import { livePlanets } from './methodes/fin/live-planets.js';
import { deadAt } from './methodes/fin/dead-at.js';
import { planetLostAt } from './methodes/fin/planet-lost-at.js';
import { pointsAtDeath } from './methodes/fin/points-at-death.js';
import { getOver } from './methodes/fin/get-over.js';
import { ranking } from './methodes/fin/ranking.js';
import { checkOver } from './methodes/fin/check-over.js';
import { losePlanet } from './methodes/fin/lose-planet.js';
import { freeze } from './methodes/fin/freeze.js';
import { getMyRace } from './methodes/joueurs/get-my-race.js';
import { chooseRace } from './methodes/joueurs/choose-race.js';
import { getBeforeStart } from './methodes/joueurs/get-before-start.js';
import { rename } from './methodes/joueurs/rename.js';
import { leave } from './methodes/joueurs/leave.js';
import { getPlanets } from './methodes/planetes/get-planets.js';
import { planetsOf } from './methodes/planetes/planets-of.js';
import { planetOf } from './methodes/planetes/planet-of.js';
import { planetRef } from './methodes/planetes/planet-ref.js';
import { goneBy } from './methodes/planetes/gone-by.js';
import { ownerAt } from './methodes/planetes/owner-at.js';
import { takenBefore } from './methodes/planetes/taken-before.js';
import { getMyWorld } from './methodes/planetes/get-my-world.js';
import { claimPlanet } from './methodes/planetes/claim-planet.js';
import { checkClaim } from './methodes/planetes/check-claim.js';
import { evacuate } from './methodes/planetes/evacuate.js';
import { myPlanet } from './methodes/planetes/my-planet.js';
import { build } from './methodes/chantiers/build.js';
import { planBuild } from './methodes/chantiers/plan-build.js';
import { queuedBehind } from './methodes/chantiers/queued-behind.js';
import { toPlan } from './methodes/chantiers/to-plan.js';
import { settlePlan } from './methodes/chantiers/settle-plan.js';
import { planResearch } from './methodes/chantiers/plan-research.js';
import { planShips } from './methodes/chantiers/plan-ships.js';
import { unplan } from './methodes/chantiers/unplan.js';
import { demolish } from './methodes/chantiers/demolish.js';
import { research } from './methodes/chantiers/research.js';
import { buildShips } from './methodes/chantiers/build-ships.js';
import { myFleet } from './methodes/flottes/my-fleet.js';
import { assaultView } from './methodes/flottes/assault-view.js';
import { planetsAt } from './methodes/flottes/planets-at.js';
import { ordersAt } from './methodes/flottes/orders-at.js';
import { takeOff } from './methodes/flottes/take-off.js';
import { moveFleet } from './methodes/flottes/move-fleet.js';
import { stopFleet } from './methodes/flottes/stop-fleet.js';
import { setFleetStance } from './methodes/flottes/set-fleet-stance.js';
import { eyes } from './methodes/detection/eyes.js';
import { sees } from './methodes/detection/sees.js';
import { showsLog } from './methodes/detection/shows-log.js';
import { seesCell } from './methodes/detection/sees-cell.js';
import { myPlanetAt } from './methodes/planetes/my-planet-at.js';
import { knownOwner } from './methodes/detection/known-owner.js';
import { scout } from './methodes/detection/scout.js';
import { threats } from './methodes/detection/threats.js';
import { fleetOf } from './methodes/flottes/fleet-of.js';
import { chaseFleet } from './methodes/flottes/chase-fleet.js';
import { pursue } from './methodes/combats/pursue.js';
import { engage } from './methodes/combats/engage.js';
import { pendingFight } from './methodes/combats/pending-fight.js';
import { fight } from './methodes/combats/fight.js';
import { locked } from './methodes/echanges/locked.js';
import { tradeSide } from './methodes/echanges/trade-side.js';
import { tradePartners } from './methodes/echanges/trade-partners.js';
import { tradeHoldings } from './methodes/echanges/trade-holdings.js';
import { proposeTrade } from './methodes/echanges/propose-trade.js';
import { incomingOffers } from './methodes/echanges/incoming-offers.js';
import { answerTrade } from './methodes/echanges/answer-trade.js';
import { settleOffers } from './methodes/echanges/settle-offers.js';
import { settleDropped } from './methodes/echanges/settle-dropped.js';
import { keptAnswers } from './methodes/echanges/kept-answers.js';
import { refuseExpired } from './methodes/echanges/refuse-expired.js';
import { noticeOffers } from './methodes/echanges/notice-offers.js';
import { refuelFleet } from './methodes/flottes/refuel-fleet.js';
import { fleetsBeside } from './methodes/flottes/fleets-beside.js';
import { pairOf } from './methodes/flottes/pair-of.js';
import { transferFleet } from './methodes/flottes/transfer-fleet.js';
import { mergeFleets } from './methodes/flottes/merge-fleets.js';
import { joinFleet } from './methodes/flottes/join-fleet.js';
import { splitFleet } from './methodes/flottes/split-fleet.js';
import { returnFleet } from './methodes/flottes/return-fleet.js';
import { refuse } from './methodes/journal/refuse.js';
import { power } from './methodes/chantiers/power.js';
import { tick } from './methodes/passage/tick.js';
import { arrive } from './methodes/passage/arrive.js';
import { found } from './methodes/passage/found.js';
import { capture } from './methodes/passage/capture.js';
import { defenseAt } from './methodes/combats/defense-at.js';
import { applyEffects } from './methodes/combats/apply-effects.js';
import { dockedPlanet } from './methodes/combats/docked-planet.js';
import { missedEffect } from './methodes/combats/missed-effect.js';
import { fleetHit } from './methodes/combats/fleet-hit.js';
import { note } from './methodes/journal/note.js';
import { markRead } from './methodes/journal/mark-read.js';
import { addLog } from './methodes/journal/add-log.js';
import { pushLog } from './methodes/journal/push-log.js';
import { snapshot } from './methodes/sauvegarde/snapshot.js';
import { changed } from './methodes/sauvegarde/changed.js';
import { scheduleSave } from './methodes/sauvegarde/schedule-save.js';
import { save } from './methodes/sauvegarde/save.js';
import { getOutdated } from './methodes/etat/get-outdated.js';
import { getPeerCount } from './methodes/etat/get-peer-count.js';
import { getAlone } from './methodes/etat/get-alone.js';
import { end } from './methodes/onglet/end.js';
import { settleLog } from './methodes/chantiers/settle-log.js';
import { setAutoShips } from './methodes/chantiers/set-auto-ships.js';

export class Session {
  constructor(name) {
    this.name = name;
    this.me = null;
    this.state = null; // { gid, key, players: {}, log: [] }
    this.links = new Map(); // pid -> Link
    // Heure commune (D-165) : clockOff = heure commune − heure du téléphone au moment de l'ancrage ;
    // clockSynced : j'ai l'heure commune (créateur de la partie, ou reprise d'un joueur qui l'a) ;
    // clockEpoch : change à chaque correction, pour que les autres recommencent leurs mesures.
    this.clockOff = 0;
    this.clockSynced = false;
    this.clockEpoch = 0;
    this.clockRef = {}; // pid -> écart de référence de son horloge sur la mienne (joueur sans heure commune)
    this.clockVotes = {}; // pid -> { drift, rec } : ce joueur me dit que mon heure a changé (D-166)
    this.clockTrust = {}; // pid -> sa dernière fiche reçue quand son heure était juste (D-166)
    this.clockPending = {}; // pid -> fiche reçue avant que son heure soit mesurée
    this.status = 'idle'; // idle | answering | waiting | playing | failed | refused
    this.invite = null;
    this.dialing = new Map(); // pid -> offre en cours vers ce joueur
    this.onchange = null;
    this.ontoast = null;
    this.timers = [];
    this.onlost = null; // la partie a été ouverte dans un autre onglet (D-430)
    this.lost = false;
    this.hold = null; // verrou de la partie dans cet onglet (js/tablock.js)
    this.ended = false;
  }

  /** Reprend l'heure commune gardée pour cette partie (sinon : le créateur l'a, les autres la reprendront). */
  loadClock() {
    const c = loadClock(this.state.gid);
    if (c) Object.assign(this, { clockOff: c.off, clockSynced: !!c.synced });
    else this.clockSynced = this.isCreator(this.me);
  }

  /** Garde l'heure commune : l'écart avec l'heure du téléphone maintenant (juste même si elle a sauté page ouverte). */
  storeClock() {
    if (this.state?.gid && !this.isBot) storeClock(this.state.gid, { off: this.clock() - this.wall(), synced: this.clockSynced, at: this.wall() });
  }
}

Object.defineProperties(Session.prototype, {
  adopt: { value: adopt, writable: true, configurable: true },
  claim: { value: claim, writable: true, configurable: true },
  lose: { value: lose, writable: true, configurable: true },
  answer: { value: answer, writable: true, configurable: true },
  onFirstLink: { value: onFirstLink, writable: true, configurable: true },
  start: { value: start, writable: true, configurable: true },
  now: { value: now, writable: true, configurable: true },
  wall: { value: wall, writable: true, configurable: true },
  mono: { value: mono, writable: true, configurable: true },
  clock: { value: clock, writable: true, configurable: true },
  shiftClock: { value: shiftClock, writable: true, configurable: true },
  isCreator: { value: isCreator, writable: true, configurable: true },
  newId: { value: newId, writable: true, configurable: true },
  online: { value: online, writable: true, configurable: true },
  refreshOnline: { value: refreshOnline, writable: true, configurable: true },
  linkInfo: { value: linkInfo, writable: true, configurable: true },
  attach: { value: attach, writable: true, configurable: true },
  beatMsg: { value: beatMsg, writable: true, configurable: true },
  onClock: { value: onClock, writable: true, configurable: true },
  clockDrift: { value: clockDrift, writable: true, configurable: true },
  clockState: { value: clockState, writable: true, configurable: true },
  beforeRec: { value: beforeRec, writable: true, configurable: true },
  afterRec: { value: afterRec, writable: true, configurable: true },
  checkClock: { value: checkClock, writable: true, configurable: true },
  outranks: { value: outranks, writable: true, configurable: true },
  resyncClock: { value: resyncClock, writable: true, configurable: true },
  heartbeat: { value: heartbeat, writable: true, configurable: true },
  retryRendezvous: { value: retryRendezvous, writable: true, configurable: true },
  onLinkClosed: { value: onLinkClosed, writable: true, configurable: true },
  onMessage: { value: onMessage, writable: true, configurable: true },
  onHello: { value: onHello, writable: true, configurable: true },
  admit: { value: admit, writable: true, configurable: true },
  onWelcome: { value: onWelcome, writable: true, configurable: true },
  mergeIn: { value: mergeIn, writable: true, configurable: true },
  recordOk: { value: recordOk, writable: true, configurable: true },
  backdated: { value: backdated, writable: true, configurable: true },
  onRecord: { value: onRecord, writable: true, configurable: true },
  spread: { value: spread, writable: true, configurable: true },
  touch: { value: touch, writable: true, configurable: true },
  gameKey: { get: getGameKey, configurable: true },
  meet: { value: meet, writable: true, configurable: true },
  onRoomLink: { value: onRoomLink, writable: true, configurable: true },
  dial: { value: dial, writable: true, configurable: true },
  onSignal: { value: onSignal, writable: true, configurable: true },
  openInvite: { value: openInvite, writable: true, configurable: true },
  acceptAnswer: { value: acceptAnswer, writable: true, configurable: true },
  cancelInvite: { value: cancelInvite, writable: true, configurable: true },
  addPlayer: { value: addPlayer, writable: true, configurable: true },
  canAct: { get: getCanAct, configurable: true },
  roster: { get: getRoster, configurable: true },
  tooMany: { get: getTooMany, configurable: true },
  scoreOf: { value: scoreOf, writable: true, configurable: true },
  startedAt: { get: getStartedAt, configurable: true },
  inRace: { value: inRace, writable: true, configurable: true },
  notReady: { get: getNotReady, configurable: true },
  ready: { value: ready, writable: true, configurable: true },
  begin: { value: begin, writable: true, configurable: true },
  checkStart: { value: checkStart, writable: true, configurable: true },
  enterRace: { value: enterRace, writable: true, configurable: true },
  startFleet: { value: startFleet, writable: true, configurable: true },
  ghostFleet: { value: ghostFleet, writable: true, configurable: true },
  fleetsOf: { value: fleetsOf, writable: true, configurable: true },
  fleetKillAt: { value: fleetKillAt, writable: true, configurable: true },
  fleetDeadAt: { value: fleetDeadAt, writable: true, configurable: true },
  startCell: { value: startCell, writable: true, configurable: true },
  noColonizer: { value: noColonizer, writable: true, configurable: true },
  eliminate: { value: eliminate, writable: true, configurable: true },
  frostOf: { value: frostOf, writable: true, configurable: true },
  fleetFrostAt: { value: fleetFrostAt, writable: true, configurable: true },
  freezeFleets: { value: freezeFleets, writable: true, configurable: true },
  colonizerDeadAt: { value: colonizerDeadAt, writable: true, configurable: true },
  livePlanets: { value: livePlanets, writable: true, configurable: true },
  deadAt: { value: deadAt, writable: true, configurable: true },
  planetLostAt: { value: planetLostAt, writable: true, configurable: true },
  pointsAtDeath: { value: pointsAtDeath, writable: true, configurable: true },
  over: { get: getOver, configurable: true },
  ranking: { value: ranking, writable: true, configurable: true },
  checkOver: { value: checkOver, writable: true, configurable: true },
  losePlanet: { value: losePlanet, writable: true, configurable: true },
  freeze: { value: freeze, writable: true, configurable: true },
  myRace: { get: getMyRace, configurable: true },
  chooseRace: { value: chooseRace, writable: true, configurable: true },
  beforeStart: { get: getBeforeStart, configurable: true },
  rename: { value: rename, writable: true, configurable: true },
  leave: { value: leave, writable: true, configurable: true },
  planets: { get: getPlanets, configurable: true },
  planetsOf: { value: planetsOf, writable: true, configurable: true },
  planetOf: { value: planetOf, writable: true, configurable: true },
  planetRef: { value: planetRef, writable: true, configurable: true },
  goneBy: { value: goneBy, writable: true, configurable: true },
  ownerAt: { value: ownerAt, writable: true, configurable: true },
  takenBefore: { value: takenBefore, writable: true, configurable: true },
  myWorld: { get: getMyWorld, configurable: true },
  claimPlanet: { value: claimPlanet, writable: true, configurable: true },
  checkClaim: { value: checkClaim, writable: true, configurable: true },
  evacuate: { value: evacuate, writable: true, configurable: true },
  myPlanet: { value: myPlanet, writable: true, configurable: true },
  build: { value: build, writable: true, configurable: true },
  planBuild: { value: planBuild, writable: true, configurable: true },
  queuedBehind: { value: queuedBehind, writable: true, configurable: true },
  toPlan: { value: toPlan, writable: true, configurable: true },
  settlePlan: { value: settlePlan, writable: true, configurable: true },
  settleLog: { value: settleLog, writable: true, configurable: true },
  planResearch: { value: planResearch, writable: true, configurable: true },
  planShips: { value: planShips, writable: true, configurable: true },
  setAutoShips: { value: setAutoShips, writable: true, configurable: true },
  unplan: { value: unplan, writable: true, configurable: true },
  demolish: { value: demolish, writable: true, configurable: true },
  research: { value: research, writable: true, configurable: true },
  buildShips: { value: buildShips, writable: true, configurable: true },
  myFleet: { value: myFleet, writable: true, configurable: true },
  assaultView: { value: assaultView, writable: true, configurable: true },
  planetsAt: { value: planetsAt, writable: true, configurable: true },
  ordersAt: { value: ordersAt, writable: true, configurable: true },
  takeOff: { value: takeOff, writable: true, configurable: true },
  moveFleet: { value: moveFleet, writable: true, configurable: true },
  stopFleet: { value: stopFleet, writable: true, configurable: true },
  setFleetStance: { value: setFleetStance, writable: true, configurable: true },
  eyes: { value: eyes, writable: true, configurable: true },
  sees: { value: sees, writable: true, configurable: true },
  showsLog: { value: showsLog, writable: true, configurable: true },
  seesCell: { value: seesCell, writable: true, configurable: true },
  myPlanetAt: { value: myPlanetAt, writable: true, configurable: true },
  knownOwner: { value: knownOwner, writable: true, configurable: true },
  scout: { value: scout, writable: true, configurable: true },
  threats: { value: threats, writable: true, configurable: true },
  fleetOf: { value: fleetOf, writable: true, configurable: true },
  chaseFleet: { value: chaseFleet, writable: true, configurable: true },
  pursue: { value: pursue, writable: true, configurable: true },
  engage: { value: engage, writable: true, configurable: true },
  pendingFight: { value: pendingFight, writable: true, configurable: true },
  fight: { value: fight, writable: true, configurable: true },
  locked: { value: locked, writable: true, configurable: true },
  tradeSide: { value: tradeSide, writable: true, configurable: true },
  tradePartners: { value: tradePartners, writable: true, configurable: true },
  tradeHoldings: { value: tradeHoldings, writable: true, configurable: true },
  proposeTrade: { value: proposeTrade, writable: true, configurable: true },
  incomingOffers: { value: incomingOffers, writable: true, configurable: true },
  answerTrade: { value: answerTrade, writable: true, configurable: true },
  settleOffers: { value: settleOffers, writable: true, configurable: true },
  settleDropped: { value: settleDropped, writable: true, configurable: true },
  keptAnswers: { value: keptAnswers, writable: true, configurable: true },
  refuseExpired: { value: refuseExpired, writable: true, configurable: true },
  noticeOffers: { value: noticeOffers, writable: true, configurable: true },
  refuelFleet: { value: refuelFleet, writable: true, configurable: true },
  fleetsBeside: { value: fleetsBeside, writable: true, configurable: true },
  pairOf: { value: pairOf, writable: true, configurable: true },
  transferFleet: { value: transferFleet, writable: true, configurable: true },
  mergeFleets: { value: mergeFleets, writable: true, configurable: true },
  joinFleet: { value: joinFleet, writable: true, configurable: true },
  splitFleet: { value: splitFleet, writable: true, configurable: true },
  returnFleet: { value: returnFleet, writable: true, configurable: true },
  refuse: { value: refuse, writable: true, configurable: true },
  power: { value: power, writable: true, configurable: true },
  tick: { value: tick, writable: true, configurable: true },
  arrive: { value: arrive, writable: true, configurable: true },
  found: { value: found, writable: true, configurable: true },
  capture: { value: capture, writable: true, configurable: true },
  defenseAt: { value: defenseAt, writable: true, configurable: true },
  applyEffects: { value: applyEffects, writable: true, configurable: true },
  dockedPlanet: { value: dockedPlanet, writable: true, configurable: true },
  missedEffect: { value: missedEffect, writable: true, configurable: true },
  fleetHit: { value: fleetHit, writable: true, configurable: true },
  note: { value: note, writable: true, configurable: true },
  markRead: { value: markRead, writable: true, configurable: true },
  addLog: { value: addLog, writable: true, configurable: true },
  pushLog: { value: pushLog, writable: true, configurable: true },
  snapshot: { value: snapshot, writable: true, configurable: true },
  changed: { value: changed, writable: true, configurable: true },
  scheduleSave: { value: scheduleSave, writable: true, configurable: true },
  save: { value: save, writable: true, configurable: true },
  outdated: { get: getOutdated, configurable: true },
  peerCount: { get: getPeerCount, configurable: true },
  alone: { get: getAlone, configurable: true },
  end: { value: end, writable: true, configurable: true },
});
Object.defineProperties(Session, {
  create: { value: create, writable: true, configurable: true },
  resume: { value: resume, writable: true, configurable: true },
});
