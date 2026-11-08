// Contributi INPS a carico del lavoratore dipendente - settore industria metalmeccanica.
// Due componenti osservate consistentemente sui cedolini reali del settore (azienda industriale
// soggetta a CIGS, oltre 15 dipendenti):
//   - 9,19% IVS/FPLD (9,00% ordinario + 0,19% aggiuntivo oltre il primo scaglione di retribuzione
//     pensionabile, dovuto dalla generalità dei lavoratori);
//   - 0,30% CIGS (Cassa Integrazione Guadagni Straordinaria) - a carico del lavoratore nelle aziende
//     industriali soggette a questo istituto (tipicamente oltre 15 dipendenti). NON si applica invece
//     alle piccole aziende non soggette a CIGS: in quel caso l'aliquota corretta è solo 9,19%.
// FONTE: Circolare INPS n. 27 del 30/1/2025 (aliquote 2025, confermate per il 2026 secondo le fonti
// consultate) per la quota IVS; la quota CIGS 0,30% è un'aliquota contributiva ordinaria del settore
// industria, riscontrata sui cedolini reali analizzati.
// NB: oltre il massimale di retribuzione pensionabile (c.d. "prima fascia", circa 56.224€/anno nel 2026
// per chi non ha anzianità contributiva ante 1996), l'aliquota IVS sale di 1 punto percentuale aggiuntivo
// sulla parte eccedente. Questo calcolo non gestisce quella soglia: per imponibili mensili molto alti
// (es. per effetto di bonus una tantum) la trattenuta reale può risultare più alta senza che sia un errore.

export const ALIQUOTA_INPS_IVS = 0.0919;
export const ALIQUOTA_INPS_CIGS = 0.0030;
export const ALIQUOTA_INPS_DIPENDENTE = ALIQUOTA_INPS_IVS + ALIQUOTA_INPS_CIGS; // 9,49% - default per aziende industriali soggette a CIGS

export interface RisultatoContributiInps {
  imponibile: number;
  contributoCalcolato: number;
  formula: string;
}

export function calcolaContributiInpsDipendente(imponibileContributivo: number): RisultatoContributiInps {
  const contributoCalcolato = imponibileContributivo * ALIQUOTA_INPS_DIPENDENTE;
  return {
    imponibile: imponibileContributivo,
    contributoCalcolato,
    formula: `imponibile contributivo (€${imponibileContributivo.toFixed(2)}) x (${(ALIQUOTA_INPS_IVS * 100).toFixed(2)}% IVS + ${(ALIQUOTA_INPS_CIGS * 100).toFixed(2)}% CIGS = ${(ALIQUOTA_INPS_DIPENDENTE * 100).toFixed(2)}%)`,
  };
}

export interface ConfrontoInps {
  trattenutaCedolino: number;
  attesaCalcolata: number;
  differenza: number;
  entroTolleranza: boolean;
  messaggio: string;
}

const TOLLERANZA_EURO = 2.0; // tolleranza per arrotondamenti/conguagli

export function confrontaContributiInps(
  imponibileContributivo: number,
  trattenutaCedolino: number,
): ConfrontoInps {
  const attesa = calcolaContributiInpsDipendente(imponibileContributivo).contributoCalcolato;
  const differenza = trattenutaCedolino - attesa;
  const entroTolleranza = Math.abs(differenza) <= TOLLERANZA_EURO;
  return {
    trattenutaCedolino,
    attesaCalcolata: attesa,
    differenza,
    entroTolleranza,
    messaggio: entroTolleranza
      ? `Trattenuta INPS coerente con l'aliquota attesa (${(ALIQUOTA_INPS_DIPENDENTE * 100).toFixed(2)}%).`
      : `Trattenuta INPS (€${trattenutaCedolino.toFixed(2)}) diversa dal calcolo atteso (€${attesa.toFixed(2)}, differenza €${differenza.toFixed(2)}). Se la tua azienda ha meno di 15 dipendenti potrebbe non essere soggetta al contributo CIGS 0,30% (in quel caso l'aliquota corretta è 9,19%, non 9,49%); altrimenti può dipendere da conguagli o dal massimale contributivo: verifica il dettaglio del cedolino.`,
  };
}
