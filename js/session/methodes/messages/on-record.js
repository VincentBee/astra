import { MAX_PLAYERS } from '../../constantes/max-players.js';
import { normalize } from '../../fiches/normalize.js';

/** Fiche d'un joueur, reçue de proche en proche. */
export function onRecord(link, rec, log) {
  if (!rec || typeof rec.id !== 'string' || !this.state || !this.recordOk(rec.id, rec)) return;
  const ours = this.state.players[rec.id];
  // Déjà vue (plus vieille). Une fiche resynchronisée (D-166, clockFix plus grand) passe quand même ;
  // une fiche d'avant sa resynchronisation, jamais.
  const fix = (rec.clockFix || 0) - (ours?.clockFix || 0);
  if (ours && (fix < 0 || (fix === 0 && (rec.actAt || 0) <= (ours.actAt || 0)))) return;
  if (!ours && Object.keys(this.state.players).length >= MAX_PLAYERS * 2) return;
  this.beforeRec(rec.id);
  // Lien en mémoire (une IA, même téléphone) : la fiche est déjà une copie à moi, faite à l'envoi
  // (js/bot.js copyRec, D-370) ; par le réseau, elle est recopiée ici comme avant.
  const own = link?.copied ? rec : JSON.parse(JSON.stringify(rec));
  this.state.players[rec.id] = normalize({ ...own, online: this.online(rec.id) });
  this.afterRec(rec.id);
  // Une ou plusieurs entrées de journal accompagnent la fiche.
  for (const l of [].concat(log || []).slice(0, 10)) {
    if (l && typeof l.text === 'string' && Number.isFinite(l.at)) this.pushLog(l);
  }
  this.spread(rec, log, link);
  this.scheduleSave();
  // 'record' : l'écran peut regrouper ces rendus, un par image (D-370).
  this.onchange?.('state', 'record');
}
