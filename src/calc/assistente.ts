// Assistente IA locale, opzionale: parla con Ollama (https://ollama.com) in esecuzione sul PC dell'utente.
// Nessuna chiamata esce dal dispositivo: va solo verso l'endpoint locale (es. http://localhost:11434).
// FiscAI non manda MAI dati a un servizio cloud: questo modulo non fa eccezione, è solo un client verso
// un server che gira sulla stessa macchina.

export interface RispostaAssistente {
  ok: boolean;
  testo: string;
}

const PROMPT_SISTEMA = `Sei l'assistente di FiscAI, un'app che aiuta un dipendente privato italiano (senza partita IVA)
a capire cedolini, detrazioni fiscali e scadenze. Rispondi in italiano, in modo breve e concreto.
Se la domanda riguarda la detraibilità di una spesa medica, ricorda: sono detraibili al 19% (oltre la franchigia
di 129,11€ annui) le visite specialistiche, gli esami diagnostici, i farmaci con scontrino parlante, i dispositivi
medici con marcatura CE, le prestazioni odontoiatriche, i ticket SSN, gli interventi chirurgici - sempre con
pagamento tracciabile (tranne farmaci e ticket SSN). NON sono detraibili cosmetici, integratori generici non
prescritti, trattamenti estetici non terapeutici. Se non sei sicuro di una risposta, dillo esplicitamente e
consiglia di verificare con un CAF o un commercialista: non inventare risposte categoriche su casi dubbi.`;

export async function chiediAssistente(
  domanda: string,
  endpoint: string,
  modello: string,
): Promise<RispostaAssistente> {
  const url = endpoint.replace(/\/$/, '') + '/api/generate';
  try {
    const risposta = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modello,
        prompt: `${PROMPT_SISTEMA}\n\nDomanda dell'utente: ${domanda}`,
        stream: false,
      }),
    });
    if (!risposta.ok) {
      return {
        ok: false,
        testo: `Ollama ha risposto con errore ${risposta.status}. Verifica che il modello "${modello}" sia installato (comando: ollama pull ${modello}).`,
      };
    }
    const dati = await risposta.json();
    return { ok: true, testo: dati.response ?? '(risposta vuota)' };
  } catch (err) {
    return {
      ok: false,
      testo:
        `Impossibile contattare Ollama su ${endpoint}. Verifica che: (1) Ollama sia avviato sul tuo PC; ` +
        `(2) se usi la versione online dell'app, che la variabile d'ambiente OLLAMA_ORIGINS includa ` +
        `l'indirizzo del sito (es. OLLAMA_ORIGINS=https://sabal-devops.github.io), poi riavvia Ollama. ` +
        `Dettaglio tecnico: ${(err as Error).message}`,
    };
  }
}
