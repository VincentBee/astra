/**
 * Cette partie ne se joue que dans cet onglet (D-430). `hold` : poignée de `holdGame`. Un
 * autre onglet qui demande la main : cet onglet sauve d'abord, puis s'arrête (`lose`) ; le
 * verrou ne part qu'après. Verrou pris de force (onglet gelé) : il s'arrête sans rien sauver.
 */
export function adopt(hold) {
  if (this.ended || this.lost) return hold?.release();
  this.hold?.release();
  this.hold = hold || null;
  if (!hold) return;
  hold.onyield = () => {
    this.save();
    this.lose();
  };
  hold.onlost = () => this.lose();
}
