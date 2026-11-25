import type { Profilo, Cedolino, Presenza } from '../types';
import { calcolaIrpefNettaAnnua } from './irpef';
import { calcolaRetribuzioneAttesa } from './presenze';

// Limiti di straordinario del CCNL Metalmeccanici Industria per aziende con PIÙ di 200 dipendenti
// (caso di Accenture): 200 ore annue, max 2 ore/giorno, max 8 ore/settimana. Nelle aziende fino a
// 200 dipendenti il tetto annuo sale a 250. Una quota di 80 ore annue è "libera" per l'azienda
// (può disporle senza accordo RSU); oltre richiede accordo RSU, fino al tetto di 200.
// FONTE: sintesi di più fonti di settore sul CCNL Metalmeccanici Industria; verificare sempre il
// testo ufficiale del CCNL o con il sindacato/RSU aziendale per il dato aggiornato e vincolante.
export const LIMITE_STRAORDINARIO_ANNUO_OLTRE_200_DIP = 200;
export const QUOTA_LIBERA_AZIENDALE_ANNUA = 80;
export const LIMITE_STRAORDINARIO_GIORNALIERO = 2;
export const LIMITE_STRAORDINARIO_SETTIMANALE = 8;

export interface RisultatoOreStraordinario {
  oreTotaliAnno: number;
  percentualeLimite: number;
  esito: 'ok' | 'attenzione' | 'superato';
  messaggio: string;
}

export function calcolaOreStraordinarioAnno(presenze: Presenza[], anno: number): RisultatoOreStraordinario {
  const presenzeAnno = presenze.filter((p) => p.anno === anno);
  const oreTotaliAnno = presenzeAnno.reduce(
    (acc, p) => acc + p.oreStraordinarioFeriale + p.oreStraordinarioFestivo + p.oreStraordinarioNotturno,
    0,
  );
  const percentualeLimite = (oreTotaliAnno / LIMITE_STRAORDINARIO_ANNUO_OLTRE_200_DIP) * 100;
  let esito: RisultatoOreStraordinario['esito'] = 'ok';
  let messaggio = `${oreTotaliAnno.toFixed(1)} ore su ${LIMITE_STRAORDINARIO_ANNUO_OLTRE_200_DIP} annue (CCNL, aziende oltre 200 dipendenti).`;
  if (oreTotaliAnno > LIMITE_STRAORDINARIO_ANNUO_OLTRE_200_DIP) {
    esito = 'superato';
    messaggio = `Hai superato il limite CCNL di ${LIMITE_STRAORDINARIO_ANNUO_OLTRE_200_DIP} ore annue di straordinario (sei a ${oreTotaliAnno.toFixed(1)}). Oltre le ${QUOTA_LIBERA_AZIENDALE_ANNUA} ore "libere" serve un accordo RSU: verifica con HR/sindacato che sia stato formalizzato.`;
  } else if (percentualeLimite >= 80) {
    esito = 'attenzione';
    messaggio = `Sei a ${oreTotaliAnno.toFixed(1)} ore su ${LIMITE_STRAORDINARIO_ANNUO_OLTRE_200_DIP} annue (${percentualeLimite.toFixed(0)}%): ti stai avvicinando al limite CCNL.`;
  }
  return { oreTotaliAnno, percentualeLimite, esito, messaggio };
}

export interface RisultatoProiezioneFiscale {
  disponibile: boolean;
  imponibileAnnuoStimato: number;
  irpefNettaAnnuaAttesa: number;
  irpefTrattenutaProiettata: number;
  differenzaConguaglio: number;
  direzioneConguaglio: 'debito' | 'credito' | 'nessuna';
  messaggio: string;
  formula: string;
}

