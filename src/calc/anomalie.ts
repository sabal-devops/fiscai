import type { Cedolino, Profilo } from '../types';
import { verificaRetribuzioneBase } from './ccnl';
import { confrontaContributiInps } from './inps';
import { confrontaTfrMaturato } from './tfr';
import { verificaBuoniPasto } from './buoniPasto';
import { calcolaIrpefNettaAnnua } from './irpef';
import { stimaAddizionaliMensili, verificaAddizionali } from './addizionali';

// Esegue tutte le verifiche automatiche su un cedolino e restituisce la lista di anomalie/messaggi.
// Ogni messaggio indica la formula/criterio usato, così l'utente può sempre verificare il ragionamento.

export function analizzaCedolino(
  profilo: Profilo | undefined,
  cedolino: Cedolino,
  cedolinoPrecedente: Cedolino | undefined,
): string[] {
  const anomalie: string[] = [];

  if (!profilo) {
    anomalie.push('Profilo contribuente non ancora compilato: impossibile eseguire le verifiche su livello CCNL, RAL e detrazioni. Completa il Modulo 1.');
    return anomalie;
  }

  // 1. Retribuzione base vs minimo CCNL
  const verificaBase = verificaRetribuzioneBase(profilo.livello, cedolino.retribuzioneBase);
  if (verificaBase.esito !== 'ok') {
    anomalie.push(verificaBase.messaggio);
  }

  // 2. Contributi INPS
  const imponibileContributivo = cedolino.imponibileFiscaleMese || cedolino.totaleCompetenze;
  const confrontoInps = confrontaContributiInps(imponibileContributivo, cedolino.contributiInps);
  if (!confrontoInps.entroTolleranza) {
    anomalie.push(confrontoInps.messaggio);
  }

  // 3. TFR
  const confrontoTfr = confrontaTfrMaturato(cedolino.totaleCompetenze, cedolino.tfrMaturatoMese);
  if (!confrontoTfr.entroTolleranza) {
    anomalie.push(confrontoTfr.messaggio);
  }

  // 4. Buoni pasto
  if (cedolino.buoniPasto.numero > 0) {
    const verificaBp = verificaBuoniPasto(
      cedolino.buoniPasto.tipo,
      cedolino.buoniPasto.valoreUnitario,
      cedolino.buoniPasto.numero,
    );
    if (!verificaBp.entroLimite) {
      anomalie.push(
        `Buoni pasto: €${verificaBp.valoreUnitario.toFixed(2)} a buono supera il limite di esenzione (${verificaBp.tipo}, €${verificaBp.limiteEsenzione.toFixed(2)}); l'eccedenza (€${verificaBp.totaleImponibileMese.toFixed(2)} nel mese) dovrebbe concorrere a formare reddito imponibile. Verifica che sia stata correttamente assoggettata.`,
      );
    }
  }

  // 4b. Addizionali regionali/comunali (verifica indicativa, vedi calc/addizionali.ts per i limiti)
  const stimaAddizionali = stimaAddizionaliMensili(
    cedolino.imponibileFiscaleMese || cedolino.totaleCompetenze,
    profilo.addizionaleRegionalePct,
    profilo.addizionaleComunalePct,
    cedolino.addizionaliRegionaliComunali,
  );
  const verificaAdd = verificaAddizionali(stimaAddizionali);
  if (verificaAdd.esito === 'da_verificare') {
    anomalie.push(verificaAdd.messaggio);
  }

  // 5. IRPEF cumulata coerente con proiezione annua a scaglioni
  // Proiezione grezza: imponibile annuo = cumulato ad oggi / mesi trascorsi x 12 mesi di lavoro.
  if (cedolino.imponibileFiscaleCumulato > 0 && cedolino.mese > 0) {
    const imponibileAnnuoProiettato = (cedolino.imponibileFiscaleCumulato / cedolino.mese) * 12;
    const irpefStimata = calcolaIrpefNettaAnnua(imponibileAnnuoProiettato, 365, profilo.mensilita);
    const irpefCumulataAttesaAProRata = (irpefStimata.irpefNettaAnnua / 12) * cedolino.mese;
    const differenza = cedolino.irpefCumulata - irpefCumulataAttesaAProRata;
    if (Math.abs(differenza) > Math.max(30, irpefCumulataAttesaAProRata * 0.1)) {
      anomalie.push(
        `IRPEF cumulata (€${cedolino.irpefCumulata.toFixed(2)}) si discosta dalla proiezione basata sugli scaglioni annui (stima €${irpefCumulataAttesaAProRata.toFixed(2)}, calcolata proiettando il cumulato attuale su 12 mesi). Normale nei mesi con conguagli, tredicesima o variazioni di imponibile; da monitorare se la differenza persiste nel tempo.`,
      );
    }
  }

  // 6. Confronto con mese precedente (variazioni anomale)
  if (cedolinoPrecedente) {
    const sogliaVariazionePercentuale = 0.15; // 15%
    const confrontaVoce = (nome: string, attuale: number, precedente: number) => {
      if (precedente <= 0) return;
      const variazione = (attuale - precedente) / precedente;
      if (Math.abs(variazione) > sogliaVariazionePercentuale) {
        anomalie.push(
          `${nome}: variazione del ${(variazione * 100).toFixed(1)}% rispetto al mese precedente (€${precedente.toFixed(2)} -> €${attuale.toFixed(2)}). Verifica se giustificata (es. straordinari, assenze, conguagli).`,
        );
      }
    };
    confrontaVoce('Netto pagato', cedolino.nettoPagato, cedolinoPrecedente.nettoPagato);
    confrontaVoce('Retribuzione base', cedolino.retribuzioneBase, cedolinoPrecedente.retribuzioneBase);
    confrontaVoce('IRPEF trattenuta', cedolino.irpefTrattenuta, cedolinoPrecedente.irpefTrattenuta);
    confrontaVoce('Contributi INPS', cedolino.contributiInps, cedolinoPrecedente.contributiInps);
  }

  return anomalie;
}
