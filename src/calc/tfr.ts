// Calcolo TFR (Trattamento di Fine Rapporto) - art. 2120 Codice Civile.
// Quota lorda maturata nel mese = retribuzione utile TFR del mese / 13,5.
// Da questa quota il datore di lavoro trattiene lo 0,50% della retribuzione utile TFR e lo versa
// all'INPS come contributo al Fondo di Garanzia del TFR (art. 2, L. 297/1982) - obbligatorio per
// la generalità dei datori di lavoro privati. La quota netta accantonata sul cedolino è quindi:
//   quota netta = retribuzione utile TFR x (1/13,5 - 0,50%) = retribuzione utile TFR x 6,907% circa
// (coefficiente verificato sui cedolini reali analizzati).
// La rivalutazione (1,5% fisso + 75% dell'inflazione ISTAT) si applica solo al TFR già accantonato
// negli anni precedenti e viene liquidata al 31/12 (o al netto d'imposta sostitutiva 17% sulla rivalutazione).

export const ALIQUOTA_TFR_LORDA = 1 / 13.5;
export const ALIQUOTA_FONDO_GARANZIA = 0.005;
export const ALIQUOTA_TFR_NETTA = ALIQUOTA_TFR_LORDA - ALIQUOTA_FONDO_GARANZIA;

export interface RisultatoTfrMensile {
  retribuzioneUtileTfr: number;
  quotaMaturata: number;
  formula: string;
}

// retribuzioneUtileTfrMensile: imponibile TFR del mese (di norma = totale competenze, salvo esclusioni da CCNL,
// es. bonus una tantum spesso esclusi dalla base TFR per contratto).
export function calcolaQuotaTfrMensile(retribuzioneUtileTfrMensile: number): RisultatoTfrMensile {
  const quotaMaturata = retribuzioneUtileTfrMensile * ALIQUOTA_TFR_NETTA;
  return {
    retribuzioneUtileTfr: retribuzioneUtileTfrMensile,
    quotaMaturata,
    formula: `retribuzione utile TFR del mese (€${retribuzioneUtileTfrMensile.toFixed(2)}) x (1/13,5 - 0,50% Fondo Garanzia TFR = ${(ALIQUOTA_TFR_NETTA * 100).toFixed(3)}%)`,
  };
}

export interface ConfrontoTfr {
  quotaAttesa: number;
  quotaCedolino: number;
  differenza: number;
  entroTolleranza: boolean;
  messaggio: string;
}

const TOLLERANZA_EURO = 1.0;

export function confrontaTfrMaturato(
  retribuzioneUtileTfrMensile: number,
  quotaCedolino: number,
): ConfrontoTfr {
  const attesa = calcolaQuotaTfrMensile(retribuzioneUtileTfrMensile).quotaMaturata;
  const differenza = quotaCedolino - attesa;
  const entroTolleranza = Math.abs(differenza) <= TOLLERANZA_EURO;
  return {
    quotaAttesa: attesa,
    quotaCedolino,
    differenza,
    entroTolleranza,
    messaggio: entroTolleranza
      ? 'Quota TFR mensile coerente con il calcolo (retribuzione utile x 6,907%, al netto del Fondo di Garanzia).'
      : `Quota TFR nel cedolino (€${quotaCedolino.toFixed(2)}) diversa dal calcolo atteso (€${attesa.toFixed(2)}). Può succedere nel mese di assunzione/cessazione o se alcune voci (es. bonus una tantum) sono escluse dalla base di calcolo TFR per il tuo contratto: verifica il dettaglio.`,
  };
}
