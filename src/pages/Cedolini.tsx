import { useEffect, useRef, useState } from 'react';
import type { Cedolino, Profilo } from '../types';
import { getProfilo, listaCedolini, salvaCedolino, eliminaCedolino, trovaCedolinoPerPeriodo, nuovoId } from '../db';
import { estraiTestoPdf, estraiCampiCedolino } from '../calc/pdfParser';
import { analizzaCedolino } from '../calc/anomalie';

const MESI = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

function cedolinoVuoto(): Cedolino {
  const ora = new Date();
  return {
    id: nuovoId(),
    mese: ora.getMonth() + 1,
    anno: ora.getFullYear(),
    retribuzioneBase: 0,
    straordinari: 0,
    indennita: 0,
    buoniPasto: { numero: 0, valoreUnitario: 0, tipo: 'elettronico' },
    totaleCompetenze: 0,
    contributiInps: 0,
    irpefTrattenuta: 0,
    addizionaliRegionaliComunali: 0,
    altreRitenute: 0,
    nettoPagato: 0,
    tfrMaturatoMese: 0,
    tfrAccantonatoCumulato: 0,
    imponibileFiscaleCumulato: 0,
    imponibileFiscaleMese: 0,
    irpefCumulata: 0,
    vociGrezze: [],
    fontePdf: false,
    caricatoIl: new Date().toISOString(),
    anomalie: [],
  };
}

