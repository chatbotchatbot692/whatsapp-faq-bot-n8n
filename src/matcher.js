// Matcher FAQ + orari + parsing webhook WhatsApp Cloud API. Nessuna dipendenza.
// Lo stesso testo viene incorporato nel nodo Code di n8n da build.js.

function normalize(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

// Punteggio: frase chiave presente = 2, parola chiave singola presente = 1 (confronto per parola intera).
function matchFaq(text, faqs, minScore) {
  const min = minScore || 1;
  const norm = ' ' + normalize(text) + ' ';
  let best = null, bestScore = 0;
  for (const faq of faqs) {
    let score = 0;
    for (const kw of faq.keywords) {
      const k = normalize(kw);
      if (k && norm.indexOf(' ' + k + ' ') !== -1) score += k.indexOf(' ') !== -1 ? 2 : 1;
    }
    if (score > bestScore) { best = faq; bestScore = score; }
  }
  return bestScore >= min ? best : null;
}

// hours: { tz: 'Europe/Rome', week: { '1': ['09:00','18:00'], ... } }  (1 = lunedi, 7 = domenica; giorno assente = chiuso)
function isOpen(date, hours) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: hours.tz, weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false })
    .formatToParts(date).reduce((o, p) => (o[p.type] = p.value, o), {});
  const day = { Mon: '1', Tue: '2', Wed: '3', Thu: '4', Fri: '5', Sat: '6', Sun: '7' }[parts.weekday];
  const slots = hours.week[day];
  if (!slots) return false;
  const now = (parts.hour === '24' ? '00' : parts.hour) + ':' + parts.minute;
  return now >= slots[0] && now < slots[1];
}

// Estrae il primo messaggio di testo dal payload del webhook; null per stati di consegna e tipi non testuali.
function parseIncoming(body) {
  try {
    const value = body.entry[0].changes[0].value;
    const msg = value.messages && value.messages[0];
    if (!msg) return null;
    const text = msg.type === 'text' ? msg.text.body : '';
    return { from: msg.from, id: msg.id, type: msg.type, text, phoneNumberId: value.metadata.phone_number_id };
  } catch (e) { return null; }
}

// Decide la risposta. cfg: { faqs, hours, fallback, closedNote, nonText, greeting }
function buildReply(incoming, cfg, now) {
  if (!incoming) return null;
  let reply, handoff = false;
  if (incoming.type !== 'text') {
    reply = cfg.nonText; handoff = true;
  } else {
    const faq = matchFaq(incoming.text, cfg.faqs);
    if (faq) reply = faq.answer;
    else { reply = cfg.fallback; handoff = true; }
  }
  if (handoff && cfg.hours && !isOpen(now || new Date(), cfg.hours)) reply += '\n\n' + cfg.closedNote;
  return { to: incoming.from, phoneNumberId: incoming.phoneNumberId, reply, handoff };
}

if (typeof module !== 'undefined') module.exports = { normalize, matchFaq, isOpen, parseIncoming, buildReply };
