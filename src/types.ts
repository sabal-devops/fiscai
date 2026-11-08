// Tipi condivisi dell'applicazione FiscAI

export interface FamiliareACarico {
  id: string;
  relazione: 'coniuge' | 'figlio' | 'altro';
  mesiACarico: number; // 1-12, per calcolo detrazioni pro-rata
}

export interface Immobile {
  id: string;
  descrizione: string;
  uso: 'abitazione_principale' | 'altro';
  rendita: number;
}

export interface Mutuo {
  attivo: boolean;
  interessiAnnui: number;
  tipo: 'prima_casa' | 'altro';
}

export interface Profilo {
  // Anagrafica
  nome: string;
  cognome: string;
  codiceFiscale: string;
  comuneResidenza: string;

  // Contratto di lavoro
  datoreLavoro: string;
  ccnl: string; // es. "Metalmeccanici Industria"
  livello: string; // es. "B3"
  dataAssunzione: string; // ISO date
  ral: number; // retribuzione annua lorda
  mensilita: number; // 12, 13, 14

  // Familiari e immobili (per detrazioni/scadenzario)
  familiariACarico: FamiliareACarico[];
  immobili: Immobile[];
  mutuo: Mutuo;

  // Aliquote addizionali IRPEF (facoltative, dipendono dal comune/regione di domicilio fiscale).
  // Se non conosciute, lasciare a 0: la verifica sulle addizionali verrà saltata e segnalata come non disponibile.
  addizionaleRegionalePct: number;
  addizionaleComunalePct: number;

  // Indennità oraria di reperibilità (facoltativa): non è fissata in modo uniforme dal CCNL,
  // dipende spesso da accordo aziendale. Se non la conosci, lascia a 0: il confronto col cedolino
  // verrà saltato invece di stimare un importo inventato.
  tariffaOrariaReperibilita: number;

  aggiornatoIl: string;
}

export interface VoceCedolino {
  codice: string;
  descrizione: string;
  natura: 'competenza' | 'ritenuta' | 'informativa';
  importo: number;
}

export interface Cedolino {
  id: string;
  mese: number; // 1-12
  anno: number;
  // Voci principali riconosciute
  retribuzioneBase: number;
  straordinari: number;
  indennita: number;
  buoniPasto: { numero: number; valoreUnitario: number; tipo: 'cartaceo' | 'elettronico' };
  totaleCompetenze: number;
  contributiInps: number;
  irpefTrattenuta: number;
  addizionaliRegionaliComunali: number;
  altreRitenute: number;
  nettoPagato: number;
  tfrMaturatoMese: number;
  tfrAccantonatoCumulato: number;
  imponibileFiscaleCumulato: number; // da inizio anno
  imponibileFiscaleMese: number;
  imponibileContributivoMese: number; // base INPS del mese: spesso diversa dall'imponibile fiscale (es. per il F.do sanitario)
  irpefCumulata: number; // trattenuta cumulata da inizio anno
  vociGrezze: VoceCedolino[]; // tutte le voci letti dal PDF o inserite manualmente
  fontePdf: boolean;
  caricatoIl: string;
  anomalie: string[]; // calcolate, non salvate manualmente
}

export interface Presenza {
  id: string;
  mese: number;
  anno: number;
  oreOrdinarieLavorate: number;
  giorniAssenzaMalattia: number;
  giorniFerie: number;
  oreRol: number;
  oreStraordinarioFeriale: number;
  oreStraordinarioFestivo: number;
  oreStraordinarioNotturno: number;
  oreReperibilita: number;
  note: string;
}

export interface DocumentoContrattuale {
  id: string;
  tipo: 'contratto_individuale' | 'ccnl' | 'cu' | 'altro';
  nomeFile: string;
  caricatoIl: string;
  testoEstratto: string; // testo grezzo estratto dal PDF, per riferimento/ricerca
  note: string;
}

export interface SpesaMedica {
  id: string;
  data: string; // ISO date
  importo: number;
  descrizione: string;
  categoria: string;
}

export interface Scadenza {
  id: string;
  titolo: string;
  descrizione: string;
  azione: string; // cosa fare esattamente, in modo operativo (es. "Scarica la CU dal portale aziendale")
  destinatario: string; // a chi/dove va consegnato o dove si esegue (es. "CAF di fiducia", "Cassetto Fiscale AdE")
  dataScadenza: string; // ISO date
  ricorrenzaAnnuale: boolean;
  anticipiGiorni: number[]; // es. [30, 15, 7]
  completata: boolean;
  categoria: 'dichiarativo' | 'versamento' | 'altro';
}

export interface ImpostazioniApp {
  id: 'singleton';
  annoFiscaleCorrente: number;
}
