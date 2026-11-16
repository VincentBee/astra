export class Reader {
  constructor(b) { this.b = b; this.i = 0; }
  u8() { if (this.i >= this.b.length) throw new Error('trop court'); return this.b[this.i++]; }
  u16() { return (this.u8() << 8) | this.u8(); }
  bytes(n) { const out = []; for (let k = 0; k < n; k++) out.push(this.u8()); return out; }
  str() { return new TextDecoder().decode(Uint8Array.from(this.bytes(this.u8()))); }
}
