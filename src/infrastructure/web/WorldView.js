/**
 * Infrastruttura · Web · schermata Mondi.
 * Tiene lo stato di modifica come dati grezzi e costruisce un World del
 * dominio solo al momento della valutazione: l'aggregato resta sempre valido.
 */
import { $, $$, el, clear } from './dom.js';
import { blockSvg } from './BlockShapes.js';
import { World, Block, Shape, Size, CONSTANTS } from '../../domain/world/World.js';

const SHAPE_LABELS = [[Shape.TET, 'Tetraedro'], [Shape.CUBE, 'Cubo'], [Shape.DODEC, 'Dodecaedro']];
const SIZE_LABELS  = [[Size.SMALL, 'Piccolo'], [Size.MEDIUM, 'Medio'], [Size.LARGE, 'Grande']];
const VALUE_CHIP = {
  true:      ['t', 'vero'],
  false:     ['f', 'falso'],
  undefined: ['w', 'indefinito'],
  malformed: ['f', 'non valida']
};

export class WorldView {
  constructor({ evaluateInWorld, repository }) {
    this.evaluateInWorld = evaluateInWorld;
    this.repository = repository;
    this.blocks = [];
    this.selected = null;
    this.nextId = 1;
    this.sentences = ['∀x (Cube(x) → Large(x))', '∃y Tet(y)', 'Larger(a, b)'];
  }

  async start() {
    const saved = await this.repository.load('world');
    if (saved?.blocks) {
      this.blocks = saved.blocks.map(b => ({ ...b }));
      this.nextId = Math.max(0, ...this.blocks.map(b => b.id)) + 1;
      if (saved.sentences?.length) this.sentences = saved.sentences;
    } else {
      this.loadExampleWorld();
    }

    $('#wd-add').addEventListener('click', () => { this.sentences.push(''); this.renderSentences(); });
    $('#wd-clearsent').addEventListener('click', () => { this.sentences = ['']; this.renderSentences(); this.persist(); });
    $('#wd-clearworld').addEventListener('click', () => {
      this.blocks = []; this.selected = null; this.renderBoard(); this.renderInspector(); this.persist();
    });
    $('#wd-eval').addEventListener('click', () => this.evaluate());
    $('#wd-example').addEventListener('click', () => {
      this.loadExampleWorld();
      this.sentences = [
        '∀x (Cube(x) → ¬Tet(x))', '∃x (Tet(x) ∧ Small(x))',
        'Larger(a, b)', '∀x ∃y (Larger(y, x) ∨ x = y)', 'Between(e, d, c)'
      ];
      this.renderBoard(); this.renderInspector(); this.renderSentences(); this.evaluate();
    });

    this.renderBoard(); this.renderInspector(); this.renderSentences();
  }

  persist() { this.repository.save('world', { blocks: this.blocks, sentences: this.sentences }); }

  loadExampleWorld() {
    this.blocks = [
      { id:1, shape:Shape.CUBE,  size:Size.LARGE,  x:1, y:1, names:['a'] },
      { id:2, shape:Shape.CUBE,  size:Size.MEDIUM, x:4, y:1, names:['b'] },
      { id:3, shape:Shape.TET,   size:Size.SMALL,  x:6, y:3, names:['c'] },
      { id:4, shape:Shape.DODEC, size:Size.LARGE,  x:2, y:5, names:['d'] },
      { id:5, shape:Shape.TET,   size:Size.MEDIUM, x:4, y:5, names:['e'] },
      { id:6, shape:Shape.CUBE,  size:Size.SMALL,  x:5, y:6, names:['f'] }
    ];
    this.nextId = 7; this.selected = null;
  }

  /** Traduce lo stato di editing nell'aggregato di dominio. */
  toWorld() { return new World(this.blocks.map(b => new Block(b))); }

