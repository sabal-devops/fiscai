import type { Presenza, Profilo } from '../types';

// Calcolo della retribuzione attesa dalle presenze dichiarate, da confrontare col cedolino.
// Valore ora = (RAL / mensilità) / 173 (divisore convenzionale mensile CCNL Metalmeccanici per il calcolo orario).
// Maggiorazioni straordinario (indicative, da CCNL Metalmeccanici Industria): feriale +25%, festivo +50%, notturno +35%.

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
