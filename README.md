# WhatsApp FAQ bot per n8n (italiano)

Workflow n8n che risponde su WhatsApp alle domande ricorrenti di una piccola attività (orari, indirizzo, prezzi, contatti) e passa la mano a una persona quando non sa rispondere. Nessun servizio a pagamento di terzi, nessuna AI nel loop: la logica è un confronto di parole chiave, quindi le risposte sono quelle che scrivi tu.

> Dichiarazione: questo kit è stato scritto con l'assistenza di un modello AI (Claude) e revisionato da una persona. La logica ha test automatici (`node test.js`, 50 test). **Non è stato provato su un account WhatsApp Business reale né su un'istanza n8n live**: il workflow è stato validato come struttura JSON ed eseguendo il nodo Code con il payload di esempio. Fai sempre una prova con il tuo numero di test prima di usarlo con i clienti.

## Cosa fa

- Riceve i messaggi dal webhook della WhatsApp Cloud API (Meta).
- Confronta il testo con le domande frequenti (parole e frasi chiave, senza accenti né maiuscole).
- Risponde con il testo che hai scritto; se non trova nulla risponde con un messaggio di cortesia e segnala che serve una persona.
- Fuori orario aggiunge una nota di riapertura (fuso `Europe/Rome`, orari configurabili).
- I messaggi non testuali (foto, vocali) ricevono una risposta dedicata.

## Contenuto del repo (versione gratuita)

| Percorso | A cosa serve |
|---|---|
| `dist/free/workflow-generico.json` | workflow da importare in n8n (pacchetto FAQ generico) |
| `packs/generico.json` | le FAQ da personalizzare (sostituisci i `[SEGNAPOSTO]`) |
| `src/matcher.js` | la logica (nessuna dipendenza) |
| `build.js` | rigenera il workflow dopo aver modificato un pacchetto: `node build.js` |
| `test.js` | test: `node test.js` |
| `sample/webhook-message.json` | payload di esempio del webhook |
| `docs/GUIDA-SETUP-IT.md` | collegamento a Meta e a n8n, passo per passo |
| `docs/GDPR-CHECKLIST.md` | promemoria sul trattamento dei dati (non è consulenza legale) |

## Avvio rapido

1. `node test.js` per controllare che tutto giri sul tuo computer (serve Node 18+).
2. Modifica `packs/generico.json`: sostituisci i testi tra parentesi quadre.
3. `node build.js` e importa `dist/free/workflow-generico.json` in n8n.
4. Segui `docs/GUIDA-SETUP-IT.md` per token, webhook e credenziale.

## Versione Pro

Include tre pacchetti FAQ già scritti (officina/ricambi, studio professionale, negozio), l'avviso al titolare quando serve una persona e una guida di personalizzazione. Si trova su Gumroad (12 EUR): https://chatbotter3.gumroad.com/l/whatsapp-faq-bot-n8n-pro

## Limiti noti

- Confronto per parole chiave: non capisce sinonimi che non hai elencato né errori di battitura.
- Il webhook non verifica la firma `X-Hub-Signature-256` di Meta (richiede il modulo `crypto` nel nodo Code, spesso disabilitato). Vedi la guida per le alternative.
- La versione dell'API Graph nell'URL (`v21.0`) va controllata sulla documentazione Meta.
- Costi e regole di WhatsApp Business Platform (finestra di 24 ore, template, tariffe) li decide Meta e cambiano: controlla la documentazione ufficiale.

Licenza: MIT.