  renderBoard() {
    const board = clear($('#wd-board'));
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      const cell = el('div', 'cell');
      const block = this.blocks.find(b => b.x === x && b.y === y);

      if (block) {
        const node = el('div', 'blk' + (this.selected === block.id ? ' sel' : ''));
        node.innerHTML = blockSvg(block);
        node.draggable = true;
        node.addEventListener('click', e => {
          e.stopPropagation(); this.selected = block.id; this.renderBoard(); this.renderInspector();
        });
        node.addEventListener('dragstart', e => e.dataTransfer.setData('text/plain', String(block.id)));
        cell.appendChild(node);
        if (block.names.length) cell.appendChild(el('span', 'lbl', block.names.join(' ')));
      } else {
        cell.addEventListener('click', () => {
          const created = { id: this.nextId++, shape: Shape.CUBE, size: Size.MEDIUM, x, y, names: [] };
          this.blocks.push(created); this.selected = created.id;
          this.renderBoard(); this.renderInspector(); this.persist();
        });
      }

      cell.addEventListener('dragover', e => { e.preventDefault(); cell.classList.add('drop'); });
      cell.addEventListener('dragleave', () => cell.classList.remove('drop'));
      cell.addEventListener('drop', e => {
        e.preventDefault(); cell.classList.remove('drop');
        const id = Number(e.dataTransfer.getData('text/plain'));
        const moved = this.blocks.find(b => b.id === id);
        if (!moved || this.blocks.some(b => b.x === x && b.y === y && b.id !== id)) return;
        moved.x = x; moved.y = y; this.selected = id;
        this.renderBoard(); this.renderInspector(); this.persist();
      });
      board.appendChild(cell);
    }
  }

  renderInspector() {
    const host = clear($('#wd-insp'));
    const block = this.blocks.find(b => b.id === this.selected);
    if (!block) {
      host.appendChild(el('p', 'hint', 'Nessun blocco selezionato. Clic su una casella vuota per aggiungerne uno.'));
      return;
    }

    const group = (label, options, isActive, pick) => {
      const wrap = el('div');
      wrap.appendChild(el('label', null, label));
      const row = el('div', 'grp');
      options.forEach(([value, text]) => {
        const button = el('button', 'seg' + (isActive(value) ? ' on' : ''), text);
        button.addEventListener('click', () => { pick(value); this.renderBoard(); this.renderInspector(); this.persist(); });
        row.appendChild(button);
      });
      wrap.appendChild(row);
      return wrap;
    };

    host.appendChild(group('Forma', SHAPE_LABELS, v => block.shape === v, v => block.shape = v));
    host.appendChild(group('Dimensione', SIZE_LABELS, v => block.size === v, v => block.size = v));

    const names = el('div');
    names.appendChild(el('label', null, 'Nomi (una costante puo\u2019 stare su un solo blocco)'));
    const tags = el('div', 'nametags');
    CONSTANTS.forEach(name => {
      const active = block.names.includes(name);
      const tag = el('button', 'nametag' + (active ? ' on' : ''), name);
      tag.addEventListener('click', () => {
        if (active) block.names = block.names.filter(n => n !== name);
        else {
          this.blocks.forEach(b => { b.names = b.names.filter(n => n !== name); });
          block.names = [...block.names, name].sort();
        }
        this.renderBoard(); this.renderInspector(); this.persist();
      });
      tags.appendChild(tag);
    });
    names.appendChild(tags);
    host.appendChild(names);

    const remove = el('button', 'btn sm', 'Elimina blocco');
    remove.style.marginTop = '8px';
    remove.addEventListener('click', () => {
      this.blocks = this.blocks.filter(b => b.id !== block.id);
      this.selected = null;
      this.renderBoard(); this.renderInspector(); this.persist();
    });
    host.appendChild(remove);
  }

  renderSentences() {
    const host = clear($('#wd-rows'));
    this.sentences.forEach((value, i) => {
      const row = el('div', 'frow');
      row.appendChild(el('div', 'n', `${i + 1}.`));

      const input = el('input', 'finput formula');
      input.value = value;
      input.placeholder = 'es. ∀x (Cube(x) → Small(x))';
      input.addEventListener('input', () => { this.sentences[i] = input.value; input.classList.remove('bad'); });
      input.addEventListener('change', () => this.persist());
      input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); this.evaluate(); } });

      const verdict = el('span'); verdict.id = `wd-v${i}`; verdict.style.minWidth = '72px'; verdict.style.flex = 'none';
      const remove = el('button', 'xbtn', '×');
      remove.addEventListener('click', () => {
        this.sentences.splice(i, 1);
        if (!this.sentences.length) this.sentences = [''];
        this.renderSentences(); this.persist();
      });

      row.append(input, verdict, remove);
      host.appendChild(row);

      const error = el('p', 'err'); error.id = `wd-e${i}`; error.style.display = 'none';
      host.appendChild(error);
    });
  }

  evaluate() {
    this.persist();
    let world;
    try { world = this.toWorld(); }
    catch (e) { alert(e.message); return; }

    const results = this.evaluateInWorld.execute({ world, sentences: this.sentences });
    const inputs = $$('#wd-rows .finput');

    results.forEach(({ position, value, message }) => {
      const verdict = clear($(`#wd-v${position}`));
      const error = $(`#wd-e${position}`);
      error.style.display = 'none';
      inputs[position]?.classList.remove('bad');
      if (value === 'blank') return;

      const chip = VALUE_CHIP[value];
      verdict.appendChild(el('span', `chip ${chip[0]}`, chip[1]));
      if (value === 'malformed') inputs[position]?.classList.add('bad');
      if (message) { error.textContent = message; error.style.display = 'block'; }
    });
  }
}
