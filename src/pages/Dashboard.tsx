import { useEffect, useState } from 'react';
import type { Cedolino, Profilo, SpesaMedica, Scadenza } from '../types';
import { getProfilo, listaCedolini, listaSpeseMediche, listaScadenze } from '../db';
import { calcolaDetrazioneSpeseMediche } from '../calc/detrazioniMediche';
import { prossimiReminder } from '../calc/scadenzario';
import { analizzaCedolino } from '../calc/anomalie';

const MESI = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

export function Dashboard() {
  const [profilo, setProfilo] = useState<Profilo | undefined>();
  const [cedolini, setCedolini] = useState<Cedolino[]>([]);
  const [spese, setSpese] = useState<SpesaMedica[]>([]);
  const [scadenze, setScadenze] = useState<Scadenza[]>([]);

  useEffect(() => {
    Promise.all([getProfilo(), listaCedolini(), listaSpeseMediche(), listaScadenze()]).then(
      ([p, c, s, sc]) => {
        setProfilo(p);
        setCedolini(c);
        setSpese(s);
        setScadenze(sc);
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

  const totaleSpeseMedicheAnno = spese.filter((s) => new Date(s.data).getFullYear() === annoCorrente).reduce((a, s) => a + s.importo, 0);
  const detrazioneMediche = calcolaDetrazioneSpeseMediche(totaleSpeseMedicheAnno);

  const reminder = prossimiReminder(scadenze);

  const anomalieTotali = cedoliniAnno.flatMap((c, i) => analizzaCedolino(profilo, c, i > 0 ? cedoliniAnno[i - 1] : undefined));

  const maxNetto = Math.max(1, ...cedoliniAnno.map((c) => c.nettoPagato));

  return (
    <div>
      <div className="card">
        <h2>Riepilogo anno {annoCorrente}</h2>
        <div className="stat-grid">
          <div className="stat-box">
            <div className="label">Lordo cumulato vs atteso</div>
            <div className="value">€{lordoCumulato.toFixed(0)} <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>/ €{lordoAtteso.toFixed(0)}</span></div>
          </div>
          <div className="stat-box">
            <div className="label">IRPEF versata (proiezione annua: €{proiezioneIrpefAnnua.toFixed(0)})</div>
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
      </div>

      <div className="card">
        <h2>Netto mensile {annoCorrente}</h2>
        {cedoliniAnno.length === 0 && <div className="empty-state">Nessun cedolino caricato per quest'anno.</div>}
        {cedoliniAnno.length > 0 && (
          <svg viewBox={`0 0 ${cedoliniAnno.length * 60} 200`} width="100%" height="200">
            {cedoliniAnno.map((c, i) => {
              const h = (c.nettoPagato / maxNetto) * 160;
              return (
                <g key={c.id} transform={`translate(${i * 60}, 0)`}>
                  <rect x={10} y={180 - h} width={30} height={h} fill="#5b8cff" rx={3} />
                  <text x={25} y={195} textAnchor="middle" fontSize="10" fill="#9aa5c0">{MESI[c.mese - 1]}</text>
                  <text x={25} y={170 - h} textAnchor="middle" fontSize="10" fill="#e8ecf5">{c.nettoPagato.toFixed(0)}</text>
                </g>
              );
            })}
          </svg>
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
