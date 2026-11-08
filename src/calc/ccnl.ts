// Tabella minimi retributivi CCNL Metalmeccanici Industria (Federmeccanica/Assistal/Unionmeccanica-Confapi).
// Struttura a 9 livelli introdotta dal rinnovo 2021 (in ordine CRESCENTE di retribuzione):
// D1 (ex livelli 1-2) < D2 (ex 3) < C1 (ex 3S) < C2 (ex 4) < C3 (ex 5) < B1 (ex 5S) < B2 (ex 6) < B3 (ex 7) < A1 (ex 8).
// Valori mensili lordi, 13 mensilità, in vigore DAL 1° GIUGNO 2026 (rinnovo sottoscritto il 22/11/2025 da
// Federmeccanica, Assistal, Fim-Cisl, Fiom-Cgil, Uilm-Uil; scioglimento riserva sindacale 23/02/2026;
// verbale di indicizzazione 16/06/2026 non ha introdotto nuovi minimi, confermando quelli di novembre 2025).
// FONTE: Fiscoetasse, "CCNL Metalmeccanici Industria 2025: novità, aumenti e welfare"
// (https://www.fiscoetasse.com/approfondimenti/16929-ccnl-metalmeccanici-industria-2025-novita-aumenti-e-welfare.html),
// incrociata con la tabella storica 2023-2024 di Lexplain (stessa struttura e ordine di livelli: coerenti tra loro).
// Il prossimo adeguamento è previsto dal 1° giugno 2027: aggiornare questa tabella a quella data.
// Verificare sempre con il testo ufficiale del CCNL o con l'ufficio HR prima di contestazioni formali.

export interface LivelloCcnl {
  livello: string;
  minimoMensile: number;
  descrizione: string;
}

export const CCNL_METALMECCANICI_INDUSTRIA_RIF = {
  nome: 'CCNL Metalmeccanici Industria (Federmeccanica/Assistal)',
  validoDal: '2026-06-01',
  fonte: 'Rinnovo CCNL Metalmeccanici Industria sottoscritto 22/11/2025, confermato dal verbale di indicizzazione IPCA del 16/06/2026 - fonte: Fiscoetasse.com',
};

// Minimi tabellari mensili lordi, 13 mensilità, in vigore dal 1° giugno 2026.
// NB: inserire/aggiornare qui i valori ufficiali quando cambiano (prossimo adeguamento 1° giugno 2027);
// se un livello non è presente, l'app lo segnala esplicitamente invece di stimarlo.
export const LIVELLI_METALMECCANICI_INDUSTRIA: LivelloCcnl[] = [
  { livello: 'D1', minimoMensile: 1784.94, descrizione: 'Ex livelli 1-2: mansioni esecutive semplici, generiche o apprendistato' },
  { livello: 'D2', minimoMensile: 1979.37, descrizione: 'Ex livello 3: mansioni esecutive con conoscenze pratiche specifiche' },
  { livello: 'C1', minimoMensile: 2022.12, descrizione: 'Ex livello 3S: esecuzione con competenze specialistiche di base' },
  { livello: 'C2', minimoMensile: 2064.88, descrizione: 'Ex livello 4: autonomia operativa nell\'ambito di procedure definite' },
  { livello: 'C3', minimoMensile: 2211.43, descrizione: 'Ex livello 5: conoscenze tecnico-pratiche e autonomia operativa' },
  { livello: 'B1', minimoMensile: 2370.33, descrizione: 'Ex livello 5S: competenze specialistiche con responsabilità di risultati' },
  { livello: 'B2', minimoMensile: 2542.98, descrizione: 'Ex livello 6: coordinamento e responsabilità su aree/progetti' },
  { livello: 'B3', minimoMensile: 2838.99, descrizione: 'Ex livello 7: elevata autonomia e responsabilità gestionale' },
  { livello: 'A1', minimoMensile: 2907.01, descrizione: 'Ex livello 8: massima responsabilità, funzioni di quadro aziendale' },
];

export function trovaLivello(livello: string): LivelloCcnl | undefined {
  return LIVELLI_METALMECCANICI_INDUSTRIA.find(
    (l) => l.livello.toLowerCase() === livello.trim().toLowerCase(),
  );
}

export interface RisultatoVerificaBase {
  livelloTrovato: boolean;
  minimoContrattuale?: number;
  formula: string;
  esito: 'ok' | 'sotto_minimo' | 'livello_non_in_tabella';
  messaggio: string;
}

// Confronta la retribuzione base del cedolino con il minimo tabellare del livello dichiarato.
// Non considera superminimi individuali: se il cedolino è superiore al minimo è normale e corretto.
export function verificaRetribuzioneBase(
  livello: string,
  retribuzioneBaseCedolino: number,
): RisultatoVerificaBase {
  const riferimento = trovaLivello(livello);
  if (!riferimento) {
    return {
      livelloTrovato: false,
      formula: 'n/d',
      esito: 'livello_non_in_tabella',
      messaggio: `Livello "${livello}" non presente nella tabella CCNL caricata in FiscAI. Verifica manualmente con il contratto o CCNL ufficiale (Modulo 4) prima di considerare questo controllo attendibile.`,
    };
  }
  const formula = `retribuzione base cedolino (€${retribuzioneBaseCedolino.toFixed(2)}) >= minimo tabellare livello ${riferimento.livello} (€${riferimento.minimoMensile.toFixed(2)})`;
  if (retribuzioneBaseCedolino + 0.01 < riferimento.minimoMensile) {
    return {
      livelloTrovato: true,
      minimoContrattuale: riferimento.minimoMensile,
      formula,
      esito: 'sotto_minimo',
      messaggio: `Attenzione: la retribuzione base (€${retribuzioneBaseCedolino.toFixed(2)}) è inferiore al minimo tabellare del livello ${riferimento.livello} (€${riferimento.minimoMensile.toFixed(2)}).`,
    };
  }
  return {
    livelloTrovato: true,
    minimoContrattuale: riferimento.minimoMensile,
    formula,
    esito: 'ok',
    messaggio: `Retribuzione base coerente con il minimo tabellare del livello ${riferimento.livello}.`,
  };
}
