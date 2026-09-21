/**
 * Test del nucleo. Nessun browser, nessun mock, nessuna dipendenza esterna:
 * il dominio e i casi d'uso si testano perche' non toccano infrastruttura.
 * Esecuzione:  node test/run.mjs
 */
import { parse, tryParse } from '../src/domain/language/Parser.js';
import { print } from '../src/domain/language/Printer.js';
import { equals, substitute, freeTerms, conjuncts, disjuncts, equalsUpToSubstitution } from '../src/domain/language/Formula.js';
import { isTautologicalConsequence } from '../src/domain/truth/TruthTable.js';
import { World, Block, Shape, Size } from '../src/domain/world/World.js';
import { Proof, Line, Subproof, Justification, resetIds } from '../src/domain/proof/Proof.js';
import { BuildTruthTable } from '../src/application/BuildTruthTable.js';
import { EvaluateInWorld } from '../src/application/EvaluateInWorld.js';
import { CheckProof } from '../src/application/CheckProof.js';

export default function suite(t) {
  /* ---------- linguaggio ---------- */
  t('precedenza ∧ su ∨',        print(parse('P & Q | R')) === 'P ∧ Q ∨ R');
  t('parentesi conservate',     print(parse('(P | Q) & R')) === '(P ∨ Q) ∧ R');
  t('→ associa a destra',       print(parse('P -> Q -> R')) === 'P → Q → R');
  t('→ a sinistra parentesi',   print(parse('(P -> Q) -> R')) === '(P → Q) → R');
  t('∧ a destra parentesi',     print(parse('P & (Q & R)')) === 'P ∧ (Q ∧ R)');
  t('quantificatore ascii',     print(parse('@x (Cube(x) $ Small(x))')) === '∀x (Cube(x) → Small(x))');
  t('esistenziale ascii',       print(parse('/y Tet(y)')) === '∃y Tet(y)');
  t('identita',                 print(parse('a=b')) === 'a = b');
  t('disuguaglianza',           print(parse('a != b')) === '¬a = b');
  t('falso',                    print(parse('#')) === '⊥');
  t('round-trip',               print(parse(print(parse('P & (Q & R)')))) === 'P ∧ (Q ∧ R)');

  t('errore: operatore pendente', tryParse('P &').ok === false);
  t('errore: giustapposizione',   tryParse('P Q').ok === false);
  t('errore: parentesi aperta',   tryParse('(P').ok === false);
  t('errore: variabile invalida', tryParse('@Cube Cube(x)').ok === false);

  /* ---------- alfa-equivalenza ---------- */
  t('alfa: rinomina',           equals(parse('@x Cube(x)'), parse('@y Cube(y)')));
  t('alfa: non confonde libere', !equals(parse('@x Larger(x,a)'), parse('@y Larger(a,y)')));
  t('alfa: annidati',           equals(parse('@x /y Larger(x,y)'), parse('@a /b Larger(a,b)')));
  t('alfa: ordine conta',       !equals(parse('@x /y Larger(x,y)'), parse('@x /y Larger(y,x)')));

  /* ---------- sostituzione ---------- */
  t('sost: semplice',           print(substitute(parse('Cube(x)'), 'x', 'c')) === 'Cube(c)');
  t('sost: variabile legata',   print(substitute(parse('@x Cube(x)'), 'x', 'c')) === '∀x Cube(x)');
  t('sost: solo libere',        print(substitute(parse('Larger(x,a) & /x Small(x)'), 'x', 'b')) === 'Larger(b, a) ∧ ∃x Small(x)');
  t('termini liberi',           [...freeTerms(parse('@x Larger(x,a)'))].join() === 'a');
  t('congiunti',                conjuncts(parse('P&Q&R')).length === 3);
  t('disgiunti',                disjuncts(parse('P|Q')).length === 2);
  t('sost strutturale',         equalsUpToSubstitution(parse('Larger(a,a)'), parse('Larger(a,b)'), 'a', 'b'));

  /* ---------- tavole ---------- */
  t('modus ponens',             isTautologicalConsequence([parse('P->Q'), parse('P')], parse('Q')) === true);
  t('affermazione conseguente', isTautologicalConsequence([parse('P->Q'), parse('Q')], parse('P')) === false);
  t('terzo escluso',            isTautologicalConsequence([], parse('P | ~P')) === true);
  t('sillogismo disgiuntivo',   isTautologicalConsequence([parse('P|Q'), parse('~P')], parse('Q')) === true);
  t('atomo quantificato',       isTautologicalConsequence([], parse('@x Cube(x) | ~@x Cube(x)')) === true);

  const table = new BuildTruthTable().execute({ sentences: ['P → Q', 'Q → R', 'P → R'] });
  t('tavola: 8 righe',          table.rows.length === 8);
  t('tavola: argomento valido', table.analysis.valid === true);
  const bad = new BuildTruthTable().execute({ sentences: ['P → Q', 'Q', 'P'] });
  t('tavola: controesempio',    bad.analysis.valid === false && bad.analysis.counterexample !== null);

  /* ---------- mondo ---------- */
  const world = new World([
    new Block({ id:1, shape:Shape.CUBE,  size:Size.LARGE,  x:1, y:1, names:['a'] }),
    new Block({ id:2, shape:Shape.CUBE,  size:Size.MEDIUM, x:4, y:1, names:['b'] }),
    new Block({ id:3, shape:Shape.TET,   size:Size.SMALL,  x:6, y:3, names:['c'] }),
    new Block({ id:4, shape:Shape.DODEC, size:Size.LARGE,  x:2, y:5, names:['d'] }),
  ]);
  const ev = new EvaluateInWorld();
  const val = s => ev.execute({ world, sentences: [s] })[0].value;
  t('mondo: Larger',            val('Larger(a, b)') === 'true');
  t('mondo: Larger falso',      val('Larger(b, a)') === 'false');
  t('mondo: SameRow',           val('SameRow(a, b)') === 'true');
  t('mondo: LeftOf',            val('LeftOf(a, b)') === 'true');
  t('mondo: BackOf',            val('BackOf(a, d)') === 'true');
  t('mondo: universale vero',   val('∀x (Cube(x) → ¬Tet(x))') === 'true');
  t('mondo: universale falso',  val('∀x Cube(x)') === 'false');
  t('mondo: esistenziale',      val('∃x (Tet(x) ∧ Small(x))') === 'true');
  t('mondo: annidato',          val('∀x ∃y (Larger(y, x) ∨ x = y)') === 'true');
  t('mondo: identita',          val('a = a') === 'true');
  t('mondo: nome non assegnato', val('Cube(f)') === 'undefined');
  t('mondo: predicato ignoto',  val('Verde(a)') === 'undefined');
  t('mondo: aritа errata',      val('Cube(a, b)') === 'undefined');
  t('mondo: Adjoins falso',     val('Adjoins(a, b)') === 'false');

  const wb = new World([
    new Block({ id:1, shape:Shape.CUBE, size:Size.SMALL, x:0, y:0, names:['a'] }),
    new Block({ id:2, shape:Shape.CUBE, size:Size.SMALL, x:2, y:0, names:['b'] }),
    new Block({ id:3, shape:Shape.CUBE, size:Size.SMALL, x:4, y:0, names:['c'] }),
  ]);
  const evb = new EvaluateInWorld();
  t('Between: vero',            evb.execute({ world: wb, sentences: ['Between(b, a, c)'] })[0].value === 'true');
  t('Between: falso',           evb.execute({ world: wb, sentences: ['Between(a, b, c)'] })[0].value === 'false');

  /* ---------- prove ---------- */
  const check = new CheckProof();

  // P ⊢ Q → P
  resetIds(1);
  const p1 = new Proof({
    goal: 'Q → P',
    items: [
      new Line({ text:'P', rule:Justification.PREMISE }),
      new Subproof({ items: [
        new Line({ text:'Q', rule:Justification.ASSUMPTION }),
        new Line({ text:'P', rule:'Reit', citations:'1' })
      ]}),
      new Line({ text:'Q → P', rule:'→ Intro', citations:'2-3' })
    ]
  });
  const r1 = check.execute({ proof: p1 });
  t('prova: completa',          r1.verdict.kind === 'complete');
  t('prova: ogni riga ok',      r1.lines.every(l => l.status === 'ok'));

  // citazione fuori scope
  resetIds(1);
  const p2 = new Proof({
    goal: 'P',
    items: [
      new Line({ text:'P', rule:Justification.PREMISE }),
      new Subproof({ items: [ new Line({ text:'Q', rule:Justification.ASSUMPTION }) ]}),
      new Line({ text:'Q', rule:'Reit', citations:'2' })
    ]
  });
  const r2 = check.execute({ proof: p2 });
  t('prova: scope rispettato',  r2.lines[2].status === 'invalid');

  // ∧ Elim corretta e scorretta
  resetIds(1);
  const p3 = new Proof({ goal:'P', items: [
    new Line({ text:'P ∧ Q', rule:Justification.PREMISE }),
    new Line({ text:'P', rule:'∧ Elim', citations:'1' })
  ]});
  t('prova: ∧ Elim ok',         check.execute({ proof:p3 }).lines[1].status === 'ok');

  resetIds(1);
  const p4 = new Proof({ goal:'R', items: [
    new Line({ text:'P ∧ Q', rule:Justification.PREMISE }),
    new Line({ text:'R', rule:'∧ Elim', citations:'1' })
  ]});
  t('prova: ∧ Elim rifiutata',  check.execute({ proof:p4 }).lines[1].status === 'invalid');

  // ∀ Intro con costante nuova
  resetIds(1);
  const p5 = new Proof({ goal:'∀x (Cube(x) → Cube(x))', items: [
    new Subproof({ constant:'k', items: [
      new Line({ text:'Cube(k)', rule:Justification.ASSUMPTION }),
      new Line({ text:'Cube(k)', rule:'Reit', citations:'1' })
    ]}),
    new Line({ text:'∀x (Cube(x) → Cube(x))', rule:'→ Intro', citations:'1-2' })
  ]});
  t('prova: → Intro non basta', check.execute({ proof:p5 }).lines[2].status === 'invalid');

  // ∀ Elim
  resetIds(1);
  const p6 = new Proof({ goal:'Cube(a)', items: [
    new Line({ text:'∀x Cube(x)', rule:Justification.PREMISE }),
    new Line({ text:'Cube(a)', rule:'∀ Elim', citations:'1' })
  ]});
  t('prova: ∀ Elim ok',         check.execute({ proof:p6 }).lines[1].status === 'ok');

  // ∃ Intro
  resetIds(1);
  const p7 = new Proof({ goal:'∃x Cube(x)', items: [
    new Line({ text:'Cube(a)', rule:Justification.PREMISE }),
    new Line({ text:'∃x Cube(x)', rule:'∃ Intro', citations:'1' })
  ]});
  t('prova: ∃ Intro ok',        check.execute({ proof:p7 }).lines[1].status === 'ok');

  // Taut Con
  resetIds(1);
  const p8 = new Proof({ goal:'Q', items: [
    new Line({ text:'P → Q', rule:Justification.PREMISE }),
    new Line({ text:'P', rule:Justification.PREMISE }),
    new Line({ text:'Q', rule:'Taut Con', citations:'1,2' })
  ]});
  t('prova: Taut Con ok',       check.execute({ proof:p8 }).lines[2].status === 'ok');

  // = Elim
  resetIds(1);
  const p9 = new Proof({ goal:'Cube(b)', items: [
    new Line({ text:'Cube(a)', rule:Justification.PREMISE }),
    new Line({ text:'a = b',   rule:Justification.PREMISE }),
    new Line({ text:'Cube(b)', rule:'= Elim', citations:'1,2' })
  ]});
  t('prova: = Elim ok',         check.execute({ proof:p9 }).lines[2].status === 'ok');
}
