import type { Profilo, Cedolino, Presenza } from '../types';

// Azioni ricorrenti che un dipendente privato senza partita IVA dovrebbe fare periodicamente
// per tenere la propria situazione economica sotto controllo, tradotte in linguaggio semplice.
// Lo stato di ogni voce, quando possibile, è dedotto dai dati già presenti in FiscAI.

export type CadenzaRoutine = 'mensile' | 'trimestrale' | 'annuale' | 'una_tantum';

export interface VoceRoutine {
  chiave: string;
  chiavePeriodo: string; // chiave univoca per periodo, usata per salvare/leggere il completamento manuale
  titolo: string;
  cadenza: CadenzaRoutine;
  spiegazione: string;
  azione: string;
  fatto: boolean;
  togglabile: boolean; // se true, l'utente può spuntarla a mano; se false, lo stato è dedotto automaticamente
  dettaglioStato: string;
}

const MESI_ITALIANI = [
  'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
  'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre',
];

export function calcolaRoutine(
  profilo: Profilo | undefined,
  cedolini: Cedolino[],
  presenze: Presenza[],
  completamenti: Set<string>,
  oggi: Date = new Date(),
): VoceRoutine[] {
  const voci: VoceRoutine[] = [];
  const anno = oggi.getFullYear();
  const mese = oggi.getMonth() + 1;
  const trimestre = Math.ceil(mese / 3);

  // Mensile: hai caricato il cedolino del mese scorso?
  const meseScorso = mese === 1 ? 12 : mese - 1;
  const annoMeseScorso = mese === 1 ? anno - 1 : anno;
  const cedolinoMeseScorso = cedolini.find((c) => c.mese === meseScorso && c.anno === annoMeseScorso);
  voci.push({
    chiave: 'carica_cedolino',
    chiavePeriodo: `carica_cedolino:${annoMeseScorso}-${meseScorso}`,
    titolo: `Carica il cedolino di ${MESI_ITALIANI[meseScorso - 1]} ${annoMeseScorso}`,
    cadenza: 'mensile',
    spiegazione: 'Ogni mese, appena ricevi il cedolino, caricalo in FiscAI: così le verifiche automatiche (minimo CCNL, INPS, TFR, buoni pasto) partono subito.',
    azione: 'Cedolini → Carica PDF (o inserimento manuale se il PDF non si legge bene).',
    fatto: !!cedolinoMeseScorso,
    togglabile: false,
    dettaglioStato: cedolinoMeseScorso ? 'Caricato.' : `Non risulta ancora caricato il cedolino di ${MESI_ITALIANI[meseScorso - 1]}.`,
  });

  // Mensile: controlla le anomalie rilevate sull'ultimo cedolino
  if (cedolinoMeseScorso) {
    const chiavePeriodo = `controlla_anomalie:${annoMeseScorso}-${meseScorso}`;
    voci.push({
      chiave: 'controlla_anomalie',
      chiavePeriodo,
      titolo: 'Controlla le anomalie dell\'ultimo cedolino',
      cadenza: 'mensile',
      spiegazione: 'FiscAI confronta automaticamente il cedolino con le regole CCNL/INPS/TFR: se trova qualcosa di storto te lo segnala, ma va letto.',
      azione: 'Cedolini → clicca sul cedolino del mese per vedere l\'esito della verifica.',
      fatto: completamenti.has(chiavePeriodo),
      togglabile: true,
      dettaglioStato: 'Spunta quando hai controllato l\'esito della verifica per questo mese.',
    });
  }

  // Mensile: aggiorna le presenze (se usi il modulo)
  const presenzaMeseScorso = presenze.find((p) => p.mese === meseScorso && p.anno === annoMeseScorso);
  voci.push({
    chiave: 'aggiorna_presenze',
    chiavePeriodo: `aggiorna_presenze:${annoMeseScorso}-${meseScorso}`,
    titolo: `Registra le presenze di ${MESI_ITALIANI[meseScorso - 1]} ${annoMeseScorso}`,
    cadenza: 'mensile',
    spiegazione: 'Serve solo se vuoi che FiscAI controlli che il cedolino corrisponda a ore lavorate, straordinari, ferie e ROL realmente usati.',
    azione: 'Presenze → inserisci ore e giorni del mese.',
    fatto: !!presenzaMeseScorso,
    togglabile: false,
    dettaglioStato: presenzaMeseScorso ? 'Registrate.' : 'Facoltativo, ma utile se vuoi il confronto automatico con il cedolino.',
  });

  // Trimestrale: controlla saldo ferie/ROL residuo
  {
    const chiavePeriodo = `controllo_ferie_rol:${anno}-Q${trimestre}`;
    voci.push({
      chiave: 'controllo_ferie_rol',
      chiavePeriodo,
      titolo: 'Controlla il saldo ferie e ROL residuo',
      cadenza: 'trimestrale',
      spiegazione: 'Le ferie/ROL non godute si accumulano: un controllo ogni 3 mesi evita di ritrovartele arretrate a fine anno (alcuni CCNL impongono di smaltirle entro certe date).',
      azione: 'Guarda la sezione "Maturate/Godute/Saldo" in fondo all\'ultimo cedolino caricato (Cedolini).',
      fatto: completamenti.has(chiavePeriodo),
      togglabile: true,
      dettaglioStato: `Controllo del ${trimestre}° trimestre ${anno}.`,
    });
  }

  // Una tantum: verificare destinazione TFR (solo nei primi 6 mesi dall'assunzione, poi diventa storico)
  if (profilo?.dataAssunzione) {
    const dataAssunzione = new Date(profilo.dataAssunzione);
    const scadenzaTfr = new Date(dataAssunzione);
    scadenzaTfr.setMonth(scadenzaTfr.getMonth() + 6);
    const entroFinestra = oggi <= scadenzaTfr;
    const giorniDaScadenza = Math.round((oggi.getTime() - scadenzaTfr.getTime()) / (1000 * 60 * 60 * 24));
    const chiavePeriodo = 'destinazione_tfr';
    voci.push({
      chiave: 'destinazione_tfr',
      chiavePeriodo,
      titolo: 'Verifica la destinazione del tuo TFR',
      cadenza: 'una_tantum',
      spiegazione: 'Entro 6 mesi dall\'assunzione va scelto se lasciare il TFR maturando in azienda/Tesoreria o destinarlo a un fondo di previdenza complementare. Se non scegli, dopo la scadenza scatta il "silenzio-assenso" (per i metalmeccanici, di norma verso il fondo Cometa).',
      azione: entroFinestra
        ? 'Sei ancora in tempo: decidi con l\'aiuto di un consulente previdenziale/sindacale, poi comunicalo a HR con l\'apposito modulo.'
        : 'La finestra è scaduta: controlla sull\'ultimo cedolino la riga del TFR ("a Tesoreria" = resta in azienda, altrimenti comparirà il nome del fondo) per sapere cosa è successo davvero.',
      fatto: completamenti.has(chiavePeriodo),
      togglabile: true,
      dettaglioStato: entroFinestra
        ? `Hai ancora circa ${-giorniDaScadenza} giorni per scegliere (scadenza ${scadenzaTfr.toLocaleDateString('it-IT')}).`
        : `Finestra scaduta il ${scadenzaTfr.toLocaleDateString('it-IT')} (${giorniDaScadenza} giorni fa): verifica l'esito reale sul cedolino più recente.`,
    });

    // Una tantum: vincolo di restituzione del Bonus Una Tantum (se il contratto lo prevede).
    // Data di pagamento stimata dal contratto ("dopo 3 mesi dall'assunzione"): verificare la data
    // esatta sul cedolino in cui è comparso il bonus, questa è solo una stima di riferimento.
    const stimaPagamentoBonus = new Date(dataAssunzione);
    stimaPagamentoBonus.setMonth(stimaPagamentoBonus.getMonth() + 3);
    const fineVincoloBonus = new Date(stimaPagamentoBonus);
    fineVincoloBonus.setMonth(fineVincoloBonus.getMonth() + 12);
    const vincoloBonusAttivo = oggi <= fineVincoloBonus;
    if (vincoloBonusAttivo) {
      const chiavePeriodoBonus = 'vincolo_bonus_una_tantum';
      const giorniAllaFine = Math.round((fineVincoloBonus.getTime() - oggi.getTime()) / (1000 * 60 * 60 * 24));
      voci.push({
        chiave: 'vincolo_bonus_una_tantum',
        chiavePeriodo: chiavePeriodoBonus,
        titolo: 'Attenzione: vincolo di restituzione sul Bonus Una Tantum',
        cadenza: 'una_tantum',
        spiegazione: 'Se il tuo contratto prevede un bonus una tantum di ingresso, di norma è condizionato alla permanenza in azienda per 12 mesi dal pagamento: se ti dimetti o l\'azienda recede prima di questa data, potresti dover restituire l\'intero importo (anche tramite trattenuta su stipendio/TFR).',
        azione: 'Se stai valutando di cambiare lavoro prima di questa data, verifica l\'importo esatto e la data di pagamento sul tuo contratto/cedolino prima di decidere: potrebbe cambiare la convenienza economica del cambio.',
        fatto: completamenti.has(chiavePeriodoBonus),
        togglabile: true,
        dettaglioStato: `Vincolo stimato fino al ${fineVincoloBonus.toLocaleDateString('it-IT')} circa (${giorniAllaFine} giorni), basato su un pagamento stimato 3 mesi dopo l'assunzione. Verifica la data reale sul cedolino in cui hai ricevuto il bonus.`,
      });
    }

    // Una tantum, informativa: fine del periodo di prova (tipicamente 6 mesi, verificare il proprio contratto).
    const finePeriodoProva = new Date(dataAssunzione);
    finePeriodoProva.setMonth(finePeriodoProva.getMonth() + 6);
    const giorniDaFineProva = Math.round((oggi.getTime() - finePeriodoProva.getTime()) / (1000 * 60 * 60 * 24));
    if (giorniDaFineProva >= 0 && giorniDaFineProva <= 30) {
      voci.push({
        chiave: 'fine_periodo_prova',
        chiavePeriodo: 'fine_periodo_prova',
        titolo: 'Periodo di prova terminato',
        cadenza: 'una_tantum',
        spiegazione: 'Durante il periodo di prova (tipicamente 6 mesi, verifica il tuo contratto) entrambe le parti possono recedere senza preavviso né motivazione. Dopo questa data il rapporto è a tutti gli effetti consolidato.',
        azione: 'Nessuna azione richiesta: è solo una conferma. Controlla il tuo contratto se hai dubbi sulla durata esatta.',
        fatto: completamenti.has('fine_periodo_prova'),
        togglabile: true,
        dettaglioStato: `Terminato il ${finePeriodoProva.toLocaleDateString('it-IT')} (${giorniDaFineProva} giorni fa).`,
      });
    }
  }

  // Annuale: aggiornare il profilo se cambia qualcosa
  {
    const chiavePeriodo = `aggiorna_profilo:${anno}`;
    voci.push({
      chiave: 'aggiorna_profilo',
      chiavePeriodo,
      titolo: 'Aggiorna il profilo se qualcosa è cambiato',
      cadenza: 'annuale',
      spiegazione: 'Cambio di livello, RAL, residenza, nascita di un figlio, mutuo: ogni cambiamento va aggiornato nel Profilo per avere verifiche sempre corrette.',
      azione: 'Profilo → controlla e aggiorna i dati almeno una volta l\'anno.',
      fatto: completamenti.has(chiavePeriodo),
      togglabile: true,
      dettaglioStato: profilo?.aggiornatoIl
        ? `Ultimo aggiornamento: ${new Date(profilo.aggiornatoIl).toLocaleDateString('it-IT')}.`
        : 'Profilo non ancora compilato.',
    });
  }

  return voci;
}
