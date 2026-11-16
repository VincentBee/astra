import { BAR, STICKY, TABS } from '../entete-dom.js';
import { stack } from '../stack.js';

for (const el of [BAR, ...STICKY, TABS]) stack.observe(el);
