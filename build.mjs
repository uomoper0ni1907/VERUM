/**
 * Build: produce un singolo file HTML autonomo (dist/verum.html) inlinando
 * il bundle. Serve solo per la distribuzione; lo sviluppo usa i moduli ES.
 *   node build.mjs
 */
import { build } from 'esbuild';
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const result = await build({
  entryPoints: ['src/main.js'],
  bundle: true, format: 'iife', target: 'es2022',
  write: false, minify: false, legalComments: 'none'
});
const js = result.outputFiles[0].text;
const html = await readFile('index.html', 'utf8');
await mkdir('dist', { recursive: true });
await writeFile('dist/verum.html',
  html.replace('<script type="module" src="./src/main.js"></script>', `<script>\n${js}\n</script>`));
console.log('dist/verum.html scritto:', (js.length / 1024).toFixed(1), 'kB di JS');
