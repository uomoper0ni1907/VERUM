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
import { TruthTableView } from './infrastructure/web/TruthTableView.js';
import { WorldView } from './infrastructure/web/WorldView.js';
import { ProofView } from './infrastructure/web/ProofView.js';

const repository = new LocalStorageWorkspaceRepository();

const buildTruthTable = new BuildTruthTable();
const evaluateInWorld = new EvaluateInWorld();
const checkProof      = new CheckProof();

async function bootstrap() {
  new Router().start();
  new SymbolPalette().start();

  await new TruthTableView({ buildTruthTable, repository }).start();
  await new WorldView({ evaluateInWorld, repository }).start();
  await new ProofView({ checkProof, repository }).start();
}

bootstrap().catch(error => {
  console.error('avvio fallito', error);
  document.body.prepend(Object.assign(document.createElement('p'), {
    textContent: 'Errore di avvio: ' + error.message,
    style: 'padding:12px;background:#F7E5E2;color:#A23429;margin:0'
  }));
});
