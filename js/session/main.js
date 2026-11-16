// Monte la classe Session : chaque méthode (js/session/methodes/**) est posée sur le prototype
// avec les mêmes propriétés que dans une classe (non énumérable), puis les ordres sont notés
// pour le rejeu. Les modules du jeu sont chargés d'abord, dans le même ordre qu'avant.
import '../peer.js';
import '../rendezvous.js';
import '../save.js';
import '../invite.js';
import '../tablock.js';
import '../game.js';
import '../tech.js';
import '../report.js';
import '../fleet.js';
import '../trade.js';
import { Session } from './session.js';
import { ORDER_KINDS } from './constantes/order-kinds.js';
import { seenNews } from './outils/seen-news.js';
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
import { loadClock } from './methodes/horloge/load-clock.js';
import { storeClock } from './methodes/horloge/store-clock.js';
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
import { gameKey } from './methodes/connexions/game-key.js';
import { meet } from './methodes/connexions/meet.js';
import { onRoomLink } from './methodes/connexions/on-room-link.js';
import { dial } from './methodes/connexions/dial.js';
import { onSignal } from './methodes/connexions/on-signal.js';
import { openInvite } from './methodes/invitations/open-invite.js';
import { acceptAnswer } from './methodes/invitations/accept-answer.js';
import { cancelInvite } from './methodes/invitations/cancel-invite.js';
import { addPlayer } from './methodes/joueurs/add-player.js';
import { canAct } from './methodes/joueurs/can-act.js';
import { roster } from './methodes/joueurs/roster.js';
import { tooMany } from './methodes/joueurs/too-many.js';
import { scoreOf } from './methodes/joueurs/score-of.js';
import { startedAt } from './methodes/joueurs/started-at.js';
import { inRace } from './methodes/joueurs/in-race.js';
import { notReady } from './methodes/joueurs/not-ready.js';
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
import { over } from './methodes/fin/over.js';
import { ranking } from './methodes/fin/ranking.js';
import { checkOver } from './methodes/fin/check-over.js';
import { losePlanet } from './methodes/fin/lose-planet.js';
import { freeze } from './methodes/fin/freeze.js';
import { myRace } from './methodes/joueurs/my-race.js';
import { chooseRace } from './methodes/joueurs/choose-race.js';
import { beforeStart } from './methodes/joueurs/before-start.js';
import { rename } from './methodes/joueurs/rename.js';
import { leave } from './methodes/joueurs/leave.js';
import { planets } from './methodes/planetes/planets.js';
import { planetsOf } from './methodes/planetes/planets-of.js';
import { planetOf } from './methodes/planetes/planet-of.js';
import { planetRef } from './methodes/planetes/planet-ref.js';
import { goneBy } from './methodes/planetes/gone-by.js';
import { ownerAt } from './methodes/planetes/owner-at.js';
import { takenBefore } from './methodes/planetes/taken-before.js';
import { myWorld } from './methodes/planetes/my-world.js';
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
import { outdated } from './methodes/etat/outdated.js';
import { peerCount } from './methodes/etat/peer-count.js';
import { alone } from './methodes/etat/alone.js';
import { end } from './methodes/onglet/end.js';

