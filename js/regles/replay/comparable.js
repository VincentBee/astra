import { copy } from './copy.js';
import { stable } from './stable.js';
import { normalize } from '../../session/index.js';

/** Fiche comparable : complétée comme à la lecture, sans ce qui ne dépend que du téléphone. */
export const comparable = (p) => {
  const { online, ...rest } = normalize(copy(p));
  return stable(rest);
};
