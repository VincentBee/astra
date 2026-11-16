// dist/ construit pour un fichier de test (D-535) : chaque fichier de test a son propre dossier
// temporaire, car `node --test` lance les fichiers en parallèle. Construit une seule fois par
// processus.
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build } from '../build.mjs';

let made;
export function builtDist() {
  made ??= build({ out: mkdtempSync(join(tmpdir(), 'astra-dist-')), quiet: true });
  return made;
}
