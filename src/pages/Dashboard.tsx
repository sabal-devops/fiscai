import { useEffect, useState } from 'react';
import type { Cedolino, Profilo, SpesaMedica, Scadenza, Presenza } from '../types';
import { getProfilo, listaCedolini, listaSpeseMediche, listaScadenze, listaPresenze } from '../db';
import { calcolaDetrazioneSpeseMediche } from '../calc/detrazioniMediche';
import { prossimiReminder } from '../calc/scadenzario';
import { analizzaCedolino } from '../calc/anomalie';
import { calcolaOreStraordinarioAnno, calcolaProiezioneFiscaleAnnuale, LIMITE_STRAORDINARIO_ANNUO_OLTRE_200_DIP } from '../calc/proiezioneAnnuale';

const MESI = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
const MESI_ESTESI = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];

export function Dashboard() {
  const [profilo, setProfilo] = useState<Profilo | undefined>();
  const [cedolini, setCedolini] = useState<Cedolino[]>([]);
  const [spese, setSpese] = useState<SpesaMedica[]>([]);
  const [scadenze, setScadenze] = useState<Scadenza[]>([]);
  const [presenze, setPresenze] = useState<Presenza[]>([]);
  const [meseSelezionato, setMeseSelezionato] = useState<string | null>(null);
  const [dettaglioIrpefAperto, setDettaglioIrpefAperto] = useState(false);

  useEffect(() => {
    Promise.all([getProfilo(), listaCedolini(), listaSpeseMediche(), listaScadenze(), listaPresenze()]).then(
      ([p, c, s, sc, pr]) => {
        setProfilo(p);
        setCedolini(c);
        setSpese(s);
        setScadenze(sc);
        setPresenze(pr);
      },
    );
  }, []);

  const annoCorrente = new Date().getFullYear();
  const cedoliniAnno = cedolini.filter((c) => c.anno === annoCorrente).sort((a, b) => a.mese - b.mese);

  const lordoCumulato = cedoliniAnno.reduce((acc, c) => acc + c.totaleCompetenze, 0);
  const lordoAtteso = profilo ? (profilo.ral / profilo.mensilita) * cedoliniAnno.length : 0;
  const irpefVersata = cedoliniAnno.reduce((acc, c) => acc + c.irpefTrattenuta, 0);
  const tfrCumulato = cedoliniAnno.length > 0 ? cedoliniAnno[cedoliniAnno.length - 1].tfrAccantonatoCumulato : 0;

  const proiezioneIrpefAnnua = cedoliniAnno.length > 0 && profilo ? (irpefVersata / cedoliniAnno.length) * profilo.mensilita : 0;

  const speseMedicheAnno = spese.filter((s) => new Date(s.data).getFullYear() === annoCorrente);
  const nettoSpeseMedicheAnno = Math.max(
    0,
    speseMedicheAnno.reduce((a, s) => a + s.importo, 0) - speseMedicheAnno.reduce((a, s) => a + (s.rimborsatoDaFondoSanitario || 0), 0),
  );
  const detrazioneMediche = calcolaDetrazioneSpeseMediche(nettoSpeseMedicheAnno);

  const reminder = prossimiReminder(scadenze);

  const anomaliePerMese = cedoliniAnno.map((c, i) => ({
    cedolino: c,
    anomalie: analizzaCedolino(profilo, c, i > 0 ? cedoliniAnno[i - 1] : undefined),
  }));
  const anomalieTotali = anomaliePerMese.flatMap((x) => x.anomalie);

  const maxNetto = Math.max(1, ...cedoliniAnno.map((c) => c.nettoPagato));
  const cedolinoSelezionato = anomaliePerMese.find((x) => x.cedolino.id === meseSelezionato);

  const oreStraordinario = calcolaOreStraordinarioAnno(presenze, annoCorrente);
  const proiezioneFiscale = calcolaProiezioneFiscaleAnnuale(profilo, cedolini, presenze, annoCorrente);

  function selezionaMese(id: string) {
    setMeseSelezionato(meseSelezionato === id ? null : id);
  }

  return (
    <div>
      <div className="card">
        <h2>Riepilogo anno {annoCorrente}</h2>
        <div className="stat-grid">
          <div className="stat-box">
            <div className="label">Lordo cumulato vs atteso</div>
            <div className="value">€{lordoCumulato.toFixed(0)} <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>/ €{lordoAtteso.toFixed(0)}</span></div>
          </div>
          <div
            className="stat-box stat-box-cliccabile"
            onClick={() => setDettaglioIrpefAperto(!dettaglioIrpefAperto)}
            title="Clicca per vedere il dettaglio mese per mese"
          >
            <div className="label">IRPEF versata (proiezione annua: €{proiezioneIrpefAnnua.toFixed(0)}) ↕</div>
            <div className="value">€{irpefVersata.toFixed(0)}</div>
          </div>
          <div className="stat-box">
            <div className="label">TFR maturato cumulato</div>
            <div className="value">€{tfrCumulato.toFixed(0)}</div>
          </div>
          <div className="stat-box">
            <div className="label">Detrazione spese mediche recuperabile</div>
            <div className="value" style={{ color: 'var(--ok)' }}>€{detrazioneMediche.detrazioneSpettante.toFixed(0)}</div>
          </div>
        </div>

        {dettaglioIrpefAperto && (
          <table style={{ marginTop: 14 }}>
            <thead><tr><th>Mese</th><th>Imponibile</th><th>IRPEF trattenuta</th><th>IRPEF cumulata</th></tr></thead>
            <tbody>
              {cedoliniAnno.map((c) => (
                <tr key={c.id}>
                  <td>{MESI_ESTESI[c.mese - 1]}</td>
                  <td>€{c.imponibileFiscaleMese.toFixed(2)}</td>
                  <td>€{c.irpefTrattenuta.toFixed(2)}</td>
                  <td>€{c.irpefCumulata.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h2>Netto mensile {annoCorrente}</h2>
        <p className="card-sottotitolo">Clicca su una barra per vedere il dettaglio completo del mese.</p>
        {cedoliniAnno.length === 0 && <div className="empty-state">Nessun cedolino caricato per quest'anno.</div>}
        {cedoliniAnno.length > 0 && (
          <svg viewBox={`0 0 ${cedoliniAnno.length * 60} 200`} width="100%" height="200">
            {cedoliniAnno.map((c, i) => {
              const h = (c.nettoPagato / maxNetto) * 160;
              const selezionata = meseSelezionato === c.id;
              return (
                <g
                  key={c.id}
                  transform={`translate(${i * 60}, 0)`}
                  className="barra-dashboard"
                  onClick={() => selezionaMese(c.id)}
                >
                  <title>{`${MESI_ESTESI[c.mese - 1]}: netto €${c.nettoPagato.toFixed(2)} (clicca per il dettaglio)`}</title>
                  <rect x={10} y={180 - h} width={30} height={h} fill={selezionata ? '#8fb4ff' : '#5b8cff'} rx={3} />
                  <text x={25} y={195} textAnchor="middle" fontSize="10" fill={selezionata ? '#e8ecf5' : '#9aa5c0'} fontWeight={selezionata ? 700 : 400}>{MESI[c.mese - 1]}</text>
                  <text x={25} y={170 - h} textAnchor="middle" fontSize="10" fill="#e8ecf5">{c.nettoPagato.toFixed(0)}</text>
                </g>
              );
            })}
          </svg>
        )}

        {cedolinoSelezionato && (
          <div className="card" style={{ background: '#0c111c', marginTop: 4, marginBottom: 0 }}>
            <div className="toolbar">
              <strong>{MESI_ESTESI[cedolinoSelezionato.cedolino.mese - 1]} {cedolinoSelezionato.cedolino.anno}</strong>
              <button className="secondary" onClick={() => setMeseSelezionato(null)}>Chiudi</button>
            </div>
            <div className="stat-grid">
              <div className="stat-box">
                <div className="label">Retribuzione base</div>
                <div className="value">€{cedolinoSelezionato.cedolino.retribuzioneBase.toFixed(2)}</div>
              </div>
              <div className="stat-box">
                <div className="label">Totale competenze</div>
                <div className="value">€{cedolinoSelezionato.cedolino.totaleCompetenze.toFixed(2)}</div>
              </div>
              <div className="stat-box">
                <div className="label">Contributi INPS</div>
                <div className="value">€{cedolinoSelezionato.cedolino.contributiInps.toFixed(2)}</div>
              </div>
              <div className="stat-box">
                <div className="label">IRPEF trattenuta</div>
                <div className="value">€{cedolinoSelezionato.cedolino.irpefTrattenuta.toFixed(2)}</div>
              </div>
              <div className="stat-box">
                <div className="label">Netto pagato</div>
                <div className="value">€{cedolinoSelezionato.cedolino.nettoPagato.toFixed(2)}</div>
              </div>
              <div className="stat-box">
                <div className="label">TFR maturato nel mese</div>
                <div className="value">€{cedolinoSelezionato.cedolino.tfrMaturatoMese.toFixed(2)}</div>
              </div>
            </div>
            {cedolinoSelezionato.anomalie.length === 0 && <div className="badge ok" style={{ marginTop: 10 }}>Nessuna anomalia questo mese</div>}
            {cedolinoSelezionato.anomalie.map((a, i) => (
              <div key={i} className="anomalia" style={{ marginTop: 10 }}>{a}</div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h2>Straordinari e proiezione fiscale {annoCorrente}</h2>
        <p className="card-sottotitolo">
          Per vedere l'effetto di straordinari futuri prima ancora che arrivi il cedolino, inserisci una
          presenza anche per un mese non ancora passato in "Presenze": questa proiezione la userà subito.
        </p>
        <div className="stat-grid">
          <div className="stat-box">
            <div className="label">Ore di straordinario nell'anno</div>
            <div className="value">{oreStraordinario.oreTotaliAnno.toFixed(1)} <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>/ {LIMITE_STRAORDINARIO_ANNUO_OLTRE_200_DIP} limite CCNL</span></div>
          </div>
          {proiezioneFiscale.disponibile && (
            <div className="stat-box">
              <div className="label">Imponibile annuo stimato</div>
              <div className="value">€{proiezioneFiscale.imponibileAnnuoStimato.toFixed(0)}</div>
            </div>
          )}
        </div>
        <div
          className={
            oreStraordinario.esito === 'superato' ? 'anomalia'
              : oreStraordinario.esito === 'attenzione' ? 'anomalia'
              : 'badge ok'
          }
          style={{ marginTop: 10, display: 'block' }}
        >
          {oreStraordinario.messaggio}
        </div>
        {proiezioneFiscale.disponibile ? (
          <div
            className={proiezioneFiscale.direzioneConguaglio === 'debito' ? 'anomalia' : proiezioneFiscale.direzioneConguaglio === 'credito' ? 'badge ok' : 'badge ok'}
            style={{ marginTop: 10, display: 'block' }}
          >
            {proiezioneFiscale.messaggio}
          </div>
        ) : (
          <div className="empty-state">{proiezioneFiscale.messaggio}</div>
        )}
      </div>

      <div className="card">
        <h2>Alert attivi</h2>
        {reminder.length === 0 && anomalieTotali.length === 0 && <div className="badge ok">Nessun alert attivo</div>}
        {reminder.map(({ scadenza, giorniRimanenti }) => (
          <div key={scadenza.id} className="anomalia">Scadenza: {scadenza.titolo} ({giorniRimanenti >= 0 ? `${giorniRimanenti} giorni` : 'scaduta'})</div>
        ))}
        {anomalieTotali.slice(0, 10).map((a, i) => (
          <div key={i} className="anomalia">{a}</div>
        ))}
      </div>
    </div>
  );
}
