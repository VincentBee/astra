// Lecture de QR code avec la caméra arrière, via jsQR (chargé à la demande :
// Safari sur iPhone n'a pas de lecteur de QR intégré utilisable par une page).

let jsQRLoading = null;

function loadJsQR() {
  if (window.jsQR) return Promise.resolve(window.jsQR);
  jsQRLoading ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = new URL('../vendor/jsQR.js', import.meta.url).href;
    s.onload = () => resolve(window.jsQR);
    s.onerror = () => reject(new Error('Lecteur de QR introuvable.'));
    document.head.append(s);
  });
  return jsQRLoading;
}

/**
 * Ouvre la caméra dans `video` et résout avec le texte du premier QR lu.
 * `signal` (AbortSignal) permet d'annuler.
 */
export async function scanQr(video, { signal } = {}) {
  const jsQR = await loadJsQR();
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Caméra indisponible : ouvre l'appli en https, ou colle le code à la main.");
  }
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    });
  } catch (e) {
    throw new Error(
      e?.name === 'NotAllowedError'
        ? "Accès à la caméra refusé. Autorise-le dans les réglages du navigateur, ou colle le code à la main."
        : "Impossible d'ouvrir la caméra. Colle le code à la main.",
    );
  }
  const stop = () => stream.getTracks().forEach((t) => t.stop());
  video.srcObject = stream;
  video.setAttribute('playsinline', '');
  video.muted = true;
  await video.play().catch(() => {});

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  return new Promise((resolve, reject) => {
    signal?.addEventListener('abort', () => {
      stop();
      reject(new DOMException('Annulé', 'AbortError'));
    });
    const loop = () => {
      if (signal?.aborted) return;
      const w = video.videoWidth;
      const h = video.videoHeight;
      if (w && h) {
        const scale = Math.min(1, 800 / Math.max(w, h));
        canvas.width = Math.round(w * scale);
        canvas.height = Math.round(h * scale);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const found = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
        if (found?.data) {
          stop();
          return resolve(found.data);
        }
      }
      requestAnimationFrame(loop);
    };
    loop();
  });
}
