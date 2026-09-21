// SPDX-FileCopyrightText: 2026 Liam Michael Boland
// SPDX-License-Identifier: LicenseRef-Verum-Proprietary
/**
 * Dominio · Mondo · World
 *
 * Il mondo di blocchi e' l'interpretazione: fissa il dominio (i blocchi),
 * il riferimento delle costanti e l'estensione di ogni predicato.
 * Convenzione: colonna 0 = sinistra, riga 0 = fondo del tavolo.
 */
import { Block, CONSTANTS } from './Block.js';

export class UndefinedReference extends Error {}

export const SIGNATURE = Object.freeze({
  Tet:1, Cube:1, Dodec:1, Small:1, Medium:1, Large:1,
  SameSize:2, SameShape:2, SameRow:2, SameCol:2,
  Larger:2, Smaller:2, LeftOf:2, RightOf:2, BackOf:2, FrontOf:2, Adjoins:2,
  Between:3
});

export class World {
  constructor(blocks = []) {
    this.blocks = [...blocks];
    const seen = new Set();
    for (const b of this.blocks) for (const n of b.names) {
      if (seen.has(n)) throw new Error(`la costante "${n}" e' assegnata a piu' di un blocco`);
      seen.add(n);
    }
  }
  get isEmpty() { return this.blocks.length === 0; }

  referentOf(name, assignment) {
    if (assignment && Object.prototype.hasOwnProperty.call(assignment, name)) return assignment[name];
    const block = this.blocks.find(b => b.names.includes(name));
    if (!block) throw new UndefinedReference(`la costante "${name}" non e' assegnata a nessun blocco`);
    return block;
  }

  holds(predicate, args) {
    const [p, q, r] = args;
    switch (predicate) {
      case 'Tet': case 'Cube': case 'Dodec': return p.shape === predicate;
      case 'Small':  return p.size === 1;
      case 'Medium': return p.size === 2;
      case 'Large':  return p.size === 3;
      case 'SameSize':  return p.size === q.size;
      case 'SameShape': return p.shape === q.shape;
      case 'SameRow':   return p.y === q.y;
      case 'SameCol':   return p.x === q.x;
      case 'Larger':    return p.size > q.size;
      case 'Smaller':   return p.size < q.size;
      case 'LeftOf':    return p.x < q.x;
      case 'RightOf':   return p.x > q.x;
      case 'BackOf':    return p.y < q.y;
      case 'FrontOf':   return p.y > q.y;
      case 'Adjoins':   return p !== q && Math.abs(p.x-q.x) + Math.abs(p.y-q.y) === 1;
      case 'Between':   return this.isBetween(p, q, r);
      default: throw new UndefinedReference(`predicato sconosciuto: ${predicate}`);
    }
  }

  /** a sta fra b e c: collineari su riga, colonna o diagonale, a strettamente interno. */
  isBetween(a, b, c) {
    if (a === b || a === c || b === c) return false;
    const dx = c.x - b.x, dy = c.y - b.y;
    if (!(dx === 0 || dy === 0 || Math.abs(dx) === Math.abs(dy))) return false;
    if ((a.x - b.x) * dy !== (a.y - b.y) * dx) return false;
    const inside = (p, q, r) =>
      (p > Math.min(q,r) && p < Math.max(q,r)) || (q === r && p === q);
    return inside(a.x, b.x, c.x) && inside(a.y, b.y, c.y);
  }

  /** Verita' di una formula in questo mondo, sotto l'assegnazione g. */
  satisfies(f, g = {}) {
    switch (f.t) {
      case 'bot': return false;
      case 'eq':  return this.referentOf(f.l, g) === this.referentOf(f.r, g);
      case 'atom': {
        const arity = SIGNATURE[f.p];
        if (arity === undefined) throw new UndefinedReference(`predicato sconosciuto: ${f.p}`);
        if (f.args.length !== arity)
          throw new UndefinedReference(`${f.p} richiede ${arity} argoment${arity > 1 ? 'i' : 'o'}`);
        return this.holds(f.p, f.args.map(a => this.referentOf(a, g)));
      }
      case 'not': return !this.satisfies(f.a, g);
      case 'and': return this.satisfies(f.l, g) && this.satisfies(f.r, g);
      case 'or':  return this.satisfies(f.l, g) || this.satisfies(f.r, g);
      case 'imp': return !this.satisfies(f.l, g) || this.satisfies(f.r, g);
      case 'iff': return this.satisfies(f.l, g) === this.satisfies(f.r, g);
      case 'all': return this.blocks.every(b => this.satisfies(f.a, { ...g, [f.v]: b }));
      case 'ex':  return this.blocks.some (b => this.satisfies(f.a, { ...g, [f.v]: b }));
    }
  }
}

export { Block, CONSTANTS };
export { Shape, Size } from './Block.js';
