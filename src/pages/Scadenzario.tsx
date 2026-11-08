import { useEffect, useState } from 'react';
import type { Scadenza } from '../types';
import { listaScadenze, salvaScadenza, eliminaScadenza, nuovoId } from '../db';
import { generaScadenzeStandard, prossimiReminder } from '../calc/scadenzario';

function scadenzaVuota(): Scadenza {
  return {
    id: nuovoId(),
    titolo: '',
    descrizione: '',
    dataScadenza: new Date().toISOString().slice(0, 10),
    ricorrenzaAnnuale: false,
    anticipiGiorni: [7],
    completata: false,
    categoria: 'altro',
  };
}

export function Scadenzario() {
  const [scadenze, setScadenze] = useState<Scadenza[]>([]);
  const [form, setForm] = useState<Scadenza | null>(null);

  async function ricarica() {
    setScadenze(await listaScadenze());
  }
  useEffect(() => { ricarica(); }, []);

  async function generaStandard() {
    const anno = new Date().getFullYear();
    if (!confirm(`Generare le scadenze fiscali standard per l'anno ${anno}?`)) return;
    const nuove = generaScadenzeStandard(anno);
    for (const s of nuove) await salvaScadenza(s);
    ricarica();
  }

  async function toggleCompletata(s: Scadenza) {
    await salvaScadenza({ ...s, completata: !s.completata });
    ricarica();
  }

  async function elimina(id: string) {
    if (!confirm('Eliminare questa scadenza?')) return;
    await eliminaScadenza(id);
    ricarica();
  }

  function aggiorna<K extends keyof Scadenza>(campo: K, valore: Scadenza[K]) {
    if (!form) return;
    setForm({ ...form, [campo]: valore });
  }

  async function salva() {
    if (!form) return;
    await salvaScadenza(form);
    setForm(null);
    ricarica();
  }

  const reminder = prossimiReminder(scadenze);

  return (
    <div>
      {reminder.length > 0 && (
        <div className="card">
          <h2>Reminder attivi</h2>
          {reminder.map(({ scadenza, giorniRimanenti }) => (
            <div key={scadenza.id} className="anomalia">
              <strong>{scadenza.titolo}</strong> — {giorniRimanenti >= 0 ? `scade in ${giorniRimanenti} giorni` : `scaduta da ${-giorniRimanenti} giorni`} ({new Date(scadenza.dataScadenza).toLocaleDateString('it-IT')})
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <div className="toolbar">
          <h2 style={{ margin: 0 }}>Scadenzario fiscale</h2>
          <div className="row-actions">
            <button className="secondary" onClick={generaStandard}>Genera scadenze standard anno corrente</button>
            <button className="primary" onClick={() => setForm(scadenzaVuota())}>+ Aggiungi</button>
          </div>
        </div>
        {scadenze.length === 0 && <div className="empty-state">Nessuna scadenza configurata. Genera le scadenze standard per un dipendente senza partita IVA e senza immobili diversi dalla prima casa.</div>}
        {scadenze.length > 0 && (
          <table>
            <thead><tr><th></th><th>Titolo</th><th>Scadenza</th><th>Categoria</th><th></th></tr></thead>
            <tbody>
              {scadenze.map((s) => (
                <tr key={s.id} style={{ opacity: s.completata ? 0.5 : 1 }}>
                  <td><input type="checkbox" checked={s.completata} onChange={() => toggleCompletata(s)} /></td>
                  <td>{s.titolo}<div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{s.descrizione}</div></td>
                  <td>{new Date(s.dataScadenza).toLocaleDateString('it-IT')}</td>
                  <td>{s.categoria}</td>
                  <td className="row-actions">
                    <button className="secondary" onClick={() => setForm(s)}>Modifica</button>
                    <button className="danger-text" onClick={() => elimina(s.id)}>Elimina</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {form && (
        <div className="card">
          <h2>Scadenza</h2>
          <div className="form-grid">
            <div className="field">
              <label>Titolo</label>
              <input value={form.titolo} onChange={(e) => aggiorna('titolo', e.target.value)} />
            </div>
            <div className="field">
              <label>Data scadenza</label>
              <input type="date" value={form.dataScadenza} onChange={(e) => aggiorna('dataScadenza', e.target.value)} />
            </div>
            <div className="field">
              <label>Categoria</label>
              <select value={form.categoria} onChange={(e) => aggiorna('categoria', e.target.value as Scadenza['categoria'])}>
                <option value="dichiarativo">Dichiarativo</option>
                <option value="versamento">Versamento</option>
                <option value="altro">Altro</option>
              </select>
            </div>
            <div className="field">
              <label>Anticipi reminder (giorni, separati da virgola)</label>
              <input
                value={form.anticipiGiorni.join(',')}
                onChange={(e) => aggiorna('anticipiGiorni', e.target.value.split(',').map((v) => parseInt(v.trim(), 10)).filter((n) => !isNaN(n)))}
              />
            </div>
          </div>
          <div className="field" style={{ marginTop: 12 }}>
            <label>Descrizione</label>
            <textarea value={form.descrizione} onChange={(e) => aggiorna('descrizione', e.target.value)} rows={2} />
          </div>
          <div className="toolbar" style={{ marginTop: 16 }}>
            <button className="secondary" onClick={() => setForm(null)}>Annulla</button>
            <button className="primary" onClick={salva}>Salva scadenza</button>
          </div>
        </div>
      )}
    </div>
  );
}
