import { useEffect, useState } from 'react';
import jsPDF from 'jspdf';
import type { Cedolino, Profilo, SpesaMedica } from '../types';
import { getProfilo, listaCedolini, listaSpeseMediche, esportaTuttoJson, importaTuttoJson } from '../db';
import { calcolaDetrazioneSpeseMediche } from '../calc/detrazioniMediche';

const MESI = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];

function scaricaFile(contenuto: string | Blob, nomeFile: string, mime: string) {
  const blob = typeof contenuto === 'string' ? new Blob([contenuto], { type: mime }) : contenuto;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomeFile;
  a.click();
  URL.revokeObjectURL(url);
}

export function Export() {
  const [profilo, setProfilo] = useState<Profilo | undefined>();
  const [cedolini, setCedolini] = useState<Cedolino[]>([]);
  const [spese, setSpese] = useState<SpesaMedica[]>([]);
  const [anno, setAnno] = useState(new Date().getFullYear());

  useEffect(() => {
    Promise.all([getProfilo(), listaCedolini(), listaSpeseMediche()]).then(([p, c, s]) => {
      setProfilo(p);
      setCedolini(c);
      setSpese(s);
    });
  }, []);

  function esportaCsv() {
    const cedoliniAnno = cedolini.filter((c) => c.anno === anno);
    const intestazione = ['Mese', 'Anno', 'Retribuzione base', 'Straordinari', 'Totale competenze', 'Contributi INPS', 'IRPEF trattenuta', 'Netto pagato', 'TFR maturato mese'];
    const righe = cedoliniAnno.map((c) => [
      MESI[c.mese - 1], c.anno, c.retribuzioneBase, c.straordinari, c.totaleCompetenze, c.contributiInps, c.irpefTrattenuta, c.nettoPagato, c.tfrMaturatoMese,
    ]);
    const csv = [intestazione, ...righe].map((r) => r.join(';')).join('\n');
    scaricaFile(csv, `cedolini_${anno}.csv`, 'text/csv;charset=utf-8');
  }

  function esportaPdf() {
    const cedoliniAnno = cedolini.filter((c) => c.anno === anno).sort((a, b) => a.mese - b.mese);
    const speseAnno = spese.filter((s) => new Date(s.data).getFullYear() === anno);
    const totaleSpese = speseAnno.reduce((a, s) => a + s.importo, 0);
    const detrazione = calcolaDetrazioneSpeseMediche(totaleSpese);

    const doc = new jsPDF();
    let y = 15;
    doc.setFontSize(16);
    doc.text(`Report annuale FiscAI - ${anno}`, 14, y);
    y += 10;
    doc.setFontSize(10);
    if (profilo) {
      doc.text(`${profilo.nome} ${profilo.cognome} - CF: ${profilo.codiceFiscale}`, 14, y);
      y += 6;
      doc.text(`Datore di lavoro: ${profilo.datoreLavoro} - CCNL: ${profilo.ccnl} - Livello: ${profilo.livello}`, 14, y);
      y += 10;
    }

    doc.setFontSize(12);
    doc.text('Cedolini mensili', 14, y);
    y += 6;
    doc.setFontSize(9);
    doc.text('Mese | Tot. competenze | INPS | IRPEF | Netto | TFR mese', 14, y);
    y += 5;
    let totCompetenze = 0, totInps = 0, totIrpef = 0, totNetto = 0, totTfr = 0;
    for (const c of cedoliniAnno) {
      doc.text(
        `${MESI[c.mese - 1]} | €${c.totaleCompetenze.toFixed(2)} | €${c.contributiInps.toFixed(2)} | €${c.irpefTrattenuta.toFixed(2)} | €${c.nettoPagato.toFixed(2)} | €${c.tfrMaturatoMese.toFixed(2)}`,
        14, y,
      );
      totCompetenze += c.totaleCompetenze;
      totInps += c.contributiInps;
      totIrpef += c.irpefTrattenuta;
      totNetto += c.nettoPagato;
      totTfr += c.tfrMaturatoMese;
      y += 5;
      if (y > 270) { doc.addPage(); y = 15; }
    }
    y += 3;
    doc.setFontSize(10);
    doc.text(`TOTALI: competenze €${totCompetenze.toFixed(2)} | INPS €${totInps.toFixed(2)} | IRPEF €${totIrpef.toFixed(2)} | netto €${totNetto.toFixed(2)} | TFR €${totTfr.toFixed(2)}`, 14, y);
    y += 12;

    doc.setFontSize(12);
    doc.text('Spese mediche e detrazione 730', 14, y);
    y += 6;
    doc.setFontSize(9);
    doc.text(`Totale spese sostenute: €${totaleSpese.toFixed(2)}`, 14, y);
    y += 5;
    doc.text(`Franchigia non detraibile: €${detrazione.franchigia.toFixed(2)}`, 14, y);
    y += 5;
    doc.text(`Detrazione 19% spettante: €${detrazione.detrazioneSpettante.toFixed(2)}`, 14, y);
    y += 10;

    doc.setFontSize(8);
    doc.text('Report generato da FiscAI - dati inseriti dall\'utente, da verificare con il proprio CAF/commercialista.', 14, y);

    doc.save(`fiscai_report_${anno}.pdf`);
  }

  async function esportaBackup() {
    const json = await esportaTuttoJson();
    scaricaFile(json, `fiscai_backup_${new Date().toISOString().slice(0, 10)}.json`, 'application/json');
  }

  async function importaBackup(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm('Importare questo backup sovrascriverà i dati esistenti con lo stesso id. Continuare?')) return;
    const testo = await file.text();
    await importaTuttoJson(testo);
    alert('Backup importato. Ricarica la pagina per vedere i dati aggiornati.');
  }

  return (
    <div>
      <div className="card">
        <h2>Export annuale per il CAF</h2>
        <div className="form-grid">
          <div className="field">
            <label>Anno</label>
            <input type="number" value={anno} onChange={(e) => setAnno(parseInt(e.target.value, 10) || anno)} />
          </div>
        </div>
        <div className="row-actions" style={{ marginTop: 12 }}>
          <button className="primary" onClick={esportaPdf}>Esporta report PDF annuale</button>
          <button className="secondary" onClick={esportaCsv}>Esporta CSV cedolini</button>
        </div>
      </div>

      <div className="card">
        <h2>Backup completo dei dati</h2>
        <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>
          Tutti i dati di FiscAI restano solo su questo computer (IndexedDB del browser). Esporta un backup
          periodicamente per non perdere i dati se svuoti la cache del browser o cambi dispositivo.
        </p>
        <div className="row-actions">
          <button className="secondary" onClick={esportaBackup}>Esporta backup (JSON)</button>
          <label className="secondary" style={{ display: 'inline-block', cursor: 'pointer' }}>
            Importa backup (JSON)
            <input type="file" accept="application/json" style={{ display: 'none' }} onChange={importaBackup} />
          </label>
        </div>
      </div>
    </div>
  );
}
