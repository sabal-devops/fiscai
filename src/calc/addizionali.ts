// Verifica indicativa delle addizionali regionali e comunali IRPEF trattenute in busta paga.
//
// IMPORTANTE - limiti di questo calcolo: le addizionali reali si calcolano sul reddito imponibile
// IRPEF dell'ANNO PRECEDENTE (o a conguaglio a fine rapporto) e vengono rateizzate dal datore di
// lavoro su un numero di mensilità che varia (tipicamente 9-11 rate, da gennaio/marzo a novembre).
// Questo modulo NON riproduce quel meccanismo: calcola solo una stima "a regime" basata
// sull'imponibile del mese corrente, utile come ordine di grandezza per individuare trattenute
// palesemente anomale (es. zero per molti mesi, o importi molto più alti del previsto),
// non come verifica puntuale mese per mese.

export interface RisultatoAddizionali {
  aliquotaTotalePct: number;
  stimaMensileIndicativa: number;
  trattenutaCedolino: number;
  formula: string;
  disponibile: boolean;
}

export function stimaAddizionaliMensili(
  imponibileFiscaleMese: number,
  addizionaleRegionalePct: number,
  addizionaleComunalePct: number,
  trattenutaCedolino: number,
): RisultatoAddizionali {
  const aliquotaTotalePct = (addizionaleRegionalePct || 0) + (addizionaleComunalePct || 0);
  if (aliquotaTotalePct <= 0) {
    return {
      aliquotaTotalePct: 0,
      stimaMensileIndicativa: 0,
      trattenutaCedolino,
      formula: 'n/d',
      disponibile: false,
    };
  }
  // Stima "a regime": imponibile annuo (mese x 12) x aliquota totale, diviso 11 rate (approssimazione comune).
  const stimaAnnua = imponibileFiscaleMese * 12 * (aliquotaTotalePct / 100);
  const stimaMensileIndicativa = stimaAnnua / 11;
  return {
    aliquotaTotalePct,
    stimaMensileIndicativa,
    trattenutaCedolino,
    formula: `(imponibile fiscale mese x 12 x ${aliquotaTotalePct.toFixed(2)}%) / 11 rate (stima indicativa, non il meccanismo reale di conguaglio sull'anno precedente)`,
    disponibile: true,
  };
}

export interface VerificaAddizionali {
  esito: 'ok' | 'da_verificare' | 'non_disponibile';
  messaggio: string;
}

const TOLLERANZA_RELATIVA = 0.5; // 50%: la stima è grossolana, quindi la tolleranza è ampia di proposito

export function verificaAddizionali(risultato: RisultatoAddizionali): VerificaAddizionali {
  if (!risultato.disponibile) {
    return {
      esito: 'non_disponibile',
      messaggio: 'Aliquote addizionali regionale/comunale non impostate nel profilo (Modulo 1): verifica saltata. Se le conosci, inseriscile per attivare questo controllo indicativo.',
    };
  }
  if (risultato.trattenutaCedolino === 0 && risultato.stimaMensileIndicativa > 1) {
    return {
      esito: 'da_verificare',
      messaggio: `Nessuna addizionale trattenuta nel mese, ma in base alle aliquote impostate ci si aspetterebbe un importo (stima indicativa €${risultato.stimaMensileIndicativa.toFixed(2)}). Può essere normale in alcuni mesi dell'anno (le addizionali non sono rateizzate su tutti i 12 mesi): da monitorare se la trattenuta resta sempre a zero.`,
    };
  }
  const differenzaRelativa = risultato.stimaMensileIndicativa > 0
    ? Math.abs(risultato.trattenutaCedolino - risultato.stimaMensileIndicativa) / risultato.stimaMensileIndicativa
    : 0;
  if (differenzaRelativa > TOLLERANZA_RELATIVA) {
    return {
      esito: 'da_verificare',
      messaggio: `Addizionali trattenute (€${risultato.trattenutaCedolino.toFixed(2)}) molto diverse dalla stima indicativa (€${risultato.stimaMensileIndicativa.toFixed(2)}). Ricorda che questa è solo una stima a regime, non il calcolo reale (basato sull'imponibile dell'anno precedente): verifica comunque che l'importo non sia palesemente anomalo.`,
    };
  }
  return {
    esito: 'ok',
    messaggio: 'Addizionali trattenute in linea con la stima indicativa.',
  };
}
