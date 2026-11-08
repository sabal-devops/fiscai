import type { Profilo, DocumentoContrattuale, SpesaMedica, Cedolino } from '../types';

// Checklist dei documenti necessari per completare il 730 (dipendente privato senza partita IVA).
// Alcuni elementi sono SEMPRE obbligatori, altri sono obbligatori solo "se applicabile"
// (es. interessi mutuo solo se hai un mutuo attivo). Dove possibile, lo stato è dedotto
// automaticamente dai dati già presenti in FiscAI; altrimenti va spuntato manualmente dopo averlo
// verificato con i propri documenti reali.

export type StatoChecklist = 'completo' | 'mancante' | 'non_applicabile' | 'da_verificare';

export interface VoceChecklist730 {
  chiave: string;
  titolo: string;
  spiegazione: string;
  obbligatorioSempre: boolean;
  dove: string;
  stato: StatoChecklist;
  dettaglioStato: string;
}

export function calcolaChecklist730(
  profilo: Profilo | undefined,
  documenti: DocumentoContrattuale[],
  speseMediche: SpesaMedica[],
  cedolini: Cedolino[],
  anno: number,
): VoceChecklist730[] {
  const voci: VoceChecklist730[] = [];

  // 1. CU dell'anno di riferimento (sempre obbligatoria)
  const haCu = documenti.some((d) => d.tipo === 'cu');
  voci.push({
    chiave: 'cu',
    titolo: 'Certificazione Unica (CU)',
    spiegazione: 'Riepiloga i redditi da lavoro dipendente dell\'anno e le ritenute già operate: è il documento base per compilare il 730.',
    obbligatorioSempre: true,
    dove: 'La rilascia il datore di lavoro (per Accenture, di norma dal portale HR interno). Caricala nel Modulo 4.',
    stato: haCu ? 'completo' : 'mancante',
    dettaglioStato: haCu ? 'Caricata nel Modulo 4.' : 'Non ancora caricata: la trovi di solito disponibile da marzo dell\'anno successivo.',
  });

  // 2. Dati anagrafici e codice fiscale completi (Modulo 1)
  const anagraficaCompleta = !!(profilo?.nome && profilo?.cognome && profilo?.codiceFiscale);
  voci.push({
    chiave: 'anagrafica',
    titolo: 'Dati anagrafici e codice fiscale',
    spiegazione: 'Necessari per l\'intestazione della dichiarazione.',
    obbligatorioSempre: true,
    dove: 'Compilali nel Modulo 1 - Profilo.',
    stato: anagraficaCompleta ? 'completo' : 'mancante',
    dettaglioStato: anagraficaCompleta ? 'Compilati nel Modulo 1.' : 'Mancano nome, cognome o codice fiscale nel Modulo 1.',
  });

  // 3. Cedolini dell'anno (utile per controllo incrociato con la CU, non obbligatorio di per sé)
  const cedoliniAnno = cedolini.filter((c) => c.anno === anno);
  voci.push({
    chiave: 'cedolini',
    titolo: `Cedolini dell'anno ${anno} caricati in FiscAI`,
    spiegazione: 'Non obbligatori per il 730 (basta la CU), ma utili per verificare che la CU sia coerente con quanto ricevuto mese per mese.',
    obbligatorioSempre: false,
    dove: 'Caricali nel Modulo 2 - Cedolini, mano a mano che li ricevi.',
    stato: cedoliniAnno.length >= 11 ? 'completo' : cedoliniAnno.length > 0 ? 'da_verificare' : 'non_applicabile',
    dettaglioStato: `${cedoliniAnno.length} cedolino/i caricato/i su circa 13 attesi nell'anno.`,
  });

  // 4. Spese mediche (obbligatorio solo se ne hai sostenute)
  const speseAnno = speseMediche.filter((s) => new Date(s.data).getFullYear() === anno);
  const totaleSpeseAnno = speseAnno.reduce((acc, s) => acc + s.importo, 0);
  voci.push({
    chiave: 'spese_mediche',
    titolo: 'Ricevute/fatture delle spese mediche',
    spiegazione: 'Servono come prova delle spese registrate, da conservare (il CAF/commercialista può chiederle) anche se il 730 precompilato spesso le riporta già in automatico.',
    obbligatorioSempre: false,
    dove: 'Conserva gli originali; in FiscAI le hai già riepilogate nel Modulo 5.',
    stato: speseAnno.length > 0 ? 'da_verificare' : 'non_applicabile',
    dettaglioStato: speseAnno.length > 0
      ? `${speseAnno.length} spesa/e registrata/e in FiscAI per un totale di €${totaleSpeseAnno.toFixed(2)}: assicurati di avere le ricevute/fatture corrispondenti conservate.`
      : 'Nessuna spesa medica registrata quest\'anno: se non ne hai sostenute, questo documento non ti serve.',
  });

  // 5. Interessi passivi mutuo prima casa (obbligatorio solo se mutuo attivo)
  const haMutuo = !!profilo?.mutuo.attivo;
  voci.push({
    chiave: 'mutuo',
    titolo: 'Certificazione interessi passivi mutuo prima casa',
    spiegazione: 'Documento rilasciato dalla banca con il totale degli interessi passivi pagati nell\'anno, detraibili al 19%.',
    obbligatorioSempre: false,
    dove: 'La richiedi alla banca che eroga il mutuo (spesso disponibile nell\'area riservata online).',
    stato: !haMutuo ? 'non_applicabile' : 'da_verificare',
    dettaglioStato: !haMutuo
      ? 'Nel Modulo 1 risulta che non hai un mutuo attivo: documento non necessario.'
      : `Nel Modulo 1 risulta un mutuo attivo con interessi dichiarati di €${profilo?.mutuo.interessiAnnui.toFixed(2)}: verifica di avere la certificazione della banca con lo stesso importo.`,
  });

  // 6. IBAN per eventuale rimborso
  voci.push({
    chiave: 'iban',
    titolo: 'IBAN per eventuale rimborso',
    spiegazione: 'Se dal 730 risulta un credito e non lo ricevi tramite il datore di lavoro, serve un IBAN per l\'accredito diretto dall\'Agenzia delle Entrate.',
    obbligatorioSempre: false,
    dove: 'Il tuo conto corrente personale; da comunicare al CAF o da inserire tu stesso nel modello.',
    stato: 'da_verificare',
    dettaglioStato: 'FiscAI non traccia l\'IBAN: tienilo a portata di mano quando compili o consegni il 730.',
  });

  return voci;
}
