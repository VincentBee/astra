import { editableBot } from '../../../bot.js';
import { raceIcon } from '../../../game.js';
import { ic } from '../../../icons.js';
import { mapVeiled } from '../carte/map-veiled.js';
import { etat } from '../etat.js';
import { $ } from '../outils/dollar.js';
import { esc } from '../outils/esc.js';
import { setHtml } from '../planete/set-html.js';
import { myColonizer } from './my-colonizer.js';

/**
 * Bandeau du départ (D-120) : se dire prêt, voir qui l'est parmi les joueurs présents, puis,
 * la partie partie, envoyer son colonisateur fonder sa planète mère.
 */
export function renderLobby(me) {
  $('map-wrap').hidden = mapVeiled(); // avant le départ, pas de carte du tout (D-241)
  // Joueurs : seulement une fois la partie partie ; avant, le lobby liste les joueurs et invite (D-310).
  $('net').hidden = mapVeiled();
  if (mapVeiled()) $('sheet-players').hidden = true;
  const show = !!me?.race && !me.home && !me.out;
  // Lobby (D-242) : sans carte, le bandeau prend toute la hauteur, boutons en bas.
  $('screen-game').classList.toggle('lobby', show && mapVeiled());
  $('pick').hidden = !show;
  if (!show) return;
  const start = etat.session.startedAt;
  const ready = Number.isFinite(me.ready);
  const colonizer = myColonizer(me);
  let text;
  let btn = null; // 'ready' | 'unready'
  let who = '';
  if (colonizer) {
    text = `${ic('fleet')} <strong>Envoie ton colonisateur</strong> <span class="hint">· touche une planète libre (pas un petit corps) : il y fondera ta planète mère. Le premier arrivé l’emporte.</span>`;
  } else if (start != null && Number.isFinite(me.since)) {
    text = `${ic('planet')} <strong>Ton colonisateur arrive…</strong>`;
  } else if (start != null) {
    text = `${ic('play')} <strong>La partie a commencé</strong> <span class="hint">· dis-toi prêt : tu entres tout de suite, avec un seul colonisateur</span>`;
    btn = 'ready';
  } else {
    const waiting = etat.session.notReady.filter((p) => p.id !== etat.session.me);
    const extra = etat.session.roster.length - 8;
    const n = extra > 1 ? `${extra} IA` : 'une IA';
    // Trop de joueurs (D-480) : seul le téléphone qui fait jouer une IA peut la retirer (D-399).
    const mine = etat.session.roster.some((p) => editableBot(etat.session, p.id));
    text = etat.session.tooMany
      ? `${ic('alert')} <strong>${etat.session.roster.length} joueurs : 8 au plus</strong> <span class="hint">· ${mine ? `il faut retirer ${n} : touche une de tes IA ci-dessous pour la retirer` : `attends qu’un joueur retire ${n}`}, la partie ne part pas avant</span>`
      : ready
      ? `${ic('check')} <strong>Prêt</strong> <span class="hint">· ${waiting.length ? `on attend ${waiting.map((p) => esc(p.name)).join(', ')}` : 'départ…'}</span>`
      : `${ic('play')} <strong>Prépare-toi</strong> <span class="hint">· la partie part quand tous les joueurs présents sont prêts ; chacun commence avec un seul colonisateur</span>`;
    btn = ready ? 'unready' : 'ready';
    who = etat.session.roster
      .sort((a, b) => a.rank - b.rank)
      .map((p) => {
        const here = p.id === etat.session.me || p.online;
        const state = !here ? 'absent' : Number.isFinite(p.ready) ? 'prêt' : !p.race ? 'choisit sa race' : 'pas prêt';
        const cls = `pw${!here ? ' off' : Number.isFinite(p.ready) ? ' ok' : ''}`;
        const inner = `${p.race ? raceIcon(p.race) : ''}${esc(p.name)} <span class="hint">${state}</span>`;
        // Une IA que ce téléphone fait jouer se touche pour la modifier ou la retirer (D-399, D-400).
        if (editableBot(etat.session, p.id)) return `<button type="button" class="${cls} edit" data-bot="${esc(p.id)}" aria-label="Modifier ${esc(p.name)}">${inner}<span class="pen">✎</span></button>`;
        return `<span class="${cls}">${inner}</span>`;
      })
      .join('');
  }
  setHtml($('pick-text'), text);
  $('pick-who').hidden = !who;
  setHtml($('pick-who'), who);
  const b = $('btn-ready');
  b.hidden = !btn;
  b.dataset.on = btn === 'ready' ? '1' : '';
  b.className = btn === 'unready' ? 'secondary small' : 'primary small';
  setHtml(b, btn === 'unready' ? `${ic('stop')}Plus prêt` : `${ic('check')}Je suis prêt`);
  $('btn-pick-fleet').hidden = !colonizer;
  $('btn-pick-fleet').dataset.fleet = colonizer?.id || '';
  $('btn-pick-invite').hidden = start != null;
  $('btn-pick-bot').hidden = start != null || etat.session.roster.length >= 8;
  // Partie partie (ou IA disparue) : la fiche de l'IA se ferme.
  if (!$('sheet-bot').hidden && !editableBot(etat.session, etat.botSheet)) $('sheet-bot').hidden = true;
}
