# Promemoria GDPR per un bot WhatsApp (non è consulenza legale)

Questo documento è un elenco di domande da farsi, scritto con assistenza AI. Non sostituisce un parere del tuo consulente o del tuo DPO.

1. **Informativa**: i clienti sanno che la chat è gestita in parte da un sistema automatico e dove leggere l'informativa privacy? Il messaggio di benvenuto può contenere il link.
2. **Base giuridica e finalità**: usi i messaggi solo per rispondere alle richieste? Non riutilizzarli per marketing senza consenso specifico.
3. **Dati in n8n**: la cronologia delle esecuzioni salva numeri di telefono e testo dei messaggi. Imposta una retention breve (es. 7-30 giorni) e valuta di non salvare i dati delle esecuzioni riuscite.
4. **Dove sono i server**: n8n Cloud o il tuo server? Dove vengono conservati i dati? Meta è un responsabile/titolare autonomo: leggi i suoi termini per WhatsApp Business Platform.
5. **Registro dei trattamenti**: aggiungi il bot al registro se lo tieni.
6. **Dati sensibili**: invita i clienti a non inviare documenti o dati particolari in chat (i pacchetti includono già questo avviso dove serve).
7. **Diritti degli interessati**: sai come cancellare i messaggi di un cliente che lo chiede (n8n e Meta)?
8. **Accessi**: chi ha accesso a n8n e al token? Usa password forti e l'autenticazione a due fattori sugli account.
9. **Intervento umano**: un cliente può sempre chiedere di parlare con una persona? Il bot lo prevede (messaggio di cortesia e avviso al titolare nella Pro).
