import { useEffect, useState } from 'react';
import type { Presenza, Profilo, Cedolino } from '../types';
import { getProfilo, listaPresenze, salvaPresenza, eliminaPresenza, trovaPresenzaPerPeriodo, listaCedolini, nuovoId } from '../db';
import { calcolaRetribuzioneAttesa, confrontaPresenzeConCedolino } from '../calc/presenze';

const MESI = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

function presenzaVuota(): Presenza {
  const ora = new Date();
  return {
    id: nuovoId(),
    mese: ora.getMonth() + 1,
    anno: ora.getFullYear(),
    oreOrdinarieLavorate: 0,
    giorniAssenzaMalattia: 0,
    giorniFerie: 0,
    oreRol: 0,
    oreStraordinarioFeriale: 0,
    oreStraordinarioFestivo: 0,
    oreStraordinarioNotturno: 0,
    giorniReperibilita: 0,
    note: '',
  };
}

export function Presenze() {
  const [profilo, setProfilo] = useState<Profilo | undefined>();
  const [presenze, setPresenze] = useState<Presenza[]>([]);
  const [cedolini, setCedolini] = useState<Cedolino[]>([]);
  const [form, setForm] = useState<Presenza | null>(null);

  async function ricarica() {
    const [p, lp, lc] = await Promise.all([getProfilo(), listaPresenze(), listaCedolini()]);
    setProfilo(p);
    setPresenze(lp);
    setCedolini(lc);
  }

  useEffect(() => { ricarica(); }, []);

  function aggiorna<K extends keyof Presenza>(campo: K, valore: Presenza[K]) {
    if (!form) return;
    setForm({ ...form, [campo]: valore });
  }

  async function salva() {
    if (!form) return;
    const duplicata = await trovaPresenzaPerPeriodo(form.mese, form.anno, form.id);
    if (duplicata) {
      const sovrascrivi = confirm(
        `Esistono già presenze per ${MESI[form.mese - 1]} ${form.anno}. Vuoi sovrascriverle con questi dati? (Annulla per tornare indietro senza salvare)`,
      );
      if (!sovrascrivi) return;
      await eliminaPresenza(duplicata.id);
    }
    await salvaPresenza(form);
    setForm(null);
    ricarica();
  }

  async function elimina(id: string) {
    if (!confirm('Eliminare questa presenza?')) return;
    await eliminaPresenza(id);
    ricarica();
  }

  if (!profilo) {
    return <div className="card"><div className="empty-state">Completa prima il Modulo 1 - Profilo contribuente (serve la RAL per calcolare la retribuzione attesa).</div></div>;
  }

  return (
    <div>
      {!form && (
        <div className="card">
          <div className="toolbar">
            <h2 style={{ margin: 0 }}>Presenze mensili</h2>
            <button className="primary" onClick={() => setForm(presenzaVuota())}>+ Nuovo mese</button>
          </div>
          {presenze.length === 0 && <div className="empty-state">Nessuna presenza inserita.</div>}
          {presenze.map((p) => {
            const cedolinoMese = cedolini.find((c) => c.mese === p.mese && c.anno === p.anno);
            const attesa = calcolaRetribuzioneAttesa(profilo, p);
            const confronto = cedolinoMese
              ? confrontaPresenzeConCedolino(attesa, cedolinoMese.retribuzioneBase, cedolinoMese.straordinari)
              : undefined;
            return (
              <div key={p.id} className="card" style={{ background: '#0c111c' }}>
                <div className="toolbar">
                  <strong>{MESI[p.mese - 1]} {p.anno}</strong>
                  <div className="row-actions">
                    <button className="secondary" onClick={() => setForm(p)}>Modifica</button>
                    <button className="danger-text" onClick={() => elimina(p.id)}>Elimina</button>
                  </div>
                </div>
                <div className="stat-grid">
                  <div className="stat-box">
                    <div className="label">Retribuzione attesa dalle presenze</div>
                    <div className="value">€{attesa.totaleAtteso.toFixed(2)}</div>
                  </div>
                  <div className="stat-box">
                    <div className="label">Cedolino dello stesso mese</div>
                    <div className="value">{cedolinoMese ? `€${(cedolinoMese.retribuzioneBase + cedolinoMese.straordinari).toFixed(2)}` : 'non caricato'}</div>
                  </div>
                </div>
                <div className="formula">{attesa.formula}</div>
                {confronto && !confronto.entroTolleranza && <div className="anomalia">{confronto.messaggio}</div>}
                {confronto && confronto.entroTolleranza && <div className="badge ok" style={{ marginTop: 8 }}>Coerente col cedolino</div>}
              </div>
            );
          })}
        </div>
      )}

      {form && (
        <div className="card">
          <h2>Presenze {MESI[form.mese - 1]} {form.anno}</h2>
          <div className="form-grid">
            <div className="field">
              <label>Mese</label>
              <select value={form.mese} onChange={(e) => aggiorna('mese', parseInt(e.target.value, 10))}>
                {MESI.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Anno</label>
              <input type="number" value={form.anno} onChange={(e) => aggiorna('anno', parseInt(e.target.value, 10) || form.anno)} />
            </div>
            <div className="field">
              <label>Ore ordinarie lavorate</label>
              <input type="number" value={form.oreOrdinarieLavorate} onChange={(e) => aggiorna('oreOrdinarieLavorate', parseFloat(e.target.value) || 0)} />
            </div>
            <div className="field">
              <label>Giorni assenza/malattia</label>
              <input type="number" value={form.giorniAssenzaMalattia} onChange={(e) => aggiorna('giorniAssenzaMalattia', parseFloat(e.target.value) || 0)} />
            </div>
            <div className="field">
              <label>Giorni ferie usate</label>
              <input type="number" value={form.giorniFerie} onChange={(e) => aggiorna('giorniFerie', parseFloat(e.target.value) || 0)} />
            </div>
            <div className="field">
              <label>Ore ROL usate</label>
              <input type="number" value={form.oreRol} onChange={(e) => aggiorna('oreRol', parseFloat(e.target.value) || 0)} />
            </div>
            <div className="field">
              <label>Ore straordinario feriale (+25%)</label>
              <input type="number" value={form.oreStraordinarioFeriale} onChange={(e) => aggiorna('oreStraordinarioFeriale', parseFloat(e.target.value) || 0)} />
            </div>
            <div className="field">
              <label>Ore straordinario festivo (+50%)</label>
              <input type="number" value={form.oreStraordinarioFestivo} onChange={(e) => aggiorna('oreStraordinarioFestivo', parseFloat(e.target.value) || 0)} />
            </div>
            <div className="field">
              <label>Ore straordinario notturno (+35%)</label>
              <input type="number" value={form.oreStraordinarioNotturno} onChange={(e) => aggiorna('oreStraordinarioNotturno', parseFloat(e.target.value) || 0)} />
            </div>
            <div className="field">
              <label>Giornate di reperibilità</label>
              <input type="number" value={form.giorniReperibilita} onChange={(e) => aggiorna('giorniReperibilita', parseFloat(e.target.value) || 0)} />
            </div>
          </div>
          <div className="field" style={{ marginTop: 12 }}>
            <label>Note</label>
            <textarea value={form.note} onChange={(e) => aggiorna('note', e.target.value)} rows={2} />
          </div>
          <div className="toolbar" style={{ marginTop: 16 }}>
            <button className="secondary" onClick={() => setForm(null)}>Annulla</button>
            <button className="primary" onClick={salva}>Salva presenze</button>
          </div>
        </div>
      )}
    </div>
  );
}