// Proiezione indicativa di quanto accadrà a fine anno (conguaglio) tenendo conto anche dei mesi
// futuri per cui l'utente ha già inserito presenze/straordinari pianificati in Presenze.
// NON riproduce il meccanismo esatto del sostituto d'imposta (tassazione progressiva cumulativa
// mese per mese): è una stima per capire la DIREZIONE e l'ordine di grandezza, non il centesimo esatto.
export function calcolaProiezioneFiscaleAnnuale(
  profilo: Profilo | undefined,
  cedolini: Cedolino[],
  presenze: Presenza[],
  anno: number,
): RisultatoProiezioneFiscale {
  if (!profilo) {
    return {
      disponibile: false, imponibileAnnuoStimato: 0, irpefNettaAnnuaAttesa: 0,
      irpefTrattenutaProiettata: 0, differenzaConguaglio: 0, direzioneConguaglio: 'nessuna',
      messaggio: 'Completa il Profilo per attivare la proiezione fiscale.', formula: '',
    };
  }
  const cedoliniAnno = cedolini.filter((c) => c.anno === anno).sort((a, b) => a.mese - b.mese);
  if (cedoliniAnno.length === 0) {
    return {
      disponibile: false, imponibileAnnuoStimato: 0, irpefNettaAnnuaAttesa: 0,
      irpefTrattenutaProiettata: 0, differenzaConguaglio: 0, direzioneConguaglio: 'nessuna',
      messaggio: 'Carica almeno un cedolino per attivare la proiezione fiscale.', formula: '',
    };
  }

  const ultimoCedolino = cedoliniAnno[cedoliniAnno.length - 1];
  const meseUltimo = ultimoCedolino.mese;
  const imponibileCumulatoReale = ultimoCedolino.imponibileFiscaleCumulato;
  const irpefCumulataReale = ultimoCedolino.irpefCumulata;
  const irpefTrattenutaMediaRecente = cedoliniAnno.reduce((a, c) => a + c.irpefTrattenuta, 0) / cedoliniAnno.length;

  // Mesi restanti dell'anno (da meseUltimo+1 a 12): per ciascuno, se c'è una Presenza pianificata
  // (anche futura) si stima retribuzione standard + straordinario; altrimenti si usa RAL/mensilità.
  let imponibileStimatoRestante = 0;
  let irpefTrattenutaProiettataRestante = 0;
  for (let mese = meseUltimo + 1; mese <= 12; mese++) {
    const presenzaMese = presenze.find((p) => p.mese === mese && p.anno === anno);
    if (presenzaMese) {
      const attesa = calcolaRetribuzioneAttesa(profilo, presenzaMese);
      imponibileStimatoRestante += attesa.totaleAtteso;
    } else {
      imponibileStimatoRestante += profilo.ral / profilo.mensilita;
    }
    irpefTrattenutaProiettataRestante += irpefTrattenutaMediaRecente;
  }

  const imponibileAnnuoStimato = imponibileCumulatoReale + imponibileStimatoRestante;
  const irpefTrattenutaProiettata = irpefCumulataReale + irpefTrattenutaProiettataRestante;

  const dataAssunzione = profilo.dataAssunzione ? new Date(profilo.dataAssunzione) : new Date(anno, 0, 1);
  const inizioAnno = new Date(anno, 0, 1);
  const inizioEffettivo = dataAssunzione > inizioAnno ? dataAssunzione : inizioAnno;
  const fineAnno = new Date(anno, 11, 31);
  const giorniLavorati = Math.max(1, Math.round((fineAnno.getTime() - inizioEffettivo.getTime()) / (1000 * 60 * 60 * 24)) + 1);

  const risultatoIrpef = calcolaIrpefNettaAnnua(imponibileAnnuoStimato, giorniLavorati, profilo.mensilita);
  const differenzaConguaglio = risultatoIrpef.irpefNettaAnnua - irpefTrattenutaProiettata;
  const direzioneConguaglio: RisultatoProiezioneFiscale['direzioneConguaglio'] =
    Math.abs(differenzaConguaglio) < 20 ? 'nessuna' : differenzaConguaglio > 0 ? 'debito' : 'credito';

  let messaggio: string;
  if (direzioneConguaglio === 'nessuna') {
    messaggio = 'In base alla proiezione, non dovrebbero esserci conguagli significativi a fine anno.';
  } else if (direzioneConguaglio === 'debito') {
    messaggio = `Stima indicativa: a fine anno potresti avere un conguaglio A DEBITO di circa €${differenzaConguaglio.toFixed(0)} (trattenuta extra, tipicamente nel cedolino di dicembre), perché il reddito annuo proiettato risulta più alto di quanto la trattenuta mensile attuale stia considerando. Più fai straordinari extra non pianificati, più questo numero può crescere.`;
  } else {
    messaggio = `Stima indicativa: a fine anno potresti avere un conguaglio A CREDITO di circa €${Math.abs(differenzaConguaglio).toFixed(0)} (ti verrebbe restituito, tipicamente nel cedolino di dicembre).`;
  }

  return {
    disponibile: true,
    imponibileAnnuoStimato,
    irpefNettaAnnuaAttesa: risultatoIrpef.irpefNettaAnnua,
    irpefTrattenutaProiettata,
    differenzaConguaglio,
    direzioneConguaglio,
    messaggio,
    formula: 'imponibile annuo stimato = cumulato reale + stima mesi restanti (da Presenze pianificate, o RAL/mensilità se non inserite); IRPEF netta annua attesa (a scaglioni, con detrazione lavoro dipendente) confrontata con la trattenuta cumulata reale + proiezione lineare del trend attuale',
  };
}
