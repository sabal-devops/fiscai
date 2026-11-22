import { useEffect, useState } from 'react';
import type { ImpostazioniApp } from '../types';
import { getImpostazioni, salvaImpostazioni } from '../db';
import { chiediAssistente } from '../calc/assistente';

export function Assistente() {
  const [impostazioni, setImpostazioni] = useState<ImpostazioniApp | null>(null);
  const [domanda, setDomanda] = useState('');
  const [risposta, setRisposta] = useState<{ ok: boolean; testo: string } | null>(null);
  const [caricando, setCaricando] = useState(false);

  useEffect(() => {
    getImpostazioni().then(setImpostazioni);
  }, []);

  function aggiorna<K extends keyof ImpostazioniApp>(campo: K, valore: ImpostazioniApp[K]) {
    if (!impostazioni) return;
    setImpostazioni({ ...impostazioni, [campo]: valore });
  }

  async function salvaImpostazioniAssistente() {
    if (!impostazioni) return;
    await salvaImpostazioni(impostazioni);
  }

  async function invia() {
    if (!impostazioni || !domanda.trim()) return;
    setCaricando(true);
    setRisposta(null);
    const r = await chiediAssistente(domanda, impostazioni.assistenteEndpoint, impostazioni.assistenteModello);
    setRisposta(r);
    setCaricando(false);
  }

  if (!impostazioni) return <div className="empty-state">Caricamento...</div>;

  return (
    <div>
      <div className="card">
        <h2>Assistente IA locale (opzionale)</h2>
        <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>
          Si appoggia a <strong>Ollama</strong>, un motore che fa girare un modello IA direttamente sul tuo PC:
          nessuna domanda o dato lascia il dispositivo, non c'è nessun servizio cloud coinvolto. Serve avere
          Ollama installato e avviato (<a href="https://ollama.com" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>ollama.com</a>)
          e almeno un modello scaricato (es. <code className="formula" style={{ padding: '1px 6px' }}>ollama pull llama3.2</code>).
        </p>
        <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>
          Se usi FiscAI dalla versione pubblicata online e Ollama rifiuta la richiesta, imposta sul tuo PC la
          variabile d'ambiente <code className="formula" style={{ padding: '1px 6px' }}>OLLAMA_ORIGINS</code> includendo
          l'indirizzo del sito (es. <code className="formula" style={{ padding: '1px 6px' }}>https://sabal-devops.github.io</code>),
          poi riavvia Ollama. Se invece usi FiscAI in locale (<code className="formula" style={{ padding: '1px 6px' }}>npm run dev</code>),
          di solito funziona già senza configurazioni aggiuntive.
        </p>
        <div className="form-grid">
          <div className="field">
            <label>
              <input
                type="checkbox"
                checked={impostazioni.assistenteAbilitato}
                onChange={(e) => { aggiorna('assistenteAbilitato', e.target.checked); }}
                style={{ marginRight: 6 }}
              />
              Abilita l'assistente
            </label>
          </div>
          <div className="field">
            <label>Indirizzo Ollama</label>
            <input value={impostazioni.assistenteEndpoint} onChange={(e) => aggiorna('assistenteEndpoint', e.target.value)} />
          </div>
          <div className="field">
            <label>Nome del modello</label>
            <input value={impostazioni.assistenteModello} onChange={(e) => aggiorna('assistenteModello', e.target.value)} />
          </div>
        </div>
        <button className="primary" style={{ marginTop: 12 }} onClick={salvaImpostazioniAssistente}>Salva impostazioni</button>
      </div>

      {impostazioni.assistenteAbilitato && (
        <div className="card">
          <h2>Fai una domanda</h2>
          <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>
            Esempio: "Ho comprato delle lenti a contatto con fattura, sono detraibili?" oppure "Cosa devo controllare
            nel cedolino di questo mese?".
          </p>
          <div className="field">
            <textarea value={domanda} onChange={(e) => setDomanda(e.target.value)} rows={3} placeholder="Scrivi qui la tua domanda..." />
          </div>
          <button className="primary" style={{ marginTop: 8 }} onClick={invia} disabled={caricando || !domanda.trim()}>
            {caricando ? 'Sto pensando...' : 'Chiedi'}
          </button>
          {risposta && (
            <div className={risposta.ok ? 'card' : 'anomalia'} style={risposta.ok ? { background: '#0c111c', marginTop: 12 } : { marginTop: 12 }}>
              {risposta.testo}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
