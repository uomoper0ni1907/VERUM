// SPDX-FileCopyrightText: 2026 Liam Michael Boland
// SPDX-License-Identifier: LicenseRef-Verum-Proprietary
/**
 * Smoke test del bundle distribuito (dist/verum.html) in un DOM simulato.
 *
 * Non verifica l'aspetto grafico: verifica che il file che consegni si avvii
 * senza errori e che le tre schermate, i temi e il footer siano collegati.
 * Esecuzione:  node build.mjs && node test/smoke.test.mjs
 */
import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../dist/verum.html', import.meta.url), 'utf8');
const runtimeErrors = [];
const dom = new JSDOM(html, {
  runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/',
  beforeParse(window) {
    window.onerror = message => runtimeErrors.push(String(message));
    window.console.error = (...args) => runtimeErrors.push(args.map(String).join(' '));
    window.console.info = () => {};
    window.scrollTo = () => {};
    window.structuredClone = globalThis.structuredClone;
  }
});
await new Promise(resolve => setTimeout(resolve, 300));
const d = dom.window.document;

let pass = 0, fail = 0;
const t = (name, condition) => { condition ? pass++ : (fail++, console.log('  FALLITO:', name)); };

t('nessun errore all\u2019avvio', runtimeErrors.length === 0);
t('footer in ogni schermata', d.querySelectorAll('.screen .foot').length === 4);
t('footer con il copyright', [...d.querySelectorAll('.foot')].every(f => f.textContent.includes('2026 Liam Michael Boland')));
t('selettore tema in ogni schermata', d.querySelectorAll('[data-themes]').length === 4);

for (const theme of ['neon', 'dark', 'minimal']) {
  d.querySelector(`[data-themes] button[data-look="${theme}"]`).click();
  t(`tema ${theme} applicato`, d.documentElement.dataset.look === theme);
  t(`tema ${theme} sincronizzato su tutti i selettori`,
    d.querySelectorAll(`button[data-look="${theme}"][aria-pressed="true"]`).length === 4);
}
t('tema ricordato', dom.window.localStorage.getItem('verum:theme') === '"minimal"');

t('tavolo 8x8', d.querySelectorAll('#wd-board .cell').length === 64);
t('scacchiera alternata', d.querySelectorAll('#wd-board .cell.dark').length === 32);
t('pezzi disegnati', d.querySelectorAll('#wd-board .blk svg').length > 0);
t('gradienti condivisi presenti', !!d.getElementById('vg-top'));

d.querySelector('#wd-example').click();
t('valutazione nel mondo', d.querySelectorAll('#wd-rows .chip').length === 5);
d.querySelector('#tt-example').click();
t('tavola di verita\u2019', d.querySelectorAll('#tt-out tbody tr').length === 8);
d.querySelector('#pf-example').click();
t('prova di esempio completa', d.querySelector('#pf-verdict').textContent.includes('completa'));

if (runtimeErrors.length) console.log(runtimeErrors.join('\n'));
console.log(`\nsmoke test: ${pass} passati, ${fail} falliti`);
process.exit(fail ? 1 : 0);
