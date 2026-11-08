import { useState } from 'react';
import './App.css';
import { Profilo } from './pages/Profilo';
import { Cedolini } from './pages/Cedolini';
import { Presenze } from './pages/Presenze';
import { Contratto } from './pages/Contratto';
import { SpeseMediche } from './pages/SpeseMediche';
import { Scadenzario } from './pages/Scadenzario';
import { Dashboard } from './pages/Dashboard';
import { Export } from './pages/Export';

type Pagina = 'dashboard' | 'profilo' | 'cedolini' | 'presenze' | 'contratto' | 'spese' | 'scadenzario' | 'export';

const VOCI_MENU: { id: Pagina; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'profilo', label: '1. Profilo' },
  { id: 'cedolini', label: '2. Cedolini' },
  { id: 'presenze', label: '3. Presenze' },
  { id: 'contratto', label: '4. Contratto' },
  { id: 'spese', label: '5. Spese mediche' },
  { id: 'scadenzario', label: '6. Scadenzario' },
  { id: 'export', label: '8. Export' },
];

function App() {
  const [pagina, setPagina] = useState<Pagina>('dashboard');

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <h1>FiscAI</h1>
        <nav>
          {VOCI_MENU.map((v) => (
            <button key={v.id} className={pagina === v.id ? 'active' : ''} onClick={() => setPagina(v.id)}>
              {v.label}
            </button>
          ))}
        </nav>
      </aside>
      <main className="main-content">
        {pagina === 'dashboard' && <Dashboard />}
        {pagina === 'profilo' && <Profilo />}
        {pagina === 'cedolini' && <Cedolini />}
        {pagina === 'presenze' && <Presenze />}
        {pagina === 'contratto' && <Contratto />}
        {pagina === 'spese' && <SpeseMediche />}
        {pagina === 'scadenzario' && <Scadenzario />}
        {pagina === 'export' && <Export />}
      </main>
    </div>
  );
}

export default App;
