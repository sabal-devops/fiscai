import { useEffect, useState } from 'react';
import type { Profilo as ProfiloType, FamiliareACarico, Immobile } from '../types';
import { getProfilo, salvaProfilo, nuovoId } from '../db';

const PROFILO_VUOTO: ProfiloType = {
  nome: '',
  cognome: '',
  codiceFiscale: '',
  comuneResidenza: '',
  datoreLavoro: '',
  ccnl: 'Metalmeccanici Industria',
  livello: '',
  dataAssunzione: '',
  ral: 0,
  mensilita: 13,
  familiariACarico: [],
  immobili: [],
  mutuo: { attivo: false, interessiAnnui: 0, tipo: 'prima_casa' },
  addizionaleRegionalePct: 0,
  addizionaleComunalePct: 0,
  aggiornatoIl: '',
};

export function Profilo() {
  const [profilo, setProfilo] = useState<ProfiloType>(PROFILO_VUOTO);
  const [caricato, setCaricato] = useState(false);
  const [salvato, setSalvato] = useState(false);

  useEffect(() => {
    getProfilo().then((p) => {
      if (p) setProfilo(p);
      setCaricato(true);
    });
  }, []);

  function aggiorna<K extends keyof ProfiloType>(campo: K, valore: ProfiloType[K]) {
    setProfilo((p) => ({ ...p, [campo]: valore }));
    setSalvato(false);
  }

  async function salva() {
    await salvaProfilo({ ...profilo, aggiornatoIl: new Date().toISOString() });
    setSalvato(true);
  }

  function aggiungiFamiliare() {
    const nuovo: FamiliareACarico = { id: nuovoId(), relazione: 'figlio', mesiACarico: 12 };
    aggiorna('familiariACarico', [...profilo.familiariACarico, nuovo]);
  }

  function rimuoviFamiliare(id: string) {
    aggiorna('familiariACarico', profilo.familiariACarico.filter((f) => f.id !== id));
  }

  function aggiungiImmobile() {
    const nuovo: Immobile = { id: nuovoId(), descrizione: '', uso: 'abitazione_principale', rendita: 0 };
    aggiorna('immobili', [...profilo.immobili, nuovo]);
  }

  function rimuoviImmobile(id: string) {
    aggiorna('immobili', profilo.immobili.filter((i) => i.id !== id));
  }

  if (!caricato) return <div className="empty-state">Caricamento...</div>;

  return (
    <div>
      <div className="card">
        <h2>Dati anagrafici</h2>
        <div className="form-grid">
          <div className="field">
            <label>Nome</label>
            <input value={profilo.nome} onChange={(e) => aggiorna('nome', e.target.value)} />
          </div>
          <div className="field">
            <label>Cognome</label>
            <input value={profilo.cognome} onChange={(e) => aggiorna('cognome', e.target.value)} />
          </div>
          <div className="field">
            <label>Codice fiscale</label>
            <input value={profilo.codiceFiscale} onChange={(e) => aggiorna('codiceFiscale', e.target.value.toUpperCase())} />
          </div>
          <div className="field">
            <label>Comune di residenza</label>
            <input value={profilo.comuneResidenza} onChange={(e) => aggiorna('comuneResidenza', e.target.value)} />
          </div>
        </div>
      </div>

      <div className="card">
        <h2>Addizionali IRPEF</h2>
        <p style={{ color: 'var(--text-dim)', fontSize: 13, marginTop: -4 }}>
          Facoltative: dipendono dal tuo comune/regione di domicilio fiscale. Se non le conosci, lasciale a 0:
          la verifica sulle addizionali nei cedolini verrà semplicemente saltata invece di dare risultati inventati.
        </p>
        <div className="form-grid">
          <div className="field">
            <label>Aliquota addizionale regionale (%)</label>
            <input type="number" step="0.01" value={profilo.addizionaleRegionalePct} onChange={(e) => aggiorna('addizionaleRegionalePct', parseFloat(e.target.value) || 0)} />
          </div>
          <div className="field">
            <label>Aliquota addizionale comunale (%)</label>
            <input type="number" step="0.01" value={profilo.addizionaleComunalePct} onChange={(e) => aggiorna('addizionaleComunalePct', parseFloat(e.target.value) || 0)} />
          </div>
        </div>
      </div>

      <div className="card">
        <h2>Contratto di lavoro</h2>
        <div className="form-grid">
          <div className="field">
            <label>Datore di lavoro</label>
            <input value={profilo.datoreLavoro} onChange={(e) => aggiorna('datoreLavoro', e.target.value)} />
          </div>
          <div className="field">
            <label>CCNL applicato</label>
            <input value={profilo.ccnl} onChange={(e) => aggiorna('ccnl', e.target.value)} />
          </div>
          <div className="field">
            <label>Livello di inquadramento</label>
            <input value={profilo.livello} onChange={(e) => aggiorna('livello', e.target.value)} placeholder="es. B3" />
          </div>
          <div className="field">
            <label>Data assunzione</label>
            <input type="date" value={profilo.dataAssunzione} onChange={(e) => aggiorna('dataAssunzione', e.target.value)} />
          </div>
          <div className="field">
            <label>RAL (retribuzione annua lorda, €)</label>
            <input type="number" value={profilo.ral} onChange={(e) => aggiorna('ral', parseFloat(e.target.value) || 0)} />
          </div>
          <div className="field">
            <label>Numero mensilità</label>
            <select value={profilo.mensilita} onChange={(e) => aggiorna('mensilita', parseInt(e.target.value, 10))}>
              <option value={12}>12</option>
              <option value={13}>13</option>
              <option value={14}>14</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="toolbar">
          <h2 style={{ margin: 0 }}>Familiari a carico</h2>
          <button className="secondary" onClick={aggiungiFamiliare}>+ Aggiungi</button>
        </div>
        {profilo.familiariACarico.length === 0 && <div className="empty-state">Nessun familiare a carico</div>}
        {profilo.familiariACarico.map((f) => (
          <div key={f.id} className="form-grid" style={{ marginBottom: 8, alignItems: 'end' }}>
            <div className="field">
              <label>Relazione</label>
              <select
                value={f.relazione}
                onChange={(e) =>
                  aggiorna(
                    'familiariACarico',
                    profilo.familiariACarico.map((x) => (x.id === f.id ? { ...x, relazione: e.target.value as FamiliareACarico['relazione'] } : x)),
                  )
                }
              >
                <option value="coniuge">Coniuge</option>
                <option value="figlio">Figlio/a</option>
                <option value="altro">Altro</option>
              </select>
            </div>
            <div className="field">
              <label>Mesi a carico nell'anno</label>
              <input
                type="number"
                min={0}
                max={12}
                value={f.mesiACarico}
                onChange={(e) =>
                  aggiorna(
                    'familiariACarico',
                    profilo.familiariACarico.map((x) => (x.id === f.id ? { ...x, mesiACarico: parseInt(e.target.value, 10) || 0 } : x)),
                  )
                }
              />
            </div>
            <button className="danger-text" onClick={() => rimuoviFamiliare(f.id)}>Rimuovi</button>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="toolbar">
          <h2 style={{ margin: 0 }}>Immobili</h2>
          <button className="secondary" onClick={aggiungiImmobile}>+ Aggiungi</button>
        </div>
        {profilo.immobili.length === 0 && <div className="empty-state">Nessun immobile dichiarato</div>}
        {profilo.immobili.map((im) => (
          <div key={im.id} className="form-grid" style={{ marginBottom: 8, alignItems: 'end' }}>
            <div className="field">
              <label>Descrizione</label>
              <input
                value={im.descrizione}
                onChange={(e) => aggiorna('immobili', profilo.immobili.map((x) => (x.id === im.id ? { ...x, descrizione: e.target.value } : x)))}
              />
            </div>
            <div className="field">
              <label>Uso</label>
              <select
                value={im.uso}
                onChange={(e) =>
                  aggiorna('immobili', profilo.immobili.map((x) => (x.id === im.id ? { ...x, uso: e.target.value as Immobile['uso'] } : x)))
                }
              >
                <option value="abitazione_principale">Abitazione principale</option>
                <option value="altro">Altro</option>
              </select>
            </div>
            <div className="field">
              <label>Rendita catastale (€)</label>
              <input
                type="number"
                value={im.rendita}
                onChange={(e) => aggiorna('immobili', profilo.immobili.map((x) => (x.id === im.id ? { ...x, rendita: parseFloat(e.target.value) || 0 } : x)))}
              />
            </div>
            <button className="danger-text" onClick={() => rimuoviImmobile(im.id)}>Rimuovi</button>
          </div>
        ))}
      </div>

      <div className="card">
        <h2>Mutuo</h2>
        <div className="form-grid">
          <div className="field">
            <label>
              <input
                type="checkbox"
                checked={profilo.mutuo.attivo}
                onChange={(e) => aggiorna('mutuo', { ...profilo.mutuo, attivo: e.target.checked })}
                style={{ marginRight: 6 }}
              />
              Ho un mutuo attivo
            </label>
          </div>
          {profilo.mutuo.attivo && (
            <>
              <div className="field">
                <label>Tipo</label>
                <select
                  value={profilo.mutuo.tipo}
                  onChange={(e) => aggiorna('mutuo', { ...profilo.mutuo, tipo: e.target.value as 'prima_casa' | 'altro' })}
                >
                  <option value="prima_casa">Prima casa</option>
                  <option value="altro">Altro</option>
                </select>
              </div>
              <div className="field">
                <label>Interessi passivi annui (€)</label>
                <input
                  type="number"
                  value={profilo.mutuo.interessiAnnui}
                  onChange={(e) => aggiorna('mutuo', { ...profilo.mutuo, interessiAnnui: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </>
          )}
        </div>
      </div>

      <div className="toolbar">
        <button className="primary" onClick={salva}>Salva profilo</button>
        {salvato && <span className="badge ok">Salvato</span>}
      </div>
    </div>
  );
}
