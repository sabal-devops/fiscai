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
    azione: 'Modulo 2 - Cedolini → Carica PDF (o inserimento manuale se il PDF non si legge bene).',
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
      azione: 'Modulo 2 - Cedolini → clicca sul cedolino del mese per vedere l\'esito della verifica.',
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
    azione: 'Modulo 3 - Presenze → inserisci ore e giorni del mese.',
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
      azione: 'Guarda la sezione "Maturate/Godute/Saldo" in fondo all\'ultimo cedolino caricato (Modulo 2).',
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
  }

  // Annuale: aggiornare il profilo se cambia qualcosa
  {
    const chiavePeriodo = `aggiorna_profilo:${anno}`;
    voci.push({
      chiave: 'aggiorna_profilo',
      chiavePeriodo,
      titolo: 'Aggiorna il profilo se qualcosa è cambiato',
      cadenza: 'annuale',
      spiegazione: 'Cambio di livello, RAL, residenza, nascita di un figlio, mutuo: ogni cambiamento va aggiornato nel Modulo 1 per avere verifiche sempre corrette.',
      azione: 'Modulo 1 - Profilo → controlla e aggiorna i dati almeno una volta l\'anno.',
      fatto: completamenti.has(chiavePeriodo),
      togglabile: true,
      dettaglioStato: profilo?.aggiornatoIl
        ? `Ultimo aggiornamento: ${new Date(profilo.aggiornatoIl).toLocaleDateString('it-IT')}.`
        : 'Profilo non ancora compilato.',
    });
  }

  return voci;
}
