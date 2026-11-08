// Contributi INPS a carico del lavoratore dipendente - settore industria metalmeccanica.
// Aliquota complessiva a carico dipendente: 9,19% dell'imponibile contributivo
// (9,00% IVS + 0,19% aggiuntivo oltre il primo scaglione di retribuzione pensionabile, dovuto dalla generalità dei lavoratori).
// FONTE: Circolare INPS n. 27 del 30/1/2025 (aliquote 2025, confermate per il 2026 secondo le fonti consultate).
// Verificare la circolare INPS dell'anno in corso: alcune fonti citano anche una Circolare INPS n. 6/2026.
// NB: oltre il massimale di retribuzione pensionabile (c.d. "prima fascia", circa 56.224€/anno nel 2026 per chi
// non ha anzianità contributiva ante 1996), l'aliquota a carico del lavoratore sale di 1 punto percentuale.
// Questo calcolo NON gestisce tale soglia: per RAL superiori a tale massimale, la trattenuta INPS reale potrebbe
// risultare più alta del calcolo atteso senza che questo indichi un errore nel cedolino.

export const ALIQUOTA_INPS_DIPENDENTE = 0.0919;

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
    formula: `imponibile contributivo (€${imponibileContributivo.toFixed(2)}) x ${(ALIQUOTA_INPS_DIPENDENTE * 100).toFixed(2)}%`,
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
      ? 'Trattenuta INPS coerente con l\'aliquota standard 9,19%.'
      : `Trattenuta INPS (€${trattenutaCedolino.toFixed(2)}) diversa dal calcolo atteso (€${attesa.toFixed(2)}, differenza €${differenza.toFixed(2)}). Può dipendere da conguagli, massimale contributivo o voci non standard: verificare il dettaglio del cedolino.`,
  };
}
