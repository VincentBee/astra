import { ID_KEY } from '../id-key.js';
import { read } from '../stockage/read.js';

export const loadIdentity = () => read(ID_KEY, null);
