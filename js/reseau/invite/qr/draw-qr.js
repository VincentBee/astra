import qrcode from '../../../../vendor/qrcode.mjs';

/** Dessine `text` en QR code dans un <canvas>, en pixels nets. */
export function drawQr(canvas, text) {
  const qr = qrcode(0, 'M');
  qr.addData(text, 'Byte');
  qr.make();
  const count = qr.getModuleCount();
  const quiet = 4;
  const size = count + quiet * 2;
  const scale = Math.max(4, Math.floor(640 / size));
  canvas.width = canvas.height = size * scale;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#000';
  for (let r = 0; r < count; r++) {
    for (let c = 0; c < count; c++) {
      if (qr.isDark(r, c)) ctx.fillRect((c + quiet) * scale, (r + quiet) * scale, scale, scale);
    }
  }
  return count;
}
