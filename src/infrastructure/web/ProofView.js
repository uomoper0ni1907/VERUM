/**
 * Infrastruttura · Web · schermata Derivazioni.
 * Rende l'aggregato Proof e mostra l'esito che riceve dal caso d'uso.
 * Nessuna regola di inferenza vive in questo file.
 */
import { $, el, clear } from './dom.js';
import { Proof, Line, Subproof, Justification, resetIds } from '../../domain/proof/Proof.js';
import { RULE_NAMES } from '../../domain/proof/rules.js';

const VERDICT_CHIP = {
  complete:   't', sound: 'n', incomplete: 'w', 'off-goal': 'w', empty: null
};

export class ProofView {
  constructor({ checkProof, repository }) {
    this.checkProof = checkProof;
    this.repository = repository;
    this.proof = null;
    this.focusKey = null;
  }

  async start() {
    const saved = await this.repository.load('proof');
    this.proof = saved ? this.deserialize(saved) : this.blankProof();

    $('#pf-goal').value = this.proof.goal;
    $('#pf-goal').addEventListener('input', e => { this.proof.goal = e.target.value; });
    $('#pf-goal').addEventListener('blur', () => { this.render(); this.persist(); });
    $('#pf-check').addEventListener('click', () => this.render());
    $('#pf-reset').addEventListener('click', () => {
      this.proof = this.blankProof(); $('#pf-goal').value = ''; this.render(); this.persist();
    });
    $('#pf-addprem').addEventListener('click', () => {
      let last = -1;
      this.proof.items.forEach((item, i) => { if (item.kind === 'line' && item.rule === Justification.PREMISE) last = i; });
      this.proof.items.splice(last + 1, 0, new Line({ rule: Justification.PREMISE }));
      this.render(); this.persist();
    });
    $('#pf-addline').addEventListener('click', () => { this.proof.items.push(new Line()); this.render(); this.persist(); });
    $('#pf-addsub').addEventListener('click',  () => { this.proof.items.push(new Subproof()); this.render(); this.persist(); });
    $('#pf-example').addEventListener('click', () => { this.proof = this.exampleProof(); $('#pf-goal').value = this.proof.goal; this.render(); this.persist(); });

    this.render();
  }

  blankProof() { resetIds(1); return new Proof({ goal: 'P → (Q → P)' }); }

  exampleProof() {
    resetIds(1);
    return new Proof({
      goal: 'Q → P',
      items: [
        new Line({ text: 'P', rule: Justification.PREMISE }),
        new Subproof({ items: [
          new Line({ text: 'Q', rule: Justification.ASSUMPTION }),
          new Line({ text: 'P', rule: 'Reit', citations: '1' })
        ]}),
        new Line({ text: 'Q → P', rule: '→ Intro', citations: '2-3' })
      ]
    });
  }

  /* ---- serializzazione: dati semplici, non oggetti di dominio ---- */
  serialize(container = this.proof) {
    return {
      goal: this.proof.goal,
      items: container.items.map(item => item.kind === 'line'
        ? { kind:'line', text:item.text, rule:item.rule, citations:item.citations }
        : { kind:'subproof', constant:item.constant, items: this.serialize(item).items })
    };
  }
  deserialize(data) {
    resetIds(1);
    const build = items => items.map(item => item.kind === 'line'
      ? new Line({ text:item.text, rule:item.rule, citations:item.citations })
      : new Subproof({ constant:item.constant, items: build(item.items) }));
    return new Proof({ goal: data.goal ?? '', items: build(data.items ?? []) });
  }
  persist() { this.repository.save('proof', this.serialize()); }

