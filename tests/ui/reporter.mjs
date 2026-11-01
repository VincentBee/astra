// Reporter de node:test pour l'interface de test (tests/ui/server.mjs) : une
// ligne JSON par test terminé, lue au fil de l'eau par le serveur.
import { relative } from 'node:path';

const root = new URL('../..', import.meta.url).pathname;

/** Message lisible d'un échec : l'erreur du test, pas l'enveloppe de node:test. */
function failure(error) {
  const e = error?.cause ?? error;
  if (!e) return null;
  const at = String(e.stack || '')
    .split('\n')
    .find((l) => /^\s+at /.test(l) && l.includes('/tests/') && !l.includes('/tests/scenario.mjs'));
  // Le lien vers le rapport sert dans le terminal ; l'interface montre le rapport elle-même.
  const message = String(e.message ?? e).replace(/\n\s*Rapport : \S+/, '');
  return { message, at: at ? at.trim().replace(/^at /, '').replace(`file://${root}`, '').replace(root, '') : null };
}

export default async function* reporter(source) {
  for await (const { type, data } of source) {
    if (type !== 'test:pass' && type !== 'test:fail') continue;
    if (!data.file || data.details?.type === 'suite') continue;
    const file = relative(root, data.file);
    if (data.name === file) continue; // l'enveloppe d'un fichier entier, pas un test
    // `file` : là où test() a été appelé (tests/scenario.mjs pour un scénario) ; le serveur retrouve le vrai fichier par le nom.
    yield `${JSON.stringify({
      file,
      name: data.name,
      line: data.line,
      nesting: data.nesting,
      ok: type === 'test:pass',
      skip: !!data.skip,
      ms: Math.round((data.details?.duration_ms ?? 0) * 10) / 10,
      error: type === 'test:fail' ? failure(data.details?.error) : null,
    })}\n`;
  }
}
