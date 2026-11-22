import { useEffect, useState } from 'react';
import type { SpesaMedica } from '../types';
import { listaSpeseMediche, salvaSpesaMedica, eliminaSpesaMedica, nuovoId } from '../db';
import { calcolaDetrazioneSpeseMediche } from '../calc/detrazioniMediche';

const CATEGORIE_DETRAIBILI = [
  'Visita specialistica',
  'Esami diagnostici/analisi',
  'Farmaci (con scontrino parlante)',
  'Dispositivo medico con marcatura CE',
  'Prestazione odontoiatrica',
  'Ticket SSN',
  'Intervento chirurgico/degenza',
  'Altro (verificare detraibilità)',
];

function spesaVuota(): SpesaMedica {
  return {
    id: nuovoId(),
    data: new Date().toISOString().slice(0, 10),
    importo: 0,
    descrizione: '',
    categoria: 'Visita specialistica',
    rimborsatoDaFondoSanitario: 0,
  };
}

export function SpeseMediche() {
  const [spese, setSpese] = useState<SpesaMedica[]>([]);
  const [form, setForm] = useState<SpesaMedica | null>(null);
  const [guidaAperta, setGuidaAperta] = useState(false);

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
  const totalePagato = speseAnnoCorrente.reduce((acc, s) => acc + s.importo, 0);
  const totaleRimborsato = speseAnnoCorrente.reduce((acc, s) => acc + (s.rimborsatoDaFondoSanitario || 0), 0);
  const totaleNettoDetraibile = Math.max(0, totalePagato - totaleRimborsato);
  const risultato = calcolaDetrazioneSpeseMediche(totaleNettoDetraibile);

  return (
    <div>
      <div className="card">
        <div className="toolbar">
          <h2 style={{ margin: 0 }}>Cosa puoi detrarre (guida rapida)</h2>
          <button className="secondary" onClick={() => setGuidaAperta(!guidaAperta)}>
            {guidaAperta ? 'Nascondi' : 'Mostra'}
          </button>
        </div>
        {guidaAperta && (
          <div style={{ fontSize: 13, lineHeight: 1.6 }}>
            <p><strong style={{ color: 'var(--ok)' }}>Sì, detraibili (19%)</strong> — pagamento sempre tracciabile (bancomat/carta/bonifico), tranne farmaci e ticket SSN dove vanno bene anche i contanti:</p>
            <ul style={{ marginTop: 4, paddingLeft: 20 }}>
              <li>Visite specialistiche private</li>
              <li>Esami diagnostici e analisi di laboratorio</li>
              <li>Farmaci, anche da banco: serve lo scontrino "parlante" (con codice fiscale e natura del farmaco) o la fattura</li>
              <li>Dispositivi medici con marcatura CE (occhiali, lenti, apparecchi acustici, tutori, termometri...): la marcatura CE deve risultare sullo scontrino/fattura</li>
              <li>Prestazioni odontoiatriche e ticket SSN</li>
              <li>Interventi chirurgici, degenze ospedaliere</li>
            </ul>
            <p><strong style={{ color: 'var(--danger)' }}>No, non detraibili</strong>:</p>
            <ul style={{ marginTop: 4, paddingLeft: 20 }}>
              <li>Prodotti cosmetici o di bellezza</li>
              <li>Integratori generici non prescritti e non registrati come dispositivo medico</li>
              <li>Trattamenti estetici non terapeutici</li>
              <li>Spese pagate in contanti dove serve la tracciabilità (es. visite private pagate cash)</li>
            </ul>
            <p style={{ color: 'var(--text-dim)' }}>
              Se hai un fondo sanitario integrativo aziendale (es. welfare, Blue Assistance/ASFALISIS): la parte
              che ti rimborsa il fondo <strong>non</strong> è detraibile, solo l'eventuale residuo pagato di tasca
              propria. Usa il campo "Rimborsato dal fondo sanitario" qui sotto per ogni spesa.
            </p>
          </div>
        )}
      </div>

      <div className="card">
        <h2>Riepilogo detrazione {annoCorrente}</h2>
        <div className="stat-grid">
          <div className="stat-box">
            <div className="label">Totale speso</div>
            <div className="value">€{totalePagato.toFixed(2)}</div>
          </div>
          <div className="stat-box">
            <div className="label">Rimborsato dal fondo sanitario</div>
            <div className="value">€{totaleRimborsato.toFixed(2)}</div>
          </div>
          <div className="stat-box">
            <div className="label">Netto detraibile</div>
            <div className="value">€{totaleNettoDetraibile.toFixed(2)}</div>
          </div>
          <div className="stat-box">
            <div className="label">Detrazione spettante nel 730</div>
            <div className="value" style={{ color: 'var(--ok)' }}>€{risultato.detrazioneSpettante.toFixed(2)}</div>
          </div>
        </div>
        <div className="formula">
          netto detraibile = totale speso - rimborsato dal fondo; {risultato.formula}
        </div>
      </div>

      <div className="card">
        <div className="toolbar">
          <h2 style={{ margin: 0 }}>Spese mediche</h2>
          <button className="primary" onClick={() => setForm(spesaVuota())}>+ Aggiungi spesa</button>
        </div>
        {spese.length === 0 && <div className="empty-state">Nessuna spesa registrata.</div>}
        {spese.length > 0 && (
          <table>
            <thead><tr><th>Data</th><th>Descrizione</th><th>Categoria</th><th>Importo</th><th>Rimborsato</th><th></th></tr></thead>
            <tbody>
              {spese.map((s) => (
                <tr key={s.id}>
                  <td>{new Date(s.data).toLocaleDateString('it-IT')}</td>
                  <td>{s.descrizione}</td>
                  <td>{s.categoria}</td>
                  <td>€{s.importo.toFixed(2)}</td>
                  <td>{s.rimborsatoDaFondoSanitario > 0 ? `€${s.rimborsatoDaFondoSanitario.toFixed(2)}` : '-'}</td>
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
              <label>Importo pagato (€)</label>
              <input type="number" value={form.importo} onChange={(e) => aggiorna('importo', parseFloat(e.target.value) || 0)} />
            </div>
            <div className="field">
              <label>Descrizione</label>
              <input value={form.descrizione} onChange={(e) => aggiorna('descrizione', e.target.value)} />
            </div>
            <div className="field">
              <label>Categoria</label>
              <select value={form.categoria} onChange={(e) => aggiorna('categoria', e.target.value)}>
                {CATEGORIE_DETRAIBILI.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Rimborsato dal fondo sanitario (€)</label>
              <input type="number" value={form.rimborsatoDaFondoSanitario} onChange={(e) => aggiorna('rimborsatoDaFondoSanitario', parseFloat(e.target.value) || 0)} />
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
