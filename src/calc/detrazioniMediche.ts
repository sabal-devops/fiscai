// Detrazione spese sanitarie - art. 15 co.1 lett. c TUIR.
// Detrazione IRPEF del 19% sulla parte di spesa che eccede la franchigia di 129,11€ annui.
// NB: dal 2025 (L. 207/2024) la detraibilità di alcune spese è condizionata a redditi complessivi
// superiori a 75.000/120.000€ (tracciabilità del pagamento sempre richiesta, tranne farmaci/dispositivi SSN).
// Qui si assume pagamento tracciabile e reddito nella fascia standard; per casi particolari verificare con un CAF.

export const FRANCHIGIA_SPESE_MEDICHE = 129.11;
export const ALIQUOTA_DETRAZIONE_SPESE_MEDICHE = 0.19;

export interface RisultatoDetrazioneMediche {
  totaleSpesePagate: number;
  franchigia: number;
  importoEccedente: number;
  detrazioneSpettante: number;
  formula: string;
}

export function calcolaDetrazioneSpeseMediche(totaleSpesePagate: number): RisultatoDetrazioneMediche {
  const eccedente = Math.max(0, totaleSpesePagate - FRANCHIGIA_SPESE_MEDICHE);
  const detrazione = eccedente * ALIQUOTA_DETRAZIONE_SPESE_MEDICHE;
  return {
    totaleSpesePagate,
    franchigia: FRANCHIGIA_SPESE_MEDICHE,
    importoEccedente: eccedente,
    detrazioneSpettante: detrazione,
    formula: `max(0, totale spese (€${totaleSpesePagate.toFixed(2)}) - franchigia €${FRANCHIGIA_SPESE_MEDICHE.toFixed(2)}) x 19%`,
  };
}
