export function openChannel(channel) {
  return new Promise((resolve, reject) => {
    if (channel.readyState === 'open') return resolve();
    channel.addEventListener('open', () => resolve(), { once: true });
    channel.addEventListener('error', () => reject(new Error('Canal fermé')), { once: true });
  });
}
