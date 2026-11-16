import { stackSticky } from './stack-sticky.js';

export const stack = new ResizeObserver(stackSticky);
