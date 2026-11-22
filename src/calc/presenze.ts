import type { Presenza, Profilo } from '../types';

// Calcolo della retribuzione attesa dalle presenze dichiarate, da confrontare col cedolino.
// Valore ora = (RAL / mensilità) / 173 (divisore convenzionale mensile CCNL Metalmeccanici per il calcolo orario).
// Maggiorazioni straordinario (indicative, da CCNL Metalmeccanici Industria): feriale +25%, festivo +50%, notturno +35%.
// Le ore di reperibilità "attiva" (quando vieni richiamato) rientrano in queste maggiorazioni se lavorate
// davvero: non serve un calcolo a parte, basta registrarle come straordinario nel mese giusto.

export const DIVISORE_ORARIO_MENSILE = 173;
export const MAGGIORAZIONE_STRAORDINARIO_FERIALE = 0.25;
export const MAGGIORAZIONE_STRAORDINARIO_FESTIVO = 0.5;
export const MAGGIORAZIONE_STRAORDINARIO_NOTTURNO = 0.35;

export interface RisultatoRetribuzioneAttesa {
  valoreOraBase: number;
  competenzaOrdinaria: number;
  competenzaStraordinario: number;
  dettaglioStraordinario: { tipo: string; ore: number; maggiorazione: number; importo: number }[];
  totaleAtteso: number;
  formula: string;
}

export function calcolaRetribuzioneAttesa(profilo: Profilo, presenza: Presenza): RisultatoRetribuzioneAttesa {
  const retribuzioneMensileBase = profilo.ral / profilo.mensilita;
  const valoreOraBase = retribuzioneMensileBase / DIVISORE_ORARIO_MENSILE;

  const competenzaOrdinaria = valoreOraBase * presenza.oreOrdinarieLavorate;

  const dettaglioStraordinario = [
    {
      tipo: 'feriale',
      ore: presenza.oreStraordinarioFeriale,
      maggiorazione: MAGGIORAZIONE_STRAORDINARIO_FERIALE,
      importo: valoreOraBase * (1 + MAGGIORAZIONE_STRAORDINARIO_FERIALE) * presenza.oreStraordinarioFeriale,
    },
    {
      tipo: 'festivo',
      ore: presenza.oreStraordinarioFestivo,
      maggiorazione: MAGGIORAZIONE_STRAORDINARIO_FESTIVO,
      importo: valoreOraBase * (1 + MAGGIORAZIONE_STRAORDINARIO_FESTIVO) * presenza.oreStraordinarioFestivo,
    },
    {
      tipo: 'notturno',
      ore: presenza.oreStraordinarioNotturno,
      maggiorazione: MAGGIORAZIONE_STRAORDINARIO_NOTTURNO,
      importo: valoreOraBase * (1 + MAGGIORAZIONE_STRAORDINARIO_NOTTURNO) * presenza.oreStraordinarioNotturno,
    },
  ];

  const competenzaStraordinario = dettaglioStraordinario.reduce((acc, d) => acc + d.importo, 0);

  return {
    valoreOraBase,
    competenzaOrdinaria,
    competenzaStraordinario,
    dettaglioStraordinario,
    totaleAtteso: competenzaOrdinaria + competenzaStraordinario,
    formula: `valore ora = (RAL / mensilità) / ${DIVISORE_ORARIO_MENSILE}; ordinario = valore ora x ore ordinarie; straordinario = valore ora x (1 + maggiorazione) x ore per tipo`,
  };
}

export interface ConfrontoPresenzeCedolino {
  totaleAtteso: number;
  retribuzioneBaseCedolino: number;
  straordinariCedolino: number;
  totaleCedolino: number;
  differenza: number;
  entroTolleranza: boolean;
  messaggio: string;
}

const TOLLERANZA_EURO = 5.0;

export function confrontaPresenzeConCedolino(
  attesa: RisultatoRetribuzioneAttesa,
  retribuzioneBaseCedolino: number,
  straordinariCedolino: number,
): ConfrontoPresenzeCedolino {
  const totaleCedolino = retribuzioneBaseCedolino + straordinariCedolino;
  const differenza = totaleCedolino - attesa.totaleAtteso;
  const entroTolleranza = Math.abs(differenza) <= TOLLERANZA_EURO;
  return {
    totaleAtteso: attesa.totaleAtteso,
    retribuzioneBaseCedolino,
    straordinariCedolino,
    totaleCedolino,
    differenza,
    entroTolleranza,
    messaggio: entroTolleranza
      ? 'Importo nel cedolino coerente con le presenze dichiarate.'
      : `Il cedolino (€${totaleCedolino.toFixed(2)}) differisce dall'atteso in base alle presenze (€${attesa.totaleAtteso.toFixed(2)}) di €${differenza.toFixed(2)}. Può dipendere da arrotondamenti, ratei o voci non standard: verificare il dettaglio.`,
  };
}

export interface ConfrontoReperibilita {
  stato: 'ok' | 'da_verificare' | 'non_comunicato';
  comunicato: number;
  cedolino: number;
  messaggio: string;
}

const TOLLERANZA_REPERIBILITA_EURO = 2.0;

// Confronta l'importo di reperibilità che l'azienda ha comunicato via email (Presenza.reperibilitaImportoComunicato,
// l'unica fonte attendibile: non si stima con una formula) con la voce corrispondente nel cedolino del mese
// in cui viene effettivamente pagato (spesso il mese successivo a quello di competenza).
export function confrontaReperibilita(
  importoComunicato: number,
  indennitaCedolino: number,
): ConfrontoReperibilita {
  if (importoComunicato <= 0) {
    return {
      stato: 'non_comunicato',
      comunicato: 0,
      cedolino: indennitaCedolino,
      messaggio: 'Nessun importo di reperibilità comunicato per questo mese.',
    };
  }
  const differenza = indennitaCedolino - importoComunicato;
  const entroTolleranza = Math.abs(differenza) <= TOLLERANZA_REPERIBILITA_EURO;
  return {
    stato: entroTolleranza ? 'ok' : 'da_verificare',
    comunicato: importoComunicato,
    cedolino: indennitaCedolino,
    messaggio: entroTolleranza
      ? 'Indennità di reperibilità coerente con quanto comunicato dall\'azienda.'
      : `L'azienda aveva comunicato €${importoComunicato.toFixed(2)} di reperibilità, nel cedolino di questo mese risulta €${indennitaCedolino.toFixed(2)}. Attenzione: la reperibilità viene spesso pagata nel mese successivo a quello di competenza, quindi confronta col cedolino giusto prima di considerarlo un errore.`,
  };
}
