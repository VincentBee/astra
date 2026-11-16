export function refuse(text) {
  this.ontoast?.(text);
  return false;
}