  /* ---- rendering ---- */
  render() {
    const host = clear($('#pf-proof'));
    const outcome = this.checkProof.execute({ proof: this.proof });
    const byId = new Map(outcome.lines.map(l => [l.id, l]));
    let number = 0;

    const renderLine = (line, container, isAssumption, subproof) => {
      number++;
      const wrapper = el('div');
      const row = el('div', 'pline');
      row.appendChild(el('div', 'pnum', String(number)));
      const body = el('div', 'pbody');

      if (isAssumption && subproof) {
        const constant = el('input', 'pconst formula');
        constant.value = subproof.constant || '';
        constant.placeholder = 'c';
        constant.maxLength = 3;
        constant.title = 'Costante nuova (per ∀ Intro / ∃ Elim)';
        constant.addEventListener('input', () => { subproof.constant = constant.value.trim(); });
        constant.addEventListener('blur', () => { this.render(); this.persist(); });
        body.appendChild(constant);
      }

      const text = el('input', 'pf formula');
      text.value = line.text; text.placeholder = 'formula'; text.dataset.fk = 'f' + line.id;
      text.addEventListener('input', () => { line.text = text.value; });
      text.addEventListener('blur', () => { this.render(); this.persist(); });
      text.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); line.text = text.value; this.insertAfter(container, line); }
      });
      body.appendChild(text);

      const rule = el('select', 'prule');
      RULE_NAMES.forEach(name => {
        const option = el('option', null, name || '— regola —');
        option.value = name;
        rule.appendChild(option);
      });
      rule.value = line.rule || '';
      rule.addEventListener('change', () => { line.rule = rule.value; this.render(); this.persist(); });
      body.appendChild(rule);

      const citations = el('input', 'prefs');
      citations.value = line.citations || ''; citations.placeholder = 'rif.';
      citations.addEventListener('input', () => { line.citations = citations.value; });
      citations.addEventListener('blur', () => { this.render(); this.persist(); });
      body.appendChild(citations);

      const result = byId.get(line.id) ?? { status: 'empty' };
      const status = el('span', 'pstat');
      if (result.status === 'ok') { status.classList.add('ok'); status.textContent = '●'; status.title = 'corretta'; }
      else if (result.status === 'invalid' || result.status === 'malformed') {
        status.classList.add('no'); status.textContent = '●'; status.title = result.message || '';
      } else { status.textContent = '○'; status.style.color = 'var(--rule)'; }
      body.appendChild(status);

      const remove = el('button', 'xbtn', '×');
      remove.addEventListener('click', () => {
        container.items.splice(container.items.indexOf(line), 1);
        this.render(); this.persist();
      });
      body.appendChild(remove);

      row.appendChild(body);
      wrapper.appendChild(row);
      if (result.message && (result.status === 'invalid' || result.status === 'malformed'))
        wrapper.appendChild(el('p', 'pmsg', result.message));
      return wrapper;
    };

    const renderContainer = (container, target) => {
      container.items.forEach((item, index) => {
        if (item.kind === 'line') {
          const isAssumption = container.kind === 'subproof' && index === 0;
          const node = renderLine(item, container, isAssumption, container);
          if (isAssumption) node.classList.add('assume');
          target.appendChild(node);
          return;
        }
        const box = el('div', 'sub');
        renderContainer(item, box);
        const tools = el('div', 'toolrow');
        tools.style.margin = '4px 0 2px 4px';
        const addLine = el('button', 'btn sm', '+ riga');
        addLine.addEventListener('click', () => { item.items.push(new Line()); this.render(); this.persist(); });
        const addSub = el('button', 'btn sm', '+ sottodim.');
        addSub.addEventListener('click', () => { item.items.push(new Subproof()); this.render(); this.persist(); });
        const drop = el('button', 'btn sm ghost', 'elimina blocco');
        drop.addEventListener('click', () => {
          container.items.splice(container.items.indexOf(item), 1); this.render(); this.persist();
        });
        tools.append(addLine, addSub, drop);
        box.appendChild(tools);
        target.appendChild(box);
      });
    };

    const scope = el('div', 'scope');
    renderContainer(this.proof, scope);

    let lastPremise = -1;
    this.proof.items.forEach((item, i) => {
      if (item.kind === 'line' && item.rule === Justification.PREMISE) lastPremise = i;
    });
    const children = [...scope.children];
    if (lastPremise >= 0 && children[lastPremise]) {
      Object.assign(children[lastPremise].style, {
        borderBottom: '1.5px solid var(--ink)', paddingBottom: '3px', marginBottom: '3px'
      });
    }
    host.appendChild(scope);

    const verdict = clear($('#pf-verdict'));
    const chipClass = VERDICT_CHIP[outcome.verdict.kind];
    if (chipClass) verdict.appendChild(el('span', `chip ${chipClass}`, outcome.verdict.message));

    if (this.focusKey) {
      const field = host.querySelector(`[data-fk="${this.focusKey}"]`);
      if (field) { field.focus(); field.selectionStart = field.selectionEnd = field.value.length; }
      this.focusKey = null;
    }
  }

  insertAfter(container, line) {
    const created = new Line({ rule: line.rule === Justification.PREMISE ? Justification.PREMISE : '' });
    container.items.splice(container.items.indexOf(line) + 1, 0, created);
    this.focusKey = 'f' + created.id;
    this.render(); this.persist();
  }
}
