import { openDB, type IDBPDatabase } from 'idb';
import type {
  Profilo,
  Cedolino,
  Presenza,
  DocumentoContrattuale,
  SpesaMedica,
  Scadenza,
  ImpostazioniApp,
} from './types';

const DB_NAME = 'fiscai-db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('profilo')) {
          db.createObjectStore('profilo');
        }
        if (!db.objectStoreNames.contains('cedolini')) {
          db.createObjectStore('cedolini', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('presenze')) {
          db.createObjectStore('presenze', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('documenti')) {
          db.createObjectStore('documenti', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('speseMediche')) {
          db.createObjectStore('speseMediche', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('scadenze')) {
          db.createObjectStore('scadenze', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('impostazioni')) {
          db.createObjectStore('impostazioni');
        }
      },
    });
  }
  return dbPromise;
}

export function nuovoId(): string {
  return crypto.randomUUID();
}

// --- Profilo (singleton) ---
export async function getProfilo(): Promise<Profilo | undefined> {
  const db = await getDb();
  return db.get('profilo', 'singleton');
}

export async function salvaProfilo(profilo: Profilo): Promise<void> {
  const db = await getDb();
  await db.put('profilo', profilo, 'singleton');
}

// --- Cedolini ---
export async function listaCedolini(): Promise<Cedolino[]> {
  const db = await getDb();
  const tutti = await db.getAll('cedolini');
  return tutti.sort((a, b) => a.anno - b.anno || a.mese - b.mese);
}

export async function trovaCedolinoPerPeriodo(
  mese: number,
  anno: number,
  idDaEscludere?: string,
): Promise<Cedolino | undefined> {
  const tutti = await listaCedolini();
  return tutti.find((c) => c.mese === mese && c.anno === anno && c.id !== idDaEscludere);
}

export async function salvaCedolino(c: Cedolino): Promise<void> {
  const db = await getDb();
  await db.put('cedolini', c);
}

export async function eliminaCedolino(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('cedolini', id);
}

// --- Presenze ---
export async function listaPresenze(): Promise<Presenza[]> {
  const db = await getDb();
  const tutti = await db.getAll('presenze');
  return tutti.sort((a, b) => a.anno - b.anno || a.mese - b.mese);
}

export async function trovaPresenzaPerPeriodo(
  mese: number,
  anno: number,
  idDaEscludere?: string,
): Promise<Presenza | undefined> {
  const tutte = await listaPresenze();
  return tutte.find((p) => p.mese === mese && p.anno === anno && p.id !== idDaEscludere);
}

export async function salvaPresenza(p: Presenza): Promise<void> {
  const db = await getDb();
  await db.put('presenze', p);
}

export async function eliminaPresenza(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('presenze', id);
}

// --- Documenti contrattuali ---
export async function listaDocumenti(): Promise<DocumentoContrattuale[]> {
  const db = await getDb();
  return db.getAll('documenti');
}

export async function salvaDocumento(d: DocumentoContrattuale): Promise<void> {
  const db = await getDb();
  await db.put('documenti', d);
}

export async function eliminaDocumento(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('documenti', id);
}

// --- Spese mediche ---
export async function listaSpeseMediche(): Promise<SpesaMedica[]> {
  const db = await getDb();
  const tutte = await db.getAll('speseMediche');
  return tutte.sort((a, b) => a.data.localeCompare(b.data));
}

export async function salvaSpesaMedica(s: SpesaMedica): Promise<void> {
  const db = await getDb();
  await db.put('speseMediche', s);
}

export async function eliminaSpesaMedica(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('speseMediche', id);
}

// --- Scadenze ---
export async function listaScadenze(): Promise<Scadenza[]> {
  const db = await getDb();
  const tutte = await db.getAll('scadenze');
  return tutte.sort((a, b) => a.dataScadenza.localeCompare(b.dataScadenza));
}

export async function salvaScadenza(s: Scadenza): Promise<void> {
  const db = await getDb();
  await db.put('scadenze', s);
}

export async function eliminaScadenza(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('scadenze', id);
}

// --- Impostazioni ---
export async function getImpostazioni(): Promise<ImpostazioniApp> {
  const db = await getDb();
  const imp = await db.get('impostazioni', 'singleton');
  if (imp) return imp;
  const defaults: ImpostazioniApp = { id: 'singleton', annoFiscaleCorrente: new Date().getFullYear() };
  await db.put('impostazioni', defaults, 'singleton');
  return defaults;
}

export async function salvaImpostazioni(imp: ImpostazioniApp): Promise<void> {
  const db = await getDb();
  await db.put('impostazioni', imp, 'singleton');
}

// --- Export/Import completo (per backup manuale) ---
export async function esportaTuttoJson(): Promise<string> {
  const [profilo, cedolini, presenze, documenti, speseMediche, scadenze, impostazioni] = await Promise.all([
    getProfilo(),
    listaCedolini(),
    listaPresenze(),
    listaDocumenti(),
    listaSpeseMediche(),
    listaScadenze(),
    getImpostazioni(),
  ]);
  return JSON.stringify(
    { profilo, cedolini, presenze, documenti, speseMediche, scadenze, impostazioni },
    null,
    2,
  );
}

export async function importaTuttoJson(json: string): Promise<void> {
  const dati = JSON.parse(json);
  const db = await getDb();
  const tx = db.transaction(
    ['profilo', 'cedolini', 'presenze', 'documenti', 'speseMediche', 'scadenze', 'impostazioni'],
    'readwrite',
  );
  if (dati.profilo) await tx.objectStore('profilo').put(dati.profilo, 'singleton');
  for (const c of dati.cedolini ?? []) await tx.objectStore('cedolini').put(c);
  for (const p of dati.presenze ?? []) await tx.objectStore('presenze').put(p);
  for (const d of dati.documenti ?? []) await tx.objectStore('documenti').put(d);
  for (const s of dati.speseMediche ?? []) await tx.objectStore('speseMediche').put(s);
  for (const s of dati.scadenze ?? []) await tx.objectStore('scadenze').put(s);
  if (dati.impostazioni) await tx.objectStore('impostazioni').put(dati.impostazioni, 'singleton');
  await tx.done;
}
