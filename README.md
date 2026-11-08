# FiscAI

Commercialista digitale personale, locale e offline, per dipendenti privati senza partita IVA.

## Cosa fa

- **Modulo 1 — Profilo contribuente**: dati anagrafici, contratto, CCNL, livello, RAL, familiari a carico, immobili, mutuo.
- **Modulo 2 — Cedolini**: caricamento PDF (estrazione automatica best-effort) o inserimento manuale, con verifiche su retribuzione base vs minimo CCNL, contributi INPS, TFR, buoni pasto, IRPEF cumulata e variazioni mese su mese.
- **Modulo 3 — Presenze mensili**: ore ordinarie/straordinarie, ferie, ROL, reperibilità; calcolo della retribuzione attesa e confronto col cedolino.
- **Modulo 4 — Contratto di riferimento**: upload di contratto individuale e/o CCNL, con estrazione testo per consultazione e ricerca.
- **Modulo 5 — Spese mediche**: registro spese e calcolo della detrazione IRPEF 19% sull'eccedenza rispetto alla franchigia di 129,11€.
- **Modulo 6 — Scadenzario fiscale**: scadenze standard per un dipendente senza P.IVA (CU, 730, Cassetto Fiscale), con reminder configurabili e checklist.
- **Modulo 7 — Dashboard annuale**: lordo cumulato vs atteso, netto mensile, IRPEF versata e proiettata, TFR cumulato, detrazioni recuperabili, alert attivi.
- **Modulo 8 — Export**: report PDF annuale per il CAF, export CSV dei cedolini, backup/restore completo in JSON.

## Principi

- **Tutto locale**: nessun dato lascia il browser. I dati sono salvati in IndexedDB; l'app funziona offline dopo il primo caricamento.
- **Calcoli trasparenti**: ogni verifica mostra la formula usata (vedi i moduli in `src/calc/`), non solo il risultato.
- **Nessuna invenzione di dati**: se manca un'informazione per completare un calcolo (es. livello CCNL non in tabella), l'app lo segnala esplicitamente invece di stimarlo.

## Sicurezza e privacy

Il codice di questo repository è pubblico, ma **i tuoi dati non lo sono**: cedolini, contratti, importi,
dati anagrafici non vengono mai trasmessi a nessun server né salvati nel repository. L'app:

- non contiene alcuna chiamata di rete verso API esterne (nessun `fetch`, nessun backend);
- estrae il testo dai PDF caricati interamente nel browser (libreria `pdfjs-dist`, eseguita in locale);
- salva ogni dato inserito solo in IndexedDB, un database del browser legato al dispositivo su cui lo usi;
- non invia telemetria, analytics o log a servizi terzi.

Quando usi la versione pubblicata su GitHub Pages, il sito serve solo i file statici dell'applicazione
(HTML/CSS/JS): i dati che inserisci restano nel tuo browser, esattamente come se l'app girasse in locale.

Il `.gitignore` blocca inoltre il commit accidentale di export/backup generati dall'app (PDF, CSV, JSON di
backup) nel caso vengano salvati per errore dentro la cartella del progetto.

## Avvertenza

I valori di riferimento (scaglioni IRPEF, aliquote INPS, minimi tabellari CCNL, limiti buoni pasto) sono aggiornati alla data di sviluppo e vanno verificati periodicamente con le fonti ufficiali (Agenzia delle Entrate, INPS, CCNL Metalmeccanici Industria) o con il proprio CAF/commercialista. FiscAI è uno strumento di supporto personale, non sostituisce una consulenza fiscale professionale.

## Sviluppo

```bash
npm install
npm run dev      # avvia il server di sviluppo
npm run build    # build di produzione (output statico in dist/)
```

L'app è una SPA statica (Vite + React + TypeScript): una volta buildata, `dist/` può essere aperta/servita anche senza connessione internet.
