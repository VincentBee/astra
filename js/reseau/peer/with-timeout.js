export function withTimeout(promise, ms, message) {
  return Promise.race([promise, new Promise((_, rej) => setTimeout(() => rej(new Error(message)), ms))]);
}
