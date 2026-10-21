# Guida di setup

Questa guida non è stata verificata su un account reale: i nomi dei menu di Meta e di n8n possono essere cambiati. Se un passaggio non corrisponde, fa fede la documentazione ufficiale.

## 1. Cosa serve

- Un'istanza n8n raggiungibile da internet con HTTPS (n8n Cloud o self-hosted). Meta non chiama indirizzi locali.
- Un account Meta for Developers e un'app con il prodotto WhatsApp attivato (WhatsApp Cloud API).
- Un numero di telefono per il bot. Il numero di test fornito da Meta va bene per le prove.

## 2. Credenziale in n8n

1. In Meta, dalla pagina dell'app > WhatsApp > configurazione API, copia il token di accesso. Per la produzione serve un token permanente di un utente di sistema; quello temporaneo scade in poche ore.
2. In n8n crea una credenziale **Header Auth**: nome `Authorization`, valore `Bearer <il tuo token>`.
3. Non incollare mai il token nel workflow né in un repository pubblico.

## 3. Importa e configura il workflow

1. In n8n: Workflows > Import from file > scegli il file JSON.
2. Nel nodo **Token valido?** sostituisci `[VERIFY_TOKEN]` con una stringa casuale lunga inventata da te.
3. Nei nodi **Invia risposta** (e **Avvisa titolare** nella Pro) seleziona la credenziale Header Auth.
4. Nella Pro: nel nodo **Avvisa titolare** sostituisci `[NUMERO_TITOLARE_SENZA_PIU]` con il numero del titolare in formato internazionale senza `+` (es. `393331234567`). Il titolare deve aver scritto al bot nelle ultime 24 ore, altrimenti Meta rifiuta i messaggi liberi e serve un template approvato.
5. Attiva il workflow (interruttore Active). L'URL di produzione dei webhook è del tipo `https://<tuo-n8n>/webhook/whatsapp` (lo vedi nei nodi webhook).

## 4. Collega il webhook a Meta

1. App Meta > WhatsApp > Configurazione > Webhook > Modifica.
2. URL di callback: l'URL di produzione del punto 3. Token di verifica: lo stesso `[VERIFY_TOKEN]` che hai scelto.
3. Verifica e salva. Se fallisce, controlla che il workflow sia attivo e che il token coincida.
4. Iscriviti al campo `messages`.

## 5. Prova

1. Scrivi dal tuo telefono al numero di test (con il numero di test Meta devi prima aggiungere il tuo telefono tra i destinatari consentiti).
2. Chiedi "a che ora siete aperti?" e controlla la risposta.
3. Scrivi qualcosa di fuori dalle FAQ: devi ricevere il messaggio di cortesia (e, nella Pro, il titolare riceve l'avviso).
4. Guarda la cronologia delle esecuzioni in n8n se qualcosa non risponde.

## 6. Personalizzare le FAQ

- Apri il file del pacchetto in `packs/`. Ogni voce ha `keywords` (parole o frasi che il cliente potrebbe scrivere) e `answer`.
- Una frase chiave di più parole vale 2 punti, una parola singola 1: vince la voce con il punteggio più alto.
- Scrivi le parole chiave senza accenti non serve: il confronto li ignora.
- Cambia gli orari in `hours.week` (1 = lunedì ... 7 = domenica; giorno assente = chiuso).
- Dopo ogni modifica: `node test.js && node build.js` e reimporta il workflow.

## 7. Firma del webhook (consigliato per la produzione)

Meta firma ogni richiesta con `X-Hub-Signature-256`. Questo workflow non la verifica, perché serve il corpo grezzo e il modulo `crypto` nel nodo Code (in n8n self-hosted si abilita con `NODE_FUNCTION_ALLOW_BUILTIN=crypto`). In alternativa metti davanti a n8n un proxy che controlla la firma. Senza verifica, chiunque conosca l'URL può far partire il workflow: tienilo segreto e non usare il bot per operazioni sensibili.
