/** Rejette dès que WebRTC abandonne la connexion. */
export function failed(pc) {
  return new Promise((_, reject) => {
    const check = () => pc.connectionState === 'failed' && reject(new Error('La connexion ne s’établit pas.'));
    pc.addEventListener('connectionstatechange', check);
    check();
  });
}
