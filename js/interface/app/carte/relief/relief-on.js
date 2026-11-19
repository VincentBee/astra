import { relief } from './relief.js';

/** Le module de la carte en 3D s'il est coché et téléchargé, sinon null (carte 2D d'origine). */
export const reliefOn = () => (relief.on && relief.mod) || null;
