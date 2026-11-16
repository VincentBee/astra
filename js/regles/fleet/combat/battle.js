import { SHIP_KEYS, shipStats, techBonus } from '../../tech/index.js';

/**
 * Combat, sans hasard : les deux téléphones qui le calculent trouvent le
 * même résultat. Jusqu'à 4 passes ; à chaque passe, chaque camp inflige son
 * attaque totale, répartie sur les vaisseaux adverses au prorata de leur
 * coque. Les dégâts s'accumulent : un vaisseau tombe quand sa coque est
 * entièrement entamée. Les deux camps tirent en même temps.
 *
 * a, d : { race, ships, tech, fort? }. Renvoie { attLeft, defLeft, attLost, defLost, won, report } ;
 * `report` : le déroulé, pour le carnet (js/report.js).
 */
export function battle(a, d) {
  const side = (x) => {
    // Entiers positifs seulement : une fiche abîmée ne doit pas créer de vaisseaux.
    const S = {
      race: x.race,
      n: Object.fromEntries(SHIP_KEYS.map((k) => [k, Math.max(0, Math.floor(Number(x.ships?.[k]) || 0))])),
      st: Object.fromEntries(SHIP_KEYS.map((k) => [k, shipStats(x.race, k, x.tech)])),
      dmg: Object.fromEntries(SHIP_KEYS.map((k) => [k, 0])),
    };
    // La défense d'une planète (ses bâtiments) se bat comme un seul gros vaisseau.
    if (x.fort?.hull > 0) Object.assign(S, { n: { ...S.n, fort: 1 }, st: { ...S.st, fort: x.fort }, dmg: { ...S.dmg, fort: 0 } });
    return S;
  };
  const A = side(a);
  const D = side(d);
  const keys = (S) => Object.keys(S.n);
  const firepower = (S) => keys(S).reduce((t, k) => t + S.n[k] * S.st[k].attack, 0);
  const hitOn = (S, power) => {
    const hulls = keys(S).map((k) => S.n[k] * S.st[k].hull);
    const total = hulls.reduce((x, y) => x + y, 0);
    if (!total) return;
    keys(S).forEach((k, i) => {
      if (!S.n[k]) return;
      S.dmg[k] += (power * hulls[i]) / total;
      const dead = Math.min(S.n[k], Math.floor(S.dmg[k] / S.st[k].hull + 1e-9));
      S.n[k] -= dead;
      S.dmg[k] -= dead * S.st[k].hull;
    });
  };
  const alive = (S) => keys(S).some((k) => S.n[k] > 0);
  const hullOf = (S) => keys(S).reduce((t, k) => t + S.n[k] * S.st[k].hull - (S.n[k] ? S.dmg[k] : 0), 0);
  // Rapport détaillé (D-122) : forces au départ, puis chaque passe (feu et pertes de chaque camp).
  const r2 = (v) => Math.round(v * 100) / 100;
  const start = (S, x) => {
    const b = techBonus(x.race, x.tech);
    const out = {
      race: x.race,
      ships: Object.fromEntries(SHIP_KEYS.filter((k) => S.n[k] > 0).map((k) => [k, S.n[k]])),
      bonus: { attack: r2(b.attack), hull: r2(b.hull) },
      fire: r2(firepower(S)),
      hull: r2(hullOf(S)),
    };
    if (S.n.fort) out.fort = { attack: r2(S.st.fort.attack), hull: r2(S.st.fort.hull) };
    return out;
  };
  const report = { a: start(A, a), d: start(D, d), rounds: [] };
  const gone = (before, S) => Object.fromEntries(keys(S).map((k) => [k, before[k] - S.n[k]]).filter(([, v]) => v > 0));
  for (let round = 0; round < 4 && alive(A) && alive(D); round++) {
    const pa = firepower(A);
    const pd = firepower(D);
    const nA = { ...A.n };
    const nD = { ...D.n };
    hitOn(D, pa);
    hitOn(A, pd);
    report.rounds.push({ a: r2(pa), d: r2(pd), aLost: gone(nA, A), dLost: gone(nD, D) });
  }
  report.a.hullLeft = r2(Math.max(0, hullOf(A)));
  report.d.hullLeft = r2(Math.max(0, hullOf(D)));
  const lost = (before, S) => Object.fromEntries(SHIP_KEYS.map((k) => [k, (before?.[k] || 0) - S.n[k]]).filter(([, v]) => v > 0));
  const left = (S) => Object.fromEntries(SHIP_KEYS.filter((k) => S.n[k] > 0).map((k) => [k, S.n[k]]));
  return {
    attLeft: left(A),
    defLeft: left(D),
    attLost: lost(a.ships, A),
    defLost: lost(d.ships, D),
    won: alive(A) && !alive(D) && firepower(A) > 0, // des cargos sans armes ne gagnent pas, même contre personne
    report,
  };
}
