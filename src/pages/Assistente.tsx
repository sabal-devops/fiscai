import { useEffect, useState } from 'react';
import type { ImpostazioniApp } from '../types';
import { getImpostazioni, salvaImpostazioni } from '../db';
import { chiediAssistente } from '../calc/assistente';

export function Assistente() {
  const [impostazioni, setImpostazioni] = useState<ImpostazioniApp | null>(null);
  const [domanda, setDomanda] = useState('');
  const [risposta, setRisposta] = useState<{ ok: boolean; testo: string } | null>(null);
  const [caricando, setCaricando] = useState(false);
  const [dettagliAperti, setDettagliAperti] = useState(false);

  useEffect(() => {
    getImpostazioni().then(setImpostazioni);
  }, []);

  function aggiorna<K extends keyof ImpostazioniApp>(campo: K, valore: ImpostazioniApp[K]) {
    if (!impostazioni) return;
    const nuove = { ...impostazioni, [campo]: valore };
    setImpostazioni(nuove);
    salvaImpostazioni(nuove);
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

  const suPaginaPubblicata = typeof window !== 'undefined'
    && !['localhost', '127.0.0.1'].includes(window.location.hostname);

  return (
    <div>
      <div className="card">
        <div className="toolbar">
          <h2 style={{ margin: 0 }}>Assistente IA</h2>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-dim)' }}>
            <input
              type="checkbox"
              checked={impostazioni.assistenteAbilitato}
              onChange={(e) => aggiorna('assistenteAbilitato', e.target.checked)}
            />
            Abilitato
          </label>
        </div>
        <p className="card-sottotitolo">
          Fai domande su detrazioni, cedolini o scadenze. Risponde un'IA che gira sul tuo PC (Ollama):
          gratis, nessun dato esce dal dispositivo.
        </p>

        {!impostazioni.assistenteAbilitato && (
          <div className="empty-state">Abilita l'assistente qui sopra per iniziare.</div>
        )}

        {impostazioni.assistenteAbilitato && suPaginaPubblicata && (
          <div className="anomalia">
            Da qui (versione online) l'assistente non può funzionare: il browser blocca sempre i siti pubblici
            che provano a contattare il tuo PC, per sicurezza. Apri il collegamento <strong>"FiscAI (con
            assistente)"</strong> sul Desktop: lì funziona normalmente.
          </div>
        )}

        {impostazioni.assistenteAbilitato && !suPaginaPubblicata && (
          <>
            <div className="field">
              <textarea
                value={domanda}
                onChange={(e) => setDomanda(e.target.value)}
                rows={3}
                placeholder='Es. "Ho comprato delle lenti a contatto con fattura, sono detraibili?"'
              />
            </div>
            <button className="primary" style={{ marginTop: 8 }} onClick={invia} disabled={caricando || !domanda.trim()}>
              {caricando ? 'Sto pensando...' : 'Chiedi'}
            </button>
            {risposta && (
              <div className={risposta.ok ? 'card' : 'anomalia'} style={risposta.ok ? { background: '#0c111c', marginTop: 12 } : { marginTop: 12 }}>
                {risposta.testo}
              </div>
            )}
          </>
        )}
      </div>

      <div className="card">
        <div className="toolbar">
          <h2 style={{ margin: 0, fontSize: 14 }}>Impostazioni e dettagli tecnici</h2>
          <button className="secondary" onClick={() => setDettagliAperti(!dettagliAperti)}>
            {dettagliAperti ? 'Nascondi' : 'Mostra'}
          </button>
        </div>
        {dettagliAperti && (
          <>
            <p className="card-sottotitolo">
              Serve avere <strong>Ollama</strong> installato e avviato (<a href="https://ollama.com" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>ollama.com</a>)
              con almeno un modello scaricato (es. <code className="formula" style={{ padding: '1px 6px' }}>ollama pull llama3.2</code>).
              Funziona solo in locale (collegamento "FiscAI (con assistente)" sul Desktop, o <code className="formula" style={{ padding: '1px 6px' }}>npm run dev</code>):
              i browser bloccano per sicurezza (Private Network Access) i siti pubblici che contattano `localhost`, e questo non si può configurare diversamente.
            </p>
            <div className="form-grid">
              <div className="field">
                <label>Indirizzo Ollama</label>
                <input value={impostazioni.assistenteEndpoint} onChange={(e) => aggiorna('assistenteEndpoint', e.target.value)} />
              </div>
              <div className="field">
                <label>Nome del modello</label>
                <input value={impostazioni.assistenteModello} onChange={(e) => aggiorna('assistenteModello', e.target.value)} />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
