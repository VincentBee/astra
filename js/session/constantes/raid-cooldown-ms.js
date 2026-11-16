import { TEMPO } from '../../tech.js';

/** Une même planète ne se pille qu'une fois toutes les 2 min (au tempo d'origine). */
export const RAID_COOLDOWN_MS = (2 * 60_000) / TEMPO;
