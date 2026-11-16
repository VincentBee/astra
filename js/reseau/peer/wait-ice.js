import { ICE_GATHER_TIMEOUT_MS } from '../config/index.js';

export function waitIce(pc) {
  if (pc.iceGatheringState === 'complete') return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timer);
      pc.removeEventListener('icegatheringstatechange', onChange);
      resolve();
    };
    const onChange = () => pc.iceGatheringState === 'complete' && done();
    // Sans réponse du STUN (pas d'Internet), on part avec les adresses locales.
    const timer = setTimeout(done, ICE_GATHER_TIMEOUT_MS);
    pc.addEventListener('icegatheringstatechange', onChange);
  });
}