export function Cedolini() {
  const [profilo, setProfilo] = useState<Profilo | undefined>();
  const [cedolini, setCedolini] = useState<Cedolino[]>([]);
  const [form, setForm] = useState<Cedolino | null>(null);
  const [campiMancanti, setCampiMancanti] = useState<string[]>([]);
  const [selezionato, setSelezionato] = useState<string | null>(null);
  const inputFileRef = useRef<HTMLInputElement>(null);

  async function ricarica() {
    const [p, lista] = await Promise.all([getProfilo(), listaCedolini()]);
    setProfilo(p);
    setCedolini(lista);
  }

  useEffect(() => {
    ricarica();
  }, []);

  async function gestisciUploadPdf(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const testo = await estraiTestoPdf(file);
      const campi = estraiCampiCedolino(testo);
      const nuovo = cedolinoVuoto();
      nuovo.fontePdf = true;
      if (campi.mese) nuovo.mese = campi.mese;
      if (campi.anno) nuovo.anno = campi.anno;
      if (campi.retribuzioneBase !== undefined) nuovo.retribuzioneBase = campi.retribuzioneBase;
      if (campi.totaleCompetenze !== undefined) nuovo.totaleCompetenze = campi.totaleCompetenze;
      if (campi.contributiInps !== undefined) nuovo.contributiInps = campi.contributiInps;
      if (campi.irpefTrattenuta !== undefined) nuovo.irpefTrattenuta = campi.irpefTrattenuta;
      if (campi.nettoPagato !== undefined) nuovo.nettoPagato = campi.nettoPagato;
      if (campi.tfrMaturatoMese !== undefined) nuovo.tfrMaturatoMese = campi.tfrMaturatoMese;
      if (campi.imponibileFiscaleMese !== undefined) nuovo.imponibileFiscaleMese = campi.imponibileFiscaleMese;
      if (campi.imponibileFiscaleCumulato !== undefined) nuovo.imponibileFiscaleCumulato = campi.imponibileFiscaleCumulato;
      if (campi.irpefCumulata !== undefined) nuovo.irpefCumulata = campi.irpefCumulata;
      if (campi.addizionaliRegionaliComunali !== undefined) nuovo.addizionaliRegionaliComunali = campi.addizionaliRegionaliComunali;
      setCampiMancanti(campi.campiNonTrovati);
      setForm(nuovo);
    } catch (err) {
      alert('Impossibile leggere il PDF: ' + (err as Error).message + '. Puoi inserire i dati manualmente.');
      setForm(cedolinoVuoto());
    } finally {
      if (inputFileRef.current) inputFileRef.current.value = '';
    }
  }

  function apriNuovoManuale() {
    setCampiMancanti([]);
    setForm(cedolinoVuoto());
  }

  function aggiornaForm<K extends keyof Cedolino>(campo: K, valore: Cedolino[K]) {
    if (!form) return;
    setForm({ ...form, [campo]: valore });
  }

  async function salva() {
    if (!form) return;
    const duplicato = await trovaCedolinoPerPeriodo(form.mese, form.anno, form.id);
    if (duplicato) {
      const sovrascrivi = confirm(
        `Esiste già un cedolino per ${MESI[form.mese - 1]} ${form.anno}. Vuoi sovrascriverlo con questi dati? (Annulla per tornare indietro senza salvare)`,
      );
      if (!sovrascrivi) return;
      await eliminaCedolino(duplicato.id);
    }
    await salvaCedolino(form);
    setForm(null);
    setCampiMancanti([]);
    ricarica();
  }

  async function elimina(id: string) {
    if (!confirm('Eliminare questo cedolino?')) return;
    await eliminaCedolino(id);
    ricarica();
  }

  const cedolinoSelezionato = cedolini.find((c) => c.id === selezionato);
  const indiceSelezionato = cedolinoSelezionato ? cedolini.findIndex((c) => c.id === cedolinoSelezionato.id) : -1;
  const precedente = indiceSelezionato > 0 ? cedolini[indiceSelezionato - 1] : undefined;
  const anomalieSelezionato = cedolinoSelezionato ? analizzaCedolino(profilo, cedolinoSelezionato, precedente) : [];

  return (
    <div>
      {!form && (
        <div className="card">
          <div className="toolbar">
            <h2 style={{ margin: 0 }}>Cedolini caricati</h2>
            <div className="row-actions">
              <input ref={inputFileRef} type="file" accept="application/pdf" style={{ display: 'none' }} onChange={gestisciUploadPdf} />
              <button className="secondary" onClick={() => inputFileRef.current?.click()}>Carica PDF</button>
              <button className="primary" onClick={apriNuovoManuale}>+ Inserisci manualmente</button>
            </div>
          </div>
          {cedolini.length === 0 && <div className="empty-state">Nessun cedolino caricato finora.</div>}
          {cedolini.length > 0 && (
            <table>
              <thead>
                <tr>
                  <th>Periodo</th>
                  <th>Totale competenze</th>
                  <th>Netto pagato</th>
                  <th>Fonte</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {cedolini.map((c) => (
                  <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => setSelezionato(c.id)}>
                    <td>{MESI[c.mese - 1]} {c.anno}</td>
                    <td>€{c.totaleCompetenze.toFixed(2)}</td>
                    <td>€{c.nettoPagato.toFixed(2)}</td>
                    <td>{c.fontePdf ? 'PDF' : 'Manuale'}</td>
                    <td className="row-actions">
                      <button className="secondary" onClick={(e) => { e.stopPropagation(); setForm(c); }}>Modifica</button>
                      <button className="danger-text" onClick={(e) => { e.stopPropagation(); elimina(c.id); }}>Elimina</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {cedolinoSelezionato && !form && (
        <div className="card">
          <h2>Verifica {MESI[cedolinoSelezionato.mese - 1]} {cedolinoSelezionato.anno}</h2>
          {anomalieSelezionato.length === 0 && <div className="badge ok">Nessuna anomalia rilevata</div>}
          {anomalieSelezionato.map((a, i) => (
            <div key={i} className="anomalia">{a}</div>
          ))}
          <button className="secondary" style={{ marginTop: 12 }} onClick={() => setSelezionato(null)}>Chiudi</button>
        </div>
      )}

      {form && (
        <div className="card">
          <h2>{form.fontePdf ? 'Dati estratti dal PDF (verifica e completa)' : 'Inserisci cedolino'}</h2>
          {campiMancanti.length > 0 && (
            <div className="anomalia">
              Campi non trovati automaticamente nel PDF, da inserire manualmente: {campiMancanti.join(', ')}
            </div>
          )}
          <div className="form-grid">
            <div className="field">
              <label>Mese</label>
              <select value={form.mese} onChange={(e) => aggiornaForm('mese', parseInt(e.target.value, 10))}>
                {MESI.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Anno</label>
              <input type="number" value={form.anno} onChange={(e) => aggiornaForm('anno', parseInt(e.target.value, 10) || form.anno)} />
            </div>
            <div className="field">
              <label>Retribuzione base (€)</label>
              <input type="number" value={form.retribuzioneBase} onChange={(e) => aggiornaForm('retribuzioneBase', parseFloat(e.target.value) || 0)} />
            </div>
            <div className="field">
              <label>Straordinari (€)</label>
              <input type="number" value={form.straordinari} onChange={(e) => aggiornaForm('straordinari', parseFloat(e.target.value) || 0)} />
            </div>
            <div className="field">
              <label>Totale competenze (€)</label>
              <input type="number" value={form.totaleCompetenze} onChange={(e) => aggiornaForm('totaleCompetenze', parseFloat(e.target.value) || 0)} />
            </div>
            <div className="field">
              <label>Contributi INPS (€)</label>
              <input type="number" value={form.contributiInps} onChange={(e) => aggiornaForm('contributiInps', parseFloat(e.target.value) || 0)} />
            </div>
            <div className="field">
              <label>IRPEF trattenuta nel mese (€)</label>
              <input type="number" value={form.irpefTrattenuta} onChange={(e) => aggiornaForm('irpefTrattenuta', parseFloat(e.target.value) || 0)} />
            </div>
            <div className="field">
              <label>IRPEF cumulata da inizio anno (€)</label>
              <input type="number" value={form.irpefCumulata} onChange={(e) => aggiornaForm('irpefCumulata', parseFloat(e.target.value) || 0)} />
            </div>
            <div className="field">
              <label>Imponibile fiscale del mese (€)</label>
              <input type="number" value={form.imponibileFiscaleMese} onChange={(e) => aggiornaForm('imponibileFiscaleMese', parseFloat(e.target.value) || 0)} />
            </div>
            <div className="field">
              <label>Imponibile fiscale cumulato (€)</label>
              <input type="number" value={form.imponibileFiscaleCumulato} onChange={(e) => aggiornaForm('imponibileFiscaleCumulato', parseFloat(e.target.value) || 0)} />
            </div>
            <div className="field">
              <label>Addizionali regionali/comunali trattenute (€)</label>
              <input type="number" value={form.addizionaliRegionaliComunali} onChange={(e) => aggiornaForm('addizionaliRegionaliComunali', parseFloat(e.target.value) || 0)} />
            </div>
            <div className="field">
              <label>Netto pagato (€)</label>
              <input type="number" value={form.nettoPagato} onChange={(e) => aggiornaForm('nettoPagato', parseFloat(e.target.value) || 0)} />
            </div>
            <div className="field">
              <label>TFR maturato nel mese (€)</label>
              <input type="number" value={form.tfrMaturatoMese} onChange={(e) => aggiornaForm('tfrMaturatoMese', parseFloat(e.target.value) || 0)} />
            </div>
            <div className="field">
              <label>TFR accantonato cumulato (€)</label>
              <input type="number" value={form.tfrAccantonatoCumulato} onChange={(e) => aggiornaForm('tfrAccantonatoCumulato', parseFloat(e.target.value) || 0)} />
            </div>
            <div className="field">
              <label>Buoni pasto - numero</label>
              <input type="number" value={form.buoniPasto.numero} onChange={(e) => aggiornaForm('buoniPasto', { ...form.buoniPasto, numero: parseInt(e.target.value, 10) || 0 })} />
            </div>
            <div className="field">
              <label>Buoni pasto - valore unitario (€)</label>
              <input type="number" value={form.buoniPasto.valoreUnitario} onChange={(e) => aggiornaForm('buoniPasto', { ...form.buoniPasto, valoreUnitario: parseFloat(e.target.value) || 0 })} />
            </div>
            <div className="field">
              <label>Buoni pasto - tipo</label>
              <select value={form.buoniPasto.tipo} onChange={(e) => aggiornaForm('buoniPasto', { ...form.buoniPasto, tipo: e.target.value as 'cartaceo' | 'elettronico' })}>
                <option value="elettronico">Elettronico</option>
                <option value="cartaceo">Cartaceo</option>
              </select>
            </div>
          </div>
          <div className="toolbar" style={{ marginTop: 16 }}>
            <button className="secondary" onClick={() => { setForm(null); setCampiMancanti([]); }}>Annulla</button>
            <button className="primary" onClick={salva}>Salva cedolino</button>
          </div>
        </div>
      )}
    </div>
  );
}
