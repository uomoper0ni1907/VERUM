# Verum

Tre strumenti web per un corso di logica del primo ordine:

- **Tavole** — tavole di verita' complete, validita' dell'argomento, soddisfacibilita' congiunta.
- **Mondi** — editor di mondi di blocchi e valutazione di enunciati quantificati.
- **Derivazioni** — editor di prove in stile Fitch con verifica regola per regola.

Il progetto e' una riscrittura originale e indipendente. Non contiene, non decompila
e non deriva da codice di software didattici esistenti.

## Avvio

I moduli ES non si caricano da `file://`. Serve un server statico:

    python3 -m http.server 8000     # poi apri http://localhost:8000
    # oppure: npx serve .

## Test

    node test/run.mjs

Due suite: comportamento del nucleo (parser, semantica, regole di inferenza) e
conformita' architetturale (direzione delle dipendenze fra strati).
Nessuna delle due avvia un browser.

## Build

    npm install && node build.mjs

Produce `dist/verum.html`, file singolo autonomo, comodo per la consegna e per
una demo offline.

## Struttura

    src/
      domain/          logica pura: linguaggio, tavole, mondi, prove
      application/     casi d'uso e porte
      infrastructure/  adattatori: DOM, localStorage, orologio
      main.js          composition root
    test/
    build.mjs

Le regole che tengono in piedi questa struttura sono descritte in ARCHITETTURA.md
e verificate da `test/architecture.test.mjs`.
