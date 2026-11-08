import type { Scadenza } from '../types';
import { nuovoId } from '../db';

// Scadenze fiscali standard per un dipendente privato senza partita IVA e senza immobili diversi
// dall'eventuale abitazione principale. Date indicative annuali (verificare sempre il calendario
// fiscale ufficiale dell'Agenzia delle Entrate per l'anno in corso, che può differire di pochi giorni).

export function generaScadenzeStandard(anno: number): Scadenza[] {
  const base: Omit<Scadenza, 'id' | 'completata'>[] = [
    {
      titolo: 'Consultazione Certificazione Unica (CU)',
      descrizione: 'Il datore di lavoro deve rilasciare la CU con i redditi dell\'anno precedente, necessaria per il 730.',
      azione: 'Scarica la CU dal portale HR aziendale (o chiedila all\'ufficio del personale) e caricala nel Modulo 4 di FiscAI per averla sempre a disposizione.',
      destinatario: 'La ricevi dal tuo datore di lavoro (Accenture, portale HR); non va consegnata a nessuno a questo punto.',
      dataScadenza: `${anno}-03-16`,
      ricorrenzaAnnuale: true,
      anticipiGiorni: [15, 7],
      categoria: 'dichiarativo',
    },
    {
      titolo: 'Apertura 730 precompilato',
      descrizione: 'L\'Agenzia delle Entrate rende disponibile il 730 precompilato nel Cassetto Fiscale.',
      azione: 'Accedi al Cassetto Fiscale e controlla che i dati precompilati (redditi, spese mediche) corrispondano a quelli che hai registrato in FiscAI.',
      destinatario: 'Cassetto Fiscale dell\'Agenzia delle Entrate (accesso con SPID/CIE su agenziaentrate.gov.it).',
      dataScadenza: `${anno}-04-30`,
      ricorrenzaAnnuale: true,
      anticipiGiorni: [15, 7],
      categoria: 'dichiarativo',
    },
    {
      titolo: 'Scadenza invio 730 (precompilato o tramite CAF/intermediario)',
      descrizione: 'Termine per la presentazione della dichiarazione 730, salvo proroghe annuali.',
      azione: 'Invia il 730 direttamente online (se lo fai da solo) oppure consegna CU, spese mediche ed eventuali documenti a un CAF o commercialista entro questa data.',
      destinatario: 'Un CAF/commercialista di fiducia, oppure invio diretto tramite l\'app dell\'Agenzia delle Entrate se lo fai da solo.',
      dataScadenza: `${anno}-09-30`,
      ricorrenzaAnnuale: true,
      anticipiGiorni: [30, 15, 7],
      categoria: 'dichiarativo',
    },
    {
      titolo: 'Verifica conguaglio 730 a debito/credito in busta paga',
      descrizione: 'Se dal 730 risulta un debito, il datore di lavoro applica la ritenuta nelle buste paga successive (di norma da luglio); verificare che il conguaglio sia stato applicato correttamente.',
      azione: 'Controlla il cedolino di luglio (o quello successivo all\'invio del 730): dovrebbe comparire una voce di conguaglio IRPEF. Confrontala con l\'esito del 730 che hai ricevuto.',
      destinatario: 'Nessuna azione verso terzi: è un controllo che fai tu sul tuo cedolino.',
      dataScadenza: `${anno}-07-31`,
      ricorrenzaAnnuale: true,
      anticipiGiorni: [15],
      categoria: 'versamento',
    },
    {
      titolo: 'Controllo Cassetto Fiscale',
      descrizione: 'Controllo periodico di comunicazioni, esiti e documenti presenti nel Cassetto Fiscale dell\'Agenzia delle Entrate.',
      azione: 'Accedi al Cassetto Fiscale e controlla se ci sono comunicazioni, esiti di controlli automatici o documenti nuovi da leggere.',
      destinatario: 'Cassetto Fiscale dell\'Agenzia delle Entrate (agenziaentrate.gov.it, accesso SPID/CIE).',
      dataScadenza: `${anno}-11-30`,
      ricorrenzaAnnuale: true,
      anticipiGiorni: [7],
      categoria: 'altro',
    },
  ];
  return base.map((s) => ({ ...s, id: nuovoId(), completata: false }));
}

export function prossimiReminder(scadenze: Scadenza[], oggi: Date = new Date()): { scadenza: Scadenza; giorniRimanenti: number }[] {
  const risultati: { scadenza: Scadenza; giorniRimanenti: number }[] = [];
  for (const s of scadenze) {
    if (s.completata) continue;
    const data = new Date(s.dataScadenza);
    const giorniRimanenti = Math.ceil((data.getTime() - oggi.getTime()) / (1000 * 60 * 60 * 24));
    const daAvvisare = s.anticipiGiorni.some((g) => giorniRimanenti === g) || (giorniRimanenti <= 0 && giorniRimanenti >= -3);
    if (daAvvisare || giorniRimanenti <= Math.max(...s.anticipiGiorni, 0)) {
      risultati.push({ scadenza: s, giorniRimanenti });
    }
  }
  return risultati.sort((a, b) => a.giorniRimanenti - b.giorniRimanenti);
}
