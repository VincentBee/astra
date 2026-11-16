import { put } from './put.js';

export const write = (k, v) => put(k, v) === true;
