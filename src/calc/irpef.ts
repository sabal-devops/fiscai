// Calcolo IRPEF lavoro dipendente - scaglioni e detrazioni ufficiali.
// FONTE: Legge di Bilancio 2024 (L. 213/2023) per il triennio 2024-2025: 23% / 35% / 43%.
// Dal 2026 la Legge di Bilancio 2026 (L. 199/2025) ha ridotto l'aliquota del secondo scaglione
// dal 35% al 33% (risparmio IRPEF fino a 440€/anno per i redditi medi). Scaglioni in vigore dal 2026:
//   fino a 28.000€: 23%
//   da 28.000,01 a 50.000€: 33%
//   oltre 50.000€: 43%
// Se in futuro servirà calcolare anni d'imposta 2024-2025, sostituire 0.33 con 0.35 nel secondo scaglione.

export const SCAGLIONI_IRPEF_2025 = [
  { da: 0, a: 28000, aliquota: 0.23 },
  { da: 28000, a: 50000, aliquota: 0.33 },
  { da: 50000, a: Infinity, aliquota: 0.43 },
];

export interface RisultatoIrpefLorda {
  imponibile: number;
  irpefLordaAnnua: number;
  dettaglioScaglioni: { da: number; a: number; aliquota: number; imposta: number }[];
  formula: string;
}

// Calcolo IRPEF lorda annua a scaglioni progressivi (al netto delle detrazioni).
export function calcolaIrpefLordaAnnua(imponibileAnnuo: number): RisultatoIrpefLorda {
  let residuo = imponibileAnnuo;
  let totale = 0;
  const dettaglio: RisultatoIrpefLorda['dettaglioScaglioni'] = [];
  for (const scaglione of SCAGLIONI_IRPEF_2025) {
    const ampiezza = Math.min(residuo, scaglione.a - scaglione.da);
    if (ampiezza <= 0) {
      dettaglio.push({ ...scaglione, imposta: 0 });
      continue;
    }
    const imposta = ampiezza * scaglione.aliquota;
    totale += imposta;
    dettaglio.push({ ...scaglione, imposta });
    residuo -= ampiezza;
  }
  return {
    imponibile: imponibileAnnuo,
    irpefLordaAnnua: totale,
    dettaglioScaglioni: dettaglio,
    formula: 'somma(imponibile in ciascuno scaglione x aliquota dello scaglione)',
  };
}

export interface RisultatoDetrazioneLavoroDipendente {
  detrazioneAnnua: number;
  formula: string;
  fascia: string;
}

// Detrazione per redditi da lavoro dipendente (art. 13 TUIR, come modificato dalla L. 197/2022 e succ.).
// Importi validi per redditi di lavoro dipendente (escluso pensione), rapporto di lavoro per l'intero anno.
// Se il rapporto non copre l'intero anno, la detrazione va riproporzionata ai giorni di lavoro (gg lavorati / 365).
export function calcolaDetrazioneLavoroDipendenteAnnua(
  redditoComplessivo: number,
  giorniLavoratiNellAnno: number,
): RisultatoDetrazioneLavoroDipendente {
  let base: number;
  let fascia: string;
  if (redditoComplessivo <= 15000) {
    base = Math.max(690, redditoComplessivo > 0 ? redditoComplessivo * 0.048 : 0);
    // Non inferiore a 690€ per rapporti a tempo indeterminato; formula semplificata.
    fascia = 'fino a 15.000€';
  } else if (redditoComplessivo <= 28000) {
    base = 1910 + (28000 - redditoComplessivo) * (1190 / 13000);
    fascia = 'da 15.000,01 a 28.000€';
  } else if (redditoComplessivo <= 50000) {
    base = 1910 * ((50000 - redditoComplessivo) / 22000);
    fascia = 'da 28.000,01 a 50.000€';
  } else {
    base = 0;
    fascia = 'oltre 50.000€';
  }
  const proporzione = Math.min(1, Math.max(0, giorniLavoratiNellAnno / 365));
  const detrazioneAnnua = Math.max(0, base) * proporzione;
  return {
    detrazioneAnnua,
    fascia,
    formula: `detrazione base fascia reddito (${fascia}) x (giorni lavorati nell'anno / 365)`,
  };
}

export interface RisultatoIrpefNetta {
  irpefLordaAnnua: number;
  detrazioneLavoroDipendente: number;
  irpefNettaAnnua: number;
  irpefNettaMensileMedia: number;
  formula: string;
}

export function calcolaIrpefNettaAnnua(
  imponibileFiscaleAnnuo: number,
  giorniLavoratiNellAnno: number,
  mensilita: number,
): RisultatoIrpefNetta {
  const lorda = calcolaIrpefLordaAnnua(imponibileFiscaleAnnuo);
  const detrazione = calcolaDetrazioneLavoroDipendenteAnnua(imponibileFiscaleAnnuo, giorniLavoratiNellAnno);
  const netta = Math.max(0, lorda.irpefLordaAnnua - detrazione.detrazioneAnnua);
  return {
    irpefLordaAnnua: lorda.irpefLordaAnnua,
    detrazioneLavoroDipendente: detrazione.detrazioneAnnua,
    irpefNettaAnnua: netta,
    irpefNettaMensileMedia: netta / mensilita,
    formula: 'IRPEF lorda (a scaglioni) - detrazione lavoro dipendente (riproporzionata ai giorni lavorati)',
  };
}
