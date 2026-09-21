// SPDX-FileCopyrightText: 2026 Liam Michael Boland
// SPDX-License-Identifier: LicenseRef-Verum-Proprietary
/**
 * Composition root
 *
 * L'unico punto del programma in cui si nominano insieme dominio,
 * applicazione e infrastruttura. Qui si decide quale adattatore soddisfa
 * quale porta; nessun altro file istanzia le proprie dipendenze.
 * Per passare a un backend basta sostituire una riga.
 */
import { BuildTruthTable } from './application/BuildTruthTable.js';
import { EvaluateInWorld } from './application/EvaluateInWorld.js';
import { CheckProof } from './application/CheckProof.js';

import { LocalStorageWorkspaceRepository } from './infrastructure/persistence/LocalStorageWorkspaceRepository.js';
import { Router } from './infrastructure/web/Router.js';
import { SymbolPalette } from './infrastructure/web/SymbolPalette.js';
import { ThemeSwitcher } from './infrastructure/web/ThemeSwitcher.js';
import { TruthTableView } from './infrastructure/web/TruthTableView.js';
import { WorldView } from './infrastructure/web/WorldView.js';
import { ProofView } from './infrastructure/web/ProofView.js';
import { RulesPdfPanel } from './infrastructure/web/RulesPdfPanel.js';
import { SentenceLibraryMenu } from './infrastructure/web/SentenceLibraryMenu.js';
import { BlocksKeypad } from './infrastructure/web/BlocksKeypad.js';
import { SenFileImporter } from './infrastructure/import/SenFileImporter.js';
import { BrowserFileStore } from './infrastructure/persistence/BrowserFileStore.js';

const repository = new LocalStorageWorkspaceRepository();
const fileStore  = new BrowserFileStore();

/* Versione 2 del formato: le versioni precedenti salvavano gli esempi precaricati. */
const SCHEMA_VERSION = 2;

const buildTruthTable = new BuildTruthTable();
const evaluateInWorld = new EvaluateInWorld();
const checkProof      = new CheckProof();

async function bootstrap() {
  console.info('Verum \u00a9 2026 Liam Michael Boland. Tutti i diritti riservati.');
  await repository.resetIfOutdated(SCHEMA_VERSION, ['truth-table', 'world', 'proof']);
  new Router().start();
  new SymbolPalette().start();
  await new ThemeSwitcher({ repository }).start();

  await new TruthTableView({ buildTruthTable, repository }).start();
  const worldView = new WorldView({ evaluateInWorld, repository });
  await worldView.start();
  new BlocksKeypad({ host: document.getElementById('wd-keypad'), fields: document.getElementById('wd-rows') }).start();
  await new SentenceLibraryMenu({
    button: document.getElementById('wd-library'),
    host: document.getElementById('wd-libpop'),
    repository,
    importer: new SenFileImporter(),
    onPick: collection => worldView.loadCollection(collection)
  }).start();
  await new ProofView({ checkProof, repository }).start();
  await new RulesPdfPanel({ host: document.getElementById('pf-rules'), fileStore }).start();
}

bootstrap().catch(error => {
  console.error('avvio fallito', error);
  document.body.prepend(Object.assign(document.createElement('p'), {
    textContent: 'Errore di avvio: ' + error.message,
    style: 'padding:12px;background:#F7E5E2;color:#A23429;margin:0'
  }));
});
