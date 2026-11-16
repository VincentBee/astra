import { explainBattle, sideTable } from '../../../report.js';
import { de } from '../carte/de.js';
import { esc } from '../outils/esc.js';

/**
 * Rapport détaillé d'un combat (D-122) : pourquoi en une phrase, visible tout de suite ; puis,
 * à déplier, ce qui a pesé, les forces des deux camps et le déroulé passe par passe.
 */
export function reportHtml(e) {
  if (e.kind !== 'combat' || !e.rep || (e.side !== 'a' && e.side !== 'd')) return '';
  let x;
  try {
    x = explainBattle(e.rep, e.side, { noLoot: e.noLoot, cooldown: e.cooldown });
  } catch {
    return '';
  }
  const n = (v) => Math.round(v).toLocaleString('fr-FR');
  const table = (who, title) => {
    const t = sideTable(e.rep, who);
    const rows = t.rows
      .map((r) => `<tr><td>${esc(r.name)}</td><td>${r.key === 'fort' ? '' : n(r.count)}</td><td>${n(r.attack)}</td><td>${n(r.hull)}</td><td>${r.key === 'fort' ? (r.lost ? 'abattue' : 'tient') : r.lost ? n(r.lost) : '–'}</td></tr>`)
      .join('');
    return `<table class="j-forces mono"><caption>${esc(title)} · feu ${n(t.fire)} · coque ${n(t.hull)}</caption>
      <thead><tr><th>Vaisseau</th><th>Nb</th><th>⚔</th><th>◇</th><th>Perdus</th></tr></thead><tbody>${rows || '<tr><td colspan="5">Aucun vaisseau</td></tr>'}</tbody></table>`;
  };
  const foe = e.side === 'a' ? 'd' : 'a';
  return `<p class="j-why">${esc(x.reasons[0])}</p>
    <details class="j-report"><summary>Détail du combat</summary>
      ${x.reasons.length > 1 ? `<ul class="j-reasons">${x.reasons.slice(1).map((r) => `<li>${esc(r)}</li>`).join('')}</ul>` : ''}
      ${table(e.side, 'Tes forces')}
      ${table(foe, `Forces ${de(e.who || 'l’adversaire')}`)}
      <ol class="j-rounds">${x.rounds.map((r) => `<li>${esc(r)}</li>`).join('')}</ol>
      <p class="hint">⚔ attaque et ◇ coque par vaisseau, technologies comprises. À chaque passe, les deux camps tirent en même temps ; les coups se répartissent selon la coque.</p>
    </details>`;
}
