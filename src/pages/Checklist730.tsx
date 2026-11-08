import { useEffect, useState } from 'react';
import type { Profilo, DocumentoContrattuale, SpesaMedica, Cedolino } from '../types';
import { getProfilo, listaDocumenti, listaSpeseMediche, listaCedolini } from '../db';
import { calcolaChecklist730, type StatoChecklist } from '../calc/checklist730';

const BADGE_PER_STATO: Record<StatoChecklist, { label: string; classe: string }> = {
  completo: { label: 'Completo', classe: 'ok' },
  mancante: { label: 'Obbligatorio mancante', classe: 'danger' },
  da_verificare: { label: 'Da verificare', classe: 'warn' },
  non_applicabile: { label: 'Non applicabile', classe: 'ok' },
};

export function Checklist730() {
  const [profilo, setProfilo] = useState<Profilo | undefined>();
  const [documenti, setDocumenti] = useState<DocumentoContrattuale[]>([]);
  const [spese, setSpese] = useState<SpesaMedica[]>([]);
  const [cedolini, setCedolini] = useState<Cedolino[]>([]);
  const [anno, setAnno] = useState(new Date().getFullYear());

  useEffect(() => {
    Promise.all([getProfilo(), listaDocumenti(), listaSpeseMediche(), listaCedolini()]).then(
      ([p, d, s, c]) => {
        setProfilo(p);
        setDocumenti(d);
        setSpese(s);
        setCedolini(c);
      },
    );
  }, []);

  const voci = calcolaChecklist730(profilo, documenti, spese, cedolini, anno);
  const obbligatoriMancanti = voci.filter((v) => v.obbligatorioSempre && v.stato === 'mancante');

  return (
    <div>
      <div className="card">
        <div className="toolbar">
          <h2 style={{ margin: 0 }}>Documenti necessari per il 730</h2>
          <div className="field" style={{ margin: 0 }}>
            <label>Anno di riferimento</label>
            <input type="number" value={anno} onChange={(e) => setAnno(parseInt(e.target.value, 10) || anno)} style={{ width: 100 }} />
          </div>
        </div>
        <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>
          Questa checklist è pensata per un dipendente privato senza partita IVA. Gli elementi "obbligatori"
          servono sempre; gli altri dipendono dalla tua situazione (es. mutuo, spese mediche) e FiscAI prova
          a dedurre automaticamente se ti riguardano, in base a quello che hai già inserito nell'app.
        </p>
        {obbligatoriMancanti.length > 0 ? (
          <div className="anomalia">
            Mancano {obbligatoriMancanti.length} documento/i obbligatorio/i: {obbligatoriMancanti.map((v) => v.titolo).join(', ')}.
            Senza questi non puoi considerare completo il 730.
          </div>
        ) : (
          <div className="badge ok">Tutti i documenti obbligatori risultano presenti</div>
        )}
      </div>

      {voci.map((v) => (
        <div key={v.chiave} className="card" style={{ background: '#0c111c' }}>
          <div className="toolbar">
            <strong>{v.titolo}{v.obbligatorioSempre && <span style={{ color: 'var(--danger)' }}> *</span>}</strong>
            <span className={`badge ${BADGE_PER_STATO[v.stato].classe}`}>{BADGE_PER_STATO[v.stato].label}</span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: '4px 0' }}>{v.spiegazione}</p>
          <p style={{ fontSize: 14, margin: '6px 0' }}><strong>Dove trovarlo/a chi chiederlo:</strong> {v.dove}</p>
          <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: '6px 0' }}>{v.dettaglioStato}</p>
        </div>
      ))}

      <p style={{ fontSize: 12, color: 'var(--text-dim)' }}>* Obbligatorio per chiunque presenti il 730.</p>
    </div>
  );
}
