import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export async function estraiTestoPdf(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const doc = await pdfjsLib.getDocument({ data: buffer }).promise;
  let testo = '';
  for (let i = 1; i <= doc.numPages; i++) {
    const pagina = await doc.getPage(i);
    const content = await pagina.getTextContent();
    const righe = content.items.map((item) => ('str' in item ? item.str : '')).join(' ');
    testo += righe + '\n';
  }
  return testo;
}

// Estrazione best-effort delle voci principali di un cedolino italiano standard.
// Il parsing dei PDF dei cedolini NON è standardizzato tra software paghe diversi:
// questa funzione tenta dei pattern comuni (importi con virgola decimale, parole chiave italiane)
// ma ogni campo che non trova viene lasciato a 0/undefined e segnalato come "da verificare manualmente".

export interface CampiEstrattiCedolino {
  mese?: number;
  anno?: number;
  retribuzioneBase?: number;
  totaleCompetenze?: number;
  contributiInps?: number;
  irpefTrattenuta?: number;
  nettoPagato?: number;
  tfrMaturatoMese?: number;
  imponibileFiscaleMese?: number;
  imponibileFiscaleCumulato?: number;
  addizionaliRegionaliComunali?: number;
  irpefCumulata?: number;
  campiNonTrovati: string[];
}

const MESI_ITALIANI = [
  'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
  'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre',
];

function parseImportoItaliano(testo: string): number | undefined {
  // Formato italiano: 1.234,56 oppure 1234,56
  const match = testo.match(/-?\d{1,3}(?:\.\d{3})*,\d{2}/);
  if (!match) return undefined;
  const normalizzato = match[0].replace(/\./g, '').replace(',', '.');
  const valore = parseFloat(normalizzato);
  return Number.isFinite(valore) ? valore : undefined;
}

function cercaImportoVicinoChiave(testo: string, chiavi: string[]): number | undefined {
  const testoLower = testo.toLowerCase();
  for (const chiave of chiavi) {
    const idx = testoLower.indexOf(chiave.toLowerCase());
    if (idx === -1) continue;
    // Guarda nei 60 caratteri successivi alla chiave trovata
    const finestra = testo.slice(idx, idx + 80);
    const importo = parseImportoItaliano(finestra);
    if (importo !== undefined) return importo;
  }
  return undefined;
}

const MESI_ABBREVIATI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];

function cercaMeseAnno(testoPdf: string): { mese?: number; anno?: number } {
  const testoLower = testoPdf.toLowerCase();

  // 1. Mese per nome esteso (es. "Marzo 2026")
  for (let i = 0; i < MESI_ITALIANI.length; i++) {
    if (testoLower.includes(MESI_ITALIANI[i])) {
      const idx = testoLower.indexOf(MESI_ITALIANI[i]);
      const finestra = testoPdf.slice(idx, idx + 30);
      const annoVicino = finestra.match(/20\d{2}/);
      return { mese: i + 1, anno: annoVicino ? parseInt(annoVicino[0], 10) : undefined };
    }
  }

  // 2. Formato numerico MM/AAAA o MM-AAAA (es. "Periodo: 03/2026")
  const matchNumerico = testoPdf.match(/(0[1-9]|1[0-2])[/\-.](20\d{2})/);
  if (matchNumerico) {
    return { mese: parseInt(matchNumerico[1], 10), anno: parseInt(matchNumerico[2], 10) };
  }

  // 3. Mese abbreviato (es. "Mar 2026", "MAR26")
  for (let i = 0; i < MESI_ABBREVIATI.length; i++) {
    const idx = testoLower.indexOf(MESI_ABBREVIATI[i]);
    if (idx !== -1) {
      const finestra = testoPdf.slice(idx, idx + 20);
      const annoVicino = finestra.match(/20\d{2}/);
      return { mese: i + 1, anno: annoVicino ? parseInt(annoVicino[0], 10) : undefined };
    }
  }

  return {};
}

