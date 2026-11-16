export function changed() {
  this.save(); // tout de suite : l'appli peut être fermée juste après une action
  this.onchange?.('state');
}
