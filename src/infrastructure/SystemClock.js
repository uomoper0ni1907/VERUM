/** Infrastruttura · adattatore della porta Clock. */
import { Clock } from '../application/ports.js';
export class SystemClock extends Clock { now() { return new Date(); } }
