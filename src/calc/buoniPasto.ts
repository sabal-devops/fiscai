// Limiti di esenzione fiscale e contributiva dei buoni pasto (art. 51 co.2 lett. c TUIR).
// Buoni pasto cartacei: esenti fino a 4,00€ al giorno.
// Buoni pasto elettronici: esenti fino a 8,00€ al giorno.
// L'eccedenza rispetto al limite concorre a formare reddito imponibile (fiscale e contributivo).

export const LIMITE_ESENZIONE_CARTACEO = 4.0;
export const LIMITE_ESENZIONE_ELETTRONICO = 8.0;

export interface RisultatoBuoniPasto {
  tipo: 'cartaceo' | 'elettronico';
  valoreUnitario: number;
  limiteEsenzione: number;
  numero: number;
  quotaEsenteGiornaliera: number;
  quotaImponibileGiornaliera: number;
  totaleImponibileMese: number;
  formula: string;
  entroLimite: boolean;
}

export function verificaBuoniPasto(
  tipo: 'cartaceo' | 'elettronico',
  valoreUnitario: number,
  numero: number,
): RisultatoBuoniPasto {
  const limite = tipo === 'cartaceo' ? LIMITE_ESENZIONE_CARTACEO : LIMITE_ESENZIONE_ELETTRONICO;
  const quotaEsente = Math.min(valoreUnitario, limite);
  const quotaImponibile = Math.max(0, valoreUnitario - limite);
  return {
    tipo,
    valoreUnitario,
    limiteEsenzione: limite,
    numero,
    quotaEsenteGiornaliera: quotaEsente,
    quotaImponibileGiornaliera: quotaImponibile,
    totaleImponibileMese: quotaImponibile * numero,
    formula: `max(0, valore unitario (€${valoreUnitario.toFixed(2)}) - limite esenzione ${tipo} (€${limite.toFixed(2)})) x numero buoni (${numero})`,
    entroLimite: quotaImponibile === 0,
  };
}
