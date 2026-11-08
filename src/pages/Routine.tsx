import { useEffect, useState } from 'react';
import type { Profilo, Cedolino, Presenza } from '../types';
import { getProfilo, listaCedolini, listaPresenze, listaCompletamentiRoutine, setCompletamentoRoutine } from '../db';
import { calcolaRoutine, type CadenzaRoutine, type VoceRoutine } from '../calc/routine';

const ETICHETTA_CADENZA: Record<CadenzaRoutine, string> = {
  mensile: 'Ogni mese',
  trimestrale: 'Ogni 3 mesi',
  annuale: 'Ogni anno',
  una_tantum: 'Una tantum',
};

export function Routine() {
  const [profilo, setProfilo] = useState<Profilo | undefined>();
  const [cedolini, setCedolini] = useState<Cedolino[]>([]);
  const [presenze, setPresenze] = useState<Presenza[]>([]);
  const [completamenti, setCompletamenti] = useState<Set<string>>(new Set());

  async function ricarica() {
    const [p, c, pr, comp] = await Promise.all([
      getProfilo(),
      listaCedolini(),
      listaPresenze(),
      listaCompletamentiRoutine(),
    ]);
    setProfilo(p);
    setCedolini(c);
    setPresenze(pr);
    setCompletamenti(new Set(comp));
  }

  useEffect(() => { ricarica(); }, []);

  async function toggle(voce: VoceRoutine) {
    if (!voce.togglabile) return;
    await setCompletamentoRoutine(voce.chiavePeriodo, !voce.fatto);
    ricarica();
  }

  const voci = calcolaRoutine(profilo, cedolini, presenze, completamenti);
  const gruppi: { cadenza: CadenzaRoutine; voci: VoceRoutine[] }[] = (
    ['mensile', 'trimestrale', 'una_tantum', 'annuale'] as CadenzaRoutine[]
  )
    .map((cadenza) => ({ cadenza, voci: voci.filter((v) => v.cadenza === cadenza) }))
    .filter((g) => g.voci.length > 0);

  return (
    <div>
      <div className="card">
        <h2>La tua routine</h2>
        <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>
          Non solo il 730: queste sono le cose da controllare periodicamente per tenere sotto controllo
          la tua situazione economica, con una cadenza chiara. Le voci con la spunta grigia sono dedotte
          automaticamente dai dati in FiscAI; quelle cliccabili le spunti tu quando le hai fatte.
        </p>
      </div>

      {gruppi.map((gruppo) => (
        <div key={gruppo.cadenza} className="card">
          <h2 style={{ fontSize: 15, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {ETICHETTA_CADENZA[gruppo.cadenza]}
          </h2>
          {gruppo.voci.map((v) => (
            <div key={v.chiave} className="card" style={{ background: '#0c111c', marginBottom: 10 }}>
              <div className="toolbar">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={v.fatto}
                    disabled={!v.togglabile}
                    onChange={() => toggle(v)}
                    style={{ cursor: v.togglabile ? 'pointer' : 'default' }}
                  />
                  <strong style={{ opacity: v.fatto ? 0.6 : 1 }}>{v.titolo}</strong>
                </div>
                {v.fatto && <span className="badge ok">Fatto</span>}
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: '4px 0' }}>{v.spiegazione}</p>
              <p style={{ fontSize: 14, margin: '6px 0' }}><strong>Cosa fare:</strong> {v.azione}</p>
              <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: '6px 0' }}>{v.dettaglioStato}</p>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