Object.defineProperty(Session.prototype, 'adopt', { value: adopt, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'claim', { value: claim, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'lose', { value: lose, writable: true, enumerable: false, configurable: true });

// ----- création / arrivée ------------------------------------------------
Object.defineProperty(Session, 'create', { value: create, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session, 'resume', { value: resume, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'answer', { value: answer, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'onFirstLink', { value: onFirstLink, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'start', { value: start, writable: true, enumerable: false, configurable: true });

// ----- état ------------------------------------------------------------------
Object.defineProperty(Session.prototype, 'now', { value: now, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'wall', { value: wall, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'mono', { value: mono, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'clock', { value: clock, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'shiftClock', { value: shiftClock, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'loadClock', { value: loadClock, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'storeClock', { value: storeClock, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'isCreator', { value: isCreator, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'newId', { value: newId, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'online', { value: online, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'refreshOnline', { value: refreshOnline, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'linkInfo', { value: linkInfo, writable: true, enumerable: false, configurable: true });

// ----- connexions ------------------------------------------------------------
Object.defineProperty(Session.prototype, 'attach', { value: attach, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'beatMsg', { value: beatMsg, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'onClock', { value: onClock, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'clockDrift', { value: clockDrift, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'clockState', { value: clockState, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'beforeRec', { value: beforeRec, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'afterRec', { value: afterRec, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'checkClock', { value: checkClock, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'outranks', { value: outranks, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'resyncClock', { value: resyncClock, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'heartbeat', { value: heartbeat, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'retryRendezvous', { value: retryRendezvous, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'onLinkClosed', { value: onLinkClosed, writable: true, enumerable: false, configurable: true });

// ----- messages --------------------------------------------------------------
Object.defineProperty(Session.prototype, 'onMessage', { value: onMessage, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'onHello', { value: onHello, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'admit', { value: admit, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'onWelcome', { value: onWelcome, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'mergeIn', { value: mergeIn, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'recordOk', { value: recordOk, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'backdated', { value: backdated, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'onRecord', { value: onRecord, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'spread', { value: spread, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'touch', { value: touch, writable: true, enumerable: false, configurable: true });

// ----- rendez-vous automatique (reconnexion sans rescanner) ---------------
Object.defineProperty(Session.prototype, 'gameKey', { get: gameKey, set: undefined, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'meet', { value: meet, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'onRoomLink', { value: onRoomLink, writable: true, enumerable: false, configurable: true });

// ----- maillage : chacun peut présenter deux joueurs ----------------------
Object.defineProperty(Session.prototype, 'dial', { value: dial, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'onSignal', { value: onSignal, writable: true, enumerable: false, configurable: true });

// ----- invitations (tout le monde peut inviter) ---------------------------
Object.defineProperty(Session.prototype, 'openInvite', { value: openInvite, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'acceptAnswer', { value: acceptAnswer, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'cancelInvite', { value: cancelInvite, writable: true, enumerable: false, configurable: true });

// ----- jeu ---------------------------------------------------------------------
Object.defineProperty(Session.prototype, 'addPlayer', { value: addPlayer, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'canAct', { get: canAct, set: undefined, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'roster', { get: roster, set: undefined, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'tooMany', { get: tooMany, set: undefined, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'scoreOf', { value: scoreOf, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'startedAt', { get: startedAt, set: undefined, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'inRace', { value: inRace, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'notReady', { get: notReady, set: undefined, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'ready', { value: ready, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'begin', { value: begin, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'checkStart', { value: checkStart, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'enterRace', { value: enterRace, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'startFleet', { value: startFleet, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'ghostFleet', { value: ghostFleet, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'fleetsOf', { value: fleetsOf, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'fleetKillAt', { value: fleetKillAt, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'fleetDeadAt', { value: fleetDeadAt, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'startCell', { value: startCell, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'noColonizer', { value: noColonizer, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'eliminate', { value: eliminate, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'frostOf', { value: frostOf, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'fleetFrostAt', { value: fleetFrostAt, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'freezeFleets', { value: freezeFleets, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'colonizerDeadAt', { value: colonizerDeadAt, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'livePlanets', { value: livePlanets, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'deadAt', { value: deadAt, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'planetLostAt', { value: planetLostAt, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'pointsAtDeath', { value: pointsAtDeath, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'over', { get: over, set: undefined, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'ranking', { value: ranking, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'checkOver', { value: checkOver, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'losePlanet', { value: losePlanet, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'freeze', { value: freeze, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'myRace', { get: myRace, set: undefined, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'chooseRace', { value: chooseRace, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'beforeStart', { get: beforeStart, set: undefined, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'rename', { value: rename, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'leave', { value: leave, writable: true, enumerable: false, configurable: true });

// ----- planètes ---------------------------------------------------------------
Object.defineProperty(Session.prototype, 'planets', { get: planets, set: undefined, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'planetsOf', { value: planetsOf, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'planetOf', { value: planetOf, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'planetRef', { value: planetRef, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'goneBy', { value: goneBy, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'ownerAt', { value: ownerAt, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'takenBefore', { value: takenBefore, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'myWorld', { get: myWorld, set: undefined, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'claimPlanet', { value: claimPlanet, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'checkClaim', { value: checkClaim, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'evacuate', { value: evacuate, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'myPlanet', { value: myPlanet, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'build', { value: build, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'planBuild', { value: planBuild, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'queuedBehind', { value: queuedBehind, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'toPlan', { value: toPlan, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'settlePlan', { value: settlePlan, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'planResearch', { value: planResearch, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'planShips', { value: planShips, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'unplan', { value: unplan, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'demolish', { value: demolish, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'research', { value: research, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'buildShips', { value: buildShips, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'myFleet', { value: myFleet, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'assaultView', { value: assaultView, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'planetsAt', { value: planetsAt, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'ordersAt', { value: ordersAt, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'takeOff', { value: takeOff, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'moveFleet', { value: moveFleet, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'stopFleet', { value: stopFleet, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'setFleetStance', { value: setFleetStance, writable: true, enumerable: false, configurable: true });

// ----- détection ---------------------------------------------------------
Object.defineProperty(Session.prototype, 'eyes', { value: eyes, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'sees', { value: sees, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'showsLog', { value: showsLog, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'seesCell', { value: seesCell, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'myPlanetAt', { value: myPlanetAt, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'knownOwner', { value: knownOwner, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'scout', { value: scout, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'threats', { value: threats, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'fleetOf', { value: fleetOf, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'chaseFleet', { value: chaseFleet, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'pursue', { value: pursue, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'engage', { value: engage, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'pendingFight', { value: pendingFight, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'fight', { value: fight, writable: true, enumerable: false, configurable: true });

// ----- échanges entre joueurs ---------------------------------------------
Object.defineProperty(Session.prototype, 'locked', { value: locked, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'tradeSide', { value: tradeSide, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'tradePartners', { value: tradePartners, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'tradeHoldings', { value: tradeHoldings, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'proposeTrade', { value: proposeTrade, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'incomingOffers', { value: incomingOffers, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'answerTrade', { value: answerTrade, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'settleOffers', { value: settleOffers, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'settleDropped', { value: settleDropped, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'keptAnswers', { value: keptAnswers, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'refuseExpired', { value: refuseExpired, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'noticeOffers', { value: noticeOffers, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'refuelFleet', { value: refuelFleet, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'fleetsBeside', { value: fleetsBeside, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'pairOf', { value: pairOf, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'transferFleet', { value: transferFleet, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'mergeFleets', { value: mergeFleets, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'joinFleet', { value: joinFleet, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'splitFleet', { value: splitFleet, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'returnFleet', { value: returnFleet, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'refuse', { value: refuse, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'power', { value: power, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'tick', { value: tick, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'arrive', { value: arrive, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'found', { value: found, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'capture', { value: capture, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'defenseAt', { value: defenseAt, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'applyEffects', { value: applyEffects, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'dockedPlanet', { value: dockedPlanet, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'missedEffect', { value: missedEffect, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'fleetHit', { value: fleetHit, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'note', { value: note, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'markRead', { value: markRead, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'addLog', { value: addLog, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'pushLog', { value: pushLog, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'snapshot', { value: snapshot, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'changed', { value: changed, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'scheduleSave', { value: scheduleSave, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'save', { value: save, writable: true, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'outdated', { get: outdated, set: undefined, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'peerCount', { get: peerCount, set: undefined, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'alone', { get: alone, set: undefined, enumerable: false, configurable: true });
Object.defineProperty(Session.prototype, 'end', { value: end, writable: true, enumerable: false, configurable: true });

/**
 * Ce qui change ma fiche, noté pour le rejeu : mes ordres, et les passages
 * (`tick`) qui ont fait avancer quelque chose (voir touch). Le reste de la partie vient des fiches des
 * autres, qui ont chacune leur journal.
 */
for (const k of [...ORDER_KINDS, 'tick']) {
  const act = Session.prototype[k];
  Session.prototype[k] = function (...a) {
    if (this.entry || !this.state) return act.apply(this, a); // un ordre dans un ordre : déjà noté
    while (a.length && a[a.length - 1] === undefined) a.pop();
    this.entry = { t: this.now(), k, ...(a.length ? { a: JSON.parse(JSON.stringify(a)) } : {}), ...seenNews(this.state, this.me) };
    this.entryKept = false;
    try {
      return act.apply(this, a);
    } finally {
      // Un ordre refusé a pu faire avancer l'heure d'une planète (calculs
      // arrondis autrement) : on le garde aussi, et ma fiche change d'heure
      // pour que les autres l'adoptent (à heure égale, chacun garde la sienne).
      const p = this.state.players[this.me];
      if (!this.entryKept && k !== 'tick' && p) {
        this.touch();
        this.scheduleSave();
      }
      this.entry = null;
    }
  };
}
