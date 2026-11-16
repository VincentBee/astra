import { TRADE_RES } from './trade-res.js';

export const isEmpty = (a) => TRADE_RES.every((r) => !a?.[r]);
