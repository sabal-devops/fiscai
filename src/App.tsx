import { useState } from 'react';
import './App.css';
import { Profilo } from './pages/Profilo';
import { Cedolini } from './pages/Cedolini';
import { Presenze } from './pages/Presenze';
import { Contratto } from './pages/Contratto';
import { SpeseMediche } from './pages/SpeseMediche';
import { Checklist730 } from './pages/Checklist730';
import { Routine } from './pages/Routine';
import { Assistente } from './pages/Assistente';
import { Scadenzario } from './pages/Scadenzario';
import { Dashboard } from './pages/Dashboard';
import { Export } from './pages/Export';
import {
  IconHome, IconChecklist, IconUser, IconDocument, IconClock, IconBriefcase,
  IconHeart, IconShield, IconCalendar, IconMessage, IconDownload,
} from './icons';

type Pagina = 'dashboard' | 'routine' | 'profilo' | 'cedolini' | 'presenze' | 'contratto' | 'spese' | 'checklist' | 'scadenzario' | 'assistente' | 'export';

interface VoceMenu { id: Pagina; label: string; Icon: (p: { size?: number }) => React.JSX.Element; }
interface SezioneMenu { titolo: string; voci: VoceMenu[]; }

const SEZIONI: SezioneMenu[] = [
  {
    titolo: 'Oggi',
    voci: [
      { id: 'dashboard', label: 'Panoramica', Icon: IconHome },
      { id: 'routine', label: 'Cosa devo fare', Icon: IconChecklist },
    ],
  },
  {
    titolo: 'I miei dati',
    voci: [
      { id: 'profilo', label: 'Profilo', Icon: IconUser },
      { id: 'cedolini', label: 'Cedolini', Icon: IconDocument },
      { id: 'presenze', label: 'Presenze', Icon: IconClock },
      { id: 'contratto', label: 'Contratto', Icon: IconBriefcase },
    ],
  },
  {
    titolo: 'Spese e detrazioni',
    voci: [
      { id: 'spese', label: 'Spese mediche', Icon: IconHeart },
      { id: 'checklist', label: 'Documenti per il 730', Icon: IconShield },
    ],
  },
  {
    titolo: 'Scadenze',
    voci: [
      { id: 'scadenzario', label: 'Scadenzario', Icon: IconCalendar },
    ],
  },
  {
    titolo: 'Strumenti',
    voci: [
      { id: 'assistente', label: 'Assistente IA', Icon: IconMessage },
      { id: 'export', label: 'Esporta dati', Icon: IconDownload },
    ],
  },
];

function App() {
  const [pagina, setPagina] = useState<Pagina>('dashboard');

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <h1>FiscAI</h1>
        <nav>
          {SEZIONI.map((sezione) => (
            <div key={sezione.titolo} className="nav-sezione">
              <div className="nav-sezione-titolo">{sezione.titolo}</div>
              {sezione.voci.map((v) => (
                <button key={v.id} className={pagina === v.id ? 'active' : ''} onClick={() => setPagina(v.id)}>
                  <v.Icon />
                  <span>{v.label}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>
      </aside>
      <main className="main-content">
        {pagina === 'dashboard' && <Dashboard />}
        {pagina === 'routine' && <Routine />}
        {pagina === 'profilo' && <Profilo />}
        {pagina === 'cedolini' && <Cedolini />}
        {pagina === 'presenze' && <Presenze />}
        {pagina === 'contratto' && <Contratto />}
        {pagina === 'spese' && <SpeseMediche />}
        {pagina === 'checklist' && <Checklist730 />}
        {pagina === 'scadenzario' && <Scadenzario />}
        {pagina === 'assistente' && <Assistente />}
        {pagina === 'export' && <Export />}
      </main>
    </div>
  );
}

export default App;
