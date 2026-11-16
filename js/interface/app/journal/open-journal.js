import { etat } from '../etat.js';
import { $ } from '../outils/dollar.js';
import { esc } from '../outils/esc.js';
import { reportDetail } from './report-detail.js';
import { reportHtml } from './report-html.js';
import { when } from './when.js';

/** Ouvre le journal ; `away` : seulement ce qui est arrivé pendant mon absence. */
export function openJournal(away = null) {
  const j = etat.session.journal || { n: 0, read: 0, list: [] };
  const read = j.read;
  const me = etat.session.state.players[etat.session.me];
  const fights = j.list.filter((e) => !away || e.n > away.n).sort((a, b) => b.at - a.at || b.n - a.n);
  $('journal-title').textContent = away ? 'Pendant ton absence' : 'Journal';
  $('journal-away').hidden = !away;
  if (away) $('journal-away').textContent = `Absent ${away.text}.`;
  $('journal-fights').innerHTML = fights.length
    ? fights
        .map((e) => {
          const detail = reportDetail(e);
          return `<li class="${esc(e.tone || '')}${e.n > read ? ' new' : ''}"><span class="j-time mono">${when(e.at)}</span><strong>${esc(e.text)}</strong>${detail ? `<div class="j-detail mono">${esc(detail)}</div>` : ''}${reportHtml(e)}</li>`;
        })
        .join('')
    : '<li class="j-empty">Aucun combat pour l’instant.</li>';
  const events = (etat.session.state.log || [])
    .filter((l) => me && l.text.includes(me.name) && etat.session.showsLog(l) && (!away || l.at >= away.since))
    .sort((a, b) => b.at - a.at)
    .slice(0, 20);
  $('journal-events').innerHTML = events.length
    ? events.map((l) => `<li><span class="j-time mono">${when(l.at)}</span>${esc(l.text)}</li>`).join('')
    : '<li class="j-empty">Rien de neuf.</li>';
  $('btn-journal-all').hidden = !away;
  $('sheet-journal').hidden = false;
  etat.session.markRead();
}
