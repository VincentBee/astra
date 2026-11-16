// ----- binaire ---------------------------------------------------------------

export class Writer {
  constructor() { this.b = []; }
  u8(v) { this.b.push(v & 255); }
  u16(v) { this.u8(v >> 8); this.u8(v); }
  bytes(a) { for (const v of a) this.u8(v); }
  str(s) { const e = new TextEncoder().encode(s); this.u8(e.length); this.bytes(e); }
  done() { return Uint8Array.from(this.b); }
}
