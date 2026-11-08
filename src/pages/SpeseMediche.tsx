import { useEffect, useState } from 'react';
import type { SpesaMedica } from '../types';
import { listaSpeseMediche, salvaSpesaMedica, eliminaSpesaMedica, nuovoId } from '../db';
import { calcolaDetrazioneSpeseMediche } from '../calc/detrazioniMediche';

function spesaVuota(): SpesaMedica {
  return { id: nuovoId(), data: new Date().toISOString().slice(0, 10), importo: 0, descrizione: '', categoria: 'Visita specialistica' };
}

export function SpeseMediche() {
  const [spese, setSpese] = useState<SpesaMedica[]>([]);
  const [form, setForm] = useState<SpesaMedica | null>(null);

  async function ricarica() {
    setSpese(await listaSpeseMediche());
  }
  useEffect(() => { ricarica(); }, []);

  function aggiorna<K extends keyof SpesaMedica>(campo: K, valore: SpesaMedica[K]) {
    if (!form) return;
    setForm({ ...form, [campo]: valore });
  }

  async function salva() {
    if (!form) return;
    await salvaSpesaMedica(form);
    setForm(null);
    ricarica();
  }

  async function elimina(id: string) {
    if (!confirm('Eliminare questa spesa?')) return;
    await eliminaSpesaMedica(id);
    ricarica();
  }

  const annoCorrente = new Date().getFullYear();
  const speseAnnoCorrente = spese.filter((s) => new Date(s.data).getFullYear() === annoCorrente);
  const totale = speseAnnoCorrente.reduce((acc, s) => acc + s.importo, 0);
  const risultato = calcolaDetrazioneSpeseMediche(totale);

  return (
    <div>
      <div className="card">
        <h2>Riepilogo detrazione {annoCorrente}</h2>
        <div className="stat-grid">
          <div className="stat-box">
            <div className="label">Totale spese sostenute</div>
            <div className="value">€{totale.toFixed(2)}</div>
          </div>
          <div className="stat-box">
            <div className="label">Importo eccedente franchigia</div>
            <div className="value">€{risultato.importoEccedente.toFixed(2)}</div>
          </div>
          <div className="stat-box">
            <div className="label">Detrazione spettante nel 730</div>
            <div className="value" style={{ color: 'var(--ok)' }}>€{risultato.detrazioneSpettante.toFixed(2)}</div>
          </div>
        </div>
        <div className="formula">{risultato.formula}</div>
      </div>

      <div className="card">
        <div className="toolbar">
          <h2 style={{ margin: 0 }}>Spese mediche</h2>
          <button className="primary" onClick={() => setForm(spesaVuota())}>+ Aggiungi spesa</button>
        </div>
        {spese.length === 0 && <div className="empty-state">Nessuna spesa registrata.</div>}
        {spese.length > 0 && (
          <table>
            <thead><tr><th>Data</th><th>Descrizione</th><th>Categoria</th><th>Importo</th><th></th></tr></thead>
            <tbody>
              {spese.map((s) => (
                <tr key={s.id}>
                  <td>{new Date(s.data).toLocaleDateString('it-IT')}</td>
                  <td>{s.descrizione}</td>
                  <td>{s.categoria}</td>
                  <td>€{s.importo.toFixed(2)}</td>
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
          <h2>Spesa medica</h2>
          <div className="form-grid">
            <div className="field">
              <label>Data</label>
              <input type="date" value={form.data} onChange={(e) => aggiorna('data', e.target.value)} />
            </div>
            <div className="field">
              <label>Importo (€)</label>
              <input type="number" value={form.importo} onChange={(e) => aggiorna('importo', parseFloat(e.target.value) || 0)} />
            </div>
            <div className="field">
              <label>Descrizione</label>
              <input value={form.descrizione} onChange={(e) => aggiorna('descrizione', e.target.value)} />
            </div>
            <div className="field">
              <label>Categoria</label>
              <input value={form.categoria} onChange={(e) => aggiorna('categoria', e.target.value)} />
            </div>
          </div>
          <div className="toolbar" style={{ marginTop: 16 }}>
            <button className="secondary" onClick={() => setForm(null)}>Annulla</button>
            <button className="primary" onClick={salva}>Salva spesa</button>
          </div>
        </div>
      )}
    </div>
  );
}
