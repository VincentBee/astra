// Lecture de QR code avec la caméra arrière, via jsQR (chargé à la demande :
// Safari sur iPhone n'a pas de lecteur de QR intégré utilisable par une page).

let jsQRLoading = null;

function loadJsQR() {
  if (window.jsQR) return Promise.resolve(window.jsQR);
  jsQRLoading ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = new URL('../vendor/jsQR.js', import.meta.url).href;
    s.onload = () => resolve(window.jsQR);
    s.onerror = () => {
      // Pas de promesse ratée gardée en mémoire (#86) : le prochain Scanner refait la requête.
      jsQRLoading = null;
      s.remove?.();
      reject(new Error('Lecteur de QR introuvable.'));
    };
    document.head.append(s);
  });
  return jsQRLoading;
}

/**
 * Ouvre la caméra dans `video` et résout avec le texte du premier QR lu.
 * `signal` (AbortSignal) permet d'annuler à tout moment (#42) : pendant le
 * chargement de jsQR, la demande d'autorisation, le démarrage de la caméra ou
 * la lecture. La promesse rejette alors tout de suite avec `AbortError`, et un
 * flux de caméra obtenu après coup est éteint dès qu'il arrive.
 */
export async function scanQr(video, { signal } = {}) {
  const abortError = () => new DOMException('Annulé', 'AbortError');
  if (signal?.aborted) throw abortError();

  let stream = null;
  const stop = () => {
    stream?.getTracks().forEach((t) => t.stop());
    if (video.srcObject) video.srcObject = null;
  };
  // Rejette dès l'annulation ; chaque attente fait la course avec elle.
  let onAbort;
  const aborted = new Promise((_, reject) => {
    onAbort = () => {
      stop();
      reject(abortError());
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
  aborted.catch(() => {});
  const step = (p) => Promise.race([p, aborted]);

  try {
    const jsQR = await step(loadJsQR());
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Caméra indisponible : ouvre l'appli en https, ou colle le code à la main.");
    }
    const asked = navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    });
    // Flux arrivé après l'annulation : on l'éteint aussitôt.
    asked.then(
      (s) => {
        stream = s;
        if (signal?.aborted) stop();
      },
      () => {},
    );
    try {
      await step(asked);
    } catch (e) {
      if (signal?.aborted) throw abortError();
      throw new Error(
        e?.name === 'NotAllowedError'
          ? "Accès à la caméra refusé. Autorise-le dans les réglages du navigateur, ou colle le code à la main."
          : "Impossible d'ouvrir la caméra. Colle le code à la main.",
      );
    }
    video.srcObject = stream;
    video.setAttribute('playsinline', '');
    video.muted = true;
    await step(video.play().catch(() => {}));

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    const text = await step(
      new Promise((resolve) => {
        const loop = () => {
          if (signal?.aborted) return; // `aborted` a déjà rejeté et tout éteint
          const w = video.videoWidth;
          const h = video.videoHeight;
          if (w && h) {
            const scale = Math.min(1, 800 / Math.max(w, h));
            canvas.width = Math.round(w * scale);
            canvas.height = Math.round(h * scale);
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const found = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
            if (found?.data) return resolve(found.data);
          }
          requestAnimationFrame(loop);
        };
        loop();
      }),
    );
    stop();
    return text;
  } catch (e) {
    stop();
    throw e;
  } finally {
    signal?.removeEventListener('abort', onAbort);
  }
}
