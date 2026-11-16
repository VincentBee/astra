import { distance } from '../../game/index.js';
import { CONTACT } from './contact.js';
import { fleetPos } from '../deplacement/fleet-pos.js';

/** Deux flottes au contact à `now`. */
export const inContact = (a, b, now) => distance(fleetPos(a, now), fleetPos(b, now)) <= CONTACT;
