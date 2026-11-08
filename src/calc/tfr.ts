// Calcolo TFR (Trattamento di Fine Rapporto) - art. 2120 Codice Civile.
// Quota maturata nell'anno = retribuzione utile TFR annua / 13,5.
// La rivalutazione (1,5% fisso + 75% dell'inflazione ISTAT) si applica solo al TFR già accantonato
// negli anni precedenti e viene liquidata al 31/12 (o al netto d'imposta sostitutiva 17% sulla rivalutazione).

export interface RisultatoTfrMensile {
  retribuzioneUtileTfr: number;
  quotaMaturata: number;
  formula: string;
}

// retribuzioneUtileTfrMensile: imponibile TFR del mese (di norma = totale competenze, salvo esclusioni da CCNL).
export function calcolaQuotaTfrMensile(retribuzioneUtileTfrMensile: number): RisultatoTfrMensile {
  const quotaMaturata = retribuzioneUtileTfrMensile / 13.5;
  return {
    retribuzioneUtileTfr: retribuzioneUtileTfrMensile,
    quotaMaturata,
    formula: `retribuzione utile TFR del mese (€${retribuzioneUtileTfrMensile.toFixed(2)}) / 13,5`,
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
      ? 'Quota TFR mensile coerente con il calcolo (retribuzione utile / 13,5).'
      : `Quota TFR nel cedolino (€${quotaCedolino.toFixed(2)}) diversa dal calcolo atteso (€${attesa.toFixed(2)}). Verificare se alcune voci sono escluse dalla base di calcolo TFR per il tuo CCNL.`,
  };
}
