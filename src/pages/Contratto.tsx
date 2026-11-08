import { useEffect, useRef, useState } from 'react';
import type { DocumentoContrattuale } from '../types';
import { listaDocumenti, salvaDocumento, eliminaDocumento, nuovoId } from '../db';
import { estraiTestoPdf } from '../calc/pdfParser';

export function Contratto() {
  const [documenti, setDocumenti] = useState<DocumentoContrattuale[]>([]);
  const [tipoDaCaricare, setTipoDaCaricare] = useState<'contratto_individuale' | 'ccnl'>('contratto_individuale');
  const [aperto, setAperto] = useState<string | null>(null);
  const [ricerca, setRicerca] = useState('');
  const inputFileRef = useRef<HTMLInputElement>(null);

  async function ricarica() {
    setDocumenti(await listaDocumenti());
  }

  useEffect(() => { ricarica(); }, []);

  async function gestisciUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    let testo = '';
    try {
      testo = await estraiTestoPdf(file);
    } catch (err) {
      alert('Impossibile estrarre il testo dal PDF: ' + (err as Error).message + '. Il file verrà salvato senza testo ricercabile.');
    }
    const doc: DocumentoContrattuale = {
      id: nuovoId(),
      tipo: tipoDaCaricare,
      nomeFile: file.name,
      caricatoIl: new Date().toISOString(),
      testoEstratto: testo,
      note: '',
    };
    await salvaDocumento(doc);
    if (inputFileRef.current) inputFileRef.current.value = '';
    ricarica();
  }

  async function elimina(id: string) {
    if (!confirm('Eliminare questo documento?')) return;
    await eliminaDocumento(id);
    ricarica();
  }

  const documentoAperto = documenti.find((d) => d.id === aperto);
  const testoFiltrato = documentoAperto && ricerca
    ? evidenziaOccorrenze(documentoAperto.testoEstratto, ricerca)
    : documentoAperto?.testoEstratto;

  return (
    <div>
      <div className="card">
        <h2>Carica contratto individuale o CCNL</h2>
        <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>
          Questi documenti diventano la fonte di verità per livello di inquadramento, indennità, maggiorazioni,
          scatti di anzianità e benefit. Il testo viene estratto solo per consultazione/ricerca locale.
        </p>
        <div className="form-grid">
          <div className="field">
            <label>Tipo documento</label>
            <select value={tipoDaCaricare} onChange={(e) => setTipoDaCaricare(e.target.value as 'contratto_individuale' | 'ccnl')}>
              <option value="contratto_individuale">Contratto individuale</option>
              <option value="ccnl">Testo CCNL</option>
            </select>
          </div>
        </div>
        <input ref={inputFileRef} type="file" accept="application/pdf" style={{ display: 'none' }} onChange={gestisciUpload} />
        <button className="primary" style={{ marginTop: 12 }} onClick={() => inputFileRef.current?.click()}>Carica PDF</button>
      </div>

      <div className="card">
        <h2>Documenti caricati</h2>
        {documenti.length === 0 && <div className="empty-state">Nessun documento caricato.</div>}
        <table>
          <thead><tr><th>Nome file</th><th>Tipo</th><th>Caricato il</th><th></th></tr></thead>
          <tbody>
            {documenti.map((d) => (
              <tr key={d.id}>
                <td>{d.nomeFile}</td>
                <td>{d.tipo === 'ccnl' ? 'CCNL' : 'Contratto individuale'}</td>
                <td>{new Date(d.caricatoIl).toLocaleDateString('it-IT')}</td>
                <td className="row-actions">
                  <button className="secondary" onClick={() => setAperto(d.id)}>Apri testo</button>
                  <button className="danger-text" onClick={() => elimina(d.id)}>Elimina</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {documentoAperto && (
        <div className="card">
          <div className="toolbar">
            <h2 style={{ margin: 0 }}>{documentoAperto.nomeFile}</h2>
            <button className="secondary" onClick={() => setAperto(null)}>Chiudi</button>
          </div>
          <div className="field">
            <label>Cerca nel testo</label>
            <input value={ricerca} onChange={(e) => setRicerca(e.target.value)} placeholder="es. scatti di anzianità, indennità, livello B3..." />
          </div>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, maxHeight: 400, overflowY: 'auto', background: '#0c111c', padding: 12, borderRadius: 6, marginTop: 12 }}>
            {testoFiltrato || 'Nessun testo estratto da questo documento.'}
          </pre>
        </div>
      )}
    </div>
  );
}

function evidenziaOccorrenze(testo: string, query: string): string {
  if (!query.trim()) return testo;
  const idx = testo.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return `(nessuna occorrenza di "${query}" trovata)\n\n` + testo.slice(0, 2000);
  const inizio = Math.max(0, idx - 300);
  const fine = Math.min(testo.length, idx + query.length + 300);
  return `[...contesto intorno a "${query}"...]\n\n` + testo.slice(inizio, fine) + '\n\n[...]';
}