export function estraiCampiCedolino(testoPdf: string): CampiEstrattiCedolino {
  const campiNonTrovati: string[] = [];

  const { mese, anno } = cercaMeseAnno(testoPdf);
  if (!anno) {
    const matchAnnoGenerico = testoPdf.match(/20\d{2}/);
    if (matchAnnoGenerico) {
      campiNonTrovati.push('anno (trovato un anno nel testo ma non vicino al mese: verificare)');
    } else {
      campiNonTrovati.push('anno');
    }
  }
  if (!mese) campiNonTrovati.push('mese');

  // Ogni campo prova più sinonimi usati dai diversi software paghe italiani (Zucchetti, ADP, SAP HR,
  // TeamSystem, Inaz...). Se nessuno corrisponde, il campo resta vuoto e va inserito a mano.
  const retribuzioneBase = cercaImportoVicinoChiave(testoPdf, [
    'minimo contrattuale', 'paga base', 'retribuzione base', 'retribuzione tabellare',
    'stipendio base', 'paga tabellare',
  ]);
  if (retribuzioneBase === undefined) campiNonTrovati.push('retribuzioneBase');

  const totaleCompetenze = cercaImportoVicinoChiave(testoPdf, [
    'totale competenze', 'totale lordo', 'totale voci competenza', 'totale retributivo',
    'totale lordo mensile', 'totale imponibile previdenziale',
  ]);
  if (totaleCompetenze === undefined) campiNonTrovati.push('totaleCompetenze');

  const contributiInps = cercaImportoVicinoChiave(testoPdf, [
    'contributi inps a carico dipendente', 'contr. inps', 'totale ritenute inps',
    'contributi a carico lavoratore', 'trattenute previdenziali', 'contributi ivs dipendente',
    'c/dipendente inps',
  ]);
  if (contributiInps === undefined) campiNonTrovati.push('contributiInps');

  const irpefTrattenuta = cercaImportoVicinoChiave(testoPdf, [
    'irpef trattenuta', 'ritenute irpef', 'imposta netta mese', 'irpef netta del mese',
    'ritenute fiscali', 'irpef mese',
  ]);
  if (irpefTrattenuta === undefined) campiNonTrovati.push('irpefTrattenuta');

  const nettoPagato = cercaImportoVicinoChiave(testoPdf, [
    'netto da pagare', 'netto in busta', 'netto a pagare', 'netto del mese',
    'totale netto', 'nettto competenze',
  ]);
  if (nettoPagato === undefined) campiNonTrovati.push('nettoPagato');

  const tfrMaturatoMese = cercaImportoVicinoChiave(testoPdf, [
    'tfr del mese', 'quota tfr', 'tfr maturato nel mese', 'accantonamento tfr mese', 'quota tfr maturata',
  ]);
  if (tfrMaturatoMese === undefined) campiNonTrovati.push('tfrMaturatoMese');

  const imponibileFiscaleMese = cercaImportoVicinoChiave(testoPdf, [
    'imponibile fiscale del mese', 'imponibile irpef mese', 'imponibile fiscale mese corrente',
  ]);
  if (imponibileFiscaleMese === undefined) campiNonTrovati.push('imponibileFiscaleMese');

  const imponibileFiscaleCumulato = cercaImportoVicinoChiave(testoPdf, [
    'imponibile fiscale progressivo', 'imponibile fiscale cumulato', 'progressivo imponibile',
    'imponibile fiscale totale', 'cumulo imponibile fiscale',
  ]);
  if (imponibileFiscaleCumulato === undefined) campiNonTrovati.push('imponibileFiscaleCumulato');

  const irpefCumulata = cercaImportoVicinoChiave(testoPdf, [
    'irpef progressiva', 'irpef cumulata', 'ritenute irpef progressivo', 'irpef totale anno',
    'cumulo irpef',
  ]);
  if (irpefCumulata === undefined) campiNonTrovati.push('irpefCumulata');

  const addizionaliRegionaliComunali = cercaImportoVicinoChiave(testoPdf, [
    'addizionale regionale', 'addizionale comunale', 'addizionali irpef', 'add.le regionale', 'add.le comunale',
  ]);
  if (addizionaliRegionaliComunali === undefined) campiNonTrovati.push('addizionaliRegionaliComunali');

  return {
    mese,
    anno,
    retribuzioneBase,
    totaleCompetenze,
    contributiInps,
    irpefTrattenuta,
    nettoPagato,
    tfrMaturatoMese,
    imponibileFiscaleMese,
    imponibileFiscaleCumulato,
    irpefCumulata,
    addizionaliRegionaliComunali,
    campiNonTrovati,
  };
}
