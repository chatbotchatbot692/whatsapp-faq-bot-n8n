// Test senza dipendenze: node test.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { normalize, matchFaq, isOpen, parseIncoming, buildReply } = require('./src/matcher.js');
const { buildWorkflow, loadPack } = require('./build.js');

let passed = 0;
function t(name, fn) { fn(); passed++; console.log('ok  ' + name); }

const sample = JSON.parse(fs.readFileSync(path.join(__dirname, 'sample', 'webhook-message.json'), 'utf8'));
const packNames = ['generico', 'officina-ricambi', 'studio-professionale', 'negozio']
  .filter((n) => fs.existsSync(path.join(__dirname, 'packs', n + '.json'))); // il repo gratuito ha solo "generico"

t('normalize: accenti, maiuscole, punteggiatura', () => {
  assert.strictEqual(normalize('  Così, è Già APERTO?! '), 'cosi e gia aperto');
});

const gen = loadPack('generico');
t('matchFaq: parola chiave singola', () => assert.strictEqual(matchFaq('quali sono i prezzi?', gen.faqs).id, 'prezzi'));
t('matchFaq: frase chiave pesa piu di una parola', () => assert.strictEqual(matchFaq('a che ora aprite, dove siete', gen.faqs).id, 'orari'));
t('matchFaq: nessuna corrispondenza', () => assert.strictEqual(matchFaq('vorrei parlare con il direttore', gen.faqs), null));
t('matchFaq: parola intera, non sottostringa', () => assert.strictEqual(matchFaq('numeroso gruppo', gen.faqs), null));

const hours = gen.hours; // lun-ven 09-18 Europe/Rome
t('isOpen: martedi 10:00 Roma (ottobre, UTC+2) = aperto', () => assert.strictEqual(isOpen(new Date('2026-10-20T08:00:00Z'), hours), true));
t('isOpen: martedi 19:00 Roma = chiuso', () => assert.strictEqual(isOpen(new Date('2026-10-20T17:00:00Z'), hours), false));
t('isOpen: domenica = chiuso', () => assert.strictEqual(isOpen(new Date('2026-10-25T10:00:00Z'), hours), false));
t('isOpen: esattamente alla chiusura = chiuso', () => assert.strictEqual(isOpen(new Date('2026-10-20T16:00:00Z'), hours), false));
t('isOpen: cambio ora legale (gennaio, UTC+1) 09:00 Roma = aperto', () => assert.strictEqual(isOpen(new Date('2027-01-12T08:00:00Z'), hours), true));

t('parseIncoming: payload di esempio', () => {
  const m = parseIncoming(sample);
  assert.strictEqual(m.from, '393331234567');
  assert.strictEqual(m.phoneNumberId, '111111111111111');
  assert.strictEqual(m.type, 'text');
  assert.ok(m.text.includes('aperti'));
});
t('parseIncoming: notifica di stato = null', () => {
  const status = { entry: [{ changes: [{ value: { metadata: { phone_number_id: '1' }, statuses: [{ id: 'x' }] } }] }] };
  assert.strictEqual(parseIncoming(status), null);
});
t('parseIncoming: input malformato = null', () => {
  assert.strictEqual(parseIncoming(undefined), null);
  assert.strictEqual(parseIncoming({}), null);
});

const open = new Date('2026-10-20T08:00:00Z');
const closed = new Date('2026-10-20T20:00:00Z');
t('buildReply: FAQ trovata, nessun handoff', () => {
  const r = buildReply(parseIncoming(sample), gen, open);
  assert.strictEqual(r.handoff, false);
  assert.ok(r.reply.startsWith('Orari'));
  assert.strictEqual(r.to, '393331234567');
});
t('buildReply: senza match con negozio aperto = fallback + handoff, senza nota chiusura', () => {
  const inc = Object.assign(parseIncoming(sample), { text: 'parlo col direttore' });
  const r = buildReply(inc, gen, open);
  assert.strictEqual(r.handoff, true);
  assert.strictEqual(r.reply, gen.fallback);
});
t('buildReply: senza match a negozio chiuso = fallback + nota chiusura', () => {
  const inc = Object.assign(parseIncoming(sample), { text: 'parlo col direttore' });
  const r = buildReply(inc, gen, closed);
  assert.ok(r.reply.endsWith(gen.closedNote));
});
t('buildReply: messaggio non testuale = nonText + handoff', () => {
  const inc = Object.assign(parseIncoming(sample), { type: 'image', text: '' });
  const r = buildReply(inc, gen, open);
  assert.strictEqual(r.reply, gen.nonText);
  assert.strictEqual(r.handoff, true);
});
t('buildReply: incoming null = null', () => assert.strictEqual(buildReply(null, gen, open), null));

for (const n of packNames) {
  const p = loadPack(n);
  t('pack ' + n + ': struttura e id unici', () => {
    for (const k of ['greeting', 'fallback', 'closedNote', 'nonText', 'hours', 'faqs']) assert.ok(p[k], 'manca ' + k);
    const ids = p.faqs.map((f) => f.id);
    assert.strictEqual(new Set(ids).size, ids.length);
    for (const f of p.faqs) { assert.ok(f.keywords.length && f.answer, f.id); }
  });
  t('pack ' + n + ': nessun contenuto su sinistri/perizie', () => {
    assert.ok(!/sinistr|perizi|risarciment/i.test(JSON.stringify(p)));
  });
}

// Workflow: struttura + esecuzione reale del nodo Code in un sandbox con $input simulato.
for (const n of packNames) {
  for (const notify of [false, true]) {
    const wf = buildWorkflow(loadPack(n), notify);
    const label = 'workflow ' + n + (notify ? ' pro' : ' free');
    t(label + ': JSON serializzabile e connessioni valide', () => {
      JSON.parse(JSON.stringify(wf));
      const names = new Set(wf.nodes.map((x) => x.name));
      assert.strictEqual(names.size, wf.nodes.length, 'nomi nodo duplicati');
      for (const [from, c] of Object.entries(wf.connections)) {
        assert.ok(names.has(from), 'origine sconosciuta ' + from);
        for (const out of c.main) for (const l of out) assert.ok(names.has(l.node), 'destinazione sconosciuta ' + l.node);
      }
    });
    t(label + ': nodo Code gira e risponde al payload di esempio', () => {
      const code = wf.nodes.find((x) => x.type === 'n8n-nodes-base.code').parameters.jsCode;
      const run = new Function('$input', code);
      const out = run({ first: () => ({ json: { body: sample } }) });
      assert.strictEqual(out.length, 1);
      assert.strictEqual(out[0].json.to, '393331234567');
      assert.ok(out[0].json.reply.length > 0);
      new vm.Script('(function($input){' + code + '\n})'); // sintassi valida
      const ignored = run({ first: () => ({ json: { body: { entry: [{ changes: [{ value: { metadata: { phone_number_id: '1' }, statuses: [{}] } }] }] } } }) });
      assert.deepStrictEqual(ignored, []);
    });
    t(label + ': nodo Pro "Avvisa titolare" presente solo nel Pro', () => {
      assert.strictEqual(wf.nodes.some((x) => x.name === 'Avvisa titolare'), notify);
    });
  }
}

console.log('\n' + passed + ' test passati');
